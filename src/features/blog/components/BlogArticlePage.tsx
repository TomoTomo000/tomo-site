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
    <main ref={articleRef} className="l-blog-detail">
      <BlogContainer>
        <nav className="m-breadcrumb" aria-label="パンくずリスト">
          <ol className="m-breadcrumb__list">
            <li className="m-breadcrumb__item">
              <AppLink
                to="/blog"
                search={{ page: 1, query: "", tag: "" }}
                className="m-breadcrumb__link"
              >
                BLOG
              </AppLink>
            </li>
            <li className="m-breadcrumb__separator" aria-hidden="true">
              <ChevronRightIcon className="m-breadcrumb__icon" />
            </li>
            <li
              className="m-breadcrumb__current"
              aria-current="page"
              title={post.title}
            >
              {post.title}
            </li>
          </ol>
        </nav>

        <article>
          <div>
            <h1 className="l-blog-detail__title">{post.title}</h1>
            <div className="l-blog-detail__meta">
              <time dateTime={post.publishedAt ?? undefined}>
                公開 {formatPostDate(post.publishedAt)}
              </time>
              <time dateTime={post.updatedAt}>
                更新 {formatPostDate(post.updatedAt)}
              </time>
              <span>約{post.readingMinutes}分</span>
            </div>
            {post.tags.length ? (
              <ul className="l-blog-detail__tags">
                {post.tags.map((tag) => (
                  <li key={tag.id}>
                    <AppLink
                      to="/blog"
                      search={{ page: 1, query: "", tag: tag.slug }}
                      className="l-blog-detail__tag"
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
              className="l-blog-detail__cover"
            />
          ) : null}

          <div className="l-blog-detail__body">
            <div className="l-blog-detail__content">
              <ArticleBody html={post.contentHtml} />
              <section
                className="m-article-author"
                aria-labelledby="article-author-title"
              >
                <h2
                  id="article-author-title"
                  className="m-article-author__title"
                >
                  この記事を書いた人
                </h2>

                <div className="m-article-author__body">
                  <div className="m-article-author__portrait">
                    <img
                      src="/img/about-profile.svg"
                      alt="TOMOのプロフィールイラスト"
                      width={349}
                      height={398}
                      className="m-article-author__image"
                    />
                  </div>
                  <div className="m-article-author__content">
                    <div className="m-article-author__heading">
                      <p className="m-article-author__name">TOMO</p>
                      <ButtonLink
                        to="/about"
                        size="sm"
                        className="m-article-author__link"
                      >
                        プロフィールを見る
                      </ButtonLink>
                    </div>
                    <p className="m-article-author__description">
                      WEB制作・開発会社で、フロントエンドエンジニア・WEBデザイナーとして働いています。
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {hasTableOfContents ? (
              <aside className="l-blog-detail__toc">
                <details className="m-article-toc" open>
                  <summary className="m-article-toc__summary">
                    <span>目次</span>
                    <ChevronDownIcon
                      className="m-article-toc__icon"
                      aria-hidden="true"
                    />
                  </summary>
                  <ol className="m-article-toc__list">
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
                            if (
                              event.button === 0 &&
                              !event.metaKey &&
                              !event.ctrlKey &&
                              !event.shiftKey &&
                              !event.altKey
                            ) {
                              scrollToHeading();
                            }
                          }}
                          className={
                            item.level === 2
                              ? "m-article-toc__link m-article-toc__link--heading"
                              : "m-article-toc__link m-article-toc__link--nested"
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
