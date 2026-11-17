import { Segmented, Tag } from 'antd';
import type { ChatDocType } from '@/types';

export type ChatDocRoom = { id: string; title: string };

type TypeValue = ChatDocType | 'all';

const TYPE_OPTIONS: { value: TypeValue; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word' },
  { value: 'excel', label: 'Excel' },
  { value: 'slide', label: 'PowerPoint' },
  { value: 'archive', label: 'Tệp nén' },
  { value: 'other', label: 'Khác' },
];

export function ChatFilesFilters(props: {
  type: ChatDocType | null;
  onTypeChange: (type: ChatDocType | null) => void;
  room: ChatDocRoom | null;
  onClearRoom: () => void;
}) {
  return (
    <div className="chat-docs-filters">
      <Segmented<TypeValue>
        value={props.type ?? 'all'}
        options={TYPE_OPTIONS}
        onChange={(value) => props.onTypeChange(value === 'all' ? null : value)}
      />
      {props.room ? (
        <Tag
          closable
          className="chat-docs-room-tag"
          onClose={(event) => {
            // Tag tự ẩn khi đóng; để state cha quyết định hiển thị
            event.preventDefault();
            props.onClearRoom();
          }}
        >
          Hội thoại: {props.room.title}
        </Tag>
      ) : null}
    </div>
  );
}
