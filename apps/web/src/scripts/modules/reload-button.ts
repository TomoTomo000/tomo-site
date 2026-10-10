export function reloadButton() {
  document
    .querySelector(".js-reload")
    ?.addEventListener("click", () => location.reload());
}
