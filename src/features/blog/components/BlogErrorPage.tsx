import { Button, ButtonLink } from "@/components/ui/Button";

export function BlogErrorPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background text-center text-ink">
      <div>
        <p className="text-4xl font-black leading-none sm:text-5xl 2xl:text-6xl">
          TEMPORARY ERROR
        </p>
        <h1 className="mt-6 text-base font-bold">
          記事を読み込めませんでした
        </h1>
        <p className="mt-6 text-xs text-muted">
          一時的に通信できない可能性があります。
          <br />
          時間をおいて、もう一度お試しください。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => window.location.reload()}
          >
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
