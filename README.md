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
