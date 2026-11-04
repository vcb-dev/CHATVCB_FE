import { io, type Socket } from 'socket.io-client';
import { api } from '@/api/client';

const PROD_BE = 'https://chatvcb-be-production.up.railway.app';
const RECONNECT_AFTER_KICK_MS = 1000;

const closedSockets = new WeakSet<Socket>();

export function connectSocket(): Socket {
  const url = (
    import.meta.env.VITE_WS_URL ||
    (import.meta.env.DEV ? 'http://localhost:3010' : PROD_BE)
  ).replace(/\/$/, '');

  const socket = io(url, {
    // Lấy token mới mỗi lần bắt tay, kể cả khi nối lại
    auth: (cb) => {
      api
        .socketToken()
        .then((token) => cb({ token }))
        .catch(() => cb({}));
    },
    path: '/socket.io',
    transports: ['websocket'],
    timeout: 8000,
    reconnectionDelay: 400,
  });

  // socket.io không tự nối lại khi chính server ngắt, ví dụ lúc token bị từ chối
  socket.on('disconnect', (reason) => {
    if (reason !== 'io server disconnect') {
      return;
    }
    window.setTimeout(() => {
      if (!closedSockets.has(socket)) {
        socket.connect();
      }
    }, RECONNECT_AFTER_KICK_MS);
  });

  return socket;
}

export function closeSocket(socket: Socket) {
  closedSockets.add(socket);
  socket.disconnect();
}
