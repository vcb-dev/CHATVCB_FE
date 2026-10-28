import { message as antMessage } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/types';
import { isSelectable } from '../utils/selection';

const MAX_SELECT = 20;

export function useMessageSelection(roomId: string) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const idsRef = useRef<ReadonlySet<string>>(selectedIds);

  function replace(next: ReadonlySet<string>) {
    idsRef.current = next;
    setSelectedIds(next);
  }

  function clear() {
    setSelecting(false);
    replace(new Set());
  }

  function start(first?: ChatMessage) {
    setSelecting(true);
    replace(new Set(first && isSelectable(first) ? [first.id] : []));
  }

  function toggle(message: ChatMessage) {
    if (!isSelectable(message)) {
      return;
    }
    const current = idsRef.current;
    const next = new Set(current);
    if (current.has(message.id)) {
      next.delete(message.id);
    } else if (current.size >= MAX_SELECT) {
      antMessage.info(`Chọn tối đa ${MAX_SELECT} tin.`);
      return;
    } else {
      next.add(message.id);
    }
    replace(next);
  }

  useEffect(() => {
    clear();
  }, [roomId]);

  return { selecting, selectedIds, start, toggle, clear };
}
