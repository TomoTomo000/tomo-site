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
      <Link to="/works/$slug" params={{ slug: work.slug }} className="group h-full flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface text-ink">
        <img
          src={work.image.src}
          alt={work.image.alt}
          width={work.image.width}
          height={work.image.height}
          loading="lazy"
          className="aspect-[1.91/1] w-full object-cover"
        />
        <div className="flex flex-1 flex-col px-5 py-6">
          <div className="flex flex-1 flex-col">
            <Heading className="text-lg font-bold leading-8">{work.title}</Heading>
            <p className="mt-5 text-sm leading-7">{work.description}</p>
          </div>
          <span className="sr-only">制作詳細を見る</span>
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
