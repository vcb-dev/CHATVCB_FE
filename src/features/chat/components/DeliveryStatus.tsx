import type { Delivery } from '../utils/seen';

export function DeliveryStatus({ status }: { status: Delivery }) {
  return <span className="delivery-status">{status === 'delivered' ? 'Đã nhận' : 'Đã gửi'}</span>;
}
