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

// パネル（拡張ページ）の生存はポートで把握する。
// 全ポート切断=パネルが閉じた合図で、カレンダー側のクリップモードを解除する。
const panelPorts = new Set();
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'nittei-panel') return;
  panelPorts.add(port);
  port.onDisconnect.addListener(() => {
    panelPorts.delete(port);
    if (panelPorts.size > 0) return;
    // パネルを閉じたら選択中の候補もリセットする
    chrome.storage.session?.remove('work')?.catch?.(() => {});
    // URLフィルタは権限条件で空になりうるため、全タブへ送って
    // content scriptがいないタブの失敗は握りつぶす
    chrome.tabs.query({}).then(tabs => {
      for (const tab of tabs) {
        if (tab.id != null) chrome.tabs.sendMessage(tab.id, { type: 'panel-closed' }).catch(() => {});
      }
    }).catch(() => {});
  });
});

function openPanel(windowId) {
  // ユーザージェスチャが有効なうちに同期的に呼ぶこと（awaitを挟むと失効する）
  chrome.sidePanel.open({ windowId }).catch(() => {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 412,
      height: 680,
    });
  });
}

// Googleカレンダー上のボタンからの要求
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'open-panel') {
    openPanel(sender.tab?.windowId);
    return;
  }
  if (message?.type === 'toggle-panel') {
    if (panelPorts.size > 0) {
      // 開いているパネルに自分で閉じてもらう（sidePanelに直接closeは無い）
      for (const port of panelPorts) port.postMessage({ type: 'close' });
    } else {
      openPanel(sender.tab?.windowId);
    }
  }
});
