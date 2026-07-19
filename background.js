// バックグラウンド（サービスワーカー）
// Googleカレンダー上のボタンからの要求でサイドパネルを開く。

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'open-panel') return;

  // サイドパネルならカレンダーの予定と重ならずに並べて使える。
  // ユーザージェスチャが有効なうちに同期的に呼ぶこと（awaitを挟むと失効する）。
  chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(() => {
    // サイドパネル非対応環境ではツールバーのポップアップ → 小窓の順でフォールバック
    chrome.action.openPopup({ windowId: sender.tab?.windowId }).catch(() => {
      chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: 412,
        height: 680,
      });
    });
  });
});
