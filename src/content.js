// Googleカレンダー用コンテンツスクリプト
// 右下にフローティングボタン（起動）と取り込みモードのトグルを設置する。
// 取り込みモード中は、カレンダーの空き枠のクリック/ドラッグを日時として拾い、
// サイドパネルの日程クリッパーに候補として送る。
// 取り込んだ候補はカレンダーの該当枠に色を重ねて表示する。
// ※ GoogleカレンダーはTrusted Typesを強制しているため、DOM APIのみで構築する。

(() => {
  const FAB_ID = 'nittei-clipper-fab';
  const TOGGLE_ID = 'nittei-clipper-capture';
  const TOAST_ID = 'nittei-clipper-toast';
  if (document.getElementById(FAB_ID)) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function icon(paths) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    for (const d of paths) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-linecap', 'round');
      svg.appendChild(path);
    }
    return svg;
  }
  const CLIP_PATH =
    'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19' +
    'a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48';
  // 照準（取り込み）アイコン
  const TARGET_PATHS = [
    'M12 5.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13',
    'M12 2v3.2 M12 18.8V22 M2 12h3.2 M18.8 12H22',
  ];

  // ── 起動ボタン ──
  const fab = document.createElement('button');
  fab.id = FAB_ID;
  fab.type = 'button';
  fab.title = '日程クリッパーを開く';
  fab.setAttribute('aria-label', '日程クリッパーを開く');
  fab.appendChild(icon([CLIP_PATH]));
  fab.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'open-panel' });
  });

  // ── 取り込みモードのトグル（アイコンのみ） ──
  let capturing = false;

  const toggle = document.createElement('button');
  toggle.id = TOGGLE_ID;
  toggle.type = 'button';
  toggle.title = '予定から取り込み: OFF（ONの間、空き枠のクリックやドラッグを候補として取り込みます。Escで解除）';
  toggle.setAttribute('aria-label', '予定から取り込み');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.appendChild(icon(TARGET_PATHS));
  toggle.addEventListener('click', () => setCapturing(!capturing));

  function setCapturing(on) {
    capturing = on;
    drag = null;
    removeGhost();
    toggle.classList.toggle('is-on', on);
    toggle.setAttribute('aria-pressed', String(on));
    toggle.title = `予定から取り込み: ${on ? 'ON' : 'OFF'}（ONの間、空き枠のクリックやドラッグを候補として取り込みます。Escで解除）`;
    document.documentElement.classList.toggle('nittei-clipper-capturing', on);
    if (on) chrome.runtime.sendMessage({ type: 'open-panel' }); // パネルを一緒に開く
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && capturing) setCapturing(false);
  });

  // ── datekey の変換 ──
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
  function encodeDatekey(date) {
    const [y, m, d] = date.split('-').map(Number);
    return ((y - 1970) << 9) | (m << 5) | d;
  }

  const fmtMin = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  // ── クリック / ドラッグの取り込み ──
  // 週/日表示の時間グリッド（背の高い列）: mousedown=開始、mouseup=終了。
  // 同じ位置ならクリック扱い（1回目=開始、同じ日の2回目=終了はパネル側で処理）。
  // 月表示など低いセルのクリックは日付のみの候補。
  let drag = null; // { date, rect, startMin }

  function cellAt(e) {
    const cell = e.target instanceof Element ? e.target.closest('[data-datekey]') : null;
    if (!cell) return null;
    const main = document.querySelector('[role="main"]');
    if (!main || !main.contains(cell)) return null; // 左のミニカレンダー等は対象外
    return cell;
  }

  function minutesAt(rect, clientY) {
    const ratio = (clientY - rect.top) / rect.height;
    return Math.max(0, Math.min(47, Math.round(ratio * 48))) * 30;
  }

  function handleEvent(e) {
    if (!capturing) return;
    const cell = cellAt(e);
    if (!cell && !(drag && (e.type === 'mouseup' || e.type === 'mousemove'))) return;

    if (e.type !== 'mousemove') {
      // Googleカレンダー側の予定作成を抑止する
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    if (e.type === 'mousedown' && cell) {
      const date = decodeDatekey(cell.getAttribute('data-datekey'));
      if (!date) return;
      const rect = cell.getBoundingClientRect();
      if (rect.height > 400) {
        drag = { date, rect, startMin: minutesAt(rect, e.clientY), cell };
        renderGhost(e.clientY);
      } else {
        chrome.runtime.sendMessage({ type: 'gcal-pick', date, minutes: null });
        showToast(date, null, null);
      }
      return;
    }

    if (e.type === 'mousemove' && drag) {
      renderGhost(e.clientY);
      return;
    }

    if (e.type === 'mouseup' && drag) {
      const endMin = minutesAt(drag.rect, e.clientY);
      const [start, end] = endMin >= drag.startMin ? [drag.startMin, endMin] : [endMin, drag.startMin];
      if (start === end) {
        // ドラッグなし=クリック: 1回目=開始、同じ日の2回目=終了（パネル側のロジック）
        chrome.runtime.sendMessage({ type: 'gcal-pick', date: drag.date, minutes: start });
        showToast(drag.date, start, null);
      } else {
        chrome.runtime.sendMessage({ type: 'gcal-pick-range', date: drag.date, startMinutes: start, endMinutes: end });
        showToast(drag.date, start, end);
      }
      drag = null;
      removeGhost();
    }
  }
  for (const type of ['mousedown', 'mousemove', 'mouseup', 'click']) {
    window.addEventListener(type, handleEvent, true);
  }

  // ── ドラッグ中のゴースト表示 ──
  function renderGhost(clientY) {
    if (!drag) return;
    let ghost = drag.cell.querySelector(':scope > .nittei-clipper-ghost');
    if (!ghost) {
      if (getComputedStyle(drag.cell).position === 'static') drag.cell.style.position = 'relative';
      ghost = document.createElement('div');
      ghost.className = 'nittei-clipper-ghost';
      drag.cell.appendChild(ghost);
    }
    const cur = minutesAt(drag.rect, clientY);
    const [start, end] = cur >= drag.startMin ? [drag.startMin, cur] : [cur, drag.startMin];
    ghost.style.top = `${(start / 1440) * 100}%`;
    ghost.style.height = `${(Math.max(end - start, 30) / 1440) * 100}%`;
  }
  function removeGhost() {
    document.querySelectorAll('.nittei-clipper-ghost').forEach(n => n.remove());
  }

  // ── 取り込んだ候補をカレンダー上に色で表示 ──
  // 候補はstorage.sessionに保存されている（backgroundがアクセスレベルを開放済み）。

  function renderMarks(slots) {
    observer?.disconnect();
    document.querySelectorAll('.nittei-clipper-mark').forEach(n => n.remove());
    const main = document.querySelector('[role="main"]');
    if (main) {
      for (const slot of slots) {
        const cells = main.querySelectorAll(`[data-datekey="${encodeDatekey(slot.date)}"]`);
        for (const cell of cells) {
          const rect = cell.getBoundingClientRect();
          const mark = document.createElement('div');
          mark.className = 'nittei-clipper-mark';
          if (rect.height > 400 && slot.start) {
            // 週/日表示: 時間帯ブロック
            const start = toMin(slot.start);
            const end = slot.end ? toMin(slot.end) : start + 30;
            mark.style.top = `${(start / 1440) * 100}%`;
            mark.style.height = `${(Math.max(end - start, 15) / 1440) * 100}%`;
          } else if (rect.height > 60 && rect.height <= 400) {
            // 月表示: 下端のバー
            mark.classList.add('is-day');
          } else {
            continue;
          }
          if (getComputedStyle(cell).position === 'static') cell.style.position = 'relative';
          cell.appendChild(mark);
        }
      }
    }
    observeMain();
  }

  async function refreshMarks() {
    if (!chrome.storage?.session) return;
    try {
      const { work } = await chrome.storage.session.get('work');
      renderMarks(work?.slots ?? []);
    } catch {
      // アクセスレベル未開放（旧バージョンのbackground）の場合は表示だけ諦める
    }
  }

  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area === 'session' && changes.work) renderMarks(changes.work.newValue?.slots ?? []);
  });

  // 表示切替などでGoogleカレンダーがDOMを作り直したら描き直す
  let observer = null;
  let redrawTimer = null;
  function observeMain() {
    const main = document.querySelector('[role="main"]');
    if (!main) return;
    observer ??= new MutationObserver(() => {
      clearTimeout(redrawTimer);
      redrawTimer = setTimeout(refreshMarks, 300);
    });
    observer.observe(main, { childList: true, subtree: true });
  }

  // ── 取り込みトースト ──
  let toastTimer = null;
  function showToast(date, startMin, endMin) {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      document.documentElement.appendChild(toast);
    }
    const [y, m, d] = date.split('-').map(Number);
    const dow = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()];
    const time = startMin == null ? ''
      : endMin == null ? ` ${fmtMin(startMin)}` : ` ${fmtMin(startMin)}〜${fmtMin(endMin)}`;
    toast.textContent = `取り込み: ${m}/${d}（${dow}）${time}`;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1600);
  }

  document.documentElement.append(fab, toggle);
  refreshMarks();
})();
