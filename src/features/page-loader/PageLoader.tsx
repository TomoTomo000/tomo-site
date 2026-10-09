import { usePageLoader } from "./usePageLoader";

const loadingCharacters = Array.from("LOADING...");

export function PageLoader() {
  const { state } = usePageLoader();
  const isLeaving = state === "leaving" || state === "leaving-route";

  if (state === "done") return null;

  return (
    <div
      className={`m-page-loader ${
        state === "leaving"
          ? "m-page-loader--leaving"
          : state === "leaving-route"
            ? "m-page-loader--leaving-route"
            : "m-page-loader--waiting"
      }`}
      role="status"
      aria-label="ページを読み込んでいます"
      aria-hidden={isLeaving}
    >
      <div className="m-page-loader__content">
        <p className="m-page-loader__title">
          <span className="m-page-loader__text" aria-hidden="true">
            {loadingCharacters.map((character, index) => (
              <span
                key={`${character}-${index}`}
                className="m-page-loader__character"
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
