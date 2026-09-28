import { DetailLayout } from "@/components/layout/DetailLayout";
import { PageContainer } from "@/components/layout/PageContainer";

const careers = [
  {
    label: "約3年半",
    title: "大阪のフレンチレストランで勤務",
    description: "WEB業界に入る前は、約3年半フレンチレストランで働いていました。",
  },
  {
    label: "現在",
    title: "WEB制作・開発会社へ",
    description: "WEB業界へ転職し、現在はWEB制作・開発会社で、フロントエンドエンジニア・WEBデザイナーとして開発・デザインに携わっています。",
  },
];

const skills = [
  { name: "HTML", logo: "html" },
  { name: "CSS", logo: "css" },
  { name: "JavaScript", logo: "javascript" },
  { name: "TypeScript", logo: "typescript" },
  { name: "Next.js", logo: "nextjs" },
  { name: "React", logo: "react" },
];

const likes = [
  {
    name: "古着",
    description: "ヴィンテージの古着を着たり、集めることが好きです。古着の雰囲気や、独特の素材感に惹かれます。ヨーロッパのヴィンテージ古着が特に好きです。",
    image: "/img/about-like-used-clothes.svg",
    imageAlt: "古着のイラスト",
  },
  {
    name: "料理・食べること",
    description: "料理を作ったり、食べることが好きです。最近では、洋食プレートを自作で作ることにハマっています。食べることも好きで、休日はよく外食を楽しんでいます。",
    image: "/img/about-like-cooking.svg",
    imageAlt: "料理のイラスト",
  },
];

export function AboutPage() {
  return (
    <DetailLayout>
      <main className="pb-20 pt-12 sm:pb-28">
        <PageContainer>
          <div className="text-center">
            <h1 className="text-3xl font-black sm:text-5xl">ABOUT</h1>
            <p className="mt-7 text-sm leading-7 sm:text-base">私について</p>
          </div>

          <section className="mt-14 grid items-center gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" aria-labelledby="profile-title">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-canvas md:mx-auto md:w-full md:max-w-[360px]">
              <img
                src="/img/about-profile.svg"
                alt="TOMOのプロフィールイラスト"
                width={1223}
                height={1286}
                className="absolute inset-0 size-full object-contain object-bottom"
              />
            </div>
            <div>
              <h2 id="profile-title" className="text-3xl font-black sm:text-4xl">TOMO</h2>
              <div className="mt-7 space-y-5 text-sm leading-8 text-ink sm:text-base">
                <p>約3年半フレンチレストランに勤務したのち、WEB業界へ転職。</p>
                <p>現在はWEB制作・開発会社で、フロントエンドエンジニア・WEBデザイナーとして働いています。</p>
                <p>実装するだけではなく、長く運用できる設計や、全体を見据えたスケジューリング、クライアントの想いを整理するデザインを大切にしながら制作しています。</p>
              </div>
            </div>
          </section>

          <section className="mt-20 border-t border-ink/10 pt-14 sm:mt-28 sm:pt-20" aria-labelledby="career-title">
            <h2 id="career-title" className="text-3xl font-black sm:text-4xl">CAREER</h2>
            <p className="mt-3 text-sm text-muted">これまでのこと</p>
            <ol className="mt-10">
              {careers.map((career, index) => (
                <li key={career.title} className="flex gap-4 sm:gap-8">
                  <div aria-hidden="true" className="relative flex w-2.5 shrink-0 justify-center">
                    <span className="absolute inset-y-0 w-px bg-ink/20" />
                    <span className="relative mt-1 size-2.5 rounded-full bg-canvas" />
                  </div>
                  <div className={index < careers.length - 1 ? "min-w-0 pb-8" : "min-w-0"}>
                    <p className="text-sm font-bold text-muted">{career.label}</p>
                    <h3 className="mt-3 text-xl font-bold">{career.title}</h3>
                    <p className="mt-4 max-w-2xl text-sm leading-8 sm:text-base">{career.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-20 border-t border-ink/10 pt-14 sm:mt-28 sm:pt-20" aria-labelledby="skills-title">
            <h2 id="skills-title" className="text-3xl font-black sm:text-4xl">SKILLS</h2>
            <p className="mt-3 text-sm text-muted">使用する言語・技術</p>
            <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {skills.map((skill) => (
                <li key={skill.name} className="flex flex-col items-center gap-6 rounded-2xl bg-surface px-4 py-8 text-center text-lg font-bold sm:text-xl">
                  <div className="flex h-16 w-24 items-center justify-center" aria-hidden="true">
                    <img
                      src={`/img/skills/${skill.logo}.svg`}
                      alt=""
                      width={96}
                      height={64}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  {skill.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-20 border-t border-ink/10 pt-14 sm:mt-28 sm:pt-20" aria-labelledby="likes-title">
            <h2 id="likes-title" className="text-3xl font-black sm:text-4xl">LIKES</h2>
            <p className="mt-3 text-sm text-muted">好きなもの</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {likes.map((like) => (
                <div key={like.name} className="rounded-2xl bg-surface p-6 sm:p-8">
                  <div className="mb-6 flex justify-center">
                    <div className="flex h-28 w-42 items-center justify-center">
                      <img
                        src={like.image}
                        alt={like.imageAlt}
                        width={168}
                        height={112}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                  <h3 className="text-center text-lg font-bold sm:text-xl">{like.name}</h3>
                  <p className="mt-4 text-sm leading-8">{like.description}</p>
                </div>
              ))}
            </div>
          </section>
        </PageContainer>
      </main>
    </DetailLayout>
  );
}
