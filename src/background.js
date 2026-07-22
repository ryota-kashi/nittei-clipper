// バックグラウンド（サービスワーカー）
// ツールバーのアイコン・Googleカレンダー上のボタンのどちらからもサイドパネルで開く。

// アイコンクリックでサイドパネルを開く（Chrome 114+）
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// content scriptが候補を読んでカレンダー上に色を重ねられるよう、
// storage.sessionへのアクセスを開放する（自拡張のコンテキストのみ）
chrome.storage.session?.setAccessLevel?.({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
  .catch(() => {});

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

// パネル（拡張ページ）が閉じられたらカレンダー側のクリップモードを解除する。
// パネルは接続ポートを張っており、全ポートが切れた=表示中のパネルが無くなった合図。
let panelPorts = 0;
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'nittei-panel') return;
  panelPorts++;
  port.onDisconnect.addListener(() => {
    panelPorts--;
    if (panelPorts > 0) return;
    chrome.tabs.query({ url: 'https://calendar.google.com/*' }).then(tabs => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: 'panel-closed' }).catch(() => {});
      }
    }).catch(() => {});
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
