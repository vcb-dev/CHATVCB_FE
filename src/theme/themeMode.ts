import { useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

// Script chống nháy trong index.html đọc cùng khóa này: đổi tên thì sửa cả hai.
const STORAGE_KEY = 'chatvcb.theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();

function readMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'dark' ? raw : 'system';
  } catch {
    return 'system';
  }
}

let mode: ThemeMode = readMode();
let snapshot = { mode, resolved: resolve(mode) };

function resolve(next: ThemeMode): ResolvedTheme {
  if (next === 'system') {
    return media.matches ? 'dark' : 'light';
  }
  return next;
}

function apply() {
  const resolved = resolve(mode);
  if (snapshot.mode !== mode || snapshot.resolved !== resolved) {
    snapshot = { mode, resolved };
  }
  document.documentElement.dataset.theme = resolved;
  listeners.forEach((fn) => fn());
}

export function setThemeMode(next: ThemeMode) {
  mode = next;
  try {
    if (next === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, next);
    }
  } catch {
    // Không ghi được (chế độ riêng tư): vẫn đổi cho phiên này
  }
  apply();
}

media.addEventListener('change', () => {
  if (mode === 'system') {
    apply();
  }
});

// Tab khác đổi giao diện thì tab này đổi theo
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    mode = readMode();
    apply();
  }
});

apply();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useThemeMode() {
  const current = useSyncExternalStore(subscribe, () => snapshot);
  return { ...current, setMode: setThemeMode };
}
