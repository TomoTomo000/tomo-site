import { DetailLayout } from "@/components/layout/DetailLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { WorkCard } from "./WorkCard";
import { works } from "./works";

export function WorksListPage() {
  return (
    <DetailLayout>
      <main className="pb-20 pt-12 sm:pb-28">
        <PageContainer>
          <header className="text-center">
            <h1 className="text-3xl font-black sm:text-5xl">WORKS</h1>
            <p className="mt-7 text-sm leading-7 sm:text-base">これまでに制作したもの</p>
          </header>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {works.map((work) => (
              <WorkCard key={work.slug} work={work} heading="h2" />
            ))}
          </div>
        </PageContainer>
      </main>
    </DetailLayout>
  );
}
