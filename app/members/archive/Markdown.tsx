// Minimal renderer for the headings/bullets/emphasis the summary pages use.
// Everything is escaped first; only the tags added below reach the page.

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-[0.85em]">$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a class="underline underline-offset-2" href="$2" target="_blank" rel="noreferrer noopener">$1</a>'
    );
}

export default function Markdown({ text }: { text: string }) {
  const blocks: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (!list.length) return;
    blocks.push(
      `<ul class="my-3 list-disc space-y-1.5 pl-5 text-muted-foreground">${list.join("")}</ul>`
    );
    list = [];
  };

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      list.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    flush();
    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const size = level <= 2 ? "text-base" : "text-sm";
      blocks.push(
        `<h${level + 1} class="mt-5 ${size} font-semibold tracking-tight text-foreground">${inline(
          heading[2]
        )}</h${level + 1}>`
      );
      continue;
    }
    blocks.push(`<p class="my-2 text-muted-foreground">${inline(trimmed)}</p>`);
  }
  flush();

  return (
    <div
      className="text-sm leading-relaxed [&>h2:first-child]:mt-0 [&>p:first-child]:mt-0"
      dangerouslySetInnerHTML={{ __html: blocks.join("") }}
    />
  );
}
