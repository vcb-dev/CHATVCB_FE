import { CopyOutlined } from '@ant-design/icons';
import { Image, message as antMessage, type ImageProps } from 'antd';
import { cloneElement, type ReactElement, type ReactNode } from 'react';
import { copyImage } from '@/lib/clipboard';

async function copyWithToast(src: string) {
  try {
    await copyImage(src);
    antMessage.success('Đã sao chép.');
  } catch {
    antMessage.error('Không sao chép được ảnh.');
  }
}

function copyAction(src: string) {
  return (original: ReactElement) => {
    const { className, children } = original.props as { className: string; children: ReactNode };
    const actionCls = `${className.split(' ')[0]}-action`;
    return cloneElement(
      original,
      undefined,
      children,
      <button
        key="copy"
        type="button"
        className={`${actionCls} ${actionCls}-copy`}
        aria-label="copy"
        onClick={() => void copyWithToast(src)}
      >
        <CopyOutlined />
      </button>,
    );
  };
}

export function CopyableImage(props: ImageProps & { src: string }) {
  return <Image {...props} preview={{ actionsRender: copyAction(props.src) }} />;
}
