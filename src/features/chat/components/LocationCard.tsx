import { EnvironmentOutlined } from '@ant-design/icons';
import { formatCoords, mapUrl } from '../utils/location';

export function LocationCard({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  return (
    <div className="location-card">
      <EnvironmentOutlined className="location-pin" />
      <div className="location-info">
        <strong>{label || 'Vị trí được chia sẻ'}</strong>
        <span>{formatCoords(lat, lng)}</span>
        <a
          href={mapUrl(lat, lng)}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          Mở bản đồ
        </a>
      </div>
    </div>
  );
}
