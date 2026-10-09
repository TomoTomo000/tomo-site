import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { AppLink } from "@/components/ui/Link";
import { PageContainer } from "./PageContainer";

const navItems = [
  { section: "about", label: "ABOUT", to: "/about" },
  { section: "works", label: "WORKS", to: "/works" },
  { section: "blog", label: "BLOG", to: "/blog" },
  { section: "contact", label: "CONTACT", to: "/contact" },
] as const;

export function DetailLayout({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="l-detail">
      <header data-page-header className="l-detail__header">
        <div className="l-detail__header-inner">
          <AppLink
            to="/"
            variant="control"
            className="m-navigation__logo"
            aria-label="TOMO トップページへ"
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
        className={`m-navigation__overlay l-detail__menu ${
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
          className={`m-navigation__panel ${
            isMenuOpen ? "m-navigation__panel--open" : ""
          }`}
          aria-label="モバイルナビゲーション"
        >
          <ul className="m-navigation__list">
            {navItems.map((item) => (
              <li key={item.section}>
                <Link
                  to={item.to}
                  search={
                    item.section === "blog"
                      ? { page: 1, query: "", tag: "" }
                      : undefined
                  }
                  activeOptions={{ includeSearch: false }}
                  className="m-navigation__link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <header
        data-page-header
        className="l-detail__header l-detail__header--desktop"
      >
        <div className="l-detail__header-inner">
          <AppLink
            to="/"
            variant="control"
            className="m-navigation__logo"
            aria-label="TOMO トップページへ"
          >
            TOMO.
          </AppLink>

          <nav aria-label="ページナビゲーション">
            <ul className="m-navigation__desktop-list">
              {navItems.map((item) => (
                <li key={item.section}>
                  <Link
                    to={item.to}
                    search={
                      item.section === "blog"
                        ? { page: 1, query: "", tag: "" }
                        : undefined
                    }
                    activeOptions={{ includeSearch: false }}
                    className="m-navigation__desktop-link"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {children}

      <footer className="l-footer">
        <PageContainer className="l-footer__inner">
          <p className="l-footer__logo">TOMO.</p>
          <p className="l-footer__copyright">
            © 2026 TOMO. All Rights Reserved.
          </p>
        </PageContainer>
      </footer>
    </div>
  );
}
