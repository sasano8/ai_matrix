# AI Matrix

Chrome built-in AI の Prompt API で、ひとつの投稿を複数の観点に整理するフロントエンドアプリです。観点ごとに独立した深掘りカードを追加でき、選択したカードの話題・観点・本文を右側に表示します。元の投稿は話題の下から開閉できます。

## ローカルで起動

ビルドや依存関係のインストールは不要です。

```sh
cd /workspace/ai_matrix
python3 -m http.server 8000 --bind 127.0.0.1
```

Chrome で localhost のポート8000にアクセスしてください。静的ファイルを直接開くより、ローカルサーバーを使うことを推奨します。

## Chrome built-in AI

`LanguageModel.availability()` / `LanguageModel.create()` / `session.prompt()` と JSON Schema による構造化出力を使います。日本語・英語の入力と日本語の出力を宣言しています。利用には日本語モデルを扱える対応デスクトップ版 Chrome、HTTPS または localhost、モデルのダウンロードに必要な通信・空き容量が必要です。対応ハードウェア・地域・Chrome 設定などは [公式ガイド](https://developer.chrome.com/docs/ai/prompt-api) を確認してください。API が提供されない環境では解析ボタンを無効にして案内を表示します。サンプルは固定データで、実際の AI 回答と明確に区別しています。

投稿・結果・深掘り入力は、このブラウザの localStorage に保存します。別の投稿の解析が成功すると置き換わります。履歴一覧やサーバーへの送信はありません。保存内容を削除するには、このサイトのサイトデータを Chrome の設定から削除してください。共有端末での機密情報の入力には注意してください。AI 出力は事実確認が必要です。

## GitHub Pages

`.github/workflows/pages.yml` が main への push で静的ファイル3点をデプロイします。リポジトリの Settings → Pages → Build and deployment → Source を **GitHub Actions** に設定してください。サイトは通常 `https://sasano8.github.io/ai_matrix/` になります。相対パスで読み込むためサブパスに対応しています。API キーやバックエンドは不要です。

## 検証

`node --check app.js` で構文を確認できます。ブラウザの機能テストは `tests/browser.cjs` にあります。Playwright と Chromium を用意し、ローカルサーバーの起動後に `node tests/browser.cjs` を実行します。システムの Chromium を使う場合は `CHROMIUM_PATH=/usr/bin/chromium node tests/browser.cjs` を実行してください。Prompt API をモックしたテストは UI・リクエスト構成・エラー復旧を検証します。実際の端末内モデルによる生成品質やダウンロードは、対応する Chrome 上で別途確認してください。
