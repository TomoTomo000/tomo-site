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
        className="m-post-card"
      >
        {post.cover ? (
          <img
            src={post.cover.displayUrl}
            alt={post.cover.altText}
            width={post.cover.width}
            height={post.cover.height}
            loading="lazy"
            className="m-post-card__image"
          />
        ) : null}
        <div className="m-post-card__body">
          <div className="m-post-card__meta">
            <time
              dateTime={post.publishedAt ?? undefined}
              className="m-post-card__date"
            >
              {formatPostDate(post.publishedAt)}
            </time>
          </div>
          <div className="m-post-card__content">
            <h3 className="m-post-card__title">{post.title}</h3>
            {post.tags.length ? (
              <ul className="m-post-card__tags">
                {post.tags.map((tag) => (
                  <li key={tag.id}>#{tag.name}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <span className="m-post-card__arrow" aria-hidden="true">
            <ArrowRightIcon className="m-post-card__icon" />
          </span>
        </div>
      </Link>
    </article>
  );
}
