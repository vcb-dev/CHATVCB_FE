import { Modal } from "antd";
import type { AdminRole } from "./types";

export function confirmDeleteRole(
  role: AdminRole,
  onOk: () => Promise<void>,
): void {
  const blocked = role.userCount > 0;
  Modal.confirm({
    title: `Xóa role «${role.name}»?`,
    content: blocked
      ? `Role đang gán cho ${role.userCount} tài khoản. Gỡ role khỏi họ (tab Tài khoản) rồi xóa lại.`
      : "Role tùy chỉnh sẽ bị xóa vĩnh viễn.",
    okText: "Xóa",
    cancelText: "Hủy",
    okType: "danger",
    okButtonProps: { disabled: blocked },
    onOk,
  });
}
