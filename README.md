# tomo-site

フロントエンドエンジニア・WEBデザイナーTOMOのWEBサイトです。制作実績や日々の学び、コーディング・デザインについての備忘録をまとめています。

## 構成

- Astro（公開サイト） / React（お問い合わせフォーム）
- Bun workspaces（モノレポ）
- SCSS（Dart Sass / sass-embedded）
- microCMS（記事・タグ・画像）
- Cloudflare Workers（WEBアプリの配信）
- Resend（お問い合わせ通知メール）
- Cloudflare Turnstile（お問い合わせのボット対策）

## コマンド

```powershell
bun run dev
bun run lint
bun run typecheck
bun run test
bun run build
bun run preview
bun run cf-typegen
```

検証後のデプロイは `bun run deploy` で行います。

開発サーバーは `http://127.0.0.1:4321` で起動します。
