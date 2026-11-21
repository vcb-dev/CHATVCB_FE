/**
 * Cắt ảnh đại diện: ảnh phủ kín khung vuông `stage`, kéo (x, y = độ lệch tâm ảnh so với tâm khung,
 * tính bằng px trên màn hình), phóng to `zoom` và xoay từng 90°.
 * Màn hình (CSS) và lúc xuất (canvas) dùng cùng phép biến đổi nên thấy gì lưu nấy.
 */
export type Size = { width: number; height: number };

export type Rotation = 0 | 90 | 180 | 270;

export type CropView = { zoom: number; x: number; y: number; rotate: Rotation };

export const MAX_ZOOM = 4;

export const INITIAL_VIEW: CropView = { zoom: 1, x: 0, y: 0, rotate: 0 };

function turned(image: Size, rotate: Rotation): Size {
  return rotate % 180 === 0 ? image : { width: image.height, height: image.width };
}

/** Tỉ lệ ở zoom 1: cạnh ngắn của ảnh vừa bằng khung. */
export function coverScale(image: Size, stage: number) {
  return stage / Math.min(image.width, image.height);
}

function within(value: number, limit: number) {
  return Math.min(limit, Math.max(-limit, value)) || 0;
}

/** Giữ ảnh luôn phủ kín khung, không kéo lộ khoảng trống. */
export function clampView(view: CropView, image: Size, stage: number): CropView {
  const { width, height } = turned(image, view.rotate);
  const scale = coverScale(image, stage) * view.zoom;
  return {
    ...view,
    x: within(view.x, Math.max(0, (width * scale - stage) / 2)),
    y: within(view.y, Math.max(0, (height * scale - stage) / 2)),
  };
}

/** Đổi zoom mà điểm `at` (so với tâm khung) đứng yên, như lăn chuột ở đâu phóng to ở đó. */
export function zoomAt(
  view: CropView,
  zoom: number,
  at: { x: number; y: number },
  image: Size,
  stage: number,
): CropView {
  const next = Math.min(MAX_ZOOM, Math.max(1, zoom));
  const ratio = next / view.zoom;
  return clampView(
    { ...view, zoom: next, x: at.x - (at.x - view.x) * ratio, y: at.y - (at.y - view.y) * ratio },
    image,
    stage,
  );
}

export function moveView(view: CropView, dx: number, dy: number, image: Size, stage: number) {
  return clampView({ ...view, x: view.x + dx, y: view.y + dy }, image, stage);
}

/** Xoay 90° theo chiều kim đồng hồ quanh tâm khung (phần đang ở giữa vẫn ở giữa). */
export function rotateView(view: CropView, image: Size, stage: number): CropView {
  const rotate = ((view.rotate + 90) % 360) as Rotation;
  return clampView({ ...view, rotate, x: -view.y, y: view.x }, image, stage);
}

/** Cạnh ảnh xuất ra: số px ảnh gốc nằm trong khung, tối đa `max` (không phóng ảnh nhỏ lên). */
export function outputSize(view: CropView, image: Size, stage: number, max: number) {
  const source = stage / (coverScale(image, stage) * view.zoom);
  return Math.max(1, Math.round(Math.min(max, source)));
}

/** Vẽ phần ảnh trong khung ra canvas vuông rồi xuất thành tệp. */
export function renderCrop(
  img: CanvasImageSource,
  image: Size,
  view: CropView,
  stage: number,
  options: { max: number; type: string; name: string },
) {
  const size = outputSize(view, image, stage, options.max);
  const ratio = size / stage;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.resolve(null);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(size / 2 + view.x * ratio, size / 2 + view.y * ratio);
  ctx.rotate((view.rotate * Math.PI) / 180);
  const scale = coverScale(image, stage) * view.zoom * ratio;
  ctx.scale(scale, scale);
  ctx.drawImage(img, -image.width / 2, -image.height / 2, image.width, image.height);
  return new Promise<File | null>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ? new File([blob], options.name, { type: options.type }) : null),
      options.type,
      0.92,
    );
  });
}
