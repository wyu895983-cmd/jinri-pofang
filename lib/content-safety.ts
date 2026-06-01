type ContentSafetyResult = {
  ok: boolean;
  reason?: "ad" | "contact";
  message?: string;
};

const adPatterns = [
  /刷单|兼职日结|代刷|接单群|返佣|推广合作/i,
  /博彩|赌博|网赌|棋牌|彩票|真人荷官|体育投注/i,
  /色情|裸聊|约炮|成人视频|看片|外围|上门服务/i,
  /加微信|加vx|加v信|加v|加qq|加tg|加telegram|私聊带你|带你赚钱/i
];

const contactPatterns = [
  /(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/,
  /(?:微信|vx|v信|wechat|weixin)[：:\s号]*(?:[a-z][-_a-z0-9]{5,19})/i,
  /(?:qq|企鹅)[：:\s号]*(?:[1-9]\d{4,11})/i,
  /(?:tg|telegram|电报)[：:\s@号]*(?:[a-z][a-z0-9_]{4,31})/i,
  /t\.me\/[a-z0-9_]{4,31}/i
];

export function checkContentSafety(content: string): ContentSafetyResult {
  const text = content.trim();

  if (contactPatterns.some((pattern) => pattern.test(text))) {
    return {
      ok: false,
      reason: "contact",
      message: "先别带联系方式，直接把槽吐出来就行。"
    };
  }

  if (adPatterns.some((pattern) => pattern.test(text))) {
    return {
      ok: false,
      reason: "ad",
      message: "这条像广告，广场先不收。"
    };
  }

  return { ok: true };
}
