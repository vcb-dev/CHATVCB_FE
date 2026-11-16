import { MenuOutlined } from '@ant-design/icons';
import { useAppMenu } from '@/lib/appMenu';

export function MenuButton() {
  const menu = useAppMenu();
  if (!menu) {
    return null;
  }

  return (
    <button
      type="button"
      className="menu-btn"
      aria-label="Mở menu"
      onClick={menu.open}
    >
      <MenuOutlined />
      {menu.hasBadge ? <span className="menu-btn-dot" aria-hidden="true" /> : null}
    </button>
  );
}
