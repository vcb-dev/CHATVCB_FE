import { SearchOutlined } from '@ant-design/icons';
import { Checkbox, Input } from 'antd';
import { EmptyState } from './EmptyState';
import { UserAvatar } from './UserAvatar';

export type PickTarget = {
  key: string;
  name: string;
  avatarUrl?: string;
};

export function ConversationPicker(props: {
  items: PickTarget[];
  selected: string[];
  max: number;
  disabled?: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onToggle: (item: PickTarget, checked: boolean) => void;
  emptyText?: string;
}) {
  return (
    <>
      <Input
        placeholder="Tìm cuộc trò chuyện"
        allowClear
        prefix={<SearchOutlined />}
        value={props.query}
        onChange={(event) => props.onQueryChange(event.target.value)}
      />
      <div className="forward-count">
        Đã chọn {props.selected.length}/{props.max}
      </div>
      <div className="forward-list">
        {props.items.length > 0 ? (
          props.items.map((item) => {
            const checked = props.selected.includes(item.key);
            const rowDisabled =
              props.disabled || (!checked && props.selected.length >= props.max);
            return (
              <Checkbox
                key={item.key}
                className="forward-row"
                checked={checked}
                disabled={rowDisabled}
                onChange={(event) => props.onToggle(item, event.target.checked)}
              >
                <UserAvatar
                  size={36}
                  className="avatar-initials"
                  src={item.avatarUrl}
                  name={item.name}
                  zoomable={false}
                />
                <span>{item.name}</span>
              </Checkbox>
            );
          })
        ) : (
          <EmptyState
            compact
            title={props.emptyText ?? 'Không có cuộc trò chuyện phù hợp'}
          />
        )}
      </div>
    </>
  );
}
