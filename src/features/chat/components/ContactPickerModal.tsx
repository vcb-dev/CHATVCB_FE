import { Modal } from 'antd';
import { UserPicker } from './UserPicker';

export function ContactPickerModal(props: {
  open: boolean;
  currentUserId: string;
  onClose: () => void;
  onPick: (userId: string) => void;
}) {
  return (
    <Modal title="Gửi danh thiếp" open={props.open} onCancel={props.onClose} footer={null} destroyOnHidden>
      <UserPicker
        mode="single"
        exclude={[props.currentUserId]}
        onPick={(user) => {
          props.onClose();
          props.onPick(user.id);
        }}
      />
    </Modal>
  );
}
