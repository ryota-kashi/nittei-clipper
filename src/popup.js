// 日程クリッパー — UI本体
// 単一のstateオブジェクトとrender()による状態駆動アーキテクチャ。
// イベント → 状態更新(update) → 全体再描画 の一方向フローで統一する。

// ── 状態 ──────────────────────────────────────────

// サイドパネルは長時間開いたままになるため、「今日」は描画のたびに求める
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const state = {
  view: { year: startOfToday().getFullYear(), month: startOfToday().getMonth() }, // 表示中の月
  slots: [],        // { id, date: 'YYYY-MM-DD', start: 'H:MM'|null, end: 'H:MM'|null }
  editingId: null,  // 時間帯エディタを開いている候補のid
  format: 'standard',
  theme: 'auto',    // paper | indigo | sepia | auto（OS追従）
  copied: false,    // コピー直後のボタン表示用
};

// テーマ一覧（swatchはヘッダーのインク見本の色）
const THEMES = [
  { id: 'auto',   label: '自動（OSに合わせる）', swatch: 'linear-gradient(135deg, #fbfbf9 50%, #172136 50%)' },
  { id: 'paper',  label: '紙白',   swatch: '#fbfbf9' },
  { id: 'indigo', label: '藍染め', swatch: '#172136' },
  { id: 'sepia',  label: 'セピア', swatch: '#241d12' },
];

let nextId = 1;

// 状態を書き換えて再描画する唯一の入口
function update(mutate) {
  mutate(state);
  persist();
  render();
}

// ── 永続化 ──────────────────────────────────────────
// 候補はセッション単位（ポップアップを閉じても消えないが、ブラウザ再起動で消える）。
// 出力形式は端末をまたいで残す。

const storage = typeof chrome !== 'undefined' && chrome.storage ? chrome.storage : null;

function persist() {
  if (!storage) return;
  storage.session?.set({
    work: { slots: state.slots, editingId: state.editingId, view: state.view, nextId },
  });
  storage.sync?.set({ format: state.format, theme: state.theme });
}

async function restore() {
  if (!storage) return;
  const [{ work }, { format, theme }] = await Promise.all([
    storage.session?.get('work') ?? {},
    storage.sync?.get(['format', 'theme']) ?? {},
  ]);
  if (work) applyWork(work);
  if (format) state.format = format;
  if (theme) state.theme = theme;
}

// 保存されていた作業状態をstateへ反映する（persistはしない）
function applyWork(work) {
  state.slots = work.slots ?? [];
  state.editingId = work.editingId ?? null;
  state.view = work.view ?? state.view;
  // nextIdが欠けていても既存IDと衝突しないよう最大値から採番する
  nextId = work.nextId ?? Math.max(0, ...state.slots.map(s => s.id)) + 1;
}

// ポップアップとサイドパネルを同時に開いた場合に互いの変更を反映する
if (storage) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && changes.work?.newValue) {
      if (JSON.stringify(changes.work.newValue.slots) === JSON.stringify(state.slots) &&
          changes.work.newValue.editingId === state.editingId) return; // 自分の書き込み
      applyWork(changes.work.newValue);
      render();
    }
    if (area === 'sync') {
      let changed = false;
      if (changes.format && changes.format.newValue !== state.format) {
        state.format = changes.format.newValue;
        changed = true;
      }
      if (changes.theme && changes.theme.newValue !== state.theme) {
        state.theme = changes.theme.newValue;
        changed = true;
      }
      if (changed) render();
    }
  });
}

// ── ユーティリティ ──────────────────────────────────

const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'];

// 8:00〜22:30 を30分刻みで
const TIME_CHOICES = [];
for (let h = 8; h <= 22; h++) TIME_CHOICES.push(`${h}:00`, `${h}:30`);

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// '9:30' → 570（比較用の分数値）
function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function sortedSlots() {
  return [...state.slots].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (!a.start || !b.start) return a.start ? 1 : -1;
    return toMinutes(a.start) - toMinutes(b.start);
  });
}

function editingSlot() {
  return state.slots.find(s => s.id === state.editingId) ?? null;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ── 描画 ──────────────────────────────────────────

function render() {
  document.documentElement.dataset.theme = state.theme;
  renderThemePicker();
  renderCalendar();
  renderTimeEditor();
  renderSlotList();
  renderOutput();
}

function renderThemePicker() {
  const picker = document.getElementById('themePicker');
  picker.replaceChildren();
  THEMES.forEach(t => {
    const btn = el('button', 'theme-swatch' + (t.id === state.theme ? ' is-active' : ''));
    btn.style.background = t.swatch;
    btn.title = t.label;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(t.id === state.theme));
    btn.setAttribute('aria-label', `テーマ: ${t.label}`);
    btn.addEventListener('click', () => update(s => { s.theme = t.id; }));
    picker.appendChild(btn);
  });
}

function renderCalendar() {
  const { year, month } = state.view;
  document.getElementById('calMonth').textContent = `${year}年${month + 1}月`;

  const grid = document.getElementById('calGrid');
  grid.replaceChildren();

  DOW_JA.forEach((d, i) => {
    const cls = 'cal-dow' + (i === 0 ? ' is-sun' : i === 6 ? ' is-sat' : '');
    grid.appendChild(el('div', cls, d));
  });

  const firstDow = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDow; i++) grid.appendChild(el('div', 'cal-cell is-blank'));

  const selectedDates = new Set(state.slots.map(s => s.date));
  const editing = editingSlot();
  const today = startOfToday();

  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(year, month, d);
    const key = dateKey(year, month, d);
    const holiday = JPHolidays.nameOf(key);

    const btn = el('button', 'cal-cell', String(d));
    if (date < today) btn.classList.add('is-past');
    else {
      if (date.getDay() === 0 || holiday) btn.classList.add('is-sun');
      else if (date.getDay() === 6) btn.classList.add('is-sat');
      btn.addEventListener('click', () => addSlot(key));
    }
    // titleだけだと読み上げ名が祝日名で上書きされるため、日付を含めたラベルを付ける
    btn.setAttribute('aria-label', `${d}日${holiday ? `（${holiday}）` : ''}`);
    if (holiday) btn.title = holiday;
    if (date.getTime() === today.getTime()) btn.classList.add('is-today');
    if (selectedDates.has(key)) btn.classList.add('has-slot');
    if (editing?.date === key) btn.classList.add('is-editing');
    grid.appendChild(btn);
  }
}

function renderTimeEditor() {
  const editor = document.getElementById('timeEditor');
  const slot = editingSlot();
  editor.hidden = !slot;
  if (!slot) return;

  document.getElementById('timeEditorTitle').textContent =
    OutputFormats.byId('standard').line({ ...slot, start: null });
  document.getElementById('timeEditorHint').textContent =
    !slot.start ? '開始時間をタップ' : !slot.end ? '終了時間をタップ' : 'タップで選び直し';

  const grid = document.getElementById('timeGrid');
  grid.replaceChildren();

  const startMin = slot.start ? toMinutes(slot.start) : null;
  const endMin = slot.end ? toMinutes(slot.end) : null;

  TIME_CHOICES.forEach(t => {
    const btn = el('button', 't-cell', t);
    const min = toMinutes(t);
    if (min === startMin || min === endMin) btn.classList.add('is-edge');
    else if (startMin !== null && endMin !== null && min > startMin && min < endMin) {
      btn.classList.add('is-range');
    }
    btn.addEventListener('click', () => pickTime(t));
    grid.appendChild(btn);
  });
}

function renderSlotList() {
  const list = document.getElementById('slotList');
  list.replaceChildren();

  sortedSlots().forEach(slot => {
    const row = el('div', 'slot-row' + (slot.id === state.editingId ? ' is-editing' : ''));

    const label = el('button', 'slot-label', OutputFormats.byId('standard').line(slot));
    label.title = '時間帯を編集';
    label.addEventListener('click', () =>
      update(s => { s.editingId = s.editingId === slot.id ? null : slot.id; }));

    const remove = el('button', 'slot-remove', '✕');
    remove.setAttribute('aria-label', '候補を削除');
    remove.addEventListener('click', () =>
      update(s => {
        s.slots = s.slots.filter(x => x.id !== slot.id);
        if (s.editingId === slot.id) s.editingId = null;
      }));

    row.append(label, remove);
    list.appendChild(row);
  });
}

function renderOutput() {
  const hasSlots = state.slots.length > 0;
  document.getElementById('output').hidden = !hasSlots;
  document.getElementById('emptyHint').hidden = hasSlots;
  if (!hasSlots) return;

  const picker = document.getElementById('formatPicker');
  picker.replaceChildren();
  OutputFormats.FORMATS.forEach(fmt => {
    const btn = el('button', 'format-option', fmt.label);
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(fmt.id === state.format));
    if (fmt.id === state.format) btn.classList.add('is-active');
    btn.addEventListener('click', () => update(s => { s.format = fmt.id; }));
    picker.appendChild(btn);
  });

  document.getElementById('noteText').textContent =
    OutputFormats.render(sortedSlots(), state.format);

  const copyBtn = document.getElementById('copyBtn');
  copyBtn.textContent = state.copied ? 'コピーしました！' : 'コピーする';
  copyBtn.classList.toggle('is-done', state.copied);
}

// ── 操作 ──────────────────────────────────────────

function addSlot(date) {
  update(s => {
    const slot = { id: nextId++, date, start: null, end: null };
    s.slots.push(slot);
    s.editingId = slot.id;
  });
}

// 1つのグリッドで範囲選択: 1回目=開始、2回目=終了。
// 開始より前（または同じ時刻）を押したら開始を選び直したとみなす。
function pickTime(t) {
  update(s => {
    const slot = editingSlot();
    if (!slot) return;
    if (!slot.start || slot.end || toMinutes(t) <= toMinutes(slot.start)) {
      slot.start = t;
      slot.end = null;
    } else {
      slot.end = t;
      s.editingId = null; // 範囲が決まったら編集終了
    }
  });
}

document.getElementById('noTimeBtn').addEventListener('click', () =>
  update(s => {
    const slot = editingSlot();
    if (slot) { slot.start = null; slot.end = null; }
    s.editingId = null;
  }));

document.getElementById('doneBtn').addEventListener('click', () =>
  update(s => { s.editingId = null; }));

document.getElementById('prevMonth').addEventListener('click', () =>
  update(s => {
    s.view.month--;
    if (s.view.month < 0) { s.view.month = 11; s.view.year--; }
  }));

document.getElementById('nextMonth').addEventListener('click', () =>
  update(s => {
    s.view.month++;
    if (s.view.month > 11) { s.view.month = 0; s.view.year++; }
  }));

document.getElementById('copyBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(OutputFormats.render(sortedSlots(), state.format))
    .then(() => {
      update(s => { s.copied = true; });
      setTimeout(() => update(s => { s.copied = false; }), 2000);
    })
    .catch(() => {
      const btn = document.getElementById('copyBtn');
      btn.textContent = 'コピーできませんでした';
      setTimeout(() => render(), 2000);
    });
});

// ── 初期化 ──────────────────────────────────────────

(async () => {
  await restore();
  render();
})();
