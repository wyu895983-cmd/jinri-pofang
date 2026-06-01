export type Sticker = {
  id: string;
  name: string;
  src: string;
  token: string;
};

const stickerFiles = ["p1.webp", "p2.webp", "p3.webp", "p4.webp", "p5.webp", "p6.webp", "p7.webp", "p8.webp", "p9.webp"];

const stickerBase = "/stickers";

export const popoStickers: Sticker[] = stickerFiles.map((file, index) => {
  const id = `p${index + 1}`;
  return {
    id,
    name: `PoPo ${index + 1}`,
    src: `${stickerBase}/${file}`,
    token: `[popo:${id}]`
  };
});

export function getStickerById(id: string) {
  return popoStickers.find((sticker) => sticker.id === id);
}
