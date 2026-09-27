import { ButtonLink } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background text-center text-ink">
      <div>
        <p className="text-4xl font-black leading-none sm:text-5xl 2xl:text-6xl">
          404
        </p>
        <h1 className="mt-6 text-base font-bold">
          ページが見つかりません
        </h1>
        <p className="mt-6 text-xs text-muted">
          URLが変更されたか、ページが削除された可能性があります。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/">トップページに戻る</ButtonLink>
        </div>
      </div>
    </main>
  );
}
