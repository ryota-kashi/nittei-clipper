// 日程クリッパー — 日程候補の提案文を作成してコピーするポップアップ

const HOLIDAYS = new Set([
  '2025-01-01','2025-01-13','2025-02-11','2025-02-23','2025-02-24',
  '2025-03-20','2025-04-29','2025-05-03','2025-05-04','2025-05-05','2025-05-06',
  '2025-07-21','2025-08-11','2025-09-15','2025-09-23','2025-10-13',
  '2025-11-03','2025-11-23','2025-11-24','2025-12-23',
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23',
  '2026-03-20','2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06',
  '2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23','2026-10-12',
  '2026-11-03','2026-11-23',
  '2027-01-01','2027-01-11','2027-02-11','2027-02-23',
  '2027-03-20','2027-03-21','2027-04-29','2027-05-03','2027-05-04','2027-05-05',
  '2027-07-19','2027-08-11','2027-09-20','2027-09-23','2027-10-11',
  '2027-11-03','2027-11-23',
]);

const DAYS_JA = ['日','月','火','水','木','金','土'];
const today = new Date(); today.setHours(0,0,0,0);

let viewYear  = today.getFullYear();
let viewMonth = today.getMonth();

// slots: { key, label, start, end }[]
// editing: 時間編集中のスロットのインデックス（null = 編集なし）
let slots   = [];
let editing = null;

// ── 状態保存（ポップアップはフォーカスが外れると閉じるため）──
const canStore = typeof chrome !== 'undefined' && chrome.storage?.session;

function saveState() {
  if (!canStore) return;
  chrome.storage.session.set({ state: { slots, editing, viewYear, viewMonth } });
}

async function restoreState() {
  if (!canStore) return;
  const { state } = await chrome.storage.session.get('state');
  if (!state) return;
  slots     = state.slots ?? [];
  editing   = state.editing ?? null;
  viewYear  = state.viewYear ?? viewYear;
  viewMonth = state.viewMonth ?? viewMonth;
}

// ── ユーティリティ ──
function fmtTime(t) {
  const [h, m] = t.split(':');
  return `${parseInt(h)}:${m}`;
}

function makeTimes() {
  const list = [];
  for (let h = 8; h <= 22; h++) {
    list.push(`${h}:00`);
    list.push(`${h}:30`);
  }
  return list;
}
const ALL_TIMES = makeTimes();

function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function toLabel(key) {
  const [y,m,d] = key.split('-').map(Number);
  return `${m}月${d}日（${DAYS_JA[new Date(y,m-1,d).getDay()]}）`;
}

// ── カレンダー ──
function renderCalendar() {
  const first = new Date(viewYear, viewMonth, 1);
  const last  = new Date(viewYear, viewMonth+1, 0);
  document.getElementById('calMonth').textContent = `${viewYear}年${viewMonth+1}月`;
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  DAYS_JA.forEach((d,i) => {
    const el = document.createElement('div');
    el.className = 'cal-dow' + (i===0?' sun': i===6?' sat':'');
    el.textContent = d;
    grid.appendChild(el);
  });

  for (let i=0; i<first.getDay(); i++) {
    const el = document.createElement('button');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  for (let d=1; d<=last.getDate(); d++) {
    const date = new Date(viewYear, viewMonth, d);
    const key  = toKey(date);
    const dow  = date.getDay();
    const btn  = document.createElement('button');
    const cls  = ['cal-day'];
    if (dow===0) cls.push('sun');
    if (dow===6) cls.push('sat');
    if (HOLIDAYS.has(key)) cls.push('holiday');
    if (date < today) cls.push('past');
    // 編集中のスロットの日付をハイライト
    if (editing !== null && slots[editing]?.key === key) cls.push('active');
    btn.className = cls.join(' ');
    btn.textContent = d;
    if (date >= today) btn.addEventListener('click', () => onDateClick(key));
    grid.appendChild(btn);
  }
}

// ── 日付クリック ──
function onDateClick(key) {
  slots.push({ key, label: toLabel(key), start: null, end: null });
  editing = slots.length - 1;
  renderCalendar();
  updatePreview();
  showStartPicker();
  saveState();
}

// ── 時間グリッドを初期描画 ──
function initTimeGrids() {
  const grid = document.getElementById('startGrid');
  grid.innerHTML = '';
  ALL_TIMES.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 't-btn';
    btn.textContent = fmtTime(t);
    btn.addEventListener('click', () => onStartClick(t));
    grid.appendChild(btn);
  });
  const egrid = document.getElementById('endGrid');
  egrid.innerHTML = '';
  ALL_TIMES.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 't-btn';
    btn.textContent = fmtTime(t);
    btn.addEventListener('click', () => onEndClick(t));
    egrid.appendChild(btn);
  });
}

// ── 開始時間選択待ち状態にする ──
function showStartPicker() {
  document.getElementById('timePicker').classList.add('visible');
  document.getElementById('timeLabel').textContent = '開始時間（選ばなくてもOK）';
  document.getElementById('startSection').style.display = 'block';
  document.getElementById('endSection').style.display = 'none';
  document.querySelectorAll('#startGrid .t-btn').forEach(b => b.classList.remove('sel'));
}

// ── 終了時間選択待ち状態にする ──
function showEndPicker() {
  document.getElementById('timeLabel').textContent = '終了時間';
  document.getElementById('startSection').style.display = 'none';
  document.getElementById('endSection').style.display = 'block';
  document.querySelectorAll('#endGrid .t-btn').forEach(b => b.classList.remove('sel'));
}

// ── 開始時間クリック ──
function onStartClick(t) {
  if (editing === null) return;
  slots[editing].start = t;
  slots[editing].end   = null;
  updatePreview();
  document.querySelectorAll('#startGrid .t-btn').forEach(b => {
    b.classList.toggle('sel', b.textContent === fmtTime(t));
  });
  showEndPicker();
  saveState();
}

// ── 終了時間クリック ──
function onEndClick(t) {
  if (editing !== null) {
    slots[editing].end = t;
    editing = null;
  }
  showStartPicker();
  renderCalendar();
  updatePreview();
  saveState();
}

// ── プレビュー更新 ──
function updatePreview() {
  const card = document.getElementById('previewCard');
  if (slots.length === 0) {
    card.classList.remove('visible');
    document.getElementById('previewText').innerHTML =
      '<span class="preview-placeholder">日付を選ぶと\nここに表示されます</span>';
    return;
  }

  const sorted = [...slots].sort((a, b) => {
    if (a.key !== b.key) return a.key > b.key ? 1 : -1;
    if (!a.start) return -1;
    if (!b.start) return 1;
    return a.start > b.start ? 1 : -1;
  });

  const lines = sorted.map(s => {
    if (!s.start) return s.label;
    if (!s.end)   return `${s.label}　${fmtTime(s.start)}〜`;
    return `${s.label}　${fmtTime(s.start)}〜${fmtTime(s.end)}`;
  });

  document.getElementById('previewText').textContent =
    '以下の日程でご都合いかがでしょうか。\n' + lines.join('\n');
  card.classList.add('visible');
}

// ── コピー ──
document.getElementById('copyBtn').addEventListener('click', () => {
  const text = document.getElementById('previewText').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'コピーしました！';
    btn.classList.add('done');
    setTimeout(() => { btn.textContent = 'コピーする'; btn.classList.remove('done'); }, 2500);
  });
});

// ── リセット ──
document.getElementById('resetBtn').addEventListener('click', () => {
  slots   = [];
  editing = null;
  document.getElementById('timePicker').classList.remove('visible');
  document.getElementById('previewCard').classList.remove('visible');
  document.getElementById('previewText').innerHTML =
    '<span class="preview-placeholder">日付を選ぶと\nここに表示されます</span>';
  document.getElementById('startSection').style.display = 'block';
  document.getElementById('endSection').style.display = 'none';
  document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('sel'));
  renderCalendar();
  saveState();
});

// ── 月ナビ ──
document.getElementById('prevMonth').addEventListener('click', () => {
  viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
  saveState();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
  saveState();
});

// ── 初期化 ──
(async () => {
  await restoreState();
  renderCalendar();
  initTimeGrids();
  updatePreview();
  // 復元時に時間編集中だったら開始ピッカーを出す
  if (editing !== null) {
    if (slots[editing]?.start) showEndPicker();
    else showStartPicker();
    document.getElementById('timePicker').classList.add('visible');
  }
})();
