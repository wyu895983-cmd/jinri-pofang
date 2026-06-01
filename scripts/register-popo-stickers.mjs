import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const candidates = [join(root, "public", "stickers", "popo"), join(root, "public", "stickers")];
const extensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function extensionOf(file) {
  const dot = file.lastIndexOf(".");
  return dot >= 0 ? file.slice(dot).toLowerCase() : "";
}

const dir = candidates.find((path) => {
  try {
    return readdirSync(path, { withFileTypes: true }).some((entry) => entry.isFile() && extensions.has(extensionOf(entry.name)));
  } catch {
    return false;
  }
});

if (!dir) {
  throw new Error("No PoPo sticker files found in public/stickers/popo or public/stickers.");
}

const files = readdirSync(dir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && extensions.has(extensionOf(entry.name)))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));

const publicBase = dir.endsWith(join("stickers", "popo")) ? "/stickers/popo" : "/stickers";
const fileList = files.map((file) => `  ${JSON.stringify(file)}`).join(",\n");

const output = `export type Sticker = {
  id: string;
  name: string;
  src: string;
  token: string;
};

const stickerFiles = [
${fileList}
];

const stickerBase = ${JSON.stringify(publicBase)};

export const popoStickers: Sticker[] = stickerFiles.map((file, index) => {
  const id = \`p\${index + 1}\`;
  return {
    id,
    name: \`PoPo \${index + 1}\`,
    src: encodeURI(\`\${stickerBase}/\${file}\`),
    token: \`[popo:\${id}]\`
  };
});

export function getStickerById(id: string) {
  return popoStickers.find((sticker) => sticker.id === id);
}
`;

writeFileSync(join(root, "lib", "stickers.ts"), output);
console.log(`Registered ${files.length} PoPo stickers from ${publicBase}.`);
