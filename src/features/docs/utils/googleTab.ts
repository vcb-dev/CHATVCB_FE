/**
 * Mở tab trống ngay trong lúc người dùng bấm, có link rồi mới gán địa chỉ.
 * Safari (và Chrome sau vài giây) chặn window.open gọi sau một await vì không còn tính là thao tác của người dùng.
 */
export function reserveTab(): Window | null {
  const tab = window.open('about:blank', '_blank');
  if (!tab) {
    return null;
  }
  tab.opener = null;
  try {
    tab.document.title = 'Đang mở…';
    tab.document.body.style.font = '15px system-ui, sans-serif';
    tab.document.body.style.padding = '24px';
    tab.document.body.textContent = 'Đang mở tài liệu trên Google…';
  } catch {
    // tab về trạng thái khác origin thì thôi không ghi chữ
  }
  return tab;
}

export function sendTab(tab: Window | null, url: string) {
  if (tab && !tab.closed) {
    tab.location.href = url;
    return;
  }
  const opened = window.open(url, '_blank');
  if (opened) {
    opened.opener = null;
    return;
  }
  // Bị chặn popup: đi luôn ở tab hiện tại, người dùng bấm Back để về ChatVCB
  window.location.assign(url);
}

export function dropTab(tab: Window | null) {
  if (tab && !tab.closed) {
    tab.close();
  }
}
