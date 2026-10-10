export function articleScroll() {
  const article = document.querySelector<HTMLElement>(".js-blogDetail");
  if (!article) return;

  // 表示中のヘッダーの高さを計測し、目次の固定位置にも反映する。
  const headers = Array.from(
    document.querySelectorAll<HTMLElement>(".js-pageHeader"),
  );
  const getHeaderHeight = () =>
    Math.max(
      0,
      ...headers.map((header) => header.getBoundingClientRect().height),
    );
  const updateHeaderHeight = () =>
    article.style.setProperty(
      "--article-header-height",
      getHeaderHeight() + "px",
    );
  const observer = new ResizeObserver(updateHeaderHeight);
  headers.forEach((header) => observer.observe(header));
  updateHeaderHeight();

  // URLのハッシュが指す記事見出しを、ヘッダーに隠れない位置へ移動する。
  const scrollToArticleHeading = () =>
    requestAnimationFrame(() => {
      let id: string;
      try {
        id = decodeURIComponent(location.hash.slice(1));
      } catch {
        return;
      }
      const target = document.getElementById(id);
      if (
        target?.matches(
          ".js-articleBody h2, .js-articleBody h3, .js-articleBody h4",
        )
      )
        window.scrollTo({
          top: Math.max(
            0,
            scrollY +
              target.getBoundingClientRect().top -
              getHeaderHeight() -
              16,
          ),
          behavior: "instant",
        });
    });
  // 直接アクセス・目次クリック・フォント読み込み後に位置を補正する。
  addEventListener("hashchange", scrollToArticleHeading);
  addEventListener("load", scrollToArticleHeading, { once: true });
  document.fonts.ready.then(scrollToArticleHeading);
  document
    .querySelectorAll(".js-articleToc a")
    .forEach((link) => link.addEventListener("click", scrollToArticleHeading));
}
