/** Gửi tin: khi nào tự gửi lại, câu lỗi nào cho người dùng. Không import runtime để chạy kiểm được bằng node. */

/** POST tin (JSON nhỏ) quá ngần này coi như kết nối treo. Bước tải ảnh/tệp lên không đặt hạn. */
export const SEND_TIMEOUT_MS = 20_000;

/** Số lần tự gửi lại khi rớt kết nối. Mất mạng thì TanStack dừng giữa các lần, có mạng lại mới gửi tiếp. */
const SEND_RETRIES = 3;

const isTimeout = (error: unknown) =>
  error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError');

/** fetch ném TypeError khi không nối được máy chủ (mất mạng, server tắt). */
const isConnectionError = (error: unknown) => error instanceof TypeError;

/** Gửi lại an toàn vì BE trả tin cũ khi trùng clientId; lỗi từ server hay quá hạn thì để người dùng quyết. */
export function shouldRetrySend(failureCount: number, error: unknown): boolean {
  return failureCount < SEND_RETRIES && isConnectionError(error);
}

export function sendErrorText(error: unknown): string {
  if (isTimeout(error)) {
    return 'Mạng chậm, chưa gửi được.';
  }
  if (isConnectionError(error)) {
    return 'Không kết nối được máy chủ.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Gửi tin thất bại.';
}
