const KEY = "lifesaver:recent";
const MAX = 5;

export interface RecentNote {
  id: string;
  title: string;
}

export function getRecent(): RecentNote[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addRecent(list: RecentNote[], note: RecentNote): RecentNote[] {
  return [note, ...list.filter((n) => n.id !== note.id)].slice(0, MAX);
}

export function pushRecent(note: RecentNote) {
  localStorage.setItem(KEY, JSON.stringify(addRecent(getRecent(), note)));
}
