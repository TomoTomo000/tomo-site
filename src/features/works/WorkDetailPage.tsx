import { DetailLayout } from "@/components/layout/DetailLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { AnchorLink } from "@/components/ui/Link";
import type { Work } from "./works";

export function WorkDetailPage({ work }: { work: Work }) {
  const screenshot = (
    <img
      src={work.image.src}
      alt={work.image.alt}
      width={work.image.width}
      height={work.image.height}
      className="l-works-detail__screenshot"
    />
  );

  return (
    <DetailLayout>
      <main className="l-works-detail">
        <PageContainer>
          <header className="m-page-heading">
            <p className="m-page-heading__title">WORKS</p>
            <h1 className="l-works-detail__title">{work.title}</h1>
            <p className="l-works-detail__description">{work.description}</p>
          </header>

          <figure className="l-works-detail__figure">
            {work.siteUrl ? (
              <AnchorLink
                href={work.siteUrl}
                className="l-works-detail__screenshot-link"
                aria-label={`${work.title}のサイトを見る`}
              >
                {screenshot}
              </AnchorLink>
            ) : (
              screenshot
            )}
          </figure>

          <div className="l-works-detail__body">
            <section
              className="l-works-detail__section"
              aria-labelledby="overview-title"
            >
              <h2 id="overview-title" className="l-works-detail__section-title">
                OVERVIEW
              </h2>
              <p className="l-works-detail__section-description">
                制作について
              </p>
              <div className="l-works-detail__overview">
                {work.overview.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              <dl className="l-works-detail__details">
                {work.details.map((detail) => (
                  <div key={detail.label} className="l-works-detail__detail">
                    <dt className="l-works-detail__label">{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section
              className="l-works-detail__section"
              aria-labelledby="stack-title"
            >
              <h2 id="stack-title" className="l-works-detail__section-title">
                TECH STACK
              </h2>
              <p className="l-works-detail__section-description">使用技術</p>
              <ul className="l-works-detail__technologies">
                {work.technologies.map((technology) => (
                  <li key={technology} className="l-works-detail__technology">
                    {technology}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </PageContainer>
      </main>
    </DetailLayout>
  );
}
