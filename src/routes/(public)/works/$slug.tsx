import { createFileRoute, notFound } from "@tanstack/react-router";
import { WorkDetailPage } from "@/features/works/WorkDetailPage";
import { getWorkBySlug, getWorkPath } from "@/features/works/works";
import { getPublicSiteUrl } from "@/lib/site.functions";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/(public)/works/$slug")({
  loader: async ({ params }) => {
    const work = getWorkBySlug(params.slug);
    if (!work) throw notFound();
    return { work, siteUrl: await getPublicSiteUrl() };
  },
  head: ({ loaderData }) => loaderData ? createSeoHead({
    siteUrl: loaderData.siteUrl,
    path: getWorkPath(loaderData.work.slug),
    title: `${loaderData.work.title} | WORKS | TOMO`,
    description: loaderData.work.description,
    image: {
      url: loaderData.work.image.src,
      alt: loaderData.work.image.alt,
      width: loaderData.work.image.width,
      height: loaderData.work.image.height,
    },
  }) : {},
  component: WorkRoute,
});

function WorkRoute() {
  return <WorkDetailPage work={Route.useLoaderData().work} />;
}
