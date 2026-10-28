import { useCallback, useEffect, useRef, useState } from 'react';
import { isChatVisible } from '@/lib/notify';

export type Workspace = 'messenger' | 'email' | 'docs' | 'meetings' | 'hr';

const WORKSPACE_IDS: Workspace[] = ['messenger', 'email', 'docs', 'meetings', 'hr'];

function asWorkspace(value?: string | null): Workspace | null {
  return value && WORKSPACE_IDS.includes(value as Workspace) ? (value as Workspace) : null;
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(() => {
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

  return { workspace, setWorkspace, isViewingChat };
}
