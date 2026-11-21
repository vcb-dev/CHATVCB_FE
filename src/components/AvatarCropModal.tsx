import { RotateRightOutlined, UndoOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { Button, Modal, Slider, Tooltip, message } from 'antd';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  INITIAL_VIEW,
  MAX_ZOOM,
  coverScale,
  moveView,
  renderCrop,
  rotateView,
  zoomAt,
  type CropView,
  type Size,
} from '@/lib/avatarCrop';

/** Cạnh khung cắt trên màn hình (px). */
const STAGE = 280;
/** Cạnh lớn nhất của ảnh xuất ra; nơi gọi còn nén thêm (compressImage 800). */
const OUTPUT_MAX = 800;
const ZOOM_STEP = 0.25;
const KEY_STEP = 10;

type Drag = { pointerId: number; x: number; y: number };

/** Chọn ảnh xong thì cho kéo để căn, phóng to/thu nhỏ, xoay rồi mới lưu (ảnh tròn). */
export function AvatarCropModal({
  file,
  title,
  onCancel,
  onDone,
}: {
  file: File | null;
  title: string;
  onCancel: () => void;
  onDone: (file: File) => void;
}) {
  const [url, setUrl] = useState('');
  const [image, setImage] = useState<Size | null>(null);
  const [view, setView] = useState<CropView>(INITIAL_VIEW);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);

  useEffect(() => {
    if (!file) {
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    setImage(null);
    setView(INITIAL_VIEW);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  // Lăn chuột để zoom: React gắn wheel dạng passive nên phải tự gắn để chặn cuộn trang.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !image) {
      return;
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const box = stage!.getBoundingClientRect();
      const at = { x: event.clientX - box.left - STAGE / 2, y: event.clientY - box.top - STAGE / 2 };
      setView((current) =>
        zoomAt(current, current.zoom * Math.exp(-event.deltaY * 0.0015), at, image!, STAGE),
      );
    }
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [image]);

  const center = { x: 0, y: 0 };

  function zoomTo(zoom: number) {
    if (image) {
      setView((current) => zoomAt(current, zoom, center, image, STAGE));
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!image || event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !image) {
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    setView((current) => moveView(current, dx, dy, image, STAGE));
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!image) {
      return;
    }
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setView((current) => moveView(current, move[0], move[1], image, STAGE));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomTo(view.zoom + ZOOM_STEP);
    } else if (event.key === '-') {
      event.preventDefault();
      zoomTo(view.zoom - ZOOM_STEP);
    }
  }

  async function save() {
    const img = imgRef.current;
    if (!file || !img || !image) {
      return;
    }
    setSaving(true);
    try {
      // PNG giữ nền trong suốt; còn lại xuất JPEG
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const name = file.name.replace(/\.\w+$/, '') + (type === 'image/png' ? '.png' : '.jpg');
      const cropped = await renderCrop(img, image, view, STAGE, { max: OUTPUT_MAX, type, name });
      if (!cropped) {
        message.error('Không cắt được ảnh này.');
        return;
      }
      onDone(cropped);
    } finally {
      setSaving(false);
    }
  }

  const scale = image ? coverScale(image, STAGE) * view.zoom : 1;

  return (
    <Modal
      open={Boolean(file)}
      title={title}
      width={STAGE + 48}
      centered
      destroyOnHidden
      okText="Lưu ảnh"
      cancelText="Hủy"
      onOk={() => void save()}
      onCancel={onCancel}
      okButtonProps={{ disabled: !image }}
      confirmLoading={saving}
    >
      <div
        ref={stageRef}
        className="avatar-crop-stage"
        style={{ width: STAGE, height: STAGE }}
        tabIndex={0}
        role="application"
        aria-label="Kéo để căn ảnh, phím mũi tên để dịch, + và - để phóng to thu nhỏ"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      >
        {url ? (
          <img
            ref={imgRef}
            src={url}
            alt=""
            draggable={false}
            className="avatar-crop-img"
            onLoad={(event) =>
              setImage({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            onError={() => message.error('Không đọc được ảnh này.')}
            style={
              image
                ? {
                    width: image.width * scale,
                    height: image.height * scale,
                    transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) rotate(${view.rotate}deg)`,
                  }
                : { visibility: 'hidden' }
            }
          />
        ) : null}
        <div className="avatar-crop-ring" aria-hidden="true" />
      </div>
      <div className="avatar-crop-tools">
        <Tooltip title="Thu nhỏ">
          <Button
            type="text"
            icon={<ZoomOutOutlined />}
            aria-label="Thu nhỏ"
            disabled={!image || view.zoom <= 1}
            onClick={() => zoomTo(view.zoom - ZOOM_STEP)}
          />
        </Tooltip>
        <Slider
          className="avatar-crop-zoom"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          disabled={!image}
          tooltip={{ formatter: (value) => `${Math.round((value ?? 1) * 100)}%` }}
          onChange={zoomTo}
          aria-label="Mức phóng to"
        />
        <Tooltip title="Phóng to">
          <Button
            type="text"
            icon={<ZoomInOutlined />}
            aria-label="Phóng to"
            disabled={!image || view.zoom >= MAX_ZOOM}
            onClick={() => zoomTo(view.zoom + ZOOM_STEP)}
          />
        </Tooltip>
        <Tooltip title="Xoay 90°">
          <Button
            type="text"
            icon={<RotateRightOutlined />}
            aria-label="Xoay 90°"
            disabled={!image}
            onClick={() => image && setView((current) => rotateView(current, image, STAGE))}
          />
        </Tooltip>
        <Tooltip title="Đặt lại">
          <Button
            type="text"
            icon={<UndoOutlined />}
            aria-label="Đặt lại"
            disabled={!image}
            onClick={() => setView(INITIAL_VIEW)}
          />
        </Tooltip>
      </div>
      <p className="avatar-crop-hint">Kéo ảnh để căn, lăn chuột hoặc kéo thanh để phóng to.</p>
    </Modal>
  );
}
