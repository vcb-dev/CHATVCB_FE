import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { canAssignTask } from '@/lib/tasks';
import type { AssignKind, DirectoryUser, Room, RoomHit, RoomMember, TaskPreset } from '@/types';
import { isDirectRoom } from '../utils/rooms';

const EMPTY_MEMBERS: RoomMember[] = [];
const EMPTY_HITS: RoomHit[] = [];
const EMPTY_USERS: DirectoryUser[] = [];

export const ASSIGN_KINDS: { value: AssignKind; label: string }[] = [
  { value: 'group', label: 'Nhóm' },
  { value: 'direct', label: 'Cá nhân' },
];

export const SELF_ASSIGN_NOTE = 'Việc được lưu ở Cloud của tôi, chỉ bạn thấy.';

type RoomOption = { value: string; label: string };

/** Người đã chat lên đầu theo thứ tự danh sách phòng; người đã chặn thì không giao được. */
function peopleOptions(users: DirectoryUser[], rooms: Room[]): RoomOption[] {
  const directRooms = rooms.filter(isDirectRoom);
  const blocked = new Set(
    directRooms.filter((room) => room.blockedByMe).map((room) => room.peerUserId),
  );
  const recent = directRooms.map((room) => room.peerUserId);
  const rank = (user: DirectoryUser) => {
    const index = recent.indexOf(user.id);
    return index === -1 ? recent.length : index;
  };
  return users
    .filter((user) => !blocked.has(user.id))
    .sort((a, b) => rank(a) - rank(b))
    .map((user) => ({ value: user.id, label: `${user.name} · ${user.email}` }));
}

/** Chọn nơi giao và người nhận; có `rooms` thì người dùng tự chọn nhóm hoặc người để giao 1-1. */
export function useAssignTarget(options: {
  rooms?: Room[];
  currentUserId: string;
  members: RoomMember[];
  isDirect: boolean;
}) {
  const { rooms, currentUserId } = options;
  const [kind, setKind] = useState<AssignKind>('group');
  const [pickedRoomId, setPickedRoomId] = useState<string | undefined>();
  const [pickedOption, setPickedOption] = useState<RoomOption | null>(null);
  const [pickedAssignee, setAssigneeId] = useState<string | undefined>();
  const [roomSearch, setRoomSearch] = useState('');
  const [roomHits, setRoomHits] = useState<RoomHit[]>(EMPTY_HITS);

  // Danh sách phòng chỉ nạp theo trang: tìm thêm trên BE để giao được cả nhóm ít hoạt động
  useEffect(() => {
    const q = roomSearch.trim();
    if (!rooms || !q) {
      setRoomHits(EMPTY_HITS);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void api
        .searchRooms(q)
        .then((res) => {
          if (!cancelled) {
            setRoomHits(res.rooms);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRoomHits(EMPTY_HITS);
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [rooms, roomSearch]);

  const picking = Boolean(rooms);
  const pickingPerson = picking && kind === 'direct';
  const pickingSelf = pickingPerson && pickedAssignee === currentUserId;
  const { data: pickedMembers = EMPTY_MEMBERS } = useQuery({
    queryKey: queryKeys.members(pickedRoomId ?? ''),
    queryFn: () => api.members(pickedRoomId as string),
    enabled: Boolean(pickedRoomId),
  });
  // Không dựa vào phòng 1-1 đã nạp: danh sách phòng có trang, và người chưa từng chat thì chưa có phòng
  const { data: directory = EMPTY_USERS } = useQuery({
    queryKey: queryKeys.taskPeople,
    queryFn: () => api.users(),
    enabled: pickingPerson,
  });
  const memberList = picking ? pickedMembers : options.members;
  const peerId = !picking && options.isDirect
    ? memberList.find((m) => m.id !== currentUserId)?.id
    : undefined;
  const assignable = (rooms ?? []).filter(
    (room) => canAssignTask(room) && !isDirectRoom(room),
  );
  const listed: RoomOption[] = [
    ...assignable.map((room) => ({ value: room.id, label: room.title || room.name })),
    ...roomHits
      .filter((hit) => !assignable.some((room) => room.id === hit.id))
      .map((hit) => ({ value: hit.id, label: hit.title || hit.name })),
  ];
  // Nhóm chọn từ kết quả tìm kiếm phải còn trong danh sách khi ô tìm được xóa, không thì Select hiện id
  const roomOptions =
    pickedOption && !listed.some((option) => option.value === pickedOption.value)
      ? [...listed, pickedOption]
      : listed;
  const assigneeId = pickedAssignee ?? peerId;

  const clearPicks = () => {
    setPickedRoomId(undefined);
    setPickedOption(null);
    setAssigneeId(undefined);
    setRoomSearch('');
    setRoomHits(EMPTY_HITS);
  };

  return {
    kind,
    pickingPerson,
    pickingSelf,
    roomId: pickedRoomId,
    assigneeId,
    ready: Boolean(assigneeId && (!picking || pickingPerson || pickedRoomId)),
    roomOptions,
    memberOptions: memberList.map((m) => ({ value: m.id, label: m.displayName || m.name })),
    personOptions: [
      { value: currentUserId, label: 'Bản thân (tôi)' },
      ...peopleOptions(directory, rooms ?? []),
    ],
    setRoomSearch,
    setAssigneeId,
    changeKind: (value: AssignKind) => {
      setKind(value);
      clearPicks();
    },
    pickRoom: (value: string) => {
      setPickedRoomId(value);
      setPickedOption(roomOptions.find((option) => option.value === value) ?? null);
      setAssigneeId(undefined);
    },
    /** Phòng 1-1 chỉ được mở lúc giao thật, để chọn thử người khác không sinh phòng rỗng. */
    resolveRoomId: async () => {
      if (pickingSelf) {
        return (await api.cloudRoom()).id;
      }
      return pickingPerson ? (await api.createDirectRoom(assigneeId as string)).id : pickedRoomId;
    },
    reset: (preset?: TaskPreset) => {
      setKind(preset?.kind ?? 'group');
      setPickedRoomId(preset?.roomId);
      setPickedOption(
        preset?.roomId && preset.roomLabel
          ? { value: preset.roomId, label: preset.roomLabel }
          : null,
      );
      setAssigneeId(preset?.assigneeId);
      setRoomSearch('');
      setRoomHits(EMPTY_HITS);
    },
  };
}
