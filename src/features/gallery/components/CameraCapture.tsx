import { Alert, Button, Modal } from 'antd';
import { useEffect, useRef, useState } from 'react';

function cameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Chưa cấp quyền camera. Hãy cấp quyền rồi thử lại, hoặc chọn ảnh từ máy.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Không tìm thấy camera. Hãy chọn ảnh từ máy.';
  }
  return 'Không mở được camera. Hãy thử lại, hoặc chọn ảnh từ máy.';
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function CameraCapture(props: {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
}) {
  const { open, onClose, onCapture } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState('');

  // Cờ `cancelled` để stream về sau khi đã đóng vẫn bị tắt, đèn camera không sáng mãi
  useEffect(() => {
    if (!open || shot) {
      return;
    }
    let cancelled = false;
    let active: MediaStream | null = null;
    setError('');
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) {
      setError('Không tìm thấy camera. Hãy chọn ảnh từ máy.');
      return;
    }
    media
      .getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
        audio: false,
      })
      .then((next) => {
        if (cancelled) {
          stopStream(next);
          return;
        }
        active = next;
        setStream(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(cameraError(err));
        }
      });
    return () => {
      cancelled = true;
      stopStream(active);
      setStream(null);
    };
  }, [open, shot]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!open) {
      setShot(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (shot) {
        URL.revokeObjectURL(shot.url);
      }
    };
  }, [shot]);

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setShot({ blob, url: URL.createObjectURL(blob) });
        }
      },
      'image/jpeg',
      0.9,
    );
  }

  return (
    <Modal
      open={open}
      title="Chụp ảnh"
      wrapClassName="gallery-camera-modal"
      width={720}
      destroyOnHidden
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        ...(shot
          ? [
              <Button key="retake" onClick={() => setShot(null)}>
                Chụp lại
              </Button>,
              <Button
                key="use"
                type="primary"
                onClick={() => {
                  onCapture(shot.blob);
                  onClose();
                }}
              >
                Dùng ảnh
              </Button>,
            ]
          : [
              <Button key="shoot" type="primary" disabled={!stream} onClick={capture}>
                Chụp
              </Button>,
            ]),
      ]}
    >
      <div className="gallery-camera">
        {error ? <Alert type="warning" showIcon title={error} /> : null}
        {shot ? (
          <img src={shot.url} alt="Ảnh vừa chụp" />
        ) : error ? null : (
          <video ref={videoRef} autoPlay muted playsInline />
        )}
      </div>
    </Modal>
  );
}
