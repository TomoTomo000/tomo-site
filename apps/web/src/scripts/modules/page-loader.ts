export function pageLoader() {
  const loader = document.querySelector<HTMLElement>(".js-pageLoader");
  if (!loader || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    loader?.remove();
    return;
  }
  const previous = document.documentElement.style.overflow;
  loader.hidden = false;
  document.documentElement.style.overflow = "hidden";
  const finish = () => {
    loader.remove();
    document.documentElement.style.overflow = previous;
    document.querySelector(".js-portfolioMain")?.classList.remove("--entering");
  };
  const fallback = setTimeout(finish, 6000);
  const loaded =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise((resolve) =>
          addEventListener("load", resolve, { once: true }),
        );
  Promise.all([
    loaded,
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 750)),
  ]).then(() => {
    loader.classList.replace("--waiting", "--leaving");
    loader.setAttribute("aria-hidden", "true");
    document.querySelector(".js-portfolioMain")?.classList.remove("--entering");
    setTimeout(() => {
      clearTimeout(fallback);
      finish();
    }, 750);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      clearTimeout(fallback);
      finish();
    }
  });
}
