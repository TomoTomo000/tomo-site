import { navigation } from "./modules/navigation";
import { reloadButton } from "./modules/reload-button";
import { pageLoader } from "./modules/page-loader";

// 全ページ共通。対象要素がある場合だけ動作する。
pageLoader();
navigation();
reloadButton();
