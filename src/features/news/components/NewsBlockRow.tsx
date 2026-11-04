import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import type { NewsImage } from '@/types';
import type { EditorBlock } from '../hooks/useNewsEditor';

const LABELS = { paragraph: 'Đoạn văn', heading: 'Tiêu đề phụ', image: 'Ảnh' };

export function NewsBlockRow(props: {
  block: EditorBlock;
  image: NewsImage | undefined;
  isFirst: boolean;
  isLast: boolean;
  onChange: (key: string, patch: { text?: string; caption?: string }) => void;
  onMove: (key: string, step: -1 | 1) => void;
  onRemove: (key: string) => void;
}) {
  const { block } = props;
  return (
    <div className="news-block-row">
      <div className="news-block-head">
        <span>{LABELS[block.type]}</span>
        <span className="news-block-tools">
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            aria-label="Lên"
            disabled={props.isFirst}
            onClick={() => props.onMove(block.key, -1)}
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            aria-label="Xuống"
            disabled={props.isLast}
            onClick={() => props.onMove(block.key, 1)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            aria-label="Xóa khối"
            onClick={() => props.onRemove(block.key)}
          />
        </span>
      </div>
      {block.type === 'paragraph' ? (
        <Input.TextArea
          value={block.text}
          maxLength={10000}
          autoSize={{ minRows: 3 }}
          placeholder="Nội dung đoạn văn"
          onChange={(event) => props.onChange(block.key, { text: event.target.value })}
        />
      ) : null}
      {block.type === 'heading' ? (
        <Input
          className="news-block-heading"
          value={block.text}
          maxLength={200}
          placeholder="Tiêu đề phụ"
          onChange={(event) => props.onChange(block.key, { text: event.target.value })}
        />
      ) : null}
      {block.type === 'image' ? (
        <div className="news-block-image">
          {props.image ? <img src={props.image.thumbUrl} alt="" /> : null}
          <Input
            className="news-block-caption"
            value={block.caption}
            maxLength={300}
            placeholder="Chú thích ảnh"
            onChange={(event) => props.onChange(block.key, { caption: event.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}
