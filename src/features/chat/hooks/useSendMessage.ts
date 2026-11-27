import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { uploadChatFile } from '@/api/chatFileUpload';
import { api } from '@/api/client';
import type { ChatMessage, Room, User } from '@/types';
import { buildTempMessage, markTempFailed, removeTemp, upsertTemp } from '../utils/messageCache';
import {
  arrivedClientIds,
  releaseBlobs,
  settleSent,
  tempBlobs,
  updateMessages,
} from '../utils/messageStore';
import { dropEntry, getEntry, openOutbox, putEntry, setFailed, type SendInput } from '../utils/outbox';
import { isDirectRoom, previewOf, upsertRoom } from '../utils/rooms';
import { setUploadProgress } from '../utils/uploadProgress';
import { SEND_TIMEOUT_MS, sendErrorText, shouldRetrySend } from '../utils/sendPolicy';

export type { SendInput } from '../utils/outbox';

type SendVars = { clientId: string; roomId: string; input: SendInput; temp: ChatMessage };

function newClientId() {
  // randomUUID chỉ có trong secure context (mở Vite qua IP LAN thì không có)
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function deliver({ clientId, roomId, input }: SendVars): Promise<ChatMessage> {
  // Id đã tải lên nằm trong hộp thư đi: "Thử lại" (kể cả sau F5) không tải lại phần đã lên
  const job = getEntry(clientId)?.uploads ?? { uploaded: [] };
  const imageIds: string[] = [];
  for (const [index, image] of (input.images ?? []).entries()) {
    if (image.imageId) {
      imageIds.push(image.imageId);
      continue;
    }
    if (!job.uploaded[index] && image.file) {
      job.uploaded[index] = (await api.uploadImage(roomId, image.file)).id;
    }
    imageIds.push(job.uploaded[index]);
  }
  if (input.gifUrl) {
    job.uploaded[0] ??= (await api.attachRemoteImage(roomId, input.gifUrl)).id;
    imageIds.push(job.uploaded[0]);
  }
  if (input.file && !job.fileId) {
    const { blob, name, voice } = input.file;
    try {
      const uploaded = voice
        ? await api.uploadVoice(roomId, blob, name)
        : await uploadChatFile(roomId, blob as File, (percent) => setUploadProgress(clientId, percent));
      job.fileId = uploaded.id;
    } finally {
      setUploadProgress(clientId, null);
    }
  }
  return api.sendMessage(
    roomId,
    input.content,
    imageIds.length === 1 ? imageIds[0] : undefined,
    input.replyTo?.id,
    job.fileId,
    imageIds.length > 1 ? imageIds : undefined,
    input.rich,
    clientId,
    AbortSignal.timeout(SEND_TIMEOUT_MS),
  );
}

/**
 * Gửi tin hiện ngay: chèn tin tạm vào cache đúng phòng, gửi lần lượt theo phòng
 * (`scope`), xong thì thay bằng tin thật, lỗi thì để "Gửi lỗi · Thử lại | Xóa".
 * Rớt kết nối thì tự gửi lại (BE trả tin cũ khi trùng clientId nên không ra tin đôi);
 * mất mạng thì mutation tạm dừng và gửi tiếp khi có mạng lại.
 */
export function useSendMessage({
  user,
  roomId,
  setRooms,
  markMessageRead,
}: {
  user: User;
  roomId: string;
  setRooms: Dispatch<SetStateAction<Room[]>>;
  markMessageRead: (message?: ChatMessage, targetRoomId?: string) => void;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    openOutbox(user.id);
  }, [user.id]);

  const showInRoomList = useCallback(
    (message: ChatMessage) => {
      setRooms((current) => {
        const target = current.find((r) => r.id === message.roomId);
        if (!target) {
          return current;
        }
        return upsertRoom(current, {
          ...target,
          lastMessagePreview: previewOf(message, user.id, isDirectRoom(target)),
          updatedAt: message.createdAt,
        });
      });
    },
    [setRooms, user.id],
  );

  const mutation = useMutation({
    scope: { id: `send:${roomId}` },
    mutationFn: deliver,
    retry: shouldRetrySend,
    onMutate: (vars: SendVars) => {
      updateMessages(queryClient, vars.roomId, (cache) => upsertTemp(cache, vars.temp));
      setFailed(vars.clientId, null);
      showInRoomList(vars.temp);
    },
    onSuccess: (real, vars) => {
      void settleSent(queryClient, vars.clientId, real);
      showInRoomList(real);
      markMessageRead(real, real.roomId);
    },
    onError: (err, vars) => {
      if (arrivedClientIds.delete(vars.clientId)) {
        // Socket đã báo tin tới nơi, chỉ mất response của POST
        dropEntry(vars.clientId);
        return;
      }
      const reason = sendErrorText(err);
      updateMessages(queryClient, vars.roomId, (cache) => markTempFailed(cache, vars.clientId, reason));
      setFailed(vars.clientId, reason);
    },
    onSettled: (_data, _err, vars) => {
      arrivedClientIds.delete(vars.clientId);
    },
  });
  const { mutate } = mutation;

  const send = useCallback(
    (input: SendInput) => {
      if (!roomId) {
        return;
      }
      const clientId = newClientId();
      const blobs: string[] = [];
      const images = input.images ?? [];
      for (const image of images) {
        if (image.preview.startsWith('blob:')) {
          blobs.push(image.preview);
        }
      }
      let file: Parameters<typeof buildTempMessage>[0]['file'];
      if (input.file) {
        const url = URL.createObjectURL(input.file.blob);
        blobs.push(url);
        file = {
          url,
          name: input.file.name,
          sizeBytes: input.file.blob.size,
          // Tin thoại nhận ra bằng mime audio/*
          mimeType: input.file.blob.type || (input.file.voice ? 'audio/webm' : 'application/octet-stream'),
        };
      }
      const temp = buildTempMessage({
        clientId,
        roomId,
        user,
        content: input.content,
        replyTo: input.replyTo,
        rich: input.rich,
        imageUrl: images.length === 1 ? images[0].preview : input.gifUrl,
        images:
          images.length > 1
            ? images.map((image, index) => ({ id: `${clientId}-${index}`, url: image.preview }))
            : undefined,
        file,
      });
      tempBlobs.set(clientId, blobs);
      putEntry({ clientId, roomId, input, temp, uploads: { uploaded: [] }, failed: false });
      mutate({ clientId, roomId, input, temp });
    },
    [mutate, roomId, user],
  );

  const retry = useCallback(
    (message: ChatMessage) => {
      const entry = message.clientId ? getEntry(message.clientId) : undefined;
      if (entry) {
        mutate({ clientId: entry.clientId, roomId: entry.roomId, input: entry.input, temp: entry.temp });
      }
    },
    [mutate],
  );

  const discard = useCallback(
    (message: ChatMessage) => {
      const clientId = message.clientId;
      if (!clientId) {
        return;
      }
      updateMessages(queryClient, message.roomId, (cache) => removeTemp(cache, clientId));
      releaseBlobs(clientId);
      dropEntry(clientId);
    },
    [queryClient],
  );

  return { send, retry, discard };
}
