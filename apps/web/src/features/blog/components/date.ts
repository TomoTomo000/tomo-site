const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeZone: "Asia/Tokyo",
});

export function formatPostDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "未公開";
}
