export type Sticker = {
  id: string;
  name: string;
  src: string;
  token: string;
};

const stickerFiles = [
  "2.png",
  "3.png",
  "4.png",
  "6.png",
  "8.png",
  "9.png",
  "12.png",
  "233.png",
  "ChatGPT Image 2026年6月1日 07_56_31.png"
];

const stickerBase = "/stickers";

export const popoStickers: Sticker[] = stickerFiles.map((file, index) => {
  const id = `p${index + 1}`;
  return {
    id,
    name: `PoPo ${index + 1}`,
    src: encodeURI(`${stickerBase}/${file}`),
    token: `[popo:${id}]`
  };
});

export function getStickerById(id: string) {
  return popoStickers.find((sticker) => sticker.id === id);
}
