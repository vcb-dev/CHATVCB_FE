type Props = {
  visible: boolean;
};

export function DropOverlay({ visible }: Props) {
  if (!visible) return null;
  return (
    <div className="drop-overlay">
      <span>Thả để gửi</span>
    </div>
  );
}
