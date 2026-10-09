import { DetailLayout } from "@/components/layout/DetailLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { WorkCard } from "./WorkCard";
import { works } from "./works";

export function WorksListPage() {
  return (
    <DetailLayout>
      <main className="l-works-list">
        <PageContainer>
          <header className="m-page-heading">
            <h1 className="m-page-heading__title">WORKS</h1>
            <p className="m-page-heading__description">
              これまでに制作したもの
            </p>
          </header>
          <div className="l-works-list__cards">
            {works.map((work) => (
              <WorkCard key={work.slug} work={work} heading="h2" />
            ))}
          </div>
        </PageContainer>
      </main>
    </DetailLayout>
  );
}
