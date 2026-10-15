/** Minimal markdown renderer for note content (headings, bold, lists, tables, code blocks). */
export function renderMarkdown(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) buf.push(lines[i]!);
      i++;
      out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\|.+\|$/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i]!)) {
        const cells = lines[i]!.split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      const head = rows[0];
      const body = rows.slice(1);
      if (head) {
        out.push(
          `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`,
        );
      }
      continue;
    }

    if (/^###\s/.test(line)) out.push(`<h3>${inline(line.slice(4))}</h3>`);
    else if (/^##\s/.test(line)) out.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (/^#\s/.test(line)) out.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i]!)) items.push(lines[i]!.slice(2));
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</ul>`);
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i]!)) items.push(lines[i]!.replace(/^\d+\.\s/, ""));
      out.push(`<ol>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</ol>`);
      continue;
    } else if (line.trim()) {
      out.push(`<p>${inline(line)}</p>`);
    }
    i++;
  }
  return out.join("\n");
}
