export type DropOverlayProps = {
  visible: boolean;
};

export function DropOverlay({ visible }: DropOverlayProps) {
  if (!visible) return null;
  return (
    <div className="drop-overlay">
      <span>Thả để gửi</span>
    </div>
  );
}
