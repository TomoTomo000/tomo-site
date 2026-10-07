import { DetailLayout } from "@/components/layout/DetailLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { ButtonLink } from "@/components/ui/Button";
import type { Work } from "./works";

export function WorkDetailPage({ work }: { work: Work }) {
  return (
    <DetailLayout>
      <main className="pb-20 pt-12 sm:pb-28">
        <PageContainer>
          <header className="text-center">
            <p className="text-3xl font-black sm:text-5xl">WORKS</p>
            <h1 className="mt-7 text-2xl font-black sm:text-3xl">{work.title}</h1>
            <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 sm:text-base">{work.description}</p>
          </header>

          <figure className="mt-12 sm:mt-16">
            <img
              src={work.image.src}
              alt={work.image.alt}
              width={work.image.width}
              height={work.image.height}
              className="w-full rounded-2xl border border-ink/10"
            />
          </figure>

          <div className="mx-auto max-w-3xl">
            <section className="mt-20 border-t border-ink/10 pt-14 sm:mt-28 sm:pt-20" aria-labelledby="overview-title">
              <h2 id="overview-title" className="text-3xl font-black sm:text-4xl">OVERVIEW</h2>
              <p className="mt-3 text-sm text-muted">制作について</p>
              <div className="mt-7 space-y-5 text-sm leading-8 text-ink sm:text-base">
                {work.overview.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </div>
              <dl className="mt-10 divide-y divide-ink/10 border-y border-ink/10 text-sm leading-8 sm:text-base">
                {work.details.map((detail) => (
                  <div key={detail.label} className="grid gap-3 py-6 sm:grid-cols-[8rem_1fr]">
                    <dt className="font-bold">{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mt-20 border-t border-ink/10 pt-14 sm:mt-28 sm:pt-20" aria-labelledby="stack-title">
              <h2 id="stack-title" className="text-3xl font-black sm:text-4xl">TECH STACK</h2>
              <p className="mt-3 text-sm text-muted">使用技術</p>
              <ul className="mt-8 flex flex-wrap gap-3">
                {work.technologies.map((technology) => (
                  <li key={technology} className="rounded-full bg-surface px-5 py-3 text-sm font-bold">{technology}</li>
                ))}
              </ul>
            </section>

            <div className="mt-16 flex flex-wrap justify-center gap-4">
              {work.siteUrl ? (
                <a href={work.siteUrl} className="inline-flex items-center justify-center rounded-full bg-canvas px-6 py-3 text-center text-sm font-bold text-background transition-transform duration-300 ease-pop hover:scale-105">サイトを見る</a>
              ) : null}
              <ButtonLink to="/works" variant="secondary">WORKS一覧へ戻る</ButtonLink>
            </div>
          </div>
        </PageContainer>
      </main>
    </DetailLayout>
  );
}
