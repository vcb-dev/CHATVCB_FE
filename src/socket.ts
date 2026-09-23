import { io, type Socket } from 'socket.io-client';

const PROD_BE = 'https://chatvcb-be-production.up.railway.app';

export function connectSocket(token: string): Socket {
  const url = import.meta.env.DEV
    ? undefined
    : (import.meta.env.VITE_WS_URL || PROD_BE).replace(/\/$/, '');

  return io(url, {
    auth: { token },
    path: '/socket.io',
    transports: ['websocket'],
    timeout: 8000,
    reconnectionDelay: 400,
    reconnectionAttempts: 6,
  });
}
