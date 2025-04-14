# Local Mark Server

Local Mark Server は、ローカル環境でマークダウンファイルを管理・編集するための高性能ウェブアプリケーションです。データベースを必要とせず、ファイルシステム上のマークダウンドキュメントを直接操作できる点が特徴です。Next.js、Bun、PM2 を基盤に構築され、高速なパフォーマンスと安定した運用を実現しています。

## 主要機能

### 高性能な Markdown エディタ

- **BlockNote**ベースの最新ブロックエディタを採用
- リアルタイムプレビューとインライン編集をサポート
- シンタックスハイライト、自動補完機能を標準搭載
- ドラッグ＆ドロップによるブロック操作
- ショートカットキーによる効率的な編集体験
- 画像の埋め込みと管理機能

### データベース不要のファイルシステム統合

- ローカルファイルシステムを直接操作する API アーキテクチャ
- ディレクトリ構造をリアルタイムで反映するファイルツリー
- YAML Front Matter によるメタデータ管理
- ファイル作成・移動・削除などの操作をブラウザから実行可能
- パス操作の最適化による高速なファイルアクセス

### リアルタイム同期

PartyKit を活用した WebSocket ベースの同期システムにより、複数クライアント間でのリアルタイムな変更の伝播を実現しています。操作変換（OT）アルゴリズムを採用し、編集の競合を自動的に解決します。

## ファイル構成

```
local-mark-server
├─ README.md
├─ app
│  ├─ @sidebar
│  │  └─ default.tsx
│  ├─ [...path]
│  │  ├─ FileEditor.tsx
│  │  ├─ PageClient.tsx
│  │  ├─ layout.tsx
│  │  ├─ page.module.css
│  │  └─ page.tsx
│  ├─ actions
│  │  ├─ client.ts
│  │  ├─ fileActions.ts
│  │  └─ server.ts
│  ├─ components
│  │  ├─ Breadcrumb.tsx
│  │  ├─ ClientPage.tsx
│  │  ├─ ContextMenuLayout.tsx
│  │  ├─ DirectoryList.module.scss
│  │  ├─ DirectoryList.tsx
│  │  ├─ DirectoryListDemo.tsx
│  │  ├─ FileList.tsx
│  │  ├─ FileTreeClient.tsx
│  │  ├─ FileTreeServer.tsx
│  │  ├─ FolderPage.tsx
│  │  ├─ Header.tsx
│  │  ├─ MenuTrigger.tsx
│  │  ├─ Providers.tsx
│  │  ├─ QuickmemoInfo.tsx
│  │  ├─ SearchTrigger.tsx
│  │  ├─ Sidebar.tsx
│  │  ├─ SidebarWrapper.tsx
│  │  └─ actions.ts
│  ├─ context
│  │  ├─ ContextMenuContext.tsx
│  │  ├─ EditorContext.tsx
│  │  ├─ SidebarContext.tsx
│  │  └─ TreeContext.tsx
│  ├─ favicon.ico
│  ├─ globals.css
│  ├─ hooks
│  │  ├─ useAppPath.ts
│  │  └─ usePath.ts
│  ├─ layout.module.css
│  ├─ layout.tsx
│  ├─ lib
│  │  ├─ blockCache.ts
│  │  ├─ fileSystem.ts
│  │  ├─ fileUtils.ts
│  │  ├─ hash.ts
│  │  └─ pathUtils.ts
│  ├─ page.module.css
│  ├─ page.tsx
│  ├─ quickmemo
│  │  ├─ QuickmemoEditor.tsx
│  │  ├─ SaveButton.tsx
│  │  ├─ page.module.css
│  │  ├─ page.tsx
│  │  └─ quickmemo.module.css
│  ├─ service-worker.ts
│  └─ types
│     ├─ errors.ts
│     └─ file.ts
├─ bun.lockb
├─ lib
│  ├─ pathHandler.server.ts
│  └─ pathHandler.ts
├─ next.config.js
├─ package.json
├─ pm2.config.js
├─ public
│  ├─ apple-touch-icon.jpg
│  └─ manifest.json
├─ scripts
│  ├─ deploy.js
│  └─ deploy.ts
├─ specstory-vscode-latest.vsix
├─ tsconfig.json
└─ types
   └─ yaml-front-matter.d.ts

```

## PM2 セットアップと操作ガイド

Local Mark Server では、PM2 を使用してアプリケーションをデーモンとして実行します。以下の手順でセットアップしてください。

### 前提条件

- Bun がインストールされていること
- PM2 がインストールされていること

### PM2 のインストール方法

このプロジェクトでは、Bun を使用して PM2 をインストールし、Node.js をインストールせずに使用する方法（シンボリックリンク方式）を採用しています。

```bash
# Bunをインストール（既にインストール済みの場合はスキップ）
curl -fsSL https://bun.sh/install | bash

# PM2をBunでインストール
bun install -g pm2

# Bunから'node'へのシンボリックリンクを作成
sudo ln -s $(which bun) /usr/local/bin/node

# 動作確認
pm2 -v
```

### アプリケーションの起動

pm2.config.js ファイルを使用してアプリケーションを起動します：

```bash
# プロジェクトルートディレクトリで実行
pm2 start pm2.config.js
```

### 実行状態の確認

```bash
# 実行中のアプリケーション一覧を表示
pm2 list

# 詳細情報を表示
pm2 show local-mark-server

# ログを表示
pm2 logs local-mark-server
```

### アプリケーションの再起動

コードを変更した後や、問題が発生した場合は再起動します：

```bash
# アプリケーションを再起動
pm2 restart local-mark-server

# または設定ファイルから再起動
pm2 restart pm2.config.js
```

### アプリケーションの停止

```bash
# アプリケーションを停止
pm2 stop local-mark-server
```

### アプリケーションの削除

```bash
# PM2の管理からアプリケーションを削除
pm2 delete local-mark-server
```

### システム起動時に自動起動する設定

サーバー再起動時にアプリケーションを自動的に起動するように設定：

```bash
# 現在の環境に対応した起動スクリプトを生成
pm2 startup

# 表示されたコマンドを実行（環境によって異なる）

# 現在の状態を保存
pm2 save
```

### モニタリング

PM2 のモニタリング画面でアプリケーションのリソース使用状況を確認：

```bash
pm2 monit
```

### トラブルシューティング

- **PM2 コマンドが動作しない場合**: シンボリックリンクが正しく作成されているか確認してください。
- **アプリケーション起動エラー**: ログを確認し、必要なポートが利用可能か確認してください。
- **パーミッションエラー**: 適切な権限でコマンドを実行しているか確認してください。

Bun を使用した PM2 の設定方法についての詳細は、[Bun 公式ドキュメント](https://bun.sh/guides/ecosystem/pm2)を参照してください。
