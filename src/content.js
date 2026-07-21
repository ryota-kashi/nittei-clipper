// Googleカレンダー用コンテンツスクリプト
// 右下にフローティングボタン（起動）と「予定から取り込み」トグルを設置する。
// 取り込みモード中は、カレンダーの空き枠クリックを日時として拾い、
// サイドパネルの日程クリッパーに候補として送る。
// ※ GoogleカレンダーはTrusted Typesを強制しているため、DOM APIのみで構築する。

(() => {
  const FAB_ID = 'nittei-clipper-fab';
  const TOGGLE_ID = 'nittei-clipper-capture';
  const TOAST_ID = 'nittei-clipper-toast';
  if (document.getElementById(FAB_ID)) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function clipIcon() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d',
      'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19' +
      'a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);
    return svg;
  }

  // ── 起動ボタン ──
  const fab = document.createElement('button');
  fab.id = FAB_ID;
  fab.type = 'button';
  fab.title = '日程クリッパーを開く';
  fab.setAttribute('aria-label', '日程クリッパーを開く');
  fab.appendChild(clipIcon());
  fab.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'open-panel' });
  });

  // ── 取り込みモードのトグル ──
  let capturing = false;

  const toggle = document.createElement('button');
  toggle.id = TOGGLE_ID;
  toggle.type = 'button';
  toggle.textContent = '予定から取り込み';
  toggle.title = 'ONの間、空き枠のクリックを日程クリッパーの候補として取り込みます（Escで解除）';
  toggle.setAttribute('aria-pressed', 'false');
  toggle.addEventListener('click', () => setCapturing(!capturing));

  function setCapturing(on) {
    capturing = on;
    toggle.classList.toggle('is-on', on);
    toggle.setAttribute('aria-pressed', String(on));
    document.documentElement.classList.toggle('nittei-clipper-capturing', on);
    if (on) chrome.runtime.sendMessage({ type: 'open-panel' }); // パネルを一緒に開く
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && capturing) setCapturing(false);
  });

  // ── data-datekey の復号 ──
  // Googleカレンダーの日付セルは data-datekey=((年-1970)<<9)|(月<<5)|日 を持つ
  function decodeDatekey(value) {
    const n = Number(value);
    if (!Number.isInteger(n)) return null;
    const year = (n >> 9) + 1970;
    const month = (n >> 5) & 15;
    const day = n & 31;
    if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // ── クリックの取り込み ──
  // 週/日表示の時間グリッド（背の高い列）はクリック位置から時刻を30分刻みで算出。
  // 月表示や日付ヘッダー（低いセル）は日付のみの候補として扱う。
  function handleEvent(e) {
    if (!capturing) return;
    const cell = e.target instanceof Element ? e.target.closest('[data-datekey]') : null;
    if (!cell) return;
    const main = document.querySelector('[role="main"]');
    if (!main || !main.contains(cell)) return; // 左のミニカレンダー等は対象外

    // Googleカレンダー側の予定作成を抑止する
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type !== 'mousedown') return; // 送信はmousedownの1回だけ

    const date = decodeDatekey(cell.getAttribute('data-datekey'));
    if (!date) return;

    let minutes = null;
    const rect = cell.getBoundingClientRect();
    if (rect.height > 400) {
      const ratio = (e.clientY - rect.top) / rect.height;
      minutes = Math.max(0, Math.min(47, Math.round(ratio * 48))) * 30;
    }

    chrome.runtime.sendMessage({ type: 'gcal-pick', date, minutes });
    showToast(date, minutes);
  }
  for (const type of ['mousedown', 'mouseup', 'click']) {
    window.addEventListener(type, handleEvent, true);
  }

  // ── 取り込みトースト ──
  let toastTimer = null;
  function showToast(date, minutes) {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      document.documentElement.appendChild(toast);
    }
    const [y, m, d] = date.split('-').map(Number);
    const dow = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()];
    const time = minutes != null
      ? ` ${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
      : '';
    toast.textContent = `取り込み: ${m}/${d}（${dow}）${time}`;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1600);
  }

  document.documentElement.append(fab, toggle);
})();
