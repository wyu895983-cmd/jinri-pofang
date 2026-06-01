const LEVELS = [
  { level: 1, exp: 0, title: "实习怨种" },
  { level: 2, exp: 100, title: "实习怨种" },
  { level: 3, exp: 250, title: "实习怨种" },
  { level: 4, exp: 500, title: "实习怨种" },
  { level: 5, exp: 900, title: "吐槽专员" },
  { level: 6, exp: 1500, title: "吐槽专员" },
  { level: 7, exp: 2500, title: "吐槽专员" },
  { level: 8, exp: 4000, title: "吐槽专员" },
  { level: 9, exp: 6500, title: "吐槽专员" },
  { level: 10, exp: 10000, title: "阴阳大师" },
  { level: 20, exp: 50000, title: "怨念法师" },
  { level: 30, exp: 150000, title: "地狱段子手" },
  { level: 40, exp: 400000, title: "地狱段子手" },
  { level: 50, exp: 1000000, title: "人间清醒" },
  { level: 100, exp: 5000000, title: "吐槽之神" }
];

export function getLevelInfo(exp: number) {
  let current = LEVELS[0];
  let next = LEVELS[1];

  for (let index = 0; index < LEVELS.length; index += 1) {
    if (exp >= LEVELS[index].exp) {
      current = LEVELS[index];
      next = LEVELS[index + 1] ?? LEVELS[index];
    }
  }

  return {
    level: current.level,
    title: current.title,
    currentExp: exp,
    nextLevel: next.level,
    nextLevelExp: next.exp,
    expToNext: Math.max(next.exp - exp, 0),
    progress: next.exp === current.exp ? 100 : Math.min(((exp - current.exp) / (next.exp - current.exp)) * 100, 100)
  };
}
