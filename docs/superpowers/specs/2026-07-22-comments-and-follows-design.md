# 今日破防：两级评论、快捷表情与基础关注设计

日期：2026-07-22

## 目标

在保留现有页面布局、多语言、发帖、点赞、评论时间、通知、经验值、用户资料同步和实时订阅的前提下，完成稳定的两级评论、评论删除、评论输入快捷表情以及基础关注功能。

本次不实现无限评论嵌套、私信、好友关系、关注通知或复杂关注动画。

## 已确认现状

- 目标代码库为 `D:\文档\画画\jinri-pofang`。
- 工作区已有 AI 帖子相关未提交修改；实现必须基于当前内容增量编辑，不重置或覆盖这些修改。
- 线上 `comments` 已有 `parent_comment_id`、`created_at`、点赞数据和实时订阅，但没有根评论、实际回复用户或删除能力。
- 线上 `profiles.is_admin` 已存在并复用。
- 当前没有关注表、他人主页或关注信息流。
- 评论输入区已有 9 个 PoPo 表情的完整选择器；四个快捷表情将复用 `p1` 至 `p4`，不复制资源。
- 当前身份由昵称和口令管理。线上 `auth.users` 为 0，现有 25 个 `profiles` 均不与 Supabase Auth 绑定，因此不能直接用 `auth.uid()` 表达用户级 RLS。

## 身份与数据库权限

### 方案

保留现有昵称和口令登录，并新增数据库会话令牌。新的敏感操作不再信任客户端单独传入的 `profile_uuid`。

新增 `profile_sessions` 私有表：

- `id uuid primary key`
- `profile_id uuid not null references profiles(id) on delete cascade`
- `token_hash text not null unique`
- `created_at timestamptz not null default now()`
- `expires_at timestamptz not null`
- `revoked_at timestamptz`
- `last_seen_at timestamptz`

登录使用新的 `login_or_create_profile_session` RPC。它复用现有昵称、口令验证逻辑，生成随机高熵令牌，只保存令牌哈希，并返回用户资料和一次性明文令牌。浏览器保存该令牌；退出登录时调用撤销函数并继续清理现有本地用户状态。

`profile_sessions` 开启 RLS，不创建公开策略，也不授予直接表权限。令牌验证函数放在非暴露 schema 中，敏感 RPC 固定 `search_path`，显式检查令牌有效期和撤销状态。

现有已登录浏览器没有会话令牌。它们仍能读取内容并使用原有非敏感流程；首次执行关注、取消关注或删除评论时，界面要求重新登录一次以取得安全会话，不根据本地 UUID 静默签发令牌。

### 表级策略

- `comments` 不授予客户端直接 DELETE；DELETE RLS 默认拒绝。删除只能经过受控 RPC。
- `follows` 允许公开读取关注关系以支持计数和高亮，但不授予直接 INSERT/DELETE；写入 RLS 默认拒绝，只能经过受控 RPC。
- `profile_sessions` 不允许匿名或已认证 Data API 角色直接读取或写入。
- 管理员身份只从数据库中的 `profiles.is_admin` 读取，不信任客户端声明或用户 metadata。

## 评论数据模型

在现有 `comments` 表幂等增加：

- `root_comment_id uuid references comments(id) on delete cascade`
- `reply_to_user_id uuid references profiles(id) on delete set null`
- `reply_to_username text`

语义：

- 一级评论：`parent_comment_id`、`root_comment_id` 和回复对象字段均为空。
- 二级回复：`parent_comment_id` 指向实际被点击回复的评论，`root_comment_id` 始终指向所属一级评论。
- 回复二级回复时，`parent_comment_id` 指向该二级回复，`reply_to_user_id` 和 `reply_to_username` 保存实际对象，但 `root_comment_id` 仍指向一级评论。
- `reply_to_username` 是发布时快照，用于用户改名或资料不可用时稳定显示。

添加 `comments(root_comment_id, created_at)` 索引。迁移时为已有回复回填：根节点取父评论自身或父评论已有的根节点，实际回复对象取直接父评论作者和其昵称。

`comment_feed` 更新为 security-invoker 视图并返回新增字段，同时保留现有字段名称以兼容旧客户端。

## 创建回复

升级 `create_comment`，保留现有参数兼容性，并加入实际回复对象。数据库负责：

1. 校验帖子存在。
2. 校验直接回复目标仍存在且属于同一帖子。
3. 根据直接目标计算根评论，客户端不能指定任意根节点。
4. 保存 `parent_comment_id`、`root_comment_id`、`reply_to_user_id` 和用户名快照。
5. 通知实际被回复用户；一级评论仍通知贴主。
6. 保持现有评论经验值与被评论奖励逻辑。

前端在提交前检查当前评论列表；数据库仍执行最终校验以处理竞态。数据库返回“该评论已被删除”时，前端清除回复状态并展示对应多语言错误。

发布成功后直接把返回的完整评论追加到本地状态，并按现有规则重新归组；不调用整页刷新。Realtime 事件到达时按评论 ID 去重。

## 两级评论展示

- 一级评论继续按当前点赞数降序、创建时间降序排列。
- 回复统一按 `root_comment_id` 归到一级评论下，并按创建时间升序排列。
- 二级回复只缩进一层，使用浅背景和左分隔线。
- 展示头像、昵称、时间、点赞、回复按钮和“发布者 回复 实际对象：内容”。
- 点击评论内容、昵称或回复按钮都进入回复状态。
- 输入框通过 ref 滚动到可见区域后聚焦；移动浏览器是否弹出软键盘由浏览器策略决定，但聚焦发生在用户点击事件链中以提高成功率。
- 回复提示显示“正在回复 @用户名”及关闭按钮。

## 删除评论

新增 `delete_comment(session_token, comment_uuid)` RPC，在单个事务内：

1. 验证数据库会话并得到操作者。
2. 锁定目标评论和所属帖子。
3. 允许评论作者、帖子作者或 `is_admin = true` 的用户删除。
4. 统计目标及其级联回复总数。
5. 删除关联经验日志中仅以被删评论为来源的记录，但不回扣已经发放的用户经验，保持当前产品语义。
6. 删除评论；一级评论的回复由外键级联删除，普通回复只删除自身。
7. 将 `posts.comment_count` 原子减少实际删除数且不低于 0。

评论反应、引用该评论的通知由现有外键级联清理。前端只有在有权限时显示“···”，菜单内提供“删除评论”，并在 `window.confirm` 二次确认。成功后从本地状态移除对应评论及其回复，不刷新页面。

## 评论快捷表情

扩展现有 `StickerPicker`，让评论编辑器以受控方式获得 textarea 值和 ref：

- 快捷区使用现有 `p1` 至 `p4`。
- 点击将 token 插入当前光标位置并恢复光标，不触发表单提交。
- 按钮执行轻微缩小回弹；快捷区随后淡出并卸载。
- textarea 内容变为空字符串时重新显示快捷区。
- 评论输入区域重新挂载或重新打开时初始化为显示。
- 进入或取消回复状态不会禁用快捷表情；回复同样可插入。
- 保留现有完整 9 个 PoPo 表情选择器。

## 关注数据模型与权限

新增 `follows`：

- `follower_id uuid not null references profiles(id) on delete cascade`
- `following_id uuid not null references profiles(id) on delete cascade`
- `created_at timestamptz not null default now()`
- 主键 `(follower_id, following_id)` 防止重复关注。
- CHECK `follower_id <> following_id` 防止关注自己。
- 增加 `(following_id, created_at)` 索引支持粉丝查询；主键已支持关注列表查询。

新增 `follow_profile(session_token, target_profile_id)` 与 `unfollow_profile(session_token, target_profile_id)`。数据库会话决定 follower，客户端不能替其他用户写关注关系。函数校验目标存在、自关注、重复写入并返回稳定状态。

关注数和粉丝数通过 COUNT 查询获得，不在 `profiles` 增加重复计数字段。

## 用户主页

新增 `/profile/[id]`：

- 显示头像、昵称、等级、帖子、获赞、关注数和粉丝数。
- 非本人页面显示“关注 / 已关注”按钮。
- 本人链接回现有 `/profile`，不复制自己的编辑、通知或设置界面。
- 作者头像和昵称从首页卡片、详情页、排行榜及其他现有帖子卡片链接到正确用户主页。
- 不展示或泄露 `pass_hash`、会话信息或管理员内部字段。

新增共享 `FollowButton`，只封装关注状态、登录提示、请求中禁用和错误回滚，页面负责资料展示。

## 首页信息流

首页增加“广场 / 关注”两个页签，默认广场：

- 广场复用现有 `getPosts` 查询和排序。
- 关注流通过当前用户关注 ID 集合过滤/查询帖子，保持现有点赞状态、AI 作者字段和实时订阅。
- 没有关注任何人时显示“还没有关注的人，去广场看看吧。”，并提供切回广场的操作。
- 广场中已关注作者的帖子增加浅薄荷绿左边线、极浅背景和小型“已关注”标签；不使用大面积高饱和绿色。
- 切换页签不重新实现帖子卡片，不改变点赞、收藏、评论和情绪反应逻辑。

## 多语言

所有新增可见文字加入现有 `zh-CN`、`en`、`ja`、`ko` 字典，包括：

- 回复中、取消回复、评论已删除、删除菜单与确认文案。
- 关注、已关注、关注数、粉丝数、广场、关注流及空状态。
- 安全会话失效后重新登录提示。

数据库异常不直接作为最终 UI 中文案；存储层映射为稳定错误码，页面再通过 i18n 显示。

## 文件范围

预计修改：

- `supabase/schema.sql`
- `app/post/[id]/page.tsx`
- `components/sticker-picker.tsx`
- `lib/storage.ts`
- `lib/i18n.tsx`
- `app/page.tsx`
- `app/profile/page.tsx`
- `components/local-post-card.tsx`
- `components/post-card.tsx`
- `components/feed-list.tsx`
- `app/leaderboard/page.tsx`
- `package.json`（仅在添加测试脚本时）

预计新增：

- `supabase/migrations/<generated>-comments_follows_sessions.sql`
- `app/profile/[id]/page.tsx`
- `components/follow-button.tsx`
- 评论关系、删除权限、关注约束和信息流测试

## 测试与验收

测试先行覆盖：

- 根评论计算与两级归组。
- 回复二级评论仍归入原一级评论且保存实际回复用户。
- 回复目标删除后的提交失败。
- 删除回复、删除一级评论级联、无权限删除、贴主删除和管理员删除。
- 自关注、重复关注、关注、取消关注和会话失效。
- 关注流过滤与广场高亮。
- 快捷表情只插入、不提交、隐藏和在清空后恢复。
- 新增四种语言键完整。

验证步骤：

1. 运行新增测试并确认先失败后通过。
2. 运行 TypeScript 类型检查。
3. 运行生产构建。
4. 在 Supabase 开发验证中检查字段、约束、索引、函数权限和 RLS。
5. 运行 Supabase security/performance advisors。
6. 手动验证移动端聚焦、回复、删除、关注、取消关注、两种信息流、点赞、通知和经验值回归。

## 发布与兼容性

- SQL 使用 `IF NOT EXISTS` 或先检查后创建，避免重复字段和索引。
- 先应用向后兼容的数据库扩展，再部署使用新字段的前端。
- `comment_feed` 保留旧字段；新前端对尚未迁移的字段提供空值兼容。
- 数据库迁移失败时不部署前端。
- 回滚前端不会删除新增数据；数据库表和字段保留，避免破坏已产生的关注与回复关系。
