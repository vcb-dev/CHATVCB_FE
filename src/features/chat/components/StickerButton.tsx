import { CloseOutlined, GifOutlined, SmileOutlined } from '@ant-design/icons';
import { Button, Input, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { EMOJIS } from '../utils/emojis';
import { STICKER_PACK } from '../utils/stickerPack';
import { StickerImage } from './StickerImage';

type Tab = 'emoji' | 'sticker' | 'gif';

type GifItem = { id: string; url: string; preview: string };

const EMPTY_GIFS: GifItem[] = [];

const STICKERS = [
  '👍', '👎', '❤️', '😂', '😭', '😡', '😍', '🔥', '🎉', '🙏',
  '👏', '😎', '🤔', '😱', '😴', '💪', '👋', '🤣', '😘', '🤗',
  '🫡', '💯', '✨', '🌹', '🤝', '👌', '🥳', '😤', '😅', '🤩',
];

export function StickerButton({
  disabled,
  onEmoji,
  onSticker,
  onPackSticker,
  onGif,
}: {
  disabled: boolean;
  onEmoji: (emoji: string) => void;
  onSticker: (emoji: string) => void;
  onPackSticker: (id: string) => void;
  onGif: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticker-wrap">
      <Tooltip title="Emoji / sticker / GIF">
        <Button
          type="text"
          className="composer-tool"
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
          onPackSticker={(id) => {
            onPackSticker(id);
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
  onPackSticker,
  onGif,
}: {
  onClose: () => void;
  onEmoji: (emoji: string) => void;
  onSticker: (emoji: string) => void;
  onPackSticker: (id: string) => void;
  onGif: (url: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('emoji');
  const [query, setQuery] = useState('');
  const gifQuery = useDebouncedValue(query);
  const gifResult = useQuery({
    queryKey: queryKeys.gifs(gifQuery),
    queryFn: () => api.gifs(gifQuery),
    enabled: tab === 'gif',
  });
  const gifs = gifResult.data ?? EMPTY_GIFS;
  const gifError = gifResult.isError
    ? 'Không tải được GIF.'
    : gifResult.data && !gifResult.data.length
      ? 'Không có GIF. Bạn vẫn gửi được file GIF từ máy.'
      : '';

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
        <>
          <div className="sticker-pack-grid">
            {STICKER_PACK.map((item) => (
              <button key={item.id} type="button" title={item.text} onClick={() => onPackSticker(item.id)}>
                <StickerImage id={item.id} />
              </button>
            ))}
          </div>
          <div className="sticker-section-title">Emoji lớn</div>
          <div className="sticker-grid">
            {STICKERS.map((item) => (
              <button key={item} type="button" onClick={() => onSticker(item)}>
                {item}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {tab === 'gif' ? (
        <div className="gif-box">
          <Input
            allowClear
            placeholder="Search KLIPY"
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
