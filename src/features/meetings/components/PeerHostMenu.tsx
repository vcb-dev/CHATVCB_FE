import { MoreOutlined } from '@ant-design/icons';
import { Dropdown, Modal, type MenuProps } from 'antd';
import type { MeetingPeer } from '@/types';

type Props = {
  peer: MeetingPeer;
  className?: string;
  onMute: (peer: MeetingPeer) => void;
  onKick: (peer: MeetingPeer) => void;
};

/** Menu "⋯" chỉ chủ phòng thấy: tắt mic / mời ra khỏi cuộc họp. */
export function PeerHostMenu({ peer, className, onMute, onKick }: Props) {
  const items: MenuProps['items'] = [
    {
      key: 'mute',
      label: peer.micOn ? 'Tắt mic' : 'Mic đang tắt',
      disabled: !peer.micOn,
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        onMute(peer);
      },
    },
    {
      key: 'kick',
      danger: true,
      label: 'Mời ra khỏi cuộc họp',
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        Modal.confirm({
          title: `Mời ${peer.name} ra khỏi cuộc họp?`,
          content: 'Người này sẽ không vào lại được cho tới khi cuộc họp kết thúc.',
          okText: 'Mời ra',
          okButtonProps: { danger: true },
          cancelText: 'Huỷ',
          onOk: () => onKick(peer),
        });
      },
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <button
        type="button"
        className={className ?? 'meet-peer-more'}
        title="Thao tác của chủ phòng"
        aria-label={`Thao tác với ${peer.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreOutlined />
      </button>
    </Dropdown>
  );
}
