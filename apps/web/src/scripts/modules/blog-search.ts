export function blogSearch() {
  const input = document.querySelector<HTMLInputElement>("#blog-search");
  document
    .querySelector(".js-blogSearchClear")
    ?.addEventListener("click", () => {
      if (input) {
        input.value = "";
        input.focus();
      }
    });
}
