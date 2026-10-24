import { LockOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Avatar,
  Button,
  Checkbox,
  Input,
  Modal,
  Popover,
  Radio,
  Space,
  Typography,
  message as antMessage,
} from 'antd';
import { useState } from 'react';
import { api } from '@/api/client';
import type { ChatMessage } from '@/types';
import { formatTimeDayMonth } from '../utils/datetime';

const { Text } = Typography;

export function PollCard({
  message,
  userId,
  canManage,
  onUpdated,
}: {
  message: ChatMessage;
  userId: string;
  canManage: boolean;
  onUpdated: (m: ChatMessage) => void;
}) {
  const poll = message.poll;
  const [newOptionText, setNewOptionText] = useState('');
  const [addingOption, setAddingOption] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [voting, setVoting] = useState(false);

  if (!poll) {
    return null;
  }

  const myIds = poll.options
    .filter((o) => o.voterIds.includes(userId))
    .map((o) => o.id);

  const canAddOption =
    !poll.closed &&
    poll.options.length < 20 &&
    (poll.allowAddOptions || poll.creatorId === userId || canManage);

  const canClosePoll =
    !poll.closed && (poll.creatorId === userId || canManage);

  const handleVote = async (optId: string) => {
    if (poll.closed || voting) {
      return;
    }
    let nextIds: string[];
    if (poll.multiple) {
      nextIds = myIds.includes(optId)
        ? myIds.filter((id) => id !== optId)
        : [...myIds, optId];
    } else {
      nextIds = myIds.includes(optId) ? [] : [optId];
    }

    setVoting(true);
    try {
      const next = await api.votePoll(message.roomId, poll.id, nextIds);
      onUpdated(next);
    } catch (err: any) {
      void antMessage.error(err.message || 'Bình chọn thất bại.');
    } finally {
      setVoting(false);
    }
  };

  const handleAddOption = async () => {
    const text = newOptionText.trim();
    if (!text || addingOption) {
      return;
    }
    setAddingOption(true);
    try {
      const next = await api.addPollOption(message.roomId, poll.id, text);
      onUpdated(next);
      setNewOptionText('');
      setShowAddInput(false);
    } catch (err: any) {
      void antMessage.error(err.message || 'Thêm phương án thất bại.');
    } finally {
      setAddingOption(false);
    }
  };

  const handleConfirmClose = () => {
    Modal.confirm({
      title: 'Khóa bình chọn?',
      content: 'Sau khi khóa, không ai bình chọn được nữa.',
      okText: 'Khóa bình chọn',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const next = await api.closePoll(message.roomId, poll.id);
          onUpdated(next);
        } catch (err: any) {
          void antMessage.error(err.message || 'Khóa bình chọn thất bại.');
        }
      },
    });
  };

  const maxVoters = Math.max(poll.totalVoters, 1);

  return (
    <div
      className={`poll-card${poll.closed ? ' poll-closed' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="poll-header">
        <strong className="poll-question">{poll.question}</strong>
        <div className="poll-sub">
          {poll.multiple ? 'Chọn nhiều phương án' : 'Chọn một phương án'}
        </div>
      </div>

      <div className="poll-options">
        {poll.options.map((opt) => {
          const isMine = myIds.includes(opt.id);
          const percent = (opt.count / maxVoters) * 100;
          const votersPopover = (
            <div style={{ maxWidth: 220, maxHeight: 180, overflowY: 'auto' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Người đã bình chọn ({opt.count}):
              </div>
              {opt.voters.length === 0 ? (
                <div>Chưa có ai</div>
              ) : (
                opt.voters.map((v) => (
                  <div key={v.id} style={{ fontSize: 12, padding: '2px 0' }}>
                    {v.name}
                  </div>
                ))
              )}
            </div>
          );

          return (
            <div
              key={opt.id}
              className={`poll-option${isMine ? ' mine' : ''}`}
              onClick={() => void handleVote(opt.id)}
            >
              <div
                className="poll-bar"
                style={{ width: `${percent}%` }}
              />
              <div className="poll-option-content">
                <div className="poll-option-left">
                  {poll.multiple ? (
                    <Checkbox
                      checked={isMine}
                      disabled={poll.closed}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => void handleVote(opt.id)}
                    />
                  ) : (
                    <Radio
                      checked={isMine}
                      disabled={poll.closed}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleVote(opt.id);
                      }}
                    />
                  )}
                  <span className="poll-option-text">{opt.text}</span>
                </div>

                <div className="poll-option-right">
                  {opt.voters.length > 0 ? (
                    <Avatar.Group
                      maxCount={3}
                      size={20}
                      className="poll-voter-avatars"
                    >
                      {opt.voters.map((v) => (
                        <Avatar
                          key={v.id}
                          src={v.avatarUrl || undefined}
                          size={20}
                        >
                          {v.name.slice(0, 1)}
                        </Avatar>
                      ))}
                    </Avatar.Group>
                  ) : null}

                  <Popover
                    content={votersPopover}
                    trigger="hover"
                    placement="top"
                  >
                    <span
                      className="poll-count"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {opt.count}
                    </span>
                  </Popover>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canAddOption ? (
        <div className="poll-add-section">
          {showAddInput ? (
            <Space.Compact orientation="horizontal" style={{ width: '100%' }}>
              <Input
                placeholder="Nhập phương án mới..."
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                maxLength={100}
                onPressEnter={() => void handleAddOption()}
                autoFocus
              />
              <Button
                type="primary"
                loading={addingOption}
                disabled={!newOptionText.trim()}
                onClick={() => void handleAddOption()}
              >
                Thêm
              </Button>
              <Button onClick={() => setShowAddInput(false)}>Hủy</Button>
            </Space.Compact>
          ) : (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => setShowAddInput(true)}
              style={{ width: '100%' }}
            >
              Thêm phương án
            </Button>
          )}
        </div>
      ) : null}

      <div className="poll-foot">
        <span className="poll-stats">
          {poll.totalVoters} người đã bình chọn
          {poll.closed ? (
            <> · <span style={{ color: '#fa8c16' }}>Đã kết thúc</span></>
          ) : poll.closesAt ? (
            <> · Hết hạn {formatTimeDayMonth(poll.closesAt)}</>
          ) : null}
        </span>

        {canClosePoll ? (
          <Button
            type="link"
            size="small"
            icon={<LockOutlined />}
            onClick={handleConfirmClose}
            style={{ padding: 0, height: 'auto', fontSize: 12 }}
          >
            Khóa
          </Button>
        ) : null}
      </div>
    </div>
  );
}
