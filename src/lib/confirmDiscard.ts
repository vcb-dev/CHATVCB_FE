import { Modal } from 'antd';

export function confirmDiscard(onOk: () => void | Promise<void>): void {
  Modal.confirm({
    title: 'Bỏ thay đổi chưa lưu?',
    okText: 'Bỏ thay đổi',
    okButtonProps: { danger: true },
    cancelText: 'Ở lại',
    onOk,
  });
}
