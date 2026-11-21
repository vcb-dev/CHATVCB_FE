import { useEffect, useState, type ReactNode } from 'react';
import {
  CopyOutlined,
  DownOutlined,
  IdcardOutlined,
  MessageOutlined,
  PhoneOutlined,
  StopOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Modal, Tooltip, message as antMessage } from 'antd';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { UserAvatar } from '@/components/UserAvatar';
import { lastSeenText } from '@/features/chat/utils/presence';
import { avatarCoverGradient } from '@/lib/avatar';
import { copyText } from '@/lib/clipboard';
import type { CallMode, CommonRoom, Room } from '@/types';

const EMPTY_COMMON: CommonRoom[] = [];

/** Hồ sơ một người: thông tin công việc, nhắn tin / gọi / gửi danh thiếp, nhóm chung, chặn. */
export function UserProfileModal(props: {
  open: boolean;
  userId: string | null;
  currentUserId: string;
  online: boolean;
  lastSeenAt?: string;
  now: number;
  onClose: () => void;
  onOpenRoom: (room: Room) => void;
  /** Mở chat 1-1 rồi bắt đầu cuộc gọi trong đó. */
  onCall: (room: Room, mode?: CallMode) => void;
  onSendCard: (user: { id: string; name: string }) => void;
  /** useBlockUser.askBlock: chặn (có hỏi lại) / bỏ chặn; `true` khi đã đổi. */
  onSetBlocked: (userId: string, name: string, blocked: boolean) => Promise<boolean>;
  /**
   * Cờ chặn từ chat 1-1 trên danh sách phòng (cập nhật realtime qua rooms.changed). Có thì dùng
   * thay cho hồ sơ đã cache, để mở lại popup không thoáng hiện trạng thái chặn cũ.
   */
  blocked?: { byMe: boolean; me: boolean };
}) {
  const [showCommon, setShowCommon] = useState(false);
  const [busy, setBusy] = useState<'message' | 'call' | 'room' | null>(null);
  const userId = props.userId ?? '';
  const isSelf = props.userId === props.currentUserId;
  const enabled = props.open && Boolean(userId);

  const profileQuery = useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => api.user(userId),
    enabled,
    staleTime: 5 * 60_000,
  });
  // Nhóm chung không có hoặc lỗi thì chỉ ẩn mục đó, không báo lỗi
  const commonQuery = useQuery({
    queryKey: queryKeys.commonRooms(userId),
    queryFn: () => api.userCommonRooms(userId),
    enabled: enabled && !isSelf,
  });
  const profile = enabled ? (profileQuery.data ?? null) : null;
  const commonRooms = enabled && !isSelf ? (commonQuery.data ?? EMPTY_COMMON) : EMPTY_COMMON;

  useEffect(() => {
    setShowCommon(false);
  }, [props.open, props.userId]);

  async function withDirectRoom(kind: 'message' | 'call', then: (room: Room) => void) {
    if (!profile) {
      return;
    }
    setBusy(kind);
    try {
      const room = await api.createDirectRoom(profile.id);
      then(room);
      props.onClose();
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không mở được cuộc trò chuyện.');
    } finally {
      setBusy(null);
    }
  }

  async function openCommonRoom(id: string) {
    setBusy('room');
    try {
      props.onOpenRoom(await api.room(id));
      props.onClose();
    } catch (err) {
      antMessage.error(err instanceof Error ? err.message : 'Không mở được nhóm.');
    } finally {
      setBusy(null);
    }
  }

  async function toggleBlock() {
    if (!profile) {
      return;
    }
    await props.onSetBlocked(profile.id, profile.name, !blockedByMe);
  }

  async function copyEmail(email: string) {
    try {
      await copyText(email);
      antMessage.success('Đã sao chép email.');
    } catch {
      antMessage.error('Không sao chép được.');
    }
  }

  const blockedByMe = props.blocked?.byMe ?? Boolean(profile?.blockedByMe);
  const blockedMe = props.blocked?.me ?? Boolean(profile?.blockedMe);
  // Chặn một chiều nào cũng không nhắn/gọi riêng được (BE từ chối cả hai chiều)
  const cannotCall = blockedByMe || blockedMe;

  function statusLine() {
    if (!profile || isSelf) {
      return null;
    }
    if (blockedByMe) {
      return <p className="profile-last-seen profile-blocked-tag">Đã chặn</p>;
    }
    if (blockedMe) {
      return null;
    }
    return <p className="profile-last-seen">{lastSeenText(props.online, props.lastSeenAt, props.now)}</p>;
  }

  const rows: { label: string; value: ReactNode; key: string }[] = profile
    ? [
        {
          key: 'email',
          label: 'Email',
          value: (
            <span className="profile-info-copy">
              {profile.email}
              <Tooltip title="Sao chép email">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  aria-label="Sao chép email"
                  onClick={() => void copyEmail(profile.email)}
                />
              </Tooltip>
            </span>
          ),
        },
        ...(profile.phone
          ? [{ key: 'phone', label: 'Số điện thoại', value: <a href={`tel:${profile.phone}`}>{profile.phone}</a> }]
          : []),
        ...(profile.jobTitle ? [{ key: 'job', label: 'Chức danh', value: profile.jobTitle }] : []),
        {
          key: 'dept',
          label: 'Phòng ban',
          value: profile.department || `Team ${profile.team}`,
        },
        ...(profile.departmentGroup
          ? [{ key: 'group', label: 'Nhóm', value: profile.departmentGroup }]
          : []),
      ]
    : [];

  return (
    <Modal
      title="Thông tin tài khoản"
      open={props.open}
      onCancel={props.onClose}
      destroyOnHidden
      width={400}
      footer={null}
      className="profile-modal"
    >
      <div
        className="profile-cover"
        style={profile ? { background: avatarCoverGradient(profile.name) } : undefined}
      />
      {profileQuery.isPending ? (
        <LoadingState />
      ) : profileQuery.isError ? (
        <EmptyState
          compact
          title="Không tải được hồ sơ"
          action={
            <Button size="small" onClick={() => void profileQuery.refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : profile ? (
        <div className="user-profile-modal-body">
          <div className="profile-head" style={{ marginBottom: 8 }}>
            <UserAvatar
              size={80}
              src={profile.avatarUrl}
              name={profile.name}
              showZoomHint
              framed
              style={{ fontSize: 28, fontWeight: 700 }}
            />
            <h3 className="profile-name">{profile.name}</h3>
            {profile.jobTitle ? <p className="profile-job">{profile.jobTitle}</p> : null}
            {statusLine()}
          </div>

          {!isSelf ? (
            <div className="info-actions profile-actions">
              <button
                type="button"
                className="info-action is-primary"
                disabled={blockedMe || busy !== null}
                onClick={() => void withDirectRoom('message', props.onOpenRoom)}
              >
                <span className="info-action-btn">
                  <MessageOutlined />
                </span>
                <span className="info-action-label">Nhắn tin</span>
              </button>
              <button
                type="button"
                className="info-action"
                disabled={cannotCall || busy !== null}
                onClick={() =>
                  void withDirectRoom('call', (room) => props.onCall(room, 'audio'))
                }
              >
                <span className="info-action-btn">
                  <PhoneOutlined />
                </span>
                <span className="info-action-label">Gọi thoại</span>
              </button>
              <button
                type="button"
                className="info-action"
                disabled={cannotCall || busy !== null}
                onClick={() =>
                  void withDirectRoom('call', (room) => props.onCall(room, 'video'))
                }
              >
                <span className="info-action-btn">
                  <VideoCameraOutlined />
                </span>
                <span className="info-action-label">Gọi video</span>
              </button>
              <button
                type="button"
                className="info-action"
                onClick={() => {
                  props.onSendCard({ id: profile.id, name: profile.name });
                  props.onClose();
                }}
              >
                <span className="info-action-btn">
                  <IdcardOutlined />
                </span>
                <span className="info-action-label">Gửi danh thiếp</span>
              </button>
              <button
                type="button"
                className={`info-action ${blockedByMe ? '' : 'is-danger'}`}
                onClick={() => void toggleBlock()}
              >
                <span className="info-action-btn">
                  <StopOutlined />
                </span>
                <span className="info-action-label">{blockedByMe ? 'Bỏ chặn' : 'Chặn'}</span>
              </button>
            </div>
          ) : null}

          {!isSelf && (blockedByMe || blockedMe) ? (
            <p className="profile-block-note" role="status">
              {blockedByMe
                ? 'Bạn đã chặn người này. Hai bạn không nhắn tin riêng hay gọi cho nhau được.'
                : 'Bạn không thể nhắn tin hay gọi cho người này.'}
            </p>
          ) : null}

          <div className="profile-info-list" style={{ width: '100%' }}>
            {rows.map((row) => (
              <div key={row.key} className="profile-info-row">
                <span className="profile-info-label">{row.label}</span>
                <span className="profile-info-value">{row.value}</span>
              </div>
            ))}
          </div>

          {!isSelf && commonRooms && commonRooms.length > 0 ? (
            <div className="profile-common">
              <button
                type="button"
                className="profile-common-head"
                aria-expanded={showCommon}
                onClick={() => setShowCommon((current) => !current)}
              >
                <TeamOutlined />
                <span>Nhóm chung ({commonRooms.length})</span>
                <DownOutlined className={showCommon ? 'is-open' : ''} />
              </button>
              {showCommon ? (
                <ul className="profile-common-list">
                  {commonRooms.map((room) => (
                    <li key={room.id}>
                      <button
                        type="button"
                        className="profile-common-item"
                        disabled={busy !== null}
                        onClick={() => void openCommonRoom(room.id)}
                      >
                        <UserAvatar size={32} src={room.avatarUrl} name={room.name} zoomable={false} />
                        <span className="profile-common-name">{room.name}</span>
                        <span className="profile-common-count">{room.memberCount} thành viên</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
