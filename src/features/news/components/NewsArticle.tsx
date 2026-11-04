import { Image } from 'antd';
import { textParts } from '@/features/chat/utils/format';
import type { NewsBlock, NewsCard, NewsImage } from '@/types';

export function newsDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('vi-VN') : 'Nháp';
}

function NewsText({ text }: { text: string }) {
  return (
    <>
      {textParts(text).map((part, index) =>
        part.href ? (
          <a key={index} href={part.href} target="_blank" rel="noreferrer">
            {part.text}
          </a>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** Chỉ nhận dữ liệu qua props, nên dùng chung được cho đọc bài và xem trước nội dung chưa lưu. */
export function NewsArticle(props: {
  title: string;
  blocks: NewsBlock[];
  images: NewsImage[];
  cover: NewsImage | null;
  author: NewsCard['author'];
  publishedAt: string | null;
}) {
  const byId = new Map(props.images.map((image) => [image.id, image]));
  return (
    <article className="news-article">
      <header className="news-article-header">
        <h1 className="news-article-title">{props.title || '(Chưa có tiêu đề)'}</h1>
        <div className="news-article-meta">
          {props.author?.name ?? 'Người dùng cũ'} · {newsDate(props.publishedAt)}
        </div>
        {props.cover ? (
          <div className="news-article-cover">
            <Image src={props.cover.displayUrl} preview={{ src: props.cover.url }} alt="" />
          </div>
        ) : null}
      </header>
      <div className="news-article-body">
        {props.blocks.map((block, index) => {
          if (block.type === 'heading') {
            return (
              <h2 key={index} className="news-article-heading">
                <NewsText text={block.text} />
              </h2>
            );
          }
          if (block.type === 'paragraph') {
            return (
              <p key={index} className="news-article-paragraph">
                <NewsText text={block.text} />
              </p>
            );
          }
          const image = byId.get(block.imageId);
          return image ? (
            <figure key={index} className="news-article-figure">
              <Image src={image.displayUrl} preview={{ src: image.url }} alt={block.caption} />
              {block.caption ? <figcaption>{block.caption}</figcaption> : null}
            </figure>
          ) : null;
        })}
      </div>
    </article>
  );
}
