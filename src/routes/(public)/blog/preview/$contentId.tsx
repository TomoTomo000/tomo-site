import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BlogArticlePage } from "@/features/blog/components/BlogArticlePage";
import { getPreviewPostPageData } from "@/features/blog/server/post.functions";
import pageCss from "@/styles/pages/blog-preview.scss?url";

const previewSearchSchema = z.object({
  draftKey: z.string().max(200).catch(""),
  secret: z.string().max(200).catch(""),
});

export const Route = createFileRoute("/(public)/blog/preview/$contentId")({
  staticData: { pageStylesheet: pageCss },
  validateSearch: previewSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) =>
    getPreviewPostPageData({
      data: {
        contentId: params.contentId,
        draftKey: deps.draftKey,
        secret: deps.secret,
      },
    }),
  head: () => ({
    meta: [
      { title: "プレビュー | TOMO" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: PreviewRoute,
});

function PreviewRoute() {
  const { post } = Route.useLoaderData();
  return (
    <div className="l-blog-preview">
      <p className="l-blog-preview__notice">
        プレビューです。公開中の内容とは異なる場合があります。
      </p>
      <BlogArticlePage post={post} />
    </div>
  );
}
