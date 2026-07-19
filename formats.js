// 出力形式の定義
// 各形式は「書き出し文」と「候補1件を1行に整形する関数」を持つ。

const OutputFormats = (() => {
  const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'];
  const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parts(slot) {
    const [y, m, d] = slot.date.split('-').map(Number);
    return { y, m, d, dow: new Date(y, m - 1, d).getDay() };
  }

  // '09:30' → '9:30'
  function hm(t) {
    const [h, min] = t.split(':');
    return `${Number(h)}:${min}`;
  }

  function timeRange(slot, dash) {
    if (!slot.start) return '';
    return slot.end ? `${hm(slot.start)}${dash}${hm(slot.end)}` : `${hm(slot.start)}${dash}`;
  }

  const FORMATS = [
    {
      id: 'standard',
      label: '標準',
      line(slot) {
        const { m, d, dow } = parts(slot);
        const time = timeRange(slot, '〜');
        return `${m}月${d}日（${DOW_JA[dow]}）` + (time ? `　${time}` : '');
      },
    },
    {
      id: 'bullet',
      label: '箇条書き',
      line(slot) {
        const { m, d, dow } = parts(slot);
        const time = timeRange(slot, '-');
        return `・${m}/${d}（${DOW_JA[dow]}）` + (time ? ` ${time}` : '');
      },
    },
    {
      id: 'english',
      label: 'English',
      line(slot) {
        const { m, d, dow } = parts(slot);
        const time = timeRange(slot, '–');
        return `${DOW_EN[dow]}, ${MONTH_EN[m - 1]} ${d}` + (time ? `, ${time}` : '');
      },
    },
  ];

  function byId(id) {
    return FORMATS.find(f => f.id === id) ?? FORMATS[0];
  }

  function render(slots, formatId) {
    const fmt = byId(formatId);
    return slots.map(s => fmt.line(s)).join('\n');
  }

  return { FORMATS, byId, render };
})();

if (typeof module !== 'undefined') module.exports = OutputFormats;
