export function portfolioEntrance() {
  const main = document.querySelector(".js-portfolioMain");
  if (document.querySelector(".js-pageLoader"))
    main?.classList.add("--entering");
}
