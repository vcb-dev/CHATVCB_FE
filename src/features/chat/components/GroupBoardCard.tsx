import { PlusOutlined, RightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState, type ReactNode } from 'react';

export function GroupBoardCard(props: {
  icon: ReactNode;
  title: string;
  countLabel: string;
  emptyText: string;
  hasItems: boolean;
  onCreate: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="group-card">
      <div className="board-head">
        <button type="button" className="group-row board-toggle" onClick={() => setOpen(!open)}>
          <span className="group-ico">{props.icon}</span>
          <span className="group-row-text">
            <strong>{props.title}</strong>
            <small>{props.countLabel}</small>
          </span>
          <RightOutlined className={open ? 'chev open' : 'chev'} />
        </button>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          style={{ marginLeft: 8 }}
          onClick={(e) => {
            e.stopPropagation();
            props.onCreate();
          }}
        >
          Tạo
        </Button>
      </div>

      {open ? (
        props.hasItems ? (
          <div className="group-board-list board-list">{props.children}</div>
        ) : (
          <div className="board-empty">{props.emptyText}</div>
        )
      ) : null}
    </div>
  );
}
