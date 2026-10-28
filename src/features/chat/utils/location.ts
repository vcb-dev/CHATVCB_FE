function roundCoord(value: number) {
  return Math.round(value * 1e5) / 1e5;
}

export function formatCoords(lat: number, lng: number): string {
  return `${roundCoord(lat).toFixed(5)}, ${roundCoord(lng).toFixed(5)}`;
}

/** Cùng dạng với câu dự phòng BE lưu ở `content` của tin vị trí. */
export function mapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${roundCoord(lat)},${roundCoord(lng)}`;
}

export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Thiết bị không hỗ trợ định vị.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: roundCoord(position.coords.latitude),
          lng: roundCoord(position.coords.longitude),
        }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? 'Bạn chưa cho phép truy cập vị trí.'
              : 'Không lấy được vị trí, thử lại sau.',
          ),
        ),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
