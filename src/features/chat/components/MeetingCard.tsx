import { VideoCameraOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { openMeetTab } from '@/features/meetings/meet';

type Props = {
  code: string;
  title: string;
};

export function MeetingCard({ code, title }: Props) {
  return (
    <div className="rich-meeting-card">
      <div className="rich-meeting-head">
        <span className="rich-meeting-ico">
          <VideoCameraOutlined />
        </span>
        <div className="rich-meeting-meta">
          <strong>{title}</strong>
          <small>Mã họp: {code}</small>
        </div>
      </div>
      <Button
        type="primary"
        size="small"
        block
        icon={<VideoCameraOutlined />}
        onClick={() => openMeetTab(code)}
      >
        Tham gia
      </Button>
    </div>
  );
}

