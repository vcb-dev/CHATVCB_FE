import { useCallback, useEffect, useRef, useState } from 'react';
import { confirmDiscard } from '@/lib/confirmDiscard';
import { isChatVisible } from '@/lib/notify';

export type Workspace =
  | 'messenger'
  | 'tasks'
  | 'contacts'
  | 'email'
  | 'docs'
  | 'meetings'
  | 'gallery'
  | 'news'
  | 'hr'
  | 'departments'
  | 'admin';

const WORKSPACE_IDS: Workspace[] = [
  'messenger',
  'tasks',
  'contacts',
  'email',
  'docs',
  'meetings',
  'gallery',
  'news',
  'hr',
  'departments',
  'admin',
];

function asWorkspace(value?: string | null): Workspace | null {
  return value && WORKSPACE_IDS.includes(value as Workspace) ? (value as Workspace) : null;
}

export function useWorkspace() {
  const [workspace, setWorkspaceState] = useState<Workspace>(() => {
    return (
      asWorkspace(new URLSearchParams(window.location.search).get('workspace')) ||
      asWorkspace(localStorage.getItem('chatvcb.workspace')) ||
      'messenger'
    );
  });
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;

  useEffect(() => {
    localStorage.setItem('chatvcb.workspace', workspace);
  }, [workspace]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('workspace') && !params.get('mail')) {
      return;
    }
    window.history.replaceState({}, '', window.location.pathname || '/');
  }, []);

  const isViewingChat = useCallback(() => {
    return workspaceRef.current === 'messenger' && isChatVisible();
  }, []);

  const isViewingNews = useCallback(() => workspaceRef.current === 'news', []);

  // Màn đang có nội dung chưa lưu bật cờ này; mọi đường rời khung (đổi mục, mở thông báo, đăng xuất) đều phải hỏi
  const leaveBlockedRef = useRef(false);

  const setLeaveBlocked = useCallback((blocked: boolean) => {
    leaveBlockedRef.current = blocked;
  }, []);

  const confirmLeave = useCallback((proceed: () => void) => {
    if (!leaveBlockedRef.current) {
      proceed();
      return;
    }
    // Không tự tắt cờ: rời thất bại (đăng xuất lỗi) thì màn vẫn còn nội dung; màn tự tắt khi unmount
    confirmDiscard(proceed);
  }, []);

  const setWorkspace = useCallback(
    (next: Workspace) => {
      if (next === workspaceRef.current) {
        return;
      }
      confirmLeave(() => setWorkspaceState(next));
    },
    [confirmLeave],
  );

  return { workspace, setWorkspace, isViewingChat, isViewingNews, confirmLeave, setLeaveBlocked };
}
