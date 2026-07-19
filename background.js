// バックグラウンド（サービスワーカー）
// Googleカレンダー上のボタンからの要求でポップアップを開く。

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'open-popup') return;

  // Chrome 127以降はツールバーのポップアップを直接開ける。
  // 失敗した場合（旧バージョン等）は小窓でポップアップを開くフォールバック。
  chrome.action.openPopup({ windowId: sender.tab?.windowId }).catch(() => {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 412,
      height: 680,
    });
  });
});
