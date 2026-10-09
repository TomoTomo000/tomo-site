import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { getPageStylesheet } from "@/lib/page-styles";
import notFoundCss from "@/styles/pages/not-found.scss?url";
import blogErrorCss from "@/styles/pages/blog-error.scss?url";

const fallbackStyles = { notFound: notFoundCss, error: blogErrorCss };

export function usePageStylesheet() {
  const requestedHref = useRouterState({
    select: (state) => getPageStylesheet(state.matches, fallbackStyles),
  });
  // On a document load the server-rendered stylesheet blocks the first paint.
  const [loadedHref, setLoadedHref] = useState(requestedHref);
  const [failedHref, setFailedHref] = useState<string>();
  const pending = requestedHref !== loadedHref;
  const failed = failedHref === requestedHref;

  const links = (
    <>
      {pending && (
        <link
          key={loadedHref}
          rel="stylesheet"
          href={loadedHref}
          data-page-stylesheet="active"
        />
      )}
      <link
        key={requestedHref}
        rel="stylesheet"
        href={requestedHref}
        media={pending ? "not all" : "all"}
        data-page-stylesheet={pending ? "pending" : "active"}
        onLoad={(event) => {
          // Ignore a late event from a navigation that has already been replaced.
          if (event.currentTarget.isConnected) {
            setLoadedHref(requestedHref);
            setFailedHref(undefined);
          }
        }}
        onError={(event) => {
          if (event.currentTarget.isConnected) setFailedHref(requestedHref);
        }}
      />
    </>
  );

  // No precedence: React manages these as ordinary, removable link elements.
  // Once the pending sheet loads, the old link unmounts in the same commit.
  return { links, pending: pending && !failed, failed };
}
