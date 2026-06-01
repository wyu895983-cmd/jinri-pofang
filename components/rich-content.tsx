import { getStickerById } from "@/lib/stickers";

const stickerPattern = /\[popo:([a-z0-9-]+)\]/gi;

export function RichContent({ content, className }: { content: string; className?: string }) {
  const parts: Array<{ type: "text"; value: string } | { type: "sticker"; id: string }> = [];
  let lastIndex = 0;

  for (const match of content.matchAll(stickerPattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, index) });
    }
    parts.push({ type: "sticker", id: match[1] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (part.type === "text") return <span key={index}>{part.value}</span>;

        const sticker = getStickerById(part.id);
        if (!sticker) return <span key={index}>{`[popo:${part.id}]`}</span>;

        return (
          <img
            alt={sticker.name}
            className="mx-1 inline-block h-14 w-14 translate-y-3 object-contain"
            decoding="async"
            key={index}
            loading="lazy"
            src={sticker.src}
          />
        );
      })}
    </p>
  );
}
