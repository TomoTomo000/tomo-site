import {
  createFileRoute,
  defaultStringifySearch,
  redirect,
  stripSearchParams,
} from "@tanstack/react-router";
import { z } from "zod";
import { BlogListPage } from "@/features/blog/components/BlogListPage";
import { getPublicPosts } from "@/features/blog/server/post.functions";
import { getPublicTags } from "@/features/blog/server/taxonomy.functions";
import { getPublicSiteUrl } from "@/lib/site.functions";
import { createSeoHead } from "@/lib/seo";

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  query: z.string().trim().max(100).catch(""),
  tag: z.string().trim().max(80).catch(""),
});

const defaultSearch = {
  page: 1,
  query: "",
  tag: "",
};

function canonicalSearchString(search: typeof defaultSearch): string {
  return defaultStringifySearch({
    ...(search.page === 1 ? {} : { page: search.page }),
    ...(search.query ? { query: search.query } : {}),
    ...(search.tag ? { tag: search.tag } : {}),
  });
}

export const Route = createFileRoute("/(public)/blog/")({
  validateSearch: searchSchema,
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps, location }) => {
    if (location.searchStr !== canonicalSearchString(deps)) {
      throw redirect({ to: "/blog", search: deps, replace: true });
    }

    const [posts, tags, siteUrl] = await Promise.all([
      getPublicPosts({ data: { ...deps, pageSize: 10 } }),
      getPublicTags(),
      getPublicSiteUrl(),
    ]);

    if (deps.tag && !tags.some((tag) => tag.slug === deps.tag)) {
      throw redirect({
        to: "/blog",
        search: { ...deps, page: 1, tag: "" },
        replace: true,
      });
    }

    if (deps.page > posts.pageCount) {
      throw redirect({
        to: "/blog",
        search: { ...deps, page: posts.pageCount },
        replace: true,
      });
    }

    return { posts, tags, siteUrl };
  },
  head: ({ match, loaderData }) => {
    if (!loaderData) return {};
    const { page, query, tag } = match.search;
    return createSeoHead({
      siteUrl: loaderData.siteUrl,
      path: `/blog${canonicalSearchString(match.search)}`,
      title: `${query ? `「${query}」の検索結果 | ` : tag ? `${loaderData.tags.find((item) => item.slug === tag)?.name ?? tag} | ` : ""}TOMO | フロントエンドエンジニア・WEBデザイナー | BLOG${page > 1 ? ` - ${page}ページ目` : ""}`,
      description: `フロントエンドエンジニア・WEBデザイナーTOMOのブログ。日々の制作で学んだことと、デザイン、コード、好きなものについてのブログです。${page > 1 ? `一覧の${page}ページ目です。` : ""}`,
      noindex: Boolean(query || tag),
    });
  },
  component: BlogIndexRoute,
});

function BlogIndexRoute() {
  const data = Route.useLoaderData();
  return (
    <BlogListPage
      posts={data.posts}
      search={Route.useSearch()}
      tags={data.tags}
    />
  );
}
