import { Link } from "@tanstack/react-router";
import { ButtonLink } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ArrowDownIcon } from "@/components/ui/Icons";
import { AppLink } from "@/components/ui/Link";
import type { PostSummary } from "@/features/blog/types/post.types";
import { PostCard } from "@/features/blog/components/PostCard";
import { useState } from "react";
import { usePageLoader } from "@/features/page-loader/usePageLoader";
import { WorkCard } from "@/features/works/WorkCard";
import { works } from "@/features/works/works";

const navItems = [
  { label: "About", href: "#about" },
  { label: "Works", href: "#works" },
  { label: "Blog", href: "#blog" },
  { label: "Contact", href: "#contact" },
];

export function PortfolioPage({ blogPosts }: { blogPosts: PostSummary[] }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { state: loaderState } = usePageLoader();

  return (
    <div
      className="min-h-screen overflow-x-clip bg-canvas text-ink"
    >
      <header className="pointer-events-none sticky top-0 z-50 px-4 pt-4 min-[621px]:hidden">
        <div className="flex items-start justify-between gap-4">
          <AppLink
            to="/"
            reloadDocument
            variant="control"
            className="pointer-events-auto inline-flex h-12 items-center rounded-full bg-background px-5 text-xl font-black text-ink"
            aria-label="TOMO ホーム"
            onClick={() => setIsMenuOpen(false)}
          >
            TOMO.
          </AppLink>

          <IconButton
            variant="surface"
            className="pointer-events-auto relative"
            aria-label={isMenuOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="sr-only">Menu</span>
            <span
              className={`absolute h-0.5 w-6 bg-ink transition-transform duration-200 ${
                isMenuOpen ? "rotate-45" : "-translate-y-1"
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-ink transition-transform duration-200 ${
                isMenuOpen ? "-rotate-45" : "translate-y-1"
              }`}
            />
          </IconButton>
        </div>

      </header>

      <div
        className={`fixed inset-0 z-40 min-[621px]:hidden ${
          isMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 cursor-pointer bg-ink/60 transition-opacity duration-200 ${
            isMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="メニューを閉じる"
          onClick={() => setIsMenuOpen(false)}
        />

        <nav
          id="mobile-navigation"
          className={`relative rounded-b-3xl bg-canvas px-6 pb-6 pt-20 text-background transition-transform duration-200 ease-out ${
            isMenuOpen ? "translate-y-0" : "-translate-y-full"
          }`}
          aria-label="モバイルナビゲーション"
        >
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  to="/"
                  hash={item.href.slice(1)}
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-lg font-black uppercase text-background transition-colors hover:bg-background hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="relative mx-auto w-full">
        <aside
          className="relative h-hero-mobile overflow-hidden bg-canvas min-[621px]:hidden min-[1101px]:fixed min-[1101px]:inset-y-2 min-[1101px]:left-2 min-[1101px]:block min-[1101px]:h-auto min-[1101px]:w-[calc((100%-440px)/2-16px)] min-[1101px]:rounded-3xl"
        >
          <AppLink
            to="/"
            reloadDocument
            variant="control"
            className="absolute left-7 top-7 z-10 hidden h-12 items-center rounded-full bg-background px-5 text-xl font-black text-ink min-[1101px]:inline-flex"
            aria-label="TOMO ホーム"
          >
            TOMO.
          </AppLink>
          <picture className="absolute inset-0">
            <source
              media="(prefers-reduced-motion: reduce)"
              srcSet="/img/hero-designer-static.svg"
            />
            <img
              src="/img/hero-designer.svg"
              alt="ノートパソコンで制作するTOMOのイラスト"
              width={1536}
              height={1024}
              className="absolute inset-0 size-full object-cover object-center min-[112.5rem]:mx-auto min-[112.5rem]:max-w-[calc((100svh-1rem)*1.5)]"
            />
          </picture>
        </aside>

        <main
          className={`@container mx-auto min-w-0 space-y-2 p-2 pt-0 transition-transform duration-[750ms] ease-[cubic-bezier(0.76,0,0.24,1)] min-[621px]:ml-4 min-[621px]:mr-0 min-[621px]:w-[440px] min-[621px]:px-0 min-[621px]:pt-2 min-[831px]:ml-20 min-[1101px]:mx-auto ${
            loaderState === "entering" ? "translate-y-[7svh]" : "translate-y-0"
          }`}
          aria-label="メインコンテンツ"
        >
          <section
            className="relative flex min-h-svh scroll-mt-2 items-center justify-center rounded-3xl bg-background px-6 py-28 text-center min-[621px]:min-h-[calc(100svh-1rem)] sm:px-10"
            aria-labelledby="hero-title"
          >
            <div>
              <h1
                id="hero-title"
                className="font-black leading-none"
              >
                <span className="block text-5xl sm:text-6xl">
                  TOMO.
                </span>
                <span className="mt-4 block text-sm sm:text-base">
                  FRONTEND ENGINEER &amp; WEB DESIGNER
                </span>
              </h1>
            </div>

            <p className="scroll-cue absolute inset-x-0 bottom-10 flex flex-col items-center justify-center gap-1 text-xs font-bold text-ink">
              <span>SCROLL DOWN</span>
              <ArrowDownIcon className="size-4" />
            </p>
          </section>

          <section
            id="about"
            className="scroll-mt-2 rounded-3xl bg-background px-6 py-20 sm:px-8 sm:py-24"
            aria-labelledby="about-title"
          >
            <div className="text-center">
              <h2
                id="about-title"
                className="text-center text-3xl font-black leading-none sm:text-5xl"
              >
                ABOUT
              </h2>
              <p className="mx-auto mt-7 max-w-lg text-sm leading-7 text-ink sm:text-base">
                私について
              </p>
            </div>

            <div className="mt-14 grid items-center gap-10 @min-[600px]:grid-cols-2">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-canvas">
                <img
                  src="/img/about-profile.svg"
                  alt="TOMOのプロフィールイラスト"
                  width={1223}
                  height={1286}
                  className="absolute inset-0 size-full object-contain object-bottom"
                />
              </div>
              <div>
                <p className="text-3xl font-black sm:text-4xl">TOMO</p>
                <div className="mt-7 space-y-5 text-sm leading-8 text-ink sm:text-base">
                  <p>約3年半フレンチレストランに勤務したのち、WEB業界へ転職。</p>
                  <p>現在はWEB制作・開発会社で、フロントエンドエンジニア・WEBデザイナーとして働いています。</p>
                  <p>実装するだけではなく、長く運用できる設計や、全体を見据えたスケジューリング、クライアントの想いを整理するデザインを大切にしながら制作しています。</p>
                </div>
              </div>
            </div>
            <div className="mt-10 text-center">
              <ButtonLink to="/about">詳しく見る</ButtonLink>
            </div>
          </section>

          <section
            id="works"
            className="scroll-mt-2 rounded-3xl bg-background px-6 py-20 sm:px-8 sm:py-24"
            aria-labelledby="works-title"
          >
            <div className="text-center">
              <h2 id="works-title" className="text-3xl font-black leading-none sm:text-5xl">WORKS</h2>
              <p className="mx-auto mt-7 max-w-lg text-sm leading-7 text-ink sm:text-base">これまでに制作したもの</p>
            </div>
            <div className="mt-12 grid gap-6 @min-[600px]:grid-cols-2">
              {works.slice(0, 3).map((work) => (
                <WorkCard key={work.slug} work={work} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <ButtonLink to="/works">制作実績一覧を見る</ButtonLink>
            </div>
          </section>

          <section
            id="blog"
            className="scroll-mt-2 rounded-3xl bg-background px-6 py-20 sm:px-8 sm:py-24"
            aria-labelledby="blog-title"
          >
            <div className="text-center">
              <h2
                id="blog-title"
                className="text-3xl font-black leading-none sm:text-5xl"
              >
                BLOG
              </h2>
              <p className="mx-auto mt-7 max-w-lg text-sm leading-7 text-ink sm:text-base">
                日々の制作で学んだことと、デザイン、コード、好きなものについてのブログです。
              </p>
            </div>

            {blogPosts.length === 0 ? (
              <div className="mt-12 rounded-2xl bg-surface px-6 py-16 text-center">
                <p className="text-lg font-bold">まだ記事はありません</p>
              </div>
            ) : (
              <>
                <div className="mt-12 grid gap-6 @min-[600px]:grid-cols-2">
                  {blogPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
                <div className="mt-10 text-center">
                  <ButtonLink
                    to="/blog"
                    search={{
                      page: 1,
                      query: "",
                      tag: "",
                    }}
                  >
                    記事一覧を見る
                  </ButtonLink>
                </div>
              </>
            )}
          </section>

          <section
            id="contact"
            className="scroll-mt-2 rounded-3xl bg-background px-6 py-20 sm:px-8 sm:py-24"
            aria-labelledby="contact-title"
          >
            <div className="text-center">
              <h2
                id="contact-title"
                className="text-3xl font-black leading-none sm:text-5xl"
              >
                CONTACT
              </h2>
              <p className="mx-auto mt-7 max-w-lg text-sm leading-7 text-ink sm:text-base">
                ご相談・お仕事のご依頼など、お気軽にお問い合わせください。内容を確認後、2〜3営業日以内にご返信します。
              </p>
            </div>

            <div className="mt-10 text-center">
              <ButtonLink to="/contact">お問い合わせ</ButtonLink>
            </div>
          </section>

          <footer className="px-6 py-14 text-background sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-4xl font-black">TOMO.</p>
              <p className="text-xs text-footer-muted">
                © 2026 TOMO. All Rights Reserved.
              </p>
            </div>
          </footer>
        </main>

        <aside
          className="fixed inset-y-2 right-2 hidden w-[calc(100%-472px)] flex-col items-center justify-center p-2 min-[621px]:flex min-[831px]:w-[calc(100%-536px)] min-[831px]:p-6 min-[1101px]:w-[calc((100%-440px)/2-16px)]"
        >
          <AppLink
            to="/"
            reloadDocument
            variant="control"
            className="mb-8 inline-flex h-12 shrink-0 items-center text-4xl font-black text-background"
            aria-label="TOMO ホーム"
          >
            TOMO.
          </AppLink>
          <nav aria-label="メインナビゲーション">
            <ul className="space-y-5 text-center">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    to="/"
                    hash={item.href.slice(1)}
                    className="block rounded-2xl px-2 py-3 text-lg font-black uppercase text-background transition-colors hover:bg-background/10 min-[831px]:px-4"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

        </aside>
      </div>
    </div>
  );
}
