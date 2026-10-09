import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "@/components/ui/Icons";
import type { Work } from "./works";

type WorkCardProps = {
  work: Work;
  heading?: "h2" | "h3";
};

export function WorkCard({ work, heading: Heading = "h3" }: WorkCardProps) {
  return (
    <article>
      <Link
        to="/works/$slug"
        params={{ slug: work.slug }}
        className="m-work-card"
      >
        <img
          src={work.image.src}
          alt={work.image.alt}
          width={work.image.width}
          height={work.image.height}
          loading="lazy"
          className="m-work-card__image"
        />
        <div className="m-work-card__body">
          <div className="m-work-card__content">
            <Heading className="m-work-card__title">{work.title}</Heading>
            <p className="m-work-card__description">{work.description}</p>
          </div>
          <span className="m-work-card__label">制作詳細を見る</span>
          <span className="m-work-card__arrow" aria-hidden="true">
            <ArrowRightIcon className="m-work-card__icon" />
          </span>
        </div>
      </Link>
    </article>
  );
}
