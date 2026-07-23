# Chrome Web Store 掲載用テキスト

## 拡張機能名（45文字以内）

```
日程クリッパー — 日程調整の候補日をサッと作ってコピー
```

（短くする場合: `日程クリッパー`）

## 簡潔な説明（132文字以内 / 検索結果・一覧に表示）

```
カレンダーで日付をタップ、時間帯はタップ2回。日程調整の候補日リストを数クリックで作ってワンクリックでコピー。祝日対応・テーマ切替・サイドパネル対応。
```

## 詳細説明

```
メールやSlackでの日程調整、候補日を手打ちしていませんか？

日程クリッパーは、ツールバーのアイコンからワンクリックで開くサイドパネルで、
日程調整の候補日リストを数クリックで作成・コピーできる拡張機能です。
カレンダーやメール画面と重ならず、見ながら候補を選べます。

【使い方はシンプル】
1. カレンダーで日付をタップ（複数選択OK）
2. 時間帯は1回目のタップで開始、2回目で終了。時間なしの「終日」候補もOK
3. 「コピーする」を押せば、貼り付けるだけの候補リストが完成

【出力例】
7月20日（月）
7月22日（水）　14:00〜15:00

【便利な機能】
・候補は1件ずつ削除・時間の編集が可能。作り直しのストレスがありません
・出力形式を選択可能: 標準／箇条書き（・7/22（水） 14:00-15:00）／English（Wed, Jul 22, 14:00–15:00）
・日本の祝日を自動判定してカレンダーに色付き表示。祝日データは内蔵の計算エンジンが
　毎年自動で算出するため、更新不要でずっと使えます
・Googleカレンダーを開いているときは、画面右下のボタンからサイドパネルで起動。
　予定と重ならず、カレンダーを見ながら候補を選べます
・「予定から取り込み」をONにすると、Googleカレンダーの空き枠をドラッグするだけで
　その時間帯がそのまま候補に。選んだ候補はカレンダー上にも色付きで表示されます
・パネルを閉じると候補は自動リセット。次の日程調整はまっさらな状態から始められます
・出力形式の好みは同じGoogleアカウントのChrome間で同期
・テーマを選択可能: 紙白／藍染め／セピア／OSに合わせて自動切替

【安心設計】
・外部サーバーとの通信は一切ありません。すべての処理が端末内で完結します
・個人情報の収集・送信はゼロ。権限もクリップボードへの書き込みと設定保存の2つだけ

日程調整の「候補日を書き出す1分」を「3クリックの5秒」に。
ぜひお試しください。
```

## カテゴリ / 言語

- カテゴリ: 仕事効率化（Productivity）
- 言語: 日本語

## プライバシー関連（デベロッパーダッシュボードの入力欄）

### 単一用途の説明（Single purpose description）

```
Create a list of proposed meeting dates/times and copy it to the clipboard for scheduling coordination.
（日程調整用の候補日時リストを作成し、クリップボードにコピーする。）
```

### 権限の使用理由（Permission justifications / 英語先行+日本語併記）

- **clipboardWrite**:
  ```
  Used only when the user clicks the "Copy" button, to write the generated list of proposed dates/times to the clipboard. The extension never reads the clipboard.
  （ユーザーが「コピーする」を押したときに、作成した候補日時のテキストをクリップボードへ書き込むためだけに使用します。読み取りは行いません。）
  ```
- **storage**:
  ```
  Used to keep the user's own selections: currently selected date/time candidates (storage.session) and preferences for output format and theme (storage.sync). No data ever leaves the device; nothing is transmitted externally.
  （選択中の候補日時と、出力形式・テーマの設定を保存するために使用します。外部送信は一切ありません。）
  ```
- **sidePanel**:
  ```
  Used to display the extension's UI (the date-candidate builder) in the browser side panel, opened from the toolbar icon or from a button on Google Calendar, so it does not overlap the user's calendar or email content.
  （本拡張機能のUIをサイドパネルとして表示するために使用します。カレンダーやメール画面と重ならずに候補を選べるようにするためです。）
  ```
- **ホスト権限（calendar.google.com）**:
  ```
  Limited to calendar.google.com only, to display a small launcher button at the bottom-right of Google Calendar. The extension never reads or modifies any calendar events or page content.
  （calendar.google.com のみを対象に、起動ボタンを表示するために使用します。予定・内容の読み取りや変更は一切行いません。）
  ```

### データ使用の開示（Data usage）

- ユーザーデータの収集: **なし**（すべての項目で「収集しない」を選択）
- リモートコードの使用: **なし**

## 掲載用アセット（作成済み → docs/store-assets/）

- ストアアイコン: 128×128 PNG（`src/icons/icon128.png` をそのまま使用）
- スクリーンショット 1280×800（アップロード順の推奨）:
  1. `store-shot-1.png` … 候補リスト完成+コピー（ヒーロー）
  2. `store-shot-2.png` … 時間帯の範囲選択
  3. `store-shot-3.png` … 出力形式の切り替え（箇条書き）
  4. `store-shot-4.png` … テーマ（藍染め/セピア）
- プロモーションタイル（小 440×280）: `store-tile.png`
- 再生成する場合: リポジトリルートをHTTP配信し `scripts/store-shots.html?scene=1〜4|tile` をキャプチャ

## English（他言語対応する場合の下訳）

- Name: `Nittei Clipper — Quick scheduling suggestions`
- Short description:
  ```
  Tap dates, pick a time range with two taps, and copy a ready-to-paste list of meeting time options. Japanese holidays built in. Dark mode ready.
  ```
