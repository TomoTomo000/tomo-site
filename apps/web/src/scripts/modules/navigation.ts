export function navigation() {
  const toggle = document.querySelector<HTMLButtonElement>(
    ".js-navigationToggle",
  );
  const overlay = document.querySelector<HTMLElement>(".js-navigationOverlay");
  const panel = document.querySelector<HTMLElement>(".js-navigationPanel");
  const backdrop = document.querySelector<HTMLElement>(
    ".js-navigationBackdrop",
  );

  // 見た目・読み上げ・操作可否を、同じ開閉状態に揃える。
  function setMenu(open: boolean) {
    if (!toggle || !overlay) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "メニューを閉じる" : "メニューを開く",
    );
    overlay.inert = !open;
    overlay.setAttribute("aria-hidden", String(!open));
  }

  // ボタンで開閉し、背景・メニュー内リンク・ロゴで閉じる。
  toggle?.addEventListener("click", () =>
    setMenu(toggle.getAttribute("aria-expanded") !== "true"),
  );
  backdrop?.addEventListener("click", () => setMenu(false));
  panel
    ?.querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document
    .querySelectorAll(".js-navigationLogo")
    .forEach((link) => link.addEventListener("click", () => setMenu(false)));

  // Escapeで閉じた際は、操作元のボタンへフォーカスを戻す。
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      toggle?.getAttribute("aria-expanded") === "true"
    ) {
      setMenu(false);
      toggle.focus();
    }
  });

  // ブラウザーの「戻る」で復元された場合も閉じた状態にする。
  addEventListener("pageshow", () => setMenu(false));
}
