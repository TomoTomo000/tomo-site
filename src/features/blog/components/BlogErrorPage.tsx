import { Button, ButtonLink } from "@/components/ui/Button";

export function BlogErrorPage() {
  return (
    <main className="l-error">
      <div>
        <p className="l-error__code">TEMPORARY ERROR</p>
        <h1 className="l-error__title">記事を読み込めませんでした</h1>
        <p className="l-error__description">
          一時的に通信できない可能性があります。
          <br />
          時間をおいて、もう一度お試しください。
        </p>
        <div className="l-error__actions">
          <Button onClick={() => window.location.reload()}>
            もう一度読み込む
          </Button>
          <ButtonLink
            to="/blog"
            search={{ page: 1, query: "", tag: "" }}
            variant="secondary"
          >
            記事一覧を見る
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
