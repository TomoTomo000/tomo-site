import { Link } from "@tanstack/react-router";
import { ButtonLink } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ArrowDownIcon } from "@/components/ui/Icons";
import { AppLink } from "@/components/ui/Link";
import type { PostSummary } from "@/features/blog/types/post.types";
import { PostCard } from "@/features/blog/components/PostCard";
import { useState } from "react";
import { usePageLoader } from "@/features/page-loader/usePageLoader";

const navItems = [
  { label: "About", href: "#about" },
  { label: "Blog", href: "#blog" },
  { label: "Contact", href: "#contact" },
];

export function PortfolioPage({ blogPosts }: { blogPosts: PostSummary[] }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { state: loaderState } = usePageLoader();

  return (
    <div
      className="min-h-screen overflow-x-clip bg-canvas text-ink lg:h-svh lg:overflow-hidden"
    >
      <header className="pointer-events-none sticky top-0 z-50 px-4 pt-4 lg:hidden">
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
        className={`fixed inset-0 z-40 lg:hidden ${
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

      <div
        className={`mx-auto w-full max-w-[2400px] transform-gpu transition-transform duration-[750ms] ease-[cubic-bezier(0.76,0,0.24,1)] lg:grid lg:h-svh lg:grid-cols-site lg:gap-2 lg:p-2 min-[112.5rem]:grid-cols-[minmax(0,1fr)_57.5rem_20rem] ${
          loaderState === "entering" ? "translate-y-[7svh]" : "translate-y-0"
        }`}
      >
        <aside
          className="relative h-hero-mobile overflow-hidden bg-canvas lg:h-full lg:rounded-3xl"
        >
          <AppLink
            to="/"
            reloadDocument
            variant="control"
            className="absolute left-7 top-7 z-10 hidden h-12 items-center rounded-full bg-background px-5 text-xl font-black text-ink lg:inline-flex"
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
          className="min-w-0 space-y-2 p-2 pt-0 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:p-0 lg:[scrollbar-color:#F7F0E7_transparent] lg:[scrollbar-width:auto] lg:[&::-webkit-scrollbar]:w-3.5 lg:[&::-webkit-scrollbar-track]:bg-transparent lg:[&::-webkit-scrollbar-thumb]:rounded-full lg:[&::-webkit-scrollbar-thumb]:border-[3px] lg:[&::-webkit-scrollbar-thumb]:border-solid lg:[&::-webkit-scrollbar-thumb]:border-transparent lg:[&::-webkit-scrollbar-thumb]:bg-background lg:[&::-webkit-scrollbar-thumb]:bg-clip-content lg:[&::-webkit-scrollbar-thumb:hover]:bg-background/70"
          aria-label="メインコンテンツ"
        >
          <section
            className="relative flex min-h-svh scroll-mt-2 items-center justify-center rounded-3xl bg-background px-6 py-28 text-center sm:px-10"
            aria-labelledby="hero-title"
          >
            <div>
              <h1
                id="hero-title"
                className="font-black leading-none"
              >
                <span className="block text-5xl sm:text-6xl 2xl:text-7xl">
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

            <div className="mt-14 grid items-center gap-10 md:grid-cols-2">
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
                <div className="mt-12 grid gap-6 sm:grid-cols-2">
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
          className="hidden h-full flex-col rounded-3xl bg-background p-6 lg:flex"
        >
          <nav aria-label="メインナビゲーション">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    to="/"
                    hash={item.href.slice(1)}
                    className="block rounded-2xl px-4 py-3 text-lg font-black uppercase text-ink transition-colors hover:bg-canvas hover:text-background"
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
