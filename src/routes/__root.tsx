import type { ReactNode } from "react";
import { Toaster } from "sonner";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import figtreeCss from "@fontsource-variable/figtree/wght.css?url";
import notoSansJpCss from "@fontsource-variable/noto-sans-jp/wght.css?url";
import { NotFoundPage } from "@/components/elements/NotFoundPage";
import { PageLoader } from "@/features/page-loader/PageLoader";
import { PageLoaderProvider } from "@/features/page-loader/PageLoaderProvider";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";
import { usePageStylesheet } from "@/components/layout/usePageStylesheet";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "description",
        content: SITE_DESCRIPTION,
      },
      { title: SITE_TITLE },
    ],
    links: [
      { rel: "stylesheet", href: figtreeCss },
      { rel: "stylesheet", href: notoSansJpCss },
      { rel: "icon", href: "/favicon.ico" },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "TOMO BLOG",
        href: "/feed.xml",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function RootComponent() {
  const stylesheet = usePageStylesheet();

  return (
    <RootDocument styles={stylesheet.links}>
      <PageLoaderProvider isStylesLoading={stylesheet.pending}>
        <PageLoader />
        {stylesheet.failed ? (
          <div className="m-page-loader" role="alert">
            <div className="m-page-loader__content">
              <p className="m-page-loader__title">
                ページを表示できませんでした。
              </p>
              <button
                className="m-page-loader__retry"
                onClick={() => window.location.reload()}
              >
                再読み込み
              </button>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </PageLoaderProvider>
    </RootDocument>
  );
}

function RootDocument({
  children,
  styles,
}: Readonly<{ children: ReactNode; styles: ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
        {styles}
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-left"
          style={{ fontFamily: "inherit" }}
          richColors
          closeButton
          duration={5000}
          containerAriaLabel="通知"
          toastOptions={{ closeButtonAriaLabel: "通知を閉じる" }}
        />
        <Scripts />
      </body>
    </html>
  );
}
