# tomo-site

フロントエンドエンジニア・WEBデザイナーTOMOのWEBサイトです。制作実績や日々の学び、コーディング・デザインについての備忘録をまとめています。

## 構成

- TanStack Start / React / Vite
- Tailwind CSS
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
