import { CameraOutlined, CopyOutlined, DownloadOutlined, ZoomInOutlined } from '@ant-design/icons';
import { Avatar, Image, message as antMessage, type AvatarProps } from 'antd';
import {
  cloneElement,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { api, fileSrc } from '@/api/client';
import { avatarPalette, initials, type AvatarPalette } from '@/lib/avatar';
import { copyImage } from '@/lib/clipboard';
import { ACCEPT_IMAGES } from '@/lib/image';
import { AvatarCropModal } from './AvatarCropModal';

export type UserAvatarProps = Omit<AvatarProps, 'src'> & {
  src?: string | null;
  name?: string;
  online?: boolean;
  zoomable?: boolean;
  showZoomHint?: boolean;
  framed?: boolean;
  stopPropagation?: boolean;
  zoomTitle?: string;
  onUpload?: (file: File) => void | Promise<void>;
  uploadTitle?: string;
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
};

type PreviewState = {
  src: string;
  name?: string;
  hasPhoto: boolean;
  open: boolean;
};

const SAVE_TOAST_KEY = 'avatar-preview-save';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initialsSvgDataUrl(
  name: string,
  palette: AvatarPalette,
  customBg?: string,
  customFg?: string,
): string {
  const label = escapeXml(initials(name) || '?');
  const from = escapeXml(customBg || palette.from);
  const to = escapeXml(customBg || palette.to);
  const fg = escapeXml(customFg || palette.text);
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">',
    '<defs>',
    '<linearGradient id="av-grad" x1="0%" y1="0%" x2="100%" y2="100%">',
    `<stop offset="0%" stop-color="${from}"/>`,
    `<stop offset="100%" stop-color="${to}"/>`,
    '</linearGradient>',
    '</defs>',
    '<rect width="512" height="512" rx="256" fill="url(#av-grad)"/>',
    '<circle cx="256" cy="256" r="252" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="4"/>',
    `<text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-family="'Be Vietnam Pro',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif" font-size="192" font-weight="700">${label}</text>`,
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function extensionFromMime(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

function buildAvatarFilename(name: string | undefined, mimeType: string): string {
  const ext = extensionFromMime(mimeType);
  const slug = (name ?? '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-');
  return slug ? `avatar-${slug}.${ext}` : `avatar.${ext}`;
}

async function copyAvatar(src: string) {
  try {
    await copyImage(src);
    antMessage.success('Đã sao chép ảnh.');
  } catch {
    antMessage.error('Không sao chép được ảnh.');
  }
}

async function downloadAvatar(src: string, name?: string) {
  void antMessage.loading({ key: SAVE_TOAST_KEY, content: 'Đang tải ảnh...', duration: 0 });
  try {
    const blob = await api.download(src);
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = buildAvatarFilename(name, blob.type);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    antMessage.destroy(SAVE_TOAST_KEY);
  } catch {
    void antMessage.error({ key: SAVE_TOAST_KEY, content: 'Không tải được ảnh.' });
  }
}

function AvatarLightbox({
  preview,
  uploadLabel,
  onTriggerUpload,
  onOpenChange,
  onAfterOpenChange,
}: {
  preview: PreviewState;
  uploadLabel?: string;
  onTriggerUpload?: () => void;
  onOpenChange: (open: boolean) => void;
  onAfterOpenChange: (open: boolean) => void;
}) {
  const items = useMemo(
    () => [{ src: preview.src, alt: preview.name || 'Ảnh đại diện' }],
    [preview.src, preview.name],
  );

  const actionsRender = useCallback(
    (original: ReactElement) => {
      if (!preview.hasPhoto && !onTriggerUpload) {
        return original;
      }
      const { className, children } = original.props as {
        className?: string;
        children?: ReactNode;
      };
      const base = (className ?? '').split(' ')[0] || 'ant-image-preview-actions';
      const actionCls = `${base}-action`;
      const extra: ReactNode[] = [];

      if (preview.hasPhoto) {
        extra.push(
          <button
            key="copy"
            type="button"
            className={`${actionCls} ${actionCls}-copy`}
            aria-label="Sao chép ảnh"
            title="Sao chép ảnh"
            onClick={() => void copyAvatar(preview.src)}
          >
            <CopyOutlined />
          </button>,
          <button
            key="download"
            type="button"
            className={`${actionCls} ${actionCls}-download`}
            aria-label="Tải ảnh xuống"
            title="Tải ảnh xuống"
            onClick={() => void downloadAvatar(preview.src, preview.name)}
          >
            <DownloadOutlined />
          </button>,
        );
      }

      if (onTriggerUpload) {
        const label = uploadLabel ?? 'Đổi ảnh đại diện';
        extra.push(
          <button
            key="upload"
            type="button"
            className={`${actionCls} ${actionCls}-upload`}
            aria-label={label}
            title={label}
            onClick={onTriggerUpload}
          >
            <CameraOutlined />
          </button>,
        );
      }

      return cloneElement(original, undefined, children, ...extra);
    },
    [preview.hasPhoto, preview.src, preview.name, onTriggerUpload, uploadLabel],
  );

  const caption = preview.hasPhoto
    ? preview.name
    : preview.name
      ? `${preview.name} · Chưa đặt ảnh đại diện`
      : 'Chưa đặt ảnh đại diện';

  return (
    <Image.PreviewGroup
      items={items}
      classNames={{ popup: { root: 'avatar-preview-root' } }}
      preview={{
        open: preview.open,
        zIndex: 1200,
        alt: preview.name || 'Ảnh đại diện',
        onOpenChange,
        afterOpenChange: onAfterOpenChange,
        countRender: () => (caption ? <span className="avatar-preview-name">{caption}</span> : null),
        actionsRender,
      }}
    />
  );
}

/** Avatar dùng chung: tự resolve URL, fallback chữ cái đầu gradient, hỗ trợ bấm phóng to và đổi ảnh. */
export function UserAvatar({
  src,
  name,
  online,
  zoomable = true,
  showZoomHint = false,
  framed = false,
  stopPropagation = false,
  zoomTitle,
  onUpload,
  uploadTitle,
  wrapperClassName,
  wrapperStyle,
  icon,
  style,
  alt,
  children,
  onClick,
  onError,
  ...avatarProps
}: UserAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedSrc = src ? fileSrc(src) : undefined;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const activeSrc = resolvedSrc && failedSrc !== resolvedSrc ? resolvedSrc : undefined;
  const hasPhoto = Boolean(activeSrc);
  const canZoom = zoomable && (hasPhoto || Boolean(name && !icon));
  const plain = !canZoom && !onUpload;
  const onlineSize =
    typeof avatarProps.size === 'number'
      ? Math.max(8, Math.min(14, Math.round(avatarProps.size * 0.25)))
      : 12;
  const palette = avatarPalette(name ?? '');

  const customBg =
    (typeof style?.background === 'string' && !style.background.startsWith('var(')
      ? style.background
      : undefined) ||
    (typeof style?.backgroundColor === 'string' && !style.backgroundColor.startsWith('var(')
      ? style.backgroundColor
      : undefined);
  const customFg = typeof style?.color === 'string' ? style.color : undefined;

  const mergedStyle: CSSProperties | undefined =
    !style?.background && !style?.backgroundColor && !icon && name
      ? {
          background: palette.gradient,
          color: palette.text,
          ...style,
        }
      : style;
  const content = children !== undefined ? children : !icon && name ? initials(name) : undefined;

  const avatarNode = (
    <Avatar
      {...avatarProps}
      src={activeSrc}
      icon={icon}
      alt={alt ?? name}
      style={mergedStyle}
      onClick={plain ? onClick : undefined}
      onError={() => {
        if (resolvedSrc) {
          setFailedSrc(resolvedSrc);
        }
        return onError?.() ?? true;
      }}
    >
      {content}
    </Avatar>
  );

  const zoomLabel = zoomTitle ?? 'Xem ảnh đại diện';
  const uploadLabel = uploadTitle ?? 'Đổi ảnh đại diện';

  const trigger = canZoom ? (
    <button
      type="button"
      className="ua-trigger"
      title={zoomLabel}
      aria-label={name ? `${zoomLabel} của ${name}` : zoomLabel}
      onClick={(event) => {
        if (stopPropagation) {
          event.stopPropagation();
        }
        onClick?.(event);
        const previewSrc = activeSrc ?? initialsSvgDataUrl(name ?? '', palette, customBg, customFg);
        setPreview({
          src: previewSrc,
          name: name?.trim() || undefined,
          hasPhoto,
          open: true,
        });
      }}
    >
      {avatarNode}
      {showZoomHint ? (
        <span className="ua-hint" aria-hidden="true">
          <ZoomInOutlined />
        </span>
      ) : null}
    </button>
  ) : onUpload ? (
    <button
      type="button"
      className="ua-trigger is-upload-only"
      title={uploadLabel}
      aria-label={uploadLabel}
      onClick={(event) => {
        if (stopPropagation) {
          event.stopPropagation();
        }
        onClick?.(event);
        inputRef.current?.click();
      }}
    >
      {avatarNode}
      {showZoomHint ? (
        <span className="ua-hint" aria-hidden="true">
          <CameraOutlined />
        </span>
      ) : null}
    </button>
  ) : (
    avatarNode
  );

  const wrapClass = ['ua-wrap', framed ? 'is-framed' : '', wrapperClassName]
    .filter(Boolean)
    .join(' ');

  const uploadInput = onUpload ? (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT_IMAGES}
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
          return;
        }
        // GIF cắt qua canvas sẽ mất chuyển động nên tải thẳng; ảnh khác cho căn/zoom trước
        if (file.type === 'image/gif') {
          void onUpload(file);
        } else {
          // chọn từ màn xem ảnh lớn thì đóng nó, không thì modal cắt nằm dưới lớp xem ảnh
          setPreview((current) => (current ? { ...current, open: false } : null));
          setCropFile(file);
        }
      }}
    />
  ) : null;

  const body =
    onUpload || framed || online !== undefined || wrapperClassName || wrapperStyle ? (
      <span className={wrapClass} style={wrapperStyle}>
        {trigger}
        {online ? (
          <span
            className="ua-online"
            title="Đang online"
            style={{ width: onlineSize, height: onlineSize }}
          />
        ) : null}
        {onUpload ? (
          <button
            type="button"
            className="ua-cam"
            title={uploadLabel}
            aria-label={uploadLabel}
            onClick={(event) => {
              if (stopPropagation) {
                event.stopPropagation();
              }
              inputRef.current?.click();
            }}
          >
            <CameraOutlined />
          </button>
        ) : null}
        {uploadInput}
      </span>
    ) : (
      <>
        {trigger}
        {uploadInput}
      </>
    );

  return (
    <>
      {body}
      {onUpload ? (
        <AvatarCropModal
          file={cropFile}
          title={uploadLabel}
          onCancel={() => setCropFile(null)}
          onDone={(cropped) => {
            setCropFile(null);
            void onUpload(cropped);
          }}
        />
      ) : null}
      {preview ? (
        <AvatarLightbox
          preview={{
            ...preview,
            src: activeSrc ?? preview.src,
            hasPhoto: Boolean(activeSrc),
          }}
          uploadLabel={uploadLabel}
          onTriggerUpload={onUpload ? () => inputRef.current?.click() : undefined}
          onOpenChange={(open) =>
            setPreview((current) => (current ? { ...current, open } : null))
          }
          onAfterOpenChange={(open) => {
            if (!open) {
              setPreview((current) => (current && !current.open ? null : current));
            }
          }}
        />
      ) : null}
    </>
  );
}
