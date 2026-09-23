import { io, type Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

export function connectSocket(token: string): Socket {
  return io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
  });
}
