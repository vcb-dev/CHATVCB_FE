import type { ChatMessage } from '@/types';

type Props = {
  message: ChatMessage;
  onJump: (id: string, createdAt?: string) => Promise<void>;
};

export function SystemNotice({ message, onJump }: Props) {
  const time = new Date(message.createdAt).toLocaleString('vi-VN');
  const messageId = message.systemData?.messageId;

  return (
    <div id={`msg-${message.id}`} className="system-notice">
      {messageId ? (
        <button
          type="button"
          className="system-notice-link"
          title={time}
          onClick={() => void onJump(messageId)}
        >
          {message.content}
        </button>
      ) : (
        <span title={time}>{message.content}</span>
      )}
    </div>
  );
}
