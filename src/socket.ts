import { io, type Socket } from 'socket.io-client';

export function connectSocket(token: string): Socket {
  return io({
    auth: { token },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });
}
