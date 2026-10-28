import { Button } from 'antd';

export function SelectionBar(props: {
  count: number;
  onForward: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const none = props.count === 0;
  return (
    <div className="selection-bar">
      <span className="selection-count">Đã chọn {props.count}</span>
      <Button type="primary" disabled={none} onClick={props.onForward}>
        Chuyển tiếp
      </Button>
      <Button danger disabled={none} onClick={props.onDelete}>
        Xóa
      </Button>
      <Button onClick={props.onCancel}>Hủy</Button>
    </div>
  );
}
