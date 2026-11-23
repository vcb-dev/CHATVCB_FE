import { RobotOutlined, TeamOutlined } from '@ant-design/icons';
import { UserAvatar } from '@/components/UserAvatar';
import type { MentionKind, MentionPerson } from '../utils/mentions';

/** Một dòng trong popup @: avatar người (hoặc biểu tượng @all / AI) + tên. */
export function MentionOption(props: { label: string; kind: MentionKind; person?: MentionPerson }) {
  const { kind, person } = props;
  return (
    <span className="mention-option">
      {kind === 'person' ? (
        <UserAvatar
          size={28}
          src={person?.avatarUrl}
          name={person?.name || props.label}
          zoomable={false}
        />
      ) : (
        <UserAvatar
          size={28}
          className={`mention-option-ico is-${kind}`}
          icon={kind === 'all' ? <TeamOutlined /> : <RobotOutlined />}
          zoomable={false}
        />
      )}
      <span className="mention-option-label">{props.label}</span>
    </span>
  );
}
