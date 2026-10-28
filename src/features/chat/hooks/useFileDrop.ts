import { type DragEvent, useEffect, useRef, useState } from 'react';

export type UseFileDropOptions = {
  disabled: boolean;
  onFiles: (files: File[]) => void;
};

export function useFileDrop({ disabled, onFiles }: UseFileDropOptions) {
  const [dragging, setDragging] = useState(false);
  const counterRef = useRef(0);

  useEffect(() => {
    if (disabled) {
      counterRef.current = 0;
      setDragging(false);
    }
  }, [disabled]);

  const hasFiles = (e: DragEvent<HTMLElement>) => {
    return !disabled && Array.from(e.dataTransfer?.types ?? []).includes('Files');
  };

  const onDragEnter = (e: DragEvent<HTMLElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    counterRef.current += 1;
    setDragging(true);
  };

  const onDragOver = (e: DragEvent<HTMLElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
  };

  const onDragLeave = (e: DragEvent<HTMLElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    counterRef.current = Math.max(0, counterRef.current - 1);
    if (counterRef.current === 0) {
      setDragging(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    counterRef.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length > 0) {
      onFiles(files);
    }
  };

  return {
    dragging,
    dropProps: {
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
    },
  };
}
