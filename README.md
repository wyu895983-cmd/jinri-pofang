# 今日破防

一个吐槽、共鸣、轻社交、等级成长的小社区 Web App MVP。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth + Postgres

## 本地运行

1. 安装依赖：

```bash
npm install
```

2. 复制环境变量：

```bash
cp .env.example .env.local
```

3. 在 `.env.local` 填入 Supabase 项目信息：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. 启动：

```bash
npm run dev
```

打开 `http://localhost:3000`。

## Supabase 配置

1. 新建 Supabase 项目。
2. 进入 `SQL Editor`。
3. 复制并执行 `supabase/schema.sql`。
4. 进入 `Authentication > URL Configuration`：
   - Site URL: `http://localhost:3000`
   - Redirect URLs 添加：`http://localhost:3000/auth/callback`
5. 进入 `Project Settings > API`，复制 Project URL 和 anon public key 到 `.env.local`。

Magic Link 登录默认会发邮件。如果本地测试收不到邮件，请在 Supabase Auth 的日志里看发送状态。

## Vercel 部署

1. 把项目上传到 GitHub。
2. 在 Vercel 导入该 GitHub 仓库。
3. 添加环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`，值填 Vercel 的正式域名，例如 `https://your-app.vercel.app`
4. 回到 Supabase `Authentication > URL Configuration`：
   - Site URL 改成正式域名
   - Redirect URLs 添加 `https://your-app.vercel.app/auth/callback`
5. Vercel 重新部署。

## MVP 功能

- Feed 时间倒序展示所有吐槽
- Magic Link 登录
- 发帖：100 字以内，每条消耗 1 点怨气值
- 评论：80 字以内
- 反应按钮：笑死、共鸣、破防、神吐槽，第一版统一计入点赞
- 每日登录、发帖、评论、收到评论、点赞里程碑经验
- 每日怨气值懒重置为 20
- 个人主页和历史吐槽
- 今日点赞榜、今日评论榜、总经验榜

## 经验与怨气逻辑

核心逻辑在 `supabase/schema.sql` 的数据库函数里：

- `ensure_daily_profile()`：每日登录、连续登录、怨气值重置
- `create_post(text)`：发帖、扣怨气、加发帖经验
- `create_comment(uuid, text)`：评论、加评论经验、给楼主收到评论经验
- `react_to_post(uuid, text)`：点赞/取消点赞、处理点赞里程碑奖励

等级与称号展示逻辑在 `lib/levels.ts`。
