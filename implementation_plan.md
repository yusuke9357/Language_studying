# 開発計画 - カランメソッド英語学習Webアプリケーション（フェーズ2：詳細要件追加）

ユーザー様から追加された以下の機能要件に基づき、アプリケーションを拡張・設計します。

1. **カランメソッドの解像度向上**（即答性、発話・認識への特化）
2. **カリキュラムの別ドキュメント化**（[curriculum.md](file:///Users/yusuke/Library/Mobile%20Documents/com~apple~CloudDocs/Dev/Language_studying/curriculum.md)の作成）
3. **ユーザー名ログイン機能**（"yusuke"などを入力して個別進捗を同期）
4. **線画レベルのイラスト表示機能**（質問文のシチュエーションに応じたSVG線画を動的に表示）
5. **発話の判定・修正フィードバックの強化**（文字起こしミスや発音傾向の補足アドバイス）
6. **Webデプロイ対応**（サーバーレスSPAをGitHub PagesまたはVercelへデプロイする選定・手順）

---

## ユーザーレビューが必要な項目

> [!IMPORTANT]
> - **デプロイ先の選定**: 静的SPAのため、**GitHub Pages** または **Vercel** へのデプロイが最適です。
>   - **GitHub Pages（推奨）**: GitHubアカウントをすでにお持ちで、GistのTokenも使用するため、このプロジェクトをGitHubリポジトリにプッシュするだけで完全無料で公開できます。
>   - **Vercel**: GitHubと連携して1クリックでデプロイでき、非常に高速で独自ドメインなどの設定も簡単です。
>   - *本計画の承認後、デプロイ方法の手順ガイドを作成します。*
> - **イラストのデザイン**: シンプルでモダンなSVG線画（ペン、テーブル、閉じた/開いた箱、椅子に座る人など）をJavaScript内にSVGコードとして定義し、質問ID（例: `s1-l1-q1`）に合わせてカード上にインライン描画します。

---

## 提案する変更点・ファイル構成

カリキュラム情報のドキュメント化と、SPAロジックの機能追加を行います。

```
/Users/yusuke/Library/Mobile Documents/com~apple~CloudDocs/Dev/Language_studying/
├── index.html            # [MODIFY] ログイン画面、イラスト描画領域、発音補足エリアを追加
├── curriculum.md         # [NEW] カリキュラムの全貌を記述したドキュメント（ソースオブトゥルース）
├── css/
│   └── styles.css        # [MODIFY] ログインUI、SVGアニメーション、イラストボックスのスタイル
└── js/
    ├── api.js            # [MODIFY] 発音判定・音声修正用のプロンプト強化
    ├── storage.js        # [MODIFY] ユーザー名キーで管理するマルチユーザー対応Gist JSON構造
    ├── curriculum.js     # [MODIFY] curriculum.mdと完全同期したJSデータ
    ├── ui.js             # [MODIFY] 動的SVGイラスト描画機能、ログイン画面制御の追加
    └── app.js            # [MODIFY] ログイン遷移、イラストローダー、修正フィードバック処理の統合
```

---

### 詳細設計

#### 1. カリキュラムドキュメントの作成 (curriculum.md)
プログラムとコンテンツを分離し、ユーザーがいつでも質問一覧を俯瞰できるように [curriculum.md](file:///Users/yusuke/Library/Mobile%20Documents/com~apple~CloudDocs/Dev/Language_studying/curriculum.md) を作成します。
JS側のデータ（`js/curriculum.js`）はこれと1対1で対応し、APIを消費せずに高速にクイズデータを読み込みます。

#### 2. ユーザーログイン機能 (yusukeログイン)
- 起動時に「ユーザー名を入力してください（例: yusuke）」というシンプルなログイン画面を表示します。
- Gistの `callan_db.json` のデータ構造を以下のように変更し、同一Gistで複数ユーザーの進捗・履歴を干渉せずに管理可能にします。
  ```json
  {
    "users": {
      "yusuke": {
        "progress": { "currentStage": 1, "currentLesson": 2, ... },
        "history": [ ... ]
      },
      "guest": { ... }
    },
    "apiKey": "gemini_key_xxx",
    "settings": { ... }
  }
  ```

#### 3. 線画レベルのイラスト表示機能
カランメソッドの「絵を見て答える」体験をシミュレートするため、質問カード内に `id="question-illustration"` というSVG描画コンテナを設けます。
質問IDごとに、適したラインアートSVGをJavaScriptから動的に出力します。
- **ペン/鉛筆 (Pen/Pencil)**: シャープなペンの線画。
- **テーブル/椅子 (Table/Chair)**: シンプルなアングル付きの机と椅子の線画。
- **箱 (Box)**: 閉じた箱のイラスト。質問が「Is the box open?」等の場合は、フタが開いた箱のSVGに切り替えます。
- **座る/立つ (Sitting/Standing)**: 椅子に座っているピクトグラム風の線画、または立っている状態の線画。
- **長い/短い (Long/Short)**: 2本の長さが異なるバーの対比線画。

#### 4. 発音・音声修正フィードバックの強化
Gemini API の評価プロンプトを強化します。
音声認識（STT）で起こりやすい「LとR」「VとB」「SとTH」などの聞き取りミスやスペル差分をGeminiが推測し、以下のようにアドバイスを返すようにします。
- ユーザーの発話: "They are notebooks" -> 目標: "Those aren't books"
- Geminiのアドバイス: 「音声は They are と認識されました。カランメソッドの指示代名詞 Those と短縮形 aren't を発音するように意識しましょう。『ズ』の濁音と『アール』の響きをはっきりと発音すると認識されやすくなります。」

---

## 検証計画

### 動作テスト
- `curriculum.md` の作成とJSデータ同期のチェック。
- ログイン画面に「yusuke」と入力した際、対応するユーザーデータが読み込まれるか。
- 各質問に進んだ際、画面に適切なSVG線画イラストが表示され、隠し・表示切り替えが動作するか。
- 発話をわざと間違えた際、Geminiから具体的な修正アドバイスがフィードバックパネルに表示されるか。
- GitHub PagesまたはVercelへのデプロイ後に、モバイル実機からアクセスして同様に動作するか。
