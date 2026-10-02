import { CloseOutlined, GifOutlined, SmileOutlined } from '@ant-design/icons';
import { Button, Input, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { api } from './api';

type Tab = 'emoji' | 'sticker' | 'gif';

type GifItem = { id: string; url: string; preview: string };

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😜', '🤗', '😎',
  '🤩', '😇', '🙂', '😉', '😭', '😡', '😱', '😴', '🤔', '🙄',
  '👍', '👎', '👏', '🙏', '💪', '🔥', '✨', '💯', '❤️', '💔',
  '🎉', '🥳', '😅', '😢', '😤', '🤭', '🤫', '😐', '😬', '🤯',
  '👌', '✌️', '🤝', '👋', '🫡', '🌹', '☕', '🍕', '🍺', '✅',
];

const STICKERS = [
  '👍', '👎', '❤️', '😂', '😭', '😡', '😍', '🔥', '🎉', '🙏',
  '👏', '😎', '🤔', '😱', '😴', '💪', '👋', '🤣', '😘', '🤗',
  '🫡', '💯', '✨', '🌹', '🤝', '👌', '🥳', '😤', '😅', '🤩',
];

export function isStickerText(text: string) {
  const value = text.trim();
  if (!value || value.length > 8) {
    return false;
  }
  return /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s\uFE0F\u200D]+$/u.test(value);
}

export function StickerButton({
  disabled,
  onEmoji,
  onSticker,
  onGif,
}: {
  disabled: boolean;
  onEmoji: (emoji: string) => void;
  onSticker: (emoji: string) => void;
  onGif: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticker-wrap">
      <Tooltip title="Emoji / sticker / GIF">
        <Button
          type="text"
          shape="circle"
          size="large"
          className="composer-icon"
          icon={<SmileOutlined />}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
        />
      </Tooltip>
      {open ? (
        <StickerPanel
          onClose={() => setOpen(false)}
          onEmoji={onEmoji}
          onSticker={(emoji) => {
            onSticker(emoji);
            setOpen(false);
          }}
          onGif={(url) => {
            onGif(url);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function StickerPanel({
  onClose,
  onEmoji,
  onSticker,
  onGif,
}: {
  onClose: () => void;
  onEmoji: (emoji: string) => void;
  onSticker: (emoji: string) => void;
  onGif: (url: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('emoji');
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [gifError, setGifError] = useState('');

  useEffect(() => {
    if (tab !== 'gif') {
      return;
    }
    const timer = window.setTimeout(() => {
      void api
        .gifs(query)
        .then((next) => {
          setGifs(next);
          setGifError(next.length ? '' : 'Chưa có GIF. Thêm TENOR_API_KEY trên BE hoặc gửi file GIF từ máy.');
        })
        .catch(() => {
          setGifs([]);
          setGifError('Không tải được GIF.');
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [tab, query]);

  return (
    <div className="sticker-panel">
      <div className="sticker-tabs">
        <button type="button" className={tab === 'emoji' ? 'active' : ''} onClick={() => setTab('emoji')}>
          Emoji
        </button>
        <button type="button" className={tab === 'sticker' ? 'active' : ''} onClick={() => setTab('sticker')}>
          Sticker
        </button>
        <button type="button" className={tab === 'gif' ? 'active' : ''} onClick={() => setTab('gif')}>
          <GifOutlined /> GIF
        </button>
        <button type="button" className="sticker-close" onClick={onClose} aria-label="Đóng">
          <CloseOutlined />
        </button>
      </div>
      {tab === 'emoji' ? (
        <div className="emoji-grid">
          {EMOJIS.map((item) => (
            <button key={item} type="button" onClick={() => onEmoji(item)}>
              {item}
            </button>
          ))}
        </div>
      ) : null}
      {tab === 'sticker' ? (
        <div className="sticker-grid">
          {STICKERS.map((item) => (
            <button key={item} type="button" onClick={() => onSticker(item)}>
              {item}
            </button>
          ))}
        </div>
      ) : null}
      {tab === 'gif' ? (
        <div className="gif-box">
          <Input
            allowClear
            placeholder="Tìm GIF..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {gifs.length ? (
            <div className="gif-grid">
              {gifs.map((item) => (
                <button key={item.id} type="button" onClick={() => onGif(item.url)}>
                  <img src={item.preview} alt="" />
                </button>
              ))}
            </div>
          ) : (
            <p className="gif-empty">{gifError || 'Đang tải...'}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
