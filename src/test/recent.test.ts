import { describe, expect, it } from "vitest";
import { addRecent } from "@/lib/recent";
import { renderMarkdown } from "@/lib/markdown";

describe("recent notes", () => {
  it("keeps at most 5 notes, newest first, without duplicates", () => {
    let list = [1, 2, 3, 4, 5].map((n) => ({ id: String(n), title: `N${n}` }));
    list = addRecent(list, { id: "3", title: "N3" });
    expect(list.map((n) => n.id)).toEqual(["3", "1", "2", "4", "5"]);
    list = addRecent(list, { id: "6", title: "N6" });
    expect(list).toHaveLength(5);
    expect(list[0]!.id).toBe("6");
  });
});

describe("markdown", () => {
  it("escapes HTML in note content", () => {
    expect(renderMarkdown("<script>x</script>")).not.toContain("<script>");
  });
});
