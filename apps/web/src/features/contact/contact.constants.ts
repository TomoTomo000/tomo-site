import type { ContactInput } from "./contact.schema";

export const budgetLabels: Record<ContactInput["budget"], string> = {
  "under-100000": "〜10万円",
  "100000-300000": "10〜30万円",
  "300000-500000": "30〜50万円",
  "over-500000": "50万円〜",
  undecided: "未定・相談したい",
};
