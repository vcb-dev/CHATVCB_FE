import { SendOutlined } from '@ant-design/icons';
import { Button, Input, message } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { type Ref, useState } from 'react';
import { errorText } from '@/lib/errors';
import { NEWS_COMMENT_MAX, isPostGone } from '../utils/news';

export function NewsCommentComposer(props: {
  placeholder: string;
  initial?: string;
  submitText?: string;
  autoFocus?: boolean;
  inputRef?: Ref<TextAreaRef>;
  onSubmit: (body: string) => Promise<unknown>;
  onDone: () => void;
  onCancel?: () => void;
  onGone?: () => void;
}) {
  const [value, setValue] = useState(props.initial ?? '');
  const [sending, setSending] = useState(false);
  const empty = !value.trim();

  async function submit() {
    if (empty || sending) {
      return;
    }
    setSending(true);
    try {
      await props.onSubmit(value);
      setValue('');
      props.onDone();
    } catch (err) {
      if (props.onGone && isPostGone(err)) {
        void message.error('Bài không còn tồn tại');
        props.onGone();
      } else {
        void message.error(errorText(err, 'Không gửi được bình luận.'));
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="news-comment-composer">
      <Input.TextArea
        ref={props.inputRef}
        value={value}
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        autoSize={{ minRows: 1, maxRows: 6 }}
        maxLength={NEWS_COMMENT_MAX}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // Đang gõ dấu tiếng Việt bằng bộ gõ thì Enter là chốt chữ, không phải gửi
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void submit();
          }
          if (event.key === 'Escape') {
            props.onCancel?.();
          }
        }}
      />
      <span className="news-comment-composer-actions">
        {props.onCancel ? (
          <Button size="small" onClick={props.onCancel}>
            Hủy
          </Button>
        ) : null}
        <Button
          size="small"
          type="primary"
          icon={props.submitText ? undefined : <SendOutlined />}
          aria-label={props.submitText ?? 'Gửi bình luận'}
          disabled={empty}
          loading={sending}
          onClick={() => void submit()}
        >
          {props.submitText}
        </Button>
      </span>
    </div>
  );
}

