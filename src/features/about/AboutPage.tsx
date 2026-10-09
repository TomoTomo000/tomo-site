import { DetailLayout } from "@/components/layout/DetailLayout";
import { PageContainer } from "@/components/layout/PageContainer";

const careers = [
  {
    label: "約3年半",
    title: "大阪のフレンチレストランで勤務",
    description:
      "WEB業界に入る前は、約3年半フレンチレストランで働いていました。",
  },
  {
    label: "現在",
    title: "WEB制作・開発会社へ",
    description:
      "WEB業界へ転職し、現在はWEB制作・開発会社で、フロントエンドエンジニア・WEBデザイナーとして開発・デザインに携わっています。",
  },
];

const skills = [
  { name: "HTML", logo: "html" },
  { name: "CSS", logo: "css" },
  { name: "JavaScript", logo: "javascript" },
  { name: "TypeScript", logo: "typescript" },
  { name: "Next.js", logo: "nextjs" },
  { name: "React", logo: "react" },
  { name: "Astro", logo: "astro" },
  { name: "TanStack Start", logo: "tanstack-start" },
];

const likes = [
  {
    name: "古着",
    description:
      "ヴィンテージの古着を着たり、集めることが好きです。古着の雰囲気や、独特の素材感に惹かれます。ヨーロッパのヴィンテージ古着が特に好きです。",
    image: "/img/about-like-used-clothes.svg",
    imageAlt: "古着のイラスト",
  },
  {
    name: "料理・食べること",
    description:
      "料理を作ったり、食べることが好きです。最近では、洋食プレートを自作で作ることにハマっています。食べることも好きで、休日はよく外食を楽しんでいます。",
    image: "/img/about-like-cooking.svg",
    imageAlt: "料理のイラスト",
  },
];

export function AboutPage() {
  return (
    <DetailLayout>
      <main className="l-about">
        <PageContainer>
          <div className="m-page-heading">
            <h1 className="m-page-heading__title">ABOUT</h1>
            <p className="m-page-heading__description">私について</p>
          </div>

          <section className="l-about__profile" aria-labelledby="profile-title">
            <div className="m-profile__portrait l-about__portrait">
              <img
                src="/img/about-profile.svg"
                alt="TOMOのプロフィールイラスト"
                width={1223}
                height={1286}
                className="m-profile__image"
              />
            </div>
            <div>
              <h2 id="profile-title" className="l-about__section-title">
                TOMO
              </h2>
              <div className="m-profile__text">
                <p>約3年半フレンチレストランに勤務したのち、WEB業界へ転職。</p>
                <p>
                  現在はWEB制作・開発会社で、フロントエンドエンジニア・WEBデザイナーとして働いています。
                </p>
                <p>
                  実装するだけではなく、長く運用できる設計や、全体を見据えたスケジューリング、クライアントの想いを整理するデザインを大切にしながら制作しています。
                </p>
              </div>
            </div>
          </section>

          <section className="l-about__section" aria-labelledby="career-title">
            <h2 id="career-title" className="l-about__section-title">
              CAREER
            </h2>
            <p className="l-about__section-description">これまでのこと</p>
            <ol className="m-career">
              {careers.map((career, index) => (
                <li key={career.title} className="m-career__item">
                  <div aria-hidden="true" className="m-career__marker">
                    <span className="m-career__line" />
                    <span className="m-career__dot" />
                  </div>
                  <div
                    className={
                      index < careers.length - 1
                        ? "m-career__body m-career__body--spaced"
                        : "m-career__body"
                    }
                  >
                    <p className="m-career__label">{career.label}</p>
                    <h3 className="m-career__title">{career.title}</h3>
                    <p className="m-career__description">
                      {career.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="l-about__section" aria-labelledby="skills-title">
            <h2 id="skills-title" className="l-about__section-title">
              SKILLS
            </h2>
            <p className="l-about__section-description">使用する言語・技術</p>
            <ul className="l-about__skills">
              {skills.map((skill) => (
                <li key={skill.name} className="m-skill-card">
                  <div className="m-skill-card__image" aria-hidden="true">
                    <img
                      src={`/img/skills/${skill.logo}.svg`}
                      alt=""
                      width={96}
                      height={64}
                      loading="lazy"
                      className="m-skill-card__logo"
                    />
                  </div>
                  {skill.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="l-about__section" aria-labelledby="likes-title">
            <h2 id="likes-title" className="l-about__section-title">
              LIKES
            </h2>
            <p className="l-about__section-description">好きなもの</p>
            <div className="l-about__likes">
              {likes.map((like) => (
                <div key={like.name} className="m-like-card">
                  <div className="m-like-card__picture">
                    <div className="m-like-card__image">
                      <img
                        src={like.image}
                        alt={like.imageAlt}
                        width={168}
                        height={112}
                        loading="lazy"
                        className="m-like-card__illustration"
                      />
                    </div>
                  </div>
                  <h3 className="m-like-card__title">{like.name}</h3>
                  <p className="m-like-card__description">{like.description}</p>
                </div>
              ))}
            </div>
          </section>
        </PageContainer>
      </main>
    </DetailLayout>
  );
}
