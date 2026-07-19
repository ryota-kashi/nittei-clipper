// Googleカレンダー用コンテンツスクリプト
// 画面右下にフローティングボタンを設置し、クリックでポップアップを起動する。
// ※ GoogleカレンダーはTrusted Typesを強制しているため、innerHTMLは使わず
//    DOM APIでSVGを構築する。

(() => {
  const BUTTON_ID = 'nittei-clipper-fab';
  if (document.getElementById(BUTTON_ID)) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
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

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.type = 'button';
  btn.title = '日程クリッパーを開く';
  btn.setAttribute('aria-label', '日程クリッパーを開く');
  btn.appendChild(svg);

  btn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'open-panel' });
  });

  document.documentElement.appendChild(btn);
})();
