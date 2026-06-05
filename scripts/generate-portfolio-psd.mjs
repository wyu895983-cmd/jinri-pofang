import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PNG } from "pngjs";
import { writePsdBuffer, readPsd } from "ag-psd";

const root = process.cwd();
const outputPath = resolve(root, "portfolio-case", "jinri-pofang-case-board.psd");
const boardPath = resolve(root, "portfolio-case", "jinri-pofang-case-board.png");
const screenDir = resolve(root, "portfolio-screens");
const width = 1920;
const height = 7951;
const green = { r: 183, g: 255, b: 60 };
const white = { r: 244, g: 244, b: 245 };
const muted = { r: 161, g: 161, b: 170 };

function readPng(path) {
  const png = PNG.sync.read(Buffer.from(requireFile(path)));
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
}

const fileCache = new Map();
function requireFile(path) {
  const value = fileCache.get(path);
  if (!value) throw new Error(`File not loaded: ${path}`);
  return value;
}

function resizeImage(image, targetWidth) {
  const targetHeight = Math.round(image.height * targetWidth / image.width);
  const data = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y++) {
    const sourceY = Math.min(image.height - 1, Math.floor(y * image.height / targetHeight));
    for (let x = 0; x < targetWidth; x++) {
      const sourceX = Math.min(image.width - 1, Math.floor(x * image.width / targetWidth));
      const source = (sourceY * image.width + sourceX) * 4;
      const target = (y * targetWidth + x) * 4;
      data[target] = image.data[source];
      data[target + 1] = image.data[source + 1];
      data[target + 2] = image.data[source + 2];
      data[target + 3] = image.data[source + 3];
    }
  }
  return { width: targetWidth, height: targetHeight, data };
}

function textLayer(name, text, left, top, fontSize, color = white, options = {}) {
  return {
    name,
    text: {
      text,
      transform: [1, 0, 0, 1, left, top],
      shapeType: "point",
      style: {
        font: { name: options.font || "MicrosoftYaHei", script: 25, type: 0 },
        fontSize,
        fauxBold: options.bold ?? true,
        fillColor: color
      }
    }
  };
}

function imageLayer(name, fileName, left, top, targetWidth) {
  const image = resizeImage(readPng(resolve(screenDir, fileName)), targetWidth);
  return { name, left, top, imageData: image };
}

function group(name, children, hidden = false) {
  return { name, opened: true, hidden, children };
}

const files = [boardPath, ...[
  "01-home.png", "02-leaderboard.png", "03-create.png", "04-profile.png",
  "05-favorites.png", "06-search.png", "07-post-detail.png", "08-comments.png",
  "09-interactions.png", "10-full-home.png", "11-full-profile.png", "12-full-post-detail.png"
].map((name) => resolve(screenDir, name))];
await Promise.all(files.map(async (path) => fileCache.set(path, await readFile(path))));

const preview = readPng(boardPath);
const groups = [
  group("封面区", [
    textLayer("主标题｜今日破防", "今日破防", 130, 250, 140, white),
    textLayer("英文标题｜TODAY BREAKDOWN", "TODAY BREAKDOWN", 135, 430, 42, green),
    textLayer("副标题｜匿名情绪吐槽社区 UI 设计", "匿名情绪吐槽社区 UI 设计", 135, 510, 30, green),
    textLayer("标语｜把这口气，优雅地吐出去", "把这口气，优雅地吐出去", 135, 575, 27, muted),
    imageLayer("截图｜01 首页广场", "01-home.png", 830, 155, 360),
    imageLayer("截图｜07 帖子详情", "07-post-detail.png", 1210, 245, 320),
    imageLayer("截图｜04 个人中心", "04-profile.png", 1510, 330, 285)
  ], true),
  group("项目背景", [
    textLayer("标题｜项目背景", "项目背景", 130, 1230, 62, white),
    textLayer("文案｜背景说明", "年轻人的情绪需要一个低压力、被理解的出口。今日破防以匿名表达和轻互动，承接每一个真实瞬间。", 130, 1320, 25, muted)
  ], true),
  group("用户痛点", [
    textLayer("标题｜用户痛点", "用户痛点", 130, 1540, 62, white),
    textLayer("痛点 01", "表达压力：现实社交中不敢说出口", 130, 1640, 27, muted),
    textLayer("痛点 02", "情绪孤岛：想被回应，却不想被审视", 130, 1700, 27, muted),
    textLayer("痛点 03", "互动负担：复杂社交链路让表达变沉重", 130, 1760, 27, muted)
  ], true),
  group("产品定位", [
    textLayer("标题｜产品定位", "匿名情绪吐槽社区 / 年轻人情绪释放 App", 130, 1980, 52, white),
    textLayer("定位关键词", "破防 · 共鸣 · 吐槽 · 互动", 130, 2070, 30, green)
  ], true),
  group("信息架构", [
    textLayer("标题｜信息架构", "信息架构", 130, 2320, 62, white),
    textLayer("结构｜广场", "广场", 130, 2430, 28, green),
    textLayer("结构｜发布", "发布", 380, 2430, 28, green),
    textLayer("结构｜帖子详情", "帖子详情", 630, 2430, 28, green),
    textLayer("结构｜评论互动", "评论互动", 930, 2430, 28, green),
    textLayer("结构｜收藏", "收藏", 1230, 2430, 28, green),
    textLayer("结构｜我的", "我的", 1480, 2430, 28, green)
  ], true),
  group("核心功能", [
    textLayer("标题｜核心功能", "核心功能", 130, 2700, 62, white),
    textLayer("功能说明", "浏览、表达、回应与沉淀，形成完整的情绪释放闭环。", 130, 2790, 27, muted),
    imageLayer("截图｜03 发布破防", "03-create.png", 130, 2880, 360),
    imageLayer("截图｜05 收藏", "05-favorites.png", 530, 2880, 360),
    imageLayer("截图｜08 评论回复", "08-comments.png", 930, 2880, 360),
    imageLayer("截图｜09 收到的互动", "09-interactions.png", 1330, 2880, 360)
  ], true),
  group("页面展示", [
    textLayer("标题｜页面展示", "页面展示", 130, 4740, 62, white),
    imageLayer("截图｜02 榜单", "02-leaderboard.png", 130, 4860, 350),
    imageLayer("截图｜06 搜索", "06-search.png", 510, 4860, 350),
    imageLayer("截图｜10 完整首页", "10-full-home.png", 900, 4860, 290),
    imageLayer("截图｜11 完整个人中心", "11-full-profile.png", 1220, 4860, 290),
    imageLayer("截图｜12 完整帖子详情", "12-full-post-detail.png", 1540, 4860, 290)
  ], true),
  group("交互亮点", [
    textLayer("标题｜交互亮点", "交互亮点", 130, 6460, 62, white),
    textLayer("亮点 01", "情绪反馈：用笑死、共鸣、破防、神吐槽代替单一点赞", 130, 6560, 27, muted),
    textLayer("亮点 02", "回复关系：清晰呈现谁在回复谁，让对话自然延续", 130, 6620, 27, muted),
    textLayer("亮点 03", "互动通知：点赞与评论分区展示，保持信息轻量", 130, 6680, 27, muted)
  ], true),
  group("视觉规范", [
    textLayer("标题｜视觉规范", "视觉规范", 130, 6970, 62, white),
    textLayer("主色", "主色：荧光绿 #B7FF3C", 130, 7070, 28, green),
    textLayer("背景", "背景：黑灰渐变 #08070D", 130, 7130, 28, white),
    textLayer("关键词", "关键词：霓虹 / 情绪 / 匿名 / 共鸣", 130, 7190, 28, muted)
  ], true),
  group("总结成果", [
    textLayer("标题｜总结成果", "总结成果", 130, 7500, 62, white),
    textLayer("总结文案", "用鲜明视觉承接真实情绪，用轻量互动建立共鸣连接。", 130, 7600, 30, muted),
    textLayer("结束语", "今天也稳定破防中。", 130, 7710, 54, green)
  ], true)
];

const psd = {
  width,
  height,
  imageData: preview,
  children: [
    ...groups,
    { name: "背景｜完整视觉预览（隐藏后编辑模块）", left: 0, top: 0, imageData: preview }
  ]
};

await writeFile(outputPath, writePsdBuffer(psd));

const written = await readFile(outputPath);
const verified = readPsd(written, { skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true });
console.log(`PSD: ${outputPath}`);
console.log(`Size: ${verified.width}x${verified.height}`);
console.log(`Root layers: ${verified.children?.length ?? 0}`);
