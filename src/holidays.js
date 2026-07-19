// 日本の祝日計算エンジン
// 静的リストではなく現行の祝日法ルールから導出する（2020年以降の制度を前提）。
// 固定祝日・ハッピーマンデー・春分/秋分（天文近似式）・振替休日・国民の休日に対応。

const JPHolidays = (() => {
  // その月の第n週の月曜日（ハッピーマンデー用）
  function nthMonday(year, month, n) {
    const firstDow = new Date(year, month - 1, 1).getDay();
    const offset = (8 - firstDow) % 7; // 月初から最初の月曜まで
    return 1 + offset + (n - 1) * 7;
  }

  // 春分・秋分の日付（1980〜2099年で有効な近似式）
  function equinoxDay(year, base) {
    return Math.floor(base + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
  }

  // 振替休日・国民の休日を除いた「本来の祝日」を { 'M-D': 名称 } で返す
  function baseHolidays(year) {
    const h = {};
    h[`1-1`]  = '元日';
    h[`1-${nthMonday(year, 1, 2)}`] = '成人の日';
    h[`2-11`] = '建国記念の日';
    h[`2-23`] = '天皇誕生日';
    h[`3-${equinoxDay(year, 20.8431)}`] = '春分の日';
    h[`4-29`] = '昭和の日';
    h[`5-3`]  = '憲法記念日';
    h[`5-4`]  = 'みどりの日';
    h[`5-5`]  = 'こどもの日';
    h[`7-${nthMonday(year, 7, 3)}`] = '海の日';
    h[`8-11`] = '山の日';
    h[`9-${nthMonday(year, 9, 3)}`] = '敬老の日';
    h[`9-${equinoxDay(year, 23.2488)}`] = '秋分の日';
    h[`10-${nthMonday(year, 10, 2)}`] = 'スポーツの日';
    h[`11-3`]  = '文化の日';
    h[`11-23`] = '勤労感謝の日';
    return h;
  }

  const cache = new Map();

  // 指定年の全祝日を Map<'YYYY-MM-DD', 名称> で返す
  function holidaysOf(year) {
    if (cache.has(year)) return cache.get(year);

    const base = baseHolidays(year);
    const result = new Map();
    const key = (m, d) => `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    for (const [md, name] of Object.entries(base)) {
      const [m, d] = md.split('-').map(Number);
      result.set(key(m, d), name);
    }

    // 振替休日: 祝日が日曜なら、その後の最初の「祝日でない日」が休日になる
    for (const [md] of Object.entries(base)) {
      const [m, d] = md.split('-').map(Number);
      const date = new Date(year, m - 1, d);
      if (date.getDay() !== 0) continue;
      const sub = new Date(date);
      do { sub.setDate(sub.getDate() + 1); }
      while (base[`${sub.getMonth() + 1}-${sub.getDate()}`]);
      result.set(key(sub.getMonth() + 1, sub.getDate()), '振替休日');
    }

    // 国民の休日: 前日と翌日が祝日に挟まれた平日（日曜・振替休日を除く）
    for (const [md] of Object.entries(base)) {
      const [m, d] = md.split('-').map(Number);
      const mid = new Date(year, m - 1, d + 1);   // 祝日の翌日
      const next = new Date(year, m - 1, d + 2);  // 祝日の翌々日（月またぎもDateに任せる）
      const midMd = `${mid.getMonth() + 1}-${mid.getDate()}`;
      const nextMd = `${next.getMonth() + 1}-${next.getDate()}`;
      const midKey = key(mid.getMonth() + 1, mid.getDate());
      if (!base[midMd] && base[nextMd] && mid.getDay() !== 0 && !result.has(midKey)) {
        result.set(midKey, '国民の休日');
      }
    }

    cache.set(year, result);
    return result;
  }

  // 'YYYY-MM-DD' が祝日なら名称、そうでなければ null
  function nameOf(dateKey) {
    const year = Number(dateKey.slice(0, 4));
    return holidaysOf(year).get(dateKey) ?? null;
  }

  return { holidaysOf, nameOf };
})();

// Node.jsのテストから読み込めるようにする（ブラウザではグローバルのまま）
if (typeof module !== 'undefined') module.exports = JPHolidays;
