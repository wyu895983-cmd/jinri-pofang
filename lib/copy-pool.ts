import type { PostWithProfile } from "@/lib/queries";

export const HOME_HEADLINE_POOL = [
  "今天谁又绷不住了？",
  "今天谁偷偷破防了？",
  "今天谁被现实暴击了？",
  "今天谁在强颜欢笑？",
  "今天谁的怨气值爆表了？",
  "今天谁又开始怀疑人生了？",
  "今天谁又熬夜了？",
  "今天谁想直接躺平？",
  "今天谁假装没事？",
  "今天谁在地铁上发呆？",
  "今天谁又被迫长大了？",
  "今天谁的情绪快满格了？",
  "今天谁还在硬撑？",
  "今天谁笑着笑着沉默了？",
  "今天谁被一句话整不会了？"
] as const;

export const HOME_COPY_POOL = [
  "老师说这部分不考。\n结果全考了。",
  "老板说简单改一下。\n我知道今晚回不了家。",
  "孩子终于睡着了。\n门铃响了。",
  "Bug 消失了。\n领导来了。\n\nBug 又出现了。",
  "字体选了一小时。\n客户说都一样。",
  "视频通话挂了。\n还在看聊天框。",
  "消息秒回的时候：\n开心。\n\n已读不回的时候：\n破防。",
  "图书馆坐了八小时。\n学进去三分钟。",
  "工作教会我：\n有些事真的急不来。\n\n因为永远更急。",
  "辅导作业的时候。\n我也想重新读小学。",
  "代码跑起来了。\n但不知道为什么。",
  "考研不是学习。\n是反复怀疑人生。",
  "终于有自己的时间了。\n结果只想发呆。",
  "需求改到第十八版。\n初心已经找不到了。",
  "长大以后才发现。\n父母的唠叨其实是想念。",
  "今天不用上班。\n但也没赚钱。",
  "客户不回消息。\n我开始脑补各种剧情。"
] as const;

const COMMUNITY_NICKNAMES = [
  "匿名路过",
  "今天先忍了",
  "还能再撑会儿",
  "地铁发呆员",
  "键盘边缘人",
  "沉默观察员",
  "情绪待机中",
  "普通熬夜人",
  "刚刚还好",
  "笑着点头"
] as const;

export type HomeFeedPost = PostWithProfile & {
  fromCopyPool?: boolean;
};

function shuffle<T>(items: readonly T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function createCopyPoolPost(content: string, index: number): HomeFeedPost {
  const minutesAgo = 4 + index * 11 + Math.floor(Math.random() * 16);
  const nickname = COMMUNITY_NICKNAMES[index % COMMUNITY_NICKNAMES.length];

  return {
    id: `copy-pool-${index}`,
    user_id: `copy-pool-user-${index}`,
    content,
    reaction_count: 8 + Math.floor(Math.random() * 220),
    comment_count: Math.floor(Math.random() * 38),
    created_at: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
    updated_at: null,
    fromCopyPool: true,
    profiles: {
      id: `copy-pool-user-${index}`,
      nickname,
      exp: 100 + index * 320,
      energy: 20,
      streak_count: 1
    }
  };
}

export function buildHomeFeedPosts(posts: PostWithProfile[], copyCount = 24): HomeFeedPost[] {
  const copyPosts = shuffle(HOME_COPY_POOL)
    .slice(0, copyCount)
    .map((content, index) => createCopyPoolPost(content, index));

  return shuffle<HomeFeedPost>([...posts, ...copyPosts]);
}
