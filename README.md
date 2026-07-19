# 日程クリッパー（Chrome拡張）

日程候補の提案文を、ツールバーのポップアップから数クリックで作成・コピーできる
Chrome拡張機能。

© Ryota Kashiwagi

## 使い方

1. カレンダーで日付をクリックすると候補に追加される（複数可）
2. 時間帯は1つのグリッドで範囲選択 — 1回目のタップで開始、2回目で終了（時間なしでもOK）
3. 候補は1件ずつ削除・時間の再編集が可能
4. 出力形式（標準／箇条書き／English）を選んで「コピーする」

- 候補の選択状態はポップアップを閉じても保持（ブラウザ再起動で消去）
- 出力形式の選択は `chrome.storage.sync` で端末をまたいで保存

## 特徴

- **祝日を計算で導出**: 静的データではなく祝日法ルール（固定祝日・ハッピーマンデー・
  春分/秋分の天文近似式・振替休日・国民の休日）から算出するため、何年先でも正しく動く
- **状態駆動アーキテクチャ**: 単一のstateとrender()による一方向データフロー
- **Googleカレンダー連携**: calendar.google.com の画面右下の起動ボタンから**サイドパネル**で開く
  （カレンダーの予定と重ならずに並べて使える）
- ダークモード対応（OS設定に自動追従）、reduced-motion対応

## インストール

1. Chromeで `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をON
3. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択

## 構成

- `manifest.json` … Manifest V3（権限: clipboardWrite / storage / calendar.google.com）
- `popup.html` / `popup.css` / `popup.js` … ポップアップ本体（ビルド不要）
- `background.js` … サービスワーカー（カレンダー上のボタンからポップアップを起動）
- `content.js` / `content.css` … Googleカレンダー用の起動ボタン
- `holidays.js` … 日本の祝日計算エンジン
- `formats.js` … 出力形式の定義
- `test/holidays.test.js` … 祝日エンジンの検証（`node test/holidays.test.js`）
- `icons/` … アイコン
- `docs/` … 設計メモ
