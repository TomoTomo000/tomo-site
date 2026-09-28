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
    <main className="py-12">
      <BlogContainer>
        <div className="text-center">
          <h1 className="text-3xl font-black sm:text-5xl">BLOG</h1>
          <p className="mx-auto mt-7 max-w-lg text-sm leading-7 text-ink sm:text-base">
            日々の制作で学んだことと、デザイン、コード、好きなものについてのブログです。
          </p>
        </div>

        <form
          className="mt-12 flex gap-3"
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
          <label className="sr-only" htmlFor="blog-search">
            記事を検索
          </label>
          <div className="relative min-w-0 flex-1">
            <input
              ref={searchInputRef}
              id="blog-search"
              name="query"
              type="search"
              defaultValue={search.query}
              placeholder="記事を検索"
              maxLength={100}
              className="blog-search-input peer w-full rounded-full bg-surface py-3.5 pl-5 pr-14 text-sm outline-none ring-ink transition-shadow focus:ring-2"
            />
            <IconButton
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 peer-placeholder-shown:hidden"
              aria-label="検索語をクリア"
              onClick={() => {
                if (!searchInputRef.current) return;
                searchInputRef.current.value = "";
                searchInputRef.current.focus();
              }}
            >
              <CloseIcon className="size-4" />
            </IconButton>
          </div>
          <Button
            type="submit"
            size="lg"
          >
            検索
          </Button>
        </form>

        {tags.length ? (
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-xs font-bold text-muted">タグ</span>
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
                className={`rounded-full px-4 py-2 font-bold ${search.tag === tag.slug ? "bg-canvas text-background" : "bg-surface"}`}
              >
                #{tag.name}
              </AppLink>
            ))}
          </div>
        ) : null}

        {posts.items.length === 0 ? (
          <div className="mt-12 rounded-2xl bg-surface px-6 py-16 text-center">
            <p className="text-lg font-bold">
              {search.query || search.tag
                ? "条件に一致する記事はありません"
                : "まだ記事はありません"}
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {posts.items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {posts.pageCount > 1 ? (
          <nav
            className="mt-12 flex items-center justify-center gap-4"
            aria-label="ページ送り"
          >
            {posts.page > 1 ? (
              <AppLink
                to="/blog"
                search={{ ...search, page: posts.page - 1 }}
                variant="surface"
                className="rounded-full bg-surface px-5 py-2 text-sm font-bold"
              >
                前へ
              </AppLink>
            ) : null}
            <p className="text-sm text-muted">
              {posts.page} / {posts.pageCount}
            </p>
            {posts.page < posts.pageCount ? (
              <AppLink
                to="/blog"
                search={{ ...search, page: posts.page + 1 }}
                variant="surface"
                className="rounded-full bg-surface px-5 py-2 text-sm font-bold"
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
