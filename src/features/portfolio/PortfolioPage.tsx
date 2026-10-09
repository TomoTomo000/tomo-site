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
    <div className="l-portfolio">
      <header className="l-portfolio__header">
        <div className="l-portfolio__header-inner">
          <AppLink
            to="/"
            reloadDocument
            variant="control"
            className="m-navigation__logo"
            aria-label="TOMO ホーム"
            onClick={() => setIsMenuOpen(false)}
          >
            TOMO.
          </AppLink>

          <IconButton
            variant="surface"
            className="m-navigation__toggle"
            aria-label={isMenuOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="m-navigation__label">Menu</span>
            <span
              className={`m-navigation__bar ${
                isMenuOpen
                  ? "m-navigation__bar--open-top"
                  : "m-navigation__bar--top"
              }`}
            />
            <span
              className={`m-navigation__bar ${
                isMenuOpen
                  ? "m-navigation__bar--open-bottom"
                  : "m-navigation__bar--bottom"
              }`}
            />
          </IconButton>
        </div>
      </header>

      <div
        className={`m-navigation__overlay l-portfolio__menu ${
          isMenuOpen ? "m-navigation__overlay--open" : ""
        }`}
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
      >
        <button
          type="button"
          className={`m-navigation__backdrop ${
            isMenuOpen ? "m-navigation__backdrop--open" : ""
          }`}
          aria-label="メニューを閉じる"
          onClick={() => setIsMenuOpen(false)}
        />

        <nav
          id="mobile-navigation"
          className={`m-navigation__panel m-navigation__panel--dark ${
            isMenuOpen ? "m-navigation__panel--open" : ""
          }`}
          aria-label="モバイルナビゲーション"
        >
          <ul className="m-navigation__list">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  to="/"
                  hash={item.href.slice(1)}
                  onClick={() => setIsMenuOpen(false)}
                  className="m-navigation__link m-navigation__link--dark"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="l-portfolio__body">
        <aside className="l-portfolio__illustration">
          <AppLink
            to="/"
            reloadDocument
            variant="control"
            className="l-portfolio__illustration-logo"
            aria-label="TOMO ホーム"
          >
            TOMO.
          </AppLink>
          <picture className="l-portfolio__picture">
            <source
              media="(prefers-reduced-motion: reduce)"
              srcSet="/img/hero-designer-static.svg"
            />
            <img
              src="/img/hero-designer.svg"
              alt="ノートパソコンで制作するTOMOのイラスト"
              width={1536}
              height={1024}
              className="l-portfolio__image"
            />
          </picture>
        </aside>

        <main
          className={`l-portfolio__main ${
            loaderState === "entering" ? "l-portfolio__main--entering" : ""
          }`}
          aria-label="メインコンテンツ"
        >
          <section className="m-portfolio-hero" aria-labelledby="hero-title">
            <div>
              <h1 id="hero-title" className="m-portfolio-hero__title">
                <span className="m-portfolio-hero__name">TOMO.</span>
                <span className="m-portfolio-hero__role">
                  FRONTEND ENGINEER &amp; WEB DESIGNER
                </span>
              </h1>
            </div>

            <p className="m-portfolio-hero__scroll">
              <span>SCROLL DOWN</span>
              <ArrowDownIcon className="m-portfolio-hero__arrow" />
            </p>
          </section>

          <section
            id="about"
            className="l-portfolio__section"
            aria-labelledby="about-title"
          >
            <div className="l-portfolio__section-heading">
              <h2 id="about-title" className="l-portfolio__section-title">
                ABOUT
              </h2>
              <p className="l-portfolio__section-description">私について</p>
            </div>

            <div className="l-portfolio__profile">
              <div className="m-profile__portrait">
                <img
                  src="/img/about-profile.svg"
                  alt="TOMOのプロフィールイラスト"
                  width={1223}
                  height={1286}
                  className="m-profile__image"
                />
              </div>
              <div>
                <p className="m-profile__name">TOMO</p>
                <div className="m-profile__text">
                  <p>
                    約3年半フレンチレストランに勤務したのち、WEB業界へ転職。
                  </p>
                  <p>
                    現在はWEB制作・開発会社で、フロントエンドエンジニア・WEBデザイナーとして働いています。
                  </p>
                  <p>
                    実装するだけではなく、長く運用できる設計や、全体を見据えたスケジューリング、クライアントの想いを整理するデザインを大切にしながら制作しています。
                  </p>
                </div>
              </div>
            </div>
            <div className="l-portfolio__section-action">
              <ButtonLink to="/about">詳しく見る</ButtonLink>
            </div>
          </section>

          <section
            id="works"
            className="l-portfolio__section"
            aria-labelledby="works-title"
          >
            <div className="l-portfolio__section-heading">
              <h2 id="works-title" className="l-portfolio__section-title">
                WORKS
              </h2>
              <p className="l-portfolio__section-description">
                これまでに制作したもの
              </p>
            </div>
            <div className="l-portfolio__cards">
              {works.slice(0, 3).map((work) => (
                <WorkCard key={work.slug} work={work} />
              ))}
            </div>
            <div className="l-portfolio__section-action">
              <ButtonLink to="/works">制作実績一覧を見る</ButtonLink>
            </div>
          </section>

          <section
            id="blog"
            className="l-portfolio__section"
            aria-labelledby="blog-title"
          >
            <div className="l-portfolio__section-heading">
              <h2 id="blog-title" className="l-portfolio__section-title">
                BLOG
              </h2>
              <p className="l-portfolio__section-description">
                日々の制作で学んだことと、デザイン、コード、好きなものについてのブログです。
              </p>
            </div>

            {blogPosts.length === 0 ? (
              <div className="m-empty-state">
                <p className="m-empty-state__title">まだ記事はありません</p>
              </div>
            ) : (
              <>
                <div className="l-portfolio__cards">
                  {blogPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
                <div className="l-portfolio__section-action">
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
            className="l-portfolio__section"
            aria-labelledby="contact-title"
          >
            <div className="l-portfolio__section-heading">
              <h2 id="contact-title" className="l-portfolio__section-title">
                CONTACT
              </h2>
              <p className="l-portfolio__section-description">
                ご相談・お仕事のご依頼など、お気軽にお問い合わせください。内容を確認後、2〜3営業日以内にご返信します。
              </p>
            </div>

            <div className="l-portfolio__section-action">
              <ButtonLink to="/contact">お問い合わせ</ButtonLink>
            </div>
          </section>

          <footer className="l-portfolio__footer">
            <div className="l-footer__inner">
              <p className="l-footer__logo">TOMO.</p>
              <p className="l-portfolio__copyright">
                © 2026 TOMO. All Rights Reserved.
              </p>
            </div>
          </footer>
        </main>

        <aside className="l-portfolio__sidebar">
          <AppLink
            to="/"
            reloadDocument
            variant="control"
            className="l-portfolio__sidebar-logo"
            aria-label="TOMO ホーム"
          >
            TOMO.
          </AppLink>
          <nav aria-label="メインナビゲーション">
            <ul className="l-portfolio__sidebar-list">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    to="/"
                    hash={item.href.slice(1)}
                    className="l-portfolio__sidebar-link"
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
