// バックグラウンド（サービスワーカー）
// ツールバーのアイコン・Googleカレンダー上のボタンのどちらからもサイドパネルで開く。

// アイコンクリックでサイドパネルを開く（Chrome 114+）
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// サイドパネル非対応の環境ではアイコンクリック時に小窓で開く
// （setPanelBehaviorが効いている場合、onClickedは発火しない）
chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL('popup.html'),
    type: 'popup',
    width: 412,
    height: 680,
  });
});

// Googleカレンダー上のボタンからの要求
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'open-panel') return;

  // ユーザージェスチャが有効なうちに同期的に呼ぶこと（awaitを挟むと失効する）
  chrome.sidePanel.open({ windowId: sender.tab?.windowId }).catch(() => {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 412,
      height: 680,
    });
  });
});
