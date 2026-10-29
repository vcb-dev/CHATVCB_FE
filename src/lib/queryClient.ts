import { focusManager, QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

focusManager.setEventListener((handleFocus) => {
  const listener = () => handleFocus();
  window.addEventListener('focus', listener);
  document.addEventListener('visibilitychange', listener);
  return () => {
    window.removeEventListener('focus', listener);
    document.removeEventListener('visibilitychange', listener);
  };
});
