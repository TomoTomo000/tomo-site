import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Icons";
import { ButtonLink } from "@/components/ui/Button";
import { AnchorLink, AppLink } from "@/components/ui/Link";
import type { PostDetail } from "../types/post.types";
import { ArticleBody } from "./ArticleBody";
import { BlogContainer } from "./BlogContainer";
import { formatPostDate } from "./date";
import { useArticleHashScroll } from "./useArticleHashScroll";

export function BlogArticlePage({ post }: { post: PostDetail }) {
  const { articleRef, scrollToHeading } = useArticleHashScroll(post.id);
  const hasTableOfContents = post.tableOfContents.length >= 2;

  return (
    <main ref={articleRef} className="py-12">
      <BlogContainer>
        <nav
          className="mb-8 text-xs text-muted"
          aria-label="パンくずリスト"
        >
          <ol className="flex min-w-0 items-center gap-2">
            <li className="shrink-0">
              <AppLink
                to="/blog"
                search={{ page: 1, query: "", tag: "" }}
                className="font-bold"
              >
                BLOG
              </AppLink>
            </li>
            <li className="shrink-0 text-muted" aria-hidden="true">
              <ChevronRightIcon className="size-3.5" />
            </li>
            <li
              className="min-w-0 truncate"
              aria-current="page"
              title={post.title}
            >
              {post.title}
            </li>
          </ol>
        </nav>

        <article>
          <div>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">
              {post.title}
            </h1>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
              <time dateTime={post.publishedAt ?? undefined}>
                公開 {formatPostDate(post.publishedAt)}
              </time>
              <time dateTime={post.updatedAt}>
                更新 {formatPostDate(post.updatedAt)}
              </time>
              <span>約{post.readingMinutes}分</span>
            </div>
            {post.tags.length ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <li key={tag.id}>
                    <AppLink
                      to="/blog"
                      search={{ page: 1, query: "", tag: tag.slug }}
                      className="inline-flex text-xs font-bold text-ink"
                    >
                      #{tag.name}
                    </AppLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {post.cover ? (
            <img
              src={post.cover.displayUrl}
              alt={post.cover.altText}
              width={post.cover.width}
              height={post.cover.height}
              className="mx-auto mt-10 aspect-[1.91/1] w-full max-w-4xl rounded-2xl object-cover"
            />
          ) : null}

          <div className="mt-12 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="flex min-w-0 flex-col gap-6">
              <ArticleBody html={post.contentHtml} />
              <section
                className="rounded-2xl bg-surface p-5"
                aria-labelledby="article-author-title"
              >
                <h2
                  id="article-author-title"
                  className="text-sm font-bold text-ink"
                >
                  この記事を書いた人
                </h2>

                <div className="mt-4 flex items-center gap-3">
                  <div className="size-20 shrink-0 overflow-hidden rounded-full bg-canvas">
                    <img
                      src="/img/about-profile.svg"
                      alt="TOMOのプロフィールイラスト"
                      width={349}
                      height={398}
                      className="size-full object-cover object-top"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black">TOMO</p>
                      <ButtonLink
                        to="/about"
                        size="sm"
                        className="shrink-0"
                      >
                        プロフィールを見る
                      </ButtonLink>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      WEB制作・開発会社で、フロントエンドエンジニア・WEBデザイナーとして働いています。
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {hasTableOfContents ? (
              <aside className="order-first lg:order-last lg:sticky lg:top-[calc(var(--article-header-height)+1rem)] lg:max-h-[calc(100dvh-var(--article-header-height)-2rem)] lg:overflow-y-auto">
                <details
                  className="group rounded-2xl bg-surface p-5"
                  open
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
                    <span>目次</span>
                    <ChevronDownIcon
                      className="size-5 shrink-0 text-ink group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <ol className="mt-4 space-y-3 text-sm text-muted">
                    {post.tableOfContents.map((item) => (
                      <li
                        key={item.id}
                        style={{
                          paddingLeft: `${(item.level - 2) * 12}px`,
                        }}
                      >
                        <AnchorLink
                          href={`#${item.id}`}
                          onClick={(event) => {
                            if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                              scrollToHeading();
                            }
                          }}
                          className={
                            item.level === 2
                              ? "font-bold text-ink"
                              : "text-xs leading-5 text-muted"
                          }
                        >
                          {item.text}
                        </AnchorLink>
                      </li>
                    ))}
                  </ol>
                </details>
              </aside>
            ) : null}
          </div>
        </article>
      </BlogContainer>
    </main>
  );
}
