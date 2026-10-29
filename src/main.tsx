import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import App from './App';
import '@/styles/index.css';

const root = createRoot(document.getElementById('root')!);
const app = (
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

root.render(import.meta.env.DEV ? <StrictMode>{app}</StrictMode> : app);
