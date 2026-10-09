import { ButtonLink } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <main className="l-error">
      <div>
        <p className="l-error__code">404</p>
        <h1 className="l-error__title">ページが見つかりません</h1>
        <p className="l-error__description">
          URLが変更されたか、ページが削除された可能性があります。
        </p>
        <div className="l-error__actions">
          <ButtonLink to="/">トップページに戻る</ButtonLink>
        </div>
      </div>
    </main>
  );
}
