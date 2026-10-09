import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { CloseIcon } from "@/components/ui/Icons";
import { AppLink } from "@/components/ui/Link";
import type { PaginatedPosts, Taxonomy } from "../types/post.types";
import { BlogContainer } from "./BlogContainer";
import { PostCard } from "./PostCard";

type BlogSearch = {
  page: number;
  query: string;
  tag: string;
};

export function BlogListPage({
  posts,
  search,
  tags,
}: {
  posts: PaginatedPosts;
  search: BlogSearch;
  tags: Taxonomy[];
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  return (
    <main className="l-blog-list">
      <BlogContainer>
        <div className="m-page-heading">
          <h1 className="m-page-heading__title">BLOG</h1>
          <p className="m-page-heading__description m-page-heading__description--constrained">
            日々の制作で学んだことと、デザイン、コード、好きなものについてのブログです。
          </p>
        </div>

        <form
          className="m-blog-search"
          action="/blog"
          method="get"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            void navigate({
              to: "/blog",
              search: {
                page: 1,
                query: searchInputRef.current?.value.trim() ?? "",
                tag: "",
              },
            });
          }}
        >
          <label className="m-blog-search__label" htmlFor="blog-search">
            記事を検索
          </label>
          <div className="m-blog-search__field">
            <input
              ref={searchInputRef}
              id="blog-search"
              name="query"
              type="search"
              defaultValue={search.query}
              placeholder="記事を検索"
              maxLength={100}
              className="m-blog-search__input"
            />
            <IconButton
              size="sm"
              className="m-blog-search__clear"
              aria-label="検索語をクリア"
              onClick={() => {
                if (!searchInputRef.current) return;
                searchInputRef.current.value = "";
                searchInputRef.current.focus();
              }}
            >
              <CloseIcon className="m-blog-search__icon" />
            </IconButton>
          </div>
          <Button type="submit" size="lg">
            検索
          </Button>
        </form>

        {tags.length ? (
          <div className="l-blog-list__tags">
            <span className="l-blog-list__tags-label">タグ</span>
            {tags.map((tag) => (
              <AppLink
                key={tag.id}
                to="/blog"
                search={{
                  ...search,
                  page: 1,
                  tag: search.tag === tag.slug ? "" : tag.slug,
                }}
                variant="surface"
                data-selected={search.tag === tag.slug ? true : undefined}
                className={`l-blog-list__tag ${search.tag === tag.slug ? "l-blog-list__tag--selected" : ""}`}
              >
                #{tag.name}
              </AppLink>
            ))}
          </div>
        ) : null}

        {posts.items.length === 0 ? (
          <div className="m-empty-state">
            <p className="m-empty-state__title">
              {search.query || search.tag
                ? "条件に一致する記事はありません"
                : "まだ記事はありません"}
            </p>
          </div>
        ) : (
          <div className="l-blog-list__cards">
            {posts.items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {posts.pageCount > 1 ? (
          <nav className="m-pagination" aria-label="ページ送り">
            {posts.page > 1 ? (
              <AppLink
                to="/blog"
                search={{ ...search, page: posts.page - 1 }}
                variant="surface"
                className="m-pagination__link"
              >
                前へ
              </AppLink>
            ) : null}
            <p className="m-pagination__count">
              {posts.page} / {posts.pageCount}
            </p>
            {posts.page < posts.pageCount ? (
              <AppLink
                to="/blog"
                search={{ ...search, page: posts.page + 1 }}
                variant="surface"
                className="m-pagination__link"
              >
                次へ
              </AppLink>
            ) : null}
          </nav>
        ) : null}
      </BlogContainer>
    </main>
  );
}
