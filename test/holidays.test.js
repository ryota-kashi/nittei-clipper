// 祝日計算エンジンの検証（内閣府公表の2025〜2027年祝日一覧と突合）
// 実行: node test/holidays.test.js

const JPHolidays = require('../holidays.js');

const EXPECTED = {
  2025: [
    '2025-01-01','2025-01-13','2025-02-11','2025-02-23','2025-02-24',
    '2025-03-20','2025-04-29','2025-05-03','2025-05-04','2025-05-05','2025-05-06',
    '2025-07-21','2025-08-11','2025-09-15','2025-09-23','2025-10-13',
    '2025-11-03','2025-11-23','2025-11-24',
  ],
  2026: [
    '2026-01-01','2026-01-12','2026-02-11','2026-02-23',
    '2026-03-20','2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06',
    '2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23','2026-10-12',
    '2026-11-03','2026-11-23',
  ],
  2027: [
    '2027-01-01','2027-01-11','2027-02-11','2027-02-23',
    '2027-03-21','2027-03-22','2027-04-29','2027-05-03','2027-05-04','2027-05-05',
    '2027-07-19','2027-08-11','2027-09-20','2027-09-23','2027-10-11',
    '2027-11-03','2027-11-23',
  ],
};

let failed = 0;
for (const [year, expected] of Object.entries(EXPECTED)) {
  const actual = [...JPHolidays.holidaysOf(Number(year)).keys()].sort();
  const exp = [...expected].sort();
  const missing = exp.filter(d => !actual.includes(d));
  const extra = actual.filter(d => !exp.includes(d));
  if (missing.length || extra.length) {
    failed++;
    console.error(`✗ ${year}: 不足=${JSON.stringify(missing)} 過剰=${JSON.stringify(extra)}`);
  } else {
    console.log(`✓ ${year}: ${actual.length}件 一致`);
  }
}

if (failed) { process.exit(1); }
console.log('全テスト成功');
