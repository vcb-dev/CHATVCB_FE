// Gửi tệp chat: ưu tiên tải THẲNG từ trình duyệt lên R2 (tới 2 GB, có % tiến trình), byte không đi qua BE.
// 1. BE cấp phiếu + link PUT ký sẵn (khoá key, loại tệp, dung lượng; hết hạn sau vài phút)
// 2. PUT tệp lên R2 bằng XHR để đọc được tiến trình
// 3. BE kiểm tệp trên R2 rồi trả ChatFile
// Không PUT được ngay từ đầu (app Mac chạy file://, R2 chưa bật CORS cho domain này) hoặc BE chưa có R2 (503)
// thì quay về gửi multipart qua BE như cũ, tối đa CHAT_FILE_LEGACY_MAX_BYTES.
import { CHAT_FILE_LEGACY_MAX_BYTES } from '@/lib/chatUploadConstants';
import type { ChatFile } from '@/types';
import { api, ApiError } from './client';
import { API_URL, authedFetch } from './session';

type UploadTicket = {
  id: string;
  uploadUrl: string;
  headers: Record<string, string>;
};

/** Lỗi khi PUT lên R2. `started`: đã có byte lên rồi mới hỏng (rớt mạng giữa chừng) */
class StorageUploadError extends Error {
  constructor(
    message: string,
    readonly started: boolean,
  ) {
    super(message);
  }
}

async function postJson<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  const response = await authedFetch(`${API_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let message = 'Không gửi được tệp.';
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(data.message)) {
        message = data.message.join(', ');
      } else if (data.message) {
        message = data.message;
      }
    } catch {
      // thân lỗi không phải JSON
    }
    throw new ApiError(message, response.status);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/** PUT lên link ký sẵn. Không gửi cookie (withCredentials mặc định false): R2 không cần, và không để lộ phiên ra domain khác */
function putToStorage(
  ticket: UploadTicket,
  file: Blob,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let started = false;
    xhr.open('PUT', ticket.uploadUrl);
    for (const [name, value] of Object.entries(ticket.headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.loaded > 0) {
        started = true;
      }
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.min(99, Math.floor((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new StorageUploadError(`Kho lưu trữ từ chối tệp (${xhr.status}).`, true));
      }
    };
    xhr.onerror = () => reject(new StorageUploadError('Không kết nối được kho lưu trữ.', started));
    xhr.onabort = () => reject(new StorageUploadError('Đã huỷ tải lên.', started));
    xhr.send(file);
  });
}

async function uploadViaServer(roomId: string, file: File): Promise<ChatFile> {
  if (file.size > CHAT_FILE_LEGACY_MAX_BYTES) {
    throw new Error(
      `Máy này chưa tải thẳng lên kho được nên chỉ gửi được tệp tối đa ${CHAT_FILE_LEGACY_MAX_BYTES / 1024 / 1024} MB.`,
    );
  }
  return api.uploadFile(roomId, file);
}

export async function uploadChatFile(
  roomId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ChatFile> {
  const base = `/rooms/${roomId}/files/uploads`;
  let ticket: UploadTicket;
  try {
    ticket = await postJson<UploadTicket>(base, {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    });
  } catch (err) {
    // 503: BE chưa cấu hình R2 → gửi qua BE như cũ
    if (err instanceof ApiError && err.status === 503) {
      return uploadViaServer(roomId, file);
    }
    throw err;
  }
  try {
    await putToStorage(ticket, file, onProgress);
  } catch (err) {
    // Huỷ phiếu để BE xoá ngay phần tải dở, không đợi dọn định kỳ
    void postJson(`${base}/${ticket.id}`, undefined, 'DELETE').catch(() => undefined);
    // Chưa lên được byte nào: thường là trình duyệt chặn (CORS / file://), đi đường cũ.
    // Đã lên một phần rồi mới hỏng là rớt mạng: báo lỗi để người dùng "Thử lại", không tải lại cả tệp qua BE
    if (err instanceof StorageUploadError && !err.started) {
      return uploadViaServer(roomId, file);
    }
    throw err;
  }
  return postJson<ChatFile>(`${base}/${ticket.id}/complete`);
}
