import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "@/components/ui/Icons";
import type { PostSummary } from "../types/post.types";
import { formatPostDate } from "./date";

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <article>
      <Link
        to="/blog/$slug"
        params={{ slug: post.slug }}
        className="group h-full flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface text-ink"
      >
        {post.cover ? (
          <img
            src={post.cover.displayUrl}
            alt={post.cover.altText}
            width={post.cover.width}
            height={post.cover.height}
            loading="lazy"
            className="aspect-[1.91/1] w-full object-cover"
          />
        ) : null}
        <div className="flex flex-1 flex-col px-5 py-6">
          <div className="flex justify-end text-sm font-bold">
            <time
              dateTime={post.publishedAt ?? undefined}
              className="text-xs font-medium text-muted"
            >
              {formatPostDate(post.publishedAt)}
            </time>
          </div>
          <div className="mt-8 flex flex-1 flex-col">
            <h3 className="text-lg font-bold leading-8">{post.title}</h3>
            {post.tags.length ? (
              <ul className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-ink">
                {post.tags.map((tag) => (
                  <li key={tag.id}>#{tag.name}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <span
            className="mt-8 inline-flex size-11 items-center justify-center self-end rounded-full bg-canvas text-background transition-transform duration-300 ease-pop group-hover:scale-105"
            aria-hidden="true"
          >
            <ArrowRightIcon className="size-5" />
          </span>
        </div>
      </Link>
    </article>
  );
}
