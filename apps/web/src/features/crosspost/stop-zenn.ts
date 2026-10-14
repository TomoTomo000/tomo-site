import type { publicationStore } from "./publication-store";

export async function stopZenn(
  source: { provider: string; contentId: string },
  store: ReturnType<typeof publicationStore>,
  removeFile: (remoteId: string) => Promise<void>,
) {
  // 同期を先に停止する。GitHubへの通信が失敗しても停止状態を維持する。
  const publication = await store.stopZenn(source);
  try {
    await removeFile(publication.remoteId!);
  } catch {
    throw new Error(
      "Zenn同期は停止済みですが、GitHubの記事ファイル削除を確認できませんでした。認証・設定を確認して同じコマンドを再実行してください。Zenn上の削除は完了表示後に行ってください。",
    );
  }
  return publication;
}
