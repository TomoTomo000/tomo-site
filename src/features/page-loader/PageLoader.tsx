import { usePageLoader } from "./usePageLoader";

const loadingCharacters = Array.from("LOADING...");

export function PageLoader() {
  const { state } = usePageLoader();
  const isLeaving = state === "leaving" || state === "leaving-route";

  if (state === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-canvas will-change-transform ${
        state === "leaving"
          ? "pointer-events-none [animation:page-loader-panel-out_750ms_cubic-bezier(0.76,0,0.24,1)_forwards]"
          : state === "leaving-route"
            ? "pointer-events-none [animation:page-loader-panel-out_300ms_cubic-bezier(0.76,0,0.24,1)_forwards]"
          : "cursor-wait"
      }`}
      role="status"
      aria-label="ページを読み込んでいます"
      aria-hidden={isLeaving}
    >
      <div className="text-center">
        <p className="text-background font-black leading-none">
          <span
            className="block whitespace-nowrap text-5xl sm:text-6xl"
            aria-hidden="true"
          >
            {loadingCharacters.map((character, index) => (
              <span
                key={`${character}-${index}`}
                className="page-loader-character inline-block origin-bottom will-change-[opacity,transform] [animation:page-loader-character-cycle_1.4s_linear_infinite_both]"
                style={{ animationDelay: `${index * 25}ms` }}
              >
                {character}
              </span>
            ))}
          </span>
        </p>
      </div>
    </div>
  );
}
