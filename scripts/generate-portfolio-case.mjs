import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = process.cwd();
const outputDir = resolve(root, "portfolio-case");
const htmlPath = resolve(outputDir, "index.html");
const pngPath = resolve(outputDir, "jinri-pofang-case-board.png");

const html = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>今日破防 · UI Case Study</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #050507; color: #f4f4f5; font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; }
    body { overflow: hidden; }
    .review-layout { display: flex; width: 100vw; height: 100vh; overflow: hidden; }
    .annotation-panel { flex: 0 0 320px; width: 320px; padding: 24px; background: #101014; border-right: 1px solid #2e2b35; }
    .annotation-panel h2 { font-size: 26px; letter-spacing: 0; }
    .annotation-panel textarea { display: block; width: 100%; min-height: 300px; margin-top: 20px; padding: 14px; resize: vertical; border: 1px solid #3b3743; border-radius: 10px; outline: none; background: #08080b; color: #f4f4f5; font: inherit; line-height: 1.6; }
    .annotation-panel textarea:focus { border-color: #b7ff3c; }
    .copy-notes { width: 100%; margin-top: 14px; padding: 13px 16px; border: 0; border-radius: 10px; background: #b7ff3c; color: #101106; font: inherit; font-weight: 700; cursor: pointer; }
    .copy-hint { margin-top: 12px; color: #a1a1aa; font-size: 13px; line-height: 1.6; }
    .portfolio-preview { flex: 1 1 auto; min-width: 0; overflow: auto; scroll-behavior:smooth; }
    @media (max-width: 720px) {
      body { overflow: auto; }
      .review-layout { display: block; width: 100%; height: auto; overflow: visible; }
      .annotation-panel { width: 100%; padding: 20px; border-right: 0; border-bottom: 1px solid #2e2b35; }
      .portfolio-preview { width: 100%; height: 72vh; overflow: auto; }
    }
    .board { position: relative; width: 1920px; min-height: 6200px; overflow: hidden; background:
      radial-gradient(circle at 86% 7%, rgba(183,255,60,.14), transparent 18%),
      radial-gradient(circle at 7% 35%, rgba(112,52,170,.16), transparent 20%),
      linear-gradient(180deg, #09080e 0%, #050507 40%, #0b0910 100%); }
    .board::before { content:""; position:absolute; inset:0; opacity:.18; pointer-events:none; background-image:
      linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px); background-size: 48px 48px; }
    .section { position: relative; padding: 110px 130px; }
    .eyebrow { color:#b7ff3c; font-size:18px; font-weight:700; letter-spacing:3px; text-transform:uppercase; }
    h1,h2,h3,p { margin:0; }
    h1 { font-size:142px; line-height:.95; letter-spacing:-4px; }
    h2 { font-size:68px; line-height:1.05; letter-spacing:-2px; }
    h3 { font-size:30px; line-height:1.2; }
    .muted { color:#a1a1aa; }
    .green { color:#b7ff3c; }
    .line { height:1px; background:linear-gradient(90deg, #b7ff3c, rgba(183,255,60,0)); }
    .hero { min-height:1160px; padding-top:105px; }
    .hero-top { display:flex; justify-content:space-between; align-items:flex-start; }
    .brandmark { width:92px; height:92px; border-radius:25px; display:grid; place-items:center; box-shadow:0 0 45px rgba(183,255,60,.35); }
    .brandmark img { display:block; width:100%; height:100%; object-fit:contain; }
    .hero-copy { width:940px; margin-top:75px; }
    .hero-copy .en { margin-top:24px; font-size:37px; font-weight:700; letter-spacing:10px; color:#b7ff3c; }
    .hero-copy .desc { margin-top:40px; width:720px; font-size:28px; line-height:1.7; color:#b8b8c1; }
    .hero-tag { margin-top:32px; display:inline-flex; padding:14px 22px; border:1px solid rgba(183,255,60,.4); color:#b7ff3c; font-size:18px; letter-spacing:2px; }
    .hero-phones { position:absolute; right:30px; top:295px; width:820px; height:850px; }
    .phone { position:absolute; width:330px; padding:10px; border:1px solid #35323c; border-radius:42px; background:#111017; box-shadow:0 35px 90px rgba(0,0,0,.65), 0 0 40px rgba(183,255,60,.08); }
    .phone img { display:block; width:100%; border-radius:33px; }
    .phone.a { left:0; top:130px; transform:rotate(-7deg); }
    .phone.b { left:245px; top:0; z-index:2; }
    .phone.c { left:490px; top:150px; transform:rotate(7deg); }
    .intro { display:grid; grid-template-columns:1.1fr .9fr; gap:90px; align-items:center; min-height:720px; }
    .intro-copy p { margin-top:34px; max-width:760px; font-size:27px; line-height:1.8; color:#b5b5bf; }
    .metrics { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
    .metric { min-height:180px; padding:28px; border:1px solid #2e2b35; background:rgba(255,255,255,.025); }
    .metric strong { display:block; font-size:64px; color:#b7ff3c; }
    .metric span { display:block; margin-top:15px; font-size:18px; color:#a1a1aa; letter-spacing:1px; }
    .research { padding-top:145px; padding-bottom:160px; border-block:1px solid #24212a; background:
      radial-gradient(circle at 82% 10%, rgba(183,255,60,.09), transparent 19%),
      radial-gradient(circle at 12% 72%, rgba(105,64,165,.16), transparent 21%),
      rgba(255,255,255,.012); }
    .research-head { display:grid; grid-template-columns:1.15fr .85fr; gap:90px; align-items:end; }
    .research-head p { color:#aaa8b3; font-size:21px; line-height:1.75; }
    .research-tabs { position:sticky; top:18px; z-index:10; margin-top:55px; display:grid; grid-template-columns:repeat(4,1fr); border:1px solid #302d36; background:rgba(8,7,13,.9); backdrop-filter:blur(18px); }
    .research-tabs a { padding:18px 20px; border-right:1px solid #302d36; color:#9d9ba5; font-size:14px; font-weight:700; letter-spacing:1px; text-decoration:none; transition:.25s; }
    .research-tabs a:last-child { border-right:0; }
    .research-tabs a:hover { background:rgba(183,255,60,.08); color:#b7ff3c; }
    .research-panel { scroll-margin-top:95px; margin-top:90px; }
    .research-panel-head { display:flex; justify-content:space-between; align-items:end; gap:50px; margin-bottom:42px; }
    .research-panel-head h3 { font-size:42px; }
    .research-panel-head p { width:610px; color:#8f8d98; font-size:17px; line-height:1.7; }
    .position-grid { display:grid; grid-template-columns:1.1fr .9fr; gap:28px; }
    .position-map { position:relative; min-height:510px; overflow:hidden; border:1px solid #302d36; background:
      linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px), #0b0a0f; background-size:56px 56px; }
    .position-map::before,.position-map::after { content:""; position:absolute; background:#37333e; }
    .position-map::before { left:50%; top:42px; bottom:42px; width:1px; }
    .position-map::after { top:50%; left:42px; right:42px; height:1px; }
    .axis { position:absolute; color:#77747e; font-size:13px; letter-spacing:1px; }
    .axis.x1 { left:30px; bottom:20px; }.axis.x2 { right:30px; bottom:20px; }
    .axis.y1 { left:28px; top:20px; }.axis.y2 { left:28px; bottom:52px; }
    .map-dot { position:absolute; display:grid; place-items:center; width:108px; height:108px; padding:10px; border:1px solid #45404c; border-radius:50%; background:#141219; color:#b5b3bc; text-align:center; font-size:15px; }
    .map-dot.soul { left:18%; top:17%; }.map-dot.jike { right:16%; top:23%; }.map-dot.weibo { left:20%; bottom:18%; }.map-dot.xhs { right:17%; bottom:15%; }
    .map-dot.product { left:calc(50% - 66px); top:calc(50% - 66px); width:132px; height:132px; border-color:#b7ff3c; background:#17200d; color:#b7ff3c; font-size:18px; font-weight:800; box-shadow:0 0 38px rgba(183,255,60,.18); }
    .position-cards { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
    .position-card { min-height:240px; padding:26px; border:1px solid #302d36; background:rgba(255,255,255,.025); }
    .position-card b { color:#b7ff3c; font-size:13px; letter-spacing:2px; }
    .position-card h4 { margin:18px 0 0; color:#fff; font-size:25px; }
    .position-card p { margin-top:13px; color:#8f8d98; font-size:16px; line-height:1.65; }
    .position-card.accent { background:linear-gradient(145deg, rgba(183,255,60,.13), rgba(105,64,165,.08)); border-color:rgba(183,255,60,.35); }
    .persona-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
    .persona { min-height:325px; padding:26px; border:1px solid #302d36; background:#0d0c12; }
    .persona-icon { width:58px; height:58px; display:grid; place-items:center; border-radius:18px; background:rgba(183,255,60,.12); color:#b7ff3c; font-size:26px; }
    .persona h4 { margin:22px 0 0; font-size:24px; }
    .persona .role { margin-top:8px; color:#b7ff3c; font-size:13px; letter-spacing:1px; }
    .persona p { margin-top:20px; color:#92909a; font-size:15px; line-height:1.7; }
    .pain-flow { margin-top:26px; display:grid; grid-template-columns:repeat(5,1fr); gap:16px; }
    .pain { position:relative; min-height:205px; padding:23px; border:1px solid #302d36; background:rgba(255,255,255,.022); }
    .pain::after { content:"→"; position:absolute; right:-16px; top:82px; z-index:2; color:#b7ff3c; font-size:24px; }
    .pain:last-child::after { display:none; }
    .pain strong { color:#6940a5; font-size:36px; }
    .pain h4 { margin:14px 0 0; font-size:19px; }
    .pain p { margin-top:10px; color:#85838d; font-size:14px; line-height:1.55; }
    .opportunity { margin-top:24px; display:flex; align-items:center; justify-content:space-between; gap:40px; padding:30px 36px; border:1px solid rgba(183,255,60,.35); background:linear-gradient(90deg, rgba(183,255,60,.12), rgba(105,64,165,.08)); }
    .opportunity b { color:#b7ff3c; font-size:14px; letter-spacing:2px; }
    .opportunity p { max-width:1120px; color:#f0f0f2; font-size:22px; line-height:1.6; }
    .competitor-grid { display:grid; grid-template-columns:1.05fr .95fr; gap:28px; }
    .matrix { display:grid; grid-template-columns:170px repeat(4,1fr); border:1px solid #302d36; background:#0c0b10; }
    .matrix div { min-height:86px; padding:18px; border-right:1px solid #302d36; border-bottom:1px solid #302d36; color:#96949e; font-size:14px; line-height:1.5; }
    .matrix div:nth-child(5n) { border-right:0; }.matrix div:nth-last-child(-n+5) { border-bottom:0; }
    .matrix .m-head { color:#fff; font-weight:800; }.matrix .m-label { color:#b7ff3c; font-weight:700; }
    .matrix .best { background:rgba(183,255,60,.09); color:#b7ff3c; }
    .diff-stack { display:grid; gap:16px; }
    .diff-card { display:grid; grid-template-columns:72px 1fr; gap:18px; align-items:center; min-height:112px; padding:20px; border:1px solid #302d36; background:rgba(255,255,255,.025); }
    .diff-card span { color:#b7ff3c; font-size:35px; font-weight:800; }
    .diff-card h4 { margin:0; font-size:20px; }.diff-card p { margin-top:7px; color:#85838d; font-size:14px; }
    .function-map { display:grid; grid-template-columns:repeat(5,1fr); gap:18px; }
    .function-column { border:1px solid #302d36; background:#0d0c12; }
    .function-column h4 { margin:0; padding:22px; border-bottom:1px solid #302d36; color:#b7ff3c; font-size:19px; }
    .function-column div { padding:17px 22px; border-bottom:1px solid #232129; color:#96949e; font-size:15px; }
    .function-column div:last-child { border-bottom:0; }
    .strategy-grid { margin-top:28px; display:grid; grid-template-columns:.72fr 1.28fr; gap:28px; }
    .ip-role { position:relative; min-height:470px; overflow:hidden; border:1px solid #302d36; background:radial-gradient(circle at 50% 45%, rgba(183,255,60,.12), transparent 42%), #0b0a0f; }
    .ip-role img { position:absolute; right:-10px; bottom:-80px; width:390px; filter:drop-shadow(0 0 24px rgba(183,255,60,.16)); }
    .ip-role-copy { position:relative; z-index:2; width:100%; padding:30px; }
    .ip-role-copy b { color:#b7ff3c; font-size:13px; letter-spacing:2px; }.ip-role-copy h4 { margin:16px 0 0; font-size:27px; }
    .ip-role-copy p { margin-top:15px; color:#8f8d98; font-size:15px; line-height:1.7; }
    .role-chips { margin-top:22px; display:flex; flex-wrap:wrap; gap:9px; }.role-chips span { padding:9px 12px; border:1px solid #403b49; color:#bbb9c2; font-size:13px; }
    .visual-board { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
    .visual-word { min-height:140px; padding:22px; border:1px solid #302d36; display:flex; flex-direction:column; justify-content:flex-end; background:rgba(255,255,255,.025); }
    .visual-word:nth-child(1),.visual-word:nth-child(6) { background:#b7ff3c; color:#101106; }.visual-word:nth-child(2),.visual-word:nth-child(5) { background:#6940a5; }
    .visual-word b { font-size:22px; }.visual-word span { margin-top:8px; font-size:12px; opacity:.65; letter-spacing:1px; }
    .architecture { padding-top:145px; padding-bottom:145px; background:rgba(255,255,255,.018); border-block:1px solid #232129; }
    .arch-grid { margin-top:70px; display:grid; grid-template-columns:repeat(6,1fr); gap:16px; }
    .arch-node { position:relative; min-height:150px; padding:26px 20px; border:1px solid #36323d; background:#0d0c12; }
    .arch-node::after { content:"→"; position:absolute; right:-19px; top:54px; z-index:3; color:#b7ff3c; font-size:28px; }
    .arch-node:last-child::after { display:none; }
    .arch-node b { display:block; color:#b7ff3c; font-size:14px; letter-spacing:2px; }
    .arch-node h3 { margin-top:18px; font-size:27px; }
    .arch-node p { margin-top:12px; color:#85838d; font-size:16px; line-height:1.5; }
    .features-head { display:flex; justify-content:space-between; align-items:end; margin-bottom:75px; }
    .features-head p { width:540px; font-size:21px; line-height:1.65; color:#9d9ba5; }
    .feature-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:32px; align-items:start; }
    .feature { position:relative; }
    .feature:nth-child(even) { margin-top:90px; }
    .feature .device { padding:8px; border:1px solid #383540; border-radius:34px; background:#111017; box-shadow:0 25px 70px rgba(0,0,0,.55); }
    .feature img { display:block; width:100%; border-radius:27px; }
    .feature-info { padding:24px 3px 0; }
    .feature-info .num { color:#b7ff3c; font-size:14px; letter-spacing:2px; }
    .feature-info h3 { margin-top:10px; font-size:28px; }
    .feature-info p { margin-top:12px; color:#8f8d98; font-size:17px; line-height:1.6; }
    .systems { display:grid; grid-template-columns:.9fr 1.1fr; gap:85px; align-items:center; padding-top:160px; padding-bottom:160px; }
    .systems .turnaround { grid-column:1 / -1; margin-top:75px; padding-top:55px; border-top:1px solid #27242d; }
    .turnaround-head { display:grid; grid-template-columns:.75fr 1.25fr; align-items:start; gap:80px; }
    .character-intro { padding:26px 30px; border-left:2px solid #b7ff3c; background:linear-gradient(90deg, rgba(183,255,60,.065), transparent); }
    .character-intro h4 { margin:0; color:#fff; font-size:25px; letter-spacing:.5px; }
    .character-intro p { margin-top:15px; color:#aaa8b3; font-size:17px; line-height:1.8; }
    .turnaround-stage { margin-top:40px; padding:20px 45px 10px; border:1px solid #24212a; background:radial-gradient(circle at 50% 55%, rgba(183,255,60,.07), transparent 36%), rgba(255,255,255,.012); }
    .turnaround-stage img { display:block; width:100%; }
    .turnaround-labels { display:grid; grid-template-columns:repeat(3,1fr); margin-top:-10px; padding:0 40px 28px; text-align:center; }
    .turnaround-labels b { color:#b7ff3c; font-size:15px; letter-spacing:2px; }
    .turnaround-labels span { display:block; margin-top:7px; color:#85838d; font-size:14px; }
    .palette { display:grid; grid-template-columns:repeat(2,1fr); gap:18px; margin-top:50px; }
    .swatch { height:170px; padding:22px; display:flex; flex-direction:column; justify-content:flex-end; border:1px solid rgba(255,255,255,.08); }
    .swatch b { font-size:18px; }
    .swatch span { margin-top:7px; font-size:14px; opacity:.65; }
    .keywords { display:flex; flex-wrap:wrap; gap:14px; margin-top:46px; }
    .keyword { padding:15px 22px; border:1px solid #403b49; color:#c7c6cc; font-size:18px; }
    .system-shot { position:relative; height:630px; }
    .system-shot .phone { width:350px; }
    .system-shot .phone:first-child { left:120px; top:0; transform:rotate(-5deg); }
    .mascot-render { position:absolute; left:210px; top:-35px; width:480px; height:690px; filter:drop-shadow(0 0 22px rgba(183,255,60,.18)); }
    .mascot-render img { display:block; width:100%; height:100%; object-fit:contain; object-position:center; }
    .journey { padding-top:150px; padding-bottom:130px; border-top:1px solid #24212a; }
    .journey-head { display:flex; justify-content:space-between; align-items:end; }
    .journey-head p { width:540px; color:#96949e; font-size:20px; line-height:1.7; }
    .journey-grid { margin-top:75px; display:grid; grid-template-columns:1.25fr .75fr .75fr; gap:28px; align-items:start; }
    .journey-card { position:relative; height:950px; overflow:hidden; border:1px solid #32303a; background:#0b0a0f; }
    .journey-card img { display:block; width:100%; }
    .journey-card::after { content:""; position:absolute; inset:auto 0 0; height:280px; background:linear-gradient(transparent, #0b0a0f 85%); }
    .journey-label { position:absolute; z-index:2; bottom:32px; left:32px; }
    .journey-label b { color:#b7ff3c; font-size:15px; letter-spacing:2px; }
    .journey-label h3 { margin-top:9px; font-size:28px; }
    .footer { min-height:430px; display:flex; align-items:end; justify-content:space-between; padding-top:100px; padding-bottom:95px; border-top:1px solid #27242d; }
    .footer h2 { max-width:1000px; font-size:78px; }
    .footer-meta { text-align:right; color:#8f8d98; font-size:17px; line-height:1.8; letter-spacing:1px; }
    .burst { position:absolute; width:340px; height:340px; border:1px solid rgba(183,255,60,.25); border-radius:50%; }
    .burst::before,.burst::after { content:""; position:absolute; inset:50%; width:520px; height:1px; background:rgba(183,255,60,.25); transform:translate(-50%,-50%) rotate(35deg); }
    .burst::after { transform:translate(-50%,-50%) rotate(-35deg); }

    /* Design polish: unified type scale, spacing rhythm and grid alignment. */
    .section { padding:128px 144px; }
    .eyebrow { font-size:16px; line-height:1.4; letter-spacing:2.5px; }
    h1 { font-size:132px; line-height:.96; letter-spacing:-3.5px; }
    h2 { font-size:60px; line-height:1.08; letter-spacing:-1.5px; }
    h3 { font-size:28px; line-height:1.25; }
    .hero { padding-top:112px; }
    .hero-copy { margin-top:64px; }
    .hero-copy .en { margin-top:24px; font-size:34px; line-height:1.25; letter-spacing:8px; }
    .hero-copy .desc { margin-top:32px; width:700px; font-size:24px; line-height:1.7; }
    .hero-tag { margin-top:32px; padding:14px 24px; font-size:16px; letter-spacing:1.5px; }
    .intro { grid-template-columns:1.05fr .95fr; gap:96px; }
    .intro-copy p { margin-top:32px; max-width:720px; font-size:24px; line-height:1.7; }
    .metrics { gap:24px; }
    .metric { min-height:176px; padding:32px; }
    .metric strong { font-size:60px; line-height:1; }
    .metric span { margin-top:16px; font-size:16px; line-height:1.55; }
    .research { padding-top:144px; padding-bottom:160px; }
    .research-head { grid-template-columns:1.1fr .9fr; gap:96px; }
    .research-head p { max-width:620px; font-size:20px; line-height:1.7; }
    .research-tabs { margin-top:48px; }
    .research-tabs a { padding:18px 24px; font-size:13px; letter-spacing:1.5px; }
    .research-panel { margin-top:96px; }
    .research-panel-head { gap:64px; margin-bottom:40px; }
    .research-panel-head h3 { font-size:40px; line-height:1.2; }
    .research-panel-head p { width:580px; font-size:16px; line-height:1.7; }
    .position-grid { grid-template-columns:1.08fr .92fr; gap:32px; }
    .position-cards { gap:20px; }
    .position-card { padding:28px; }
    .position-card h4 { margin-top:16px; font-size:24px; line-height:1.3; }
    .position-card p { margin-top:12px; font-size:16px; line-height:1.65; }
    .persona-grid { gap:24px; }
    .persona { padding:28px; }
    .persona h4 { margin-top:24px; font-size:24px; line-height:1.3; }
    .persona p { margin-top:16px; font-size:15px; line-height:1.7; }
    .pain-flow { margin-top:32px; gap:16px; }
    .pain { padding:24px; }
    .pain h4 { margin-top:16px; font-size:19px; line-height:1.35; }
    .pain p { margin-top:12px; line-height:1.65; }
    .opportunity { margin-top:24px; padding:32px 40px; }
    .opportunity p { font-size:20px; line-height:1.6; }
    .competitor-grid { gap:32px; }
    .matrix div { padding:20px; font-size:14px; line-height:1.55; }
    .diff-stack { gap:16px; }
    .diff-card { grid-template-columns:64px 1fr; gap:20px; padding:24px; }
    .diff-card h4 { font-size:20px; line-height:1.35; }
    .diff-card p { margin-top:8px; line-height:1.55; }
    .function-map { gap:20px; }
    .function-column h4 { padding:24px; font-size:19px; line-height:1.35; }
    .function-column div { padding:18px 24px; font-size:15px; line-height:1.5; }
    .strategy-grid { margin-top:32px; grid-template-columns:.75fr 1.25fr; gap:32px; }
    .ip-role-copy { padding:32px; }
    .ip-role-copy h4 { margin-top:16px; font-size:26px; line-height:1.3; }
    .ip-role-copy p { margin-top:16px; max-width:520px; font-size:16px; line-height:1.7; }
    .role-chips { margin-top:24px; gap:12px; }
    .role-chips span { padding:10px 14px; }
    .visual-board { gap:20px; }
    .visual-word { min-height:136px; padding:24px; }
    .visual-word b { font-size:21px; line-height:1.3; }
    .architecture { padding-top:144px; padding-bottom:144px; }
    .arch-grid { margin-top:64px; gap:16px; }
    .arch-node { min-height:160px; padding:28px 22px; }
    .arch-node h3 { margin-top:16px; font-size:25px; line-height:1.3; }
    .arch-node p { margin-top:12px; font-size:15px; line-height:1.6; }
    .features-head { gap:80px; margin-bottom:64px; }
    .features-head p { width:520px; font-size:19px; line-height:1.7; }
    .feature-grid { gap:32px; }
    .feature:nth-child(even) { margin-top:80px; }
    .feature-info { padding:24px 4px 0; }
    .feature-info h3 { margin-top:12px; font-size:26px; line-height:1.3; }
    .feature-info p { margin-top:12px; font-size:16px; line-height:1.65; }
    .systems { gap:96px; padding-top:160px; padding-bottom:160px; }
    .systems .turnaround { margin-top:80px; padding-top:64px; }
    .turnaround-head { grid-template-columns:.78fr 1.22fr; gap:96px; }
    .character-intro { padding:28px 32px; }
    .character-intro h4 { font-size:24px; line-height:1.3; }
    .character-intro p { margin-top:16px; font-size:16px; line-height:1.75; }
    .turnaround-stage { margin-top:40px; }
    .palette { gap:20px; margin-top:48px; }
    .swatch { padding:24px; }
    .keywords { gap:16px; margin-top:40px; }
    .keyword { padding:14px 20px; font-size:16px; }
    .journey { padding-top:144px; padding-bottom:128px; }
    .journey-head { gap:80px; }
    .journey-head p { width:520px; font-size:19px; line-height:1.7; }
    .journey-grid { margin-top:64px; grid-template-columns:1.2fr .8fr .8fr; gap:24px; }
    .journey-label { bottom:32px; left:32px; }
    .journey-label h3 { margin-top:8px; font-size:26px; }
    .footer { padding-top:96px; padding-bottom:96px; }
    .footer h2 { max-width:940px; font-size:72px; line-height:1.08; }
    .footer-meta { font-size:16px; line-height:1.75; }
  </style>
</head>
<body>
<div class="review-layout">
  <aside class="annotation-panel">
    <h2>修改标注</h2>
    <textarea id="modification-notes" placeholder="在这里记录需要修改的内容……"></textarea>
    <button class="copy-notes" id="copy-notes" type="button">复制修改意见</button>
    <p class="copy-hint">把修改意见复制后发给 Codex</p>
  </aside>
  <div class="portfolio-preview">
<main class="board">
  <section class="section hero">
    <div class="burst" style="left:-180px;top:520px"></div>
    <div class="hero-top"><div class="brandmark"><img src="jinri-pofang-logo-transparent.png" alt="今日破防 Logo"></div><div class="eyebrow">Mobile App · UI/UX Case Study · 2026</div></div>
    <div class="hero-copy">
      <div class="eyebrow">匿名情绪吐槽社区 UI 设计</div>
      <h1 style="margin-top:24px">今日<br><span class="green">破防</span></h1>
      <div class="en">TODAY BREAKDOWN</div>
      <p class="desc">围绕「破防、共鸣、吐槽、互动」打造的轻量社交 App。让情绪被看见，也让每一次破防得到轻松回应。</p>
      <div class="hero-tag">把这口气，优雅地吐出去</div>
    </div>
    <div class="hero-phones">
      <div class="phone a"><img src="../portfolio-screens/04-profile.png"></div>
      <div class="phone b"><img src="../portfolio-screens/01-home.png"></div>
      <div class="phone c"><img src="../portfolio-screens/07-post-detail.png"></div>
    </div>
  </section>

  <section class="section intro">
    <div class="intro-copy">
      <div class="eyebrow">01 · Project Overview</div>
      <h2 style="margin-top:22px">把情绪释放，<br>变成一种<span class="green">轻社交</span></h2>
      <p>今日破防是面向年轻人的匿名情绪吐槽社区。产品通过低门槛发布、情绪化反馈、评论回复和互动通知，帮助用户快速表达当下感受，在共鸣中获得陪伴感。</p>
    </div>
    <div class="metrics">
      <div class="metric"><strong>01</strong><span>匿名表达 · 无压力发布</span></div>
      <div class="metric"><strong>02</strong><span>情绪反应 · 快速共鸣</span></div>
      <div class="metric"><strong>03</strong><span>核心功能 · 完整闭环</span></div>
      <div class="metric"><strong>04</strong><span>暗色霓虹 · 年轻视觉</span></div>
    </div>
  </section>

  <section class="section research" id="research">
    <div class="research-head">
      <div>
        <div class="eyebrow">02 · Research & Product Definition</div>
        <h2 style="margin-top:22px">先接住情绪，<br>再设计一场<span class="green">轻共鸣</span></h2>
      </div>
      <p>围绕年轻用户“不方便发、又想被回应”的表达缝隙，从用户动机、竞品机会到功能与视觉策略，定义《今日破防》的产品方向。</p>
    </div>
    <nav class="research-tabs" aria-label="前期调研章节导航">
      <a href="#positioning">01 / 产品定位</a><a href="#insight">02 / 用户洞察</a><a href="#competition">03 / 竞品机会</a><a href="#definition">04 / 产品定义</a>
    </nav>
    <div class="research-panel" id="positioning">
      <div class="research-panel-head"><div><div class="eyebrow">01 · Positioning</div><h3 style="margin-top:14px">轻量情绪社交，不做沉重树洞</h3></div><p>核心不是严肃记录，而是让用户用轻松、吐槽、搞笑的方式，发布当天“破防”的瞬间。</p></div>
      <div class="position-grid">
        <div class="position-map"><span class="axis y1">高互动反馈</span><span class="axis y2">低互动反馈</span><span class="axis x1">严肃表达</span><span class="axis x2">轻松表达</span><span class="map-dot soul">Soul<br>情绪浓度高</span><span class="map-dot jike">即刻<br>社区轻松</span><span class="map-dot weibo">微博树洞<br>门槛低</span><span class="map-dot xhs">小红书<br>展示成熟</span><span class="map-dot product">今日破防<br>轻情绪社交</span></div>
        <div class="position-cards"><div class="position-card accent"><b>CORE VALUE</b><h4>表达不必完美</h4><p>降低发布压力，让情绪可以用一句吐槽被轻松说出来。</p></div><div class="position-card"><b>SOCIAL VALUE</b><h4>回应不必正式</h4><p>用点赞、评论和情绪化反馈，快速建立被看见的陪伴感。</p></div><div class="position-card"><b>KEYWORDS</b><h4>匿名 · 轻社区</h4><p>情绪释放、年轻人社交、互动反馈与 IP 陪伴共同构成产品体验。</p></div><div class="position-card"><b>TONE</b><h4>有点丧，但不压抑</h4><p>把负面情绪转化为可分享、可互动、可被接住的内容。</p></div></div>
      </div>
    </div>
    <div class="research-panel" id="insight">
      <div class="research-panel-head"><div><div class="eyebrow">02 · User Insight</div><h3 style="margin-top:14px">他们想表达，也想保留一点距离</h3></div><p>目标用户活跃于互联网社区，习惯用梗消化情绪；他们需要的不是说教，而是低压力的表达与回应。</p></div>
      <div class="persona-grid"><div class="persona"><div class="persona-icon">01</div><h4>大学生</h4><div class="role">高频情绪波动</div><p>在学业、人际与未来压力间切换，需要随手吐槽和同龄人共鸣。</p></div><div class="persona"><div class="persona-icon">02</div><h4>实习生</h4><div class="role">初入工作场景</div><p>不方便在熟人圈表达职场情绪，希望获得轻松、不评判的回应。</p></div><div class="persona"><div class="persona-icon">03</div><h4>初入职场</h4><div class="role">情绪需要出口</div><p>期待短时释放压力，同时保持个人身份和现实社交边界。</p></div><div class="persona"><div class="persona-icon">04</div><h4>互联网活跃用户</h4><div class="role">梗文化参与者</div><p>喜欢轻松、有梗、可爱的社区氛围，也愿意回应陌生人的情绪。</p></div></div>
      <div class="pain-flow"><div class="pain"><strong>01</strong><h4>熟人压力</h4><p>朋友圈太熟人化，很多真实情绪不方便发。</p></div><div class="pain"><strong>02</strong><h4>公开压力</h4><p>微博、小红书太公开，容易形成表达负担。</p></div><div class="pain"><strong>03</strong><h4>缺少回应</h4><p>备忘录只能自己看，情绪难以获得互动反馈。</p></div><div class="pain"><strong>04</strong><h4>氛围沉重</h4><p>传统树洞容易过于沉重，缺少轻松感与幽默。</p></div><div class="pain"><strong>05</strong><h4>记录无趣</h4><p>情绪记录产品工具感强，缺乏社交互动。</p></div></div>
      <div class="opportunity"><b>OPPORTUNITY</b><p>用轻松吐槽的方式，把负面情绪转化成可分享、可互动、可被接住的内容。</p></div>
    </div>
    <div class="research-panel" id="competition">
      <div class="research-panel-head"><div><div class="eyebrow">03 · Competitive Opportunity</div><h3 style="margin-top:14px">在表达自由与互动质量之间找到空位</h3></div><p>竞品各自占据陌生人社交、兴趣社区、公开表达和内容展示优势，但仍缺少轻松、可爱且低压力的情绪社区。</p></div>
      <div class="competitor-grid">
        <div class="matrix"><div class="m-head">产品 / 维度</div><div class="m-head">表达门槛</div><div class="m-head">互动氛围</div><div class="m-head">视觉体验</div><div class="m-head">主要缺口</div><div class="m-label">Soul</div><div>中</div><div>情绪浓厚</div><div>成熟</div><div>功能复杂</div><div class="m-label">即刻</div><div>中</div><div>轻松</div><div>克制</div><div>偏兴趣社区</div><div class="m-label">微博树洞</div><div>低</div><div>不稳定</div><div>较弱</div><div>互动质量不一</div><div class="m-label">小红书</div><div>高</div><div>完善</div><div>成熟</div><div>精致人设压力</div><div class="m-label best">今日破防</div><div class="best">低</div><div class="best">轻松共鸣</div><div class="best">IP 陪伴</div><div class="best">轻情绪社交</div></div>
        <div class="diff-stack"><div class="diff-card"><span>01</span><div><h4>比树洞更可爱</h4><p>PoPo 与轻怪诞视觉降低情绪表达的沉重感。</p></div></div><div class="diff-card"><span>02</span><div><h4>比朋友圈更自由</h4><p>匿名与昵称发布并存，保留表达边界。</p></div></div><div class="diff-card"><span>03</span><div><h4>比微博更轻松</h4><p>围绕当下情绪建立更聚焦、更友善的回应。</p></div></div><div class="diff-card"><span>04</span><div><h4>比记录 APP 更有互动感</h4><p>让每一次记录都有机会被看见与接住。</p></div></div></div>
      </div>
    </div>
    <div class="research-panel" id="definition">
      <div class="research-panel-head"><div><div class="eyebrow">04 · Product & Visual Strategy</div><h3 style="margin-top:14px">从表达链路到情绪陪伴</h3></div><p>功能围绕“看见、表达、回应、沉淀”形成闭环，PoPo 和品牌视觉负责贯穿每个关键情绪触点。</p></div>
      <div class="function-map"><div class="function-column"><h4>首页信息流</h4><div>文字 / 表情 / 标签</div><div>头像昵称</div><div>点赞评论</div><div>发布时间</div></div><div class="function-column"><h4>发布破防</h4><div>文字与图片</div><div>心情标签</div><div>匿名发布</div><div>昵称发布</div></div><div class="function-column"><h4>点赞与评论</h4><div>点赞互动</div><div>评论互动</div><div>回复关系</div><div>评论时间</div></div><div class="function-column"><h4>收到的互动</h4><div>未读提醒</div><div>互动通知</div><div>查看互动记录</div><div>快速回到内容</div></div><div class="function-column"><h4>用户资料</h4><div>更换头像</div><div>更换昵称</div><div>资料展示</div><div>表达沉淀</div></div></div>
      <div class="strategy-grid"><div class="ip-role"><div class="ip-role-copy"><b>POPO · EMOTION COMPANION</b><h4>让情绪被温柔看见</h4><p>PoPo 是产品的情绪陪伴 IP，以互联网年轻人的真实情绪为灵感，连接用户之间的共鸣与表达。</p><div class="role-chips"><span>悬浮入口</span><span>未读提醒</span><span>空状态</span><span>发布成功</span><span>情绪陪伴</span></div></div></div><div class="visual-board"><div class="visual-word"><b>酸性可爱</b><span>ACID CUTE</span></div><div class="visual-word"><b>情绪社交</b><span>EMOTION SOCIAL</span></div><div class="visual-word"><b>轻潮玩</b><span>PLAYFUL TOY</span></div><div class="visual-word"><b>深色背景</b><span>DEEP INK · #08070D</span></div><div class="visual-word"><b>紫色身体</b><span>PURPLE · #6940A5</span></div><div class="visual-word"><b>荧光信号</b><span>NEON ACID · #B7FF3C</span></div><div class="visual-word"><b>有点破防</b><span>REAL FEELING</span></div><div class="visual-word"><b>但很好笑</b><span>LIGHT HUMOR</span></div><div class="visual-word"><b>有点丧，不压抑</b><span>SOFT COMPANION</span></div></div></div>
    </div>
  </section>

  <section class="section architecture">
    <div class="eyebrow">03 · Information Architecture</div>
    <h2 style="margin-top:20px">从看见情绪，到参与<span class="green">共鸣</span></h2>
    <div class="arch-grid">
      <div class="arch-node"><b>01 FEED</b><h3>广场</h3><p>浏览实时情绪与热门内容</p></div>
      <div class="arch-node"><b>02 CREATE</b><h3>发布</h3><p>轻量表达当下破防瞬间</p></div>
      <div class="arch-node"><b>03 DETAIL</b><h3>帖子详情</h3><p>聚焦内容与情绪反馈</p></div>
      <div class="arch-node"><b>04 REPLY</b><h3>评论互动</h3><p>回复关系与共鸣对话</p></div>
      <div class="arch-node"><b>05 SAVE</b><h3>收藏</h3><p>留下值得反复回看的情绪</p></div>
      <div class="arch-node"><b>06 ME</b><h3>我的</h3><p>互动通知与个人成长</p></div>
    </div>
  </section>

  <section class="section">
    <div class="features-head">
      <div><div class="eyebrow">04 · Core Experience</div><h2 style="margin-top:20px">核心功能<span class="green">界面</span></h2></div>
      <p>以高对比信息层级和情绪化交互构建完整使用链路，让浏览、表达、回应与沉淀都保持轻盈。</p>
    </div>
    <div class="feature-grid">
      <div class="feature"><div class="device"><img src="../portfolio-screens/01-home.png"></div><div class="feature-info"><span class="num">01 / FEED</span><h3>广场信息流</h3><p>聚合今日破防与互动热度，让真实情绪成为第一视觉焦点。</p></div></div>
      <div class="feature"><div class="device"><img src="../portfolio-screens/03-create.png"></div><div class="feature-info"><span class="num">02 / CREATE</span><h3>发布破防</h3><p>破防指数与短文本输入，强化表达过程中的情绪反馈。</p></div></div>
      <div class="feature"><div class="device"><img src="../portfolio-screens/07-post-detail.png"></div><div class="feature-info"><span class="num">03 / DETAIL</span><h3>帖子详情</h3><p>聚焦内容、情绪回应和讨论关系，减少视觉干扰。</p></div></div>
      <div class="feature"><div class="device"><img src="../portfolio-screens/08-comments-replies.png"></div><div class="feature-info"><span class="num">04 / REPLY</span><h3>评论回复</h3><p>清晰展示回复上下文，让共鸣与对话自然延续。</p></div></div>
      <div class="feature"><div class="device"><img src="../portfolio-screens/05-favorites.png"></div><div class="feature-info"><span class="num">05 / FAVORITE</span><h3>收藏</h3><p>保存有共鸣的表达，形成属于自己的情绪档案。</p></div></div>
      <div class="feature"><div class="device"><img src="../portfolio-screens/09-interactions.png"></div><div class="feature-info"><span class="num">06 / NOTICE</span><h3>收到的互动</h3><p>点赞、评论分区呈现，快速捕捉最新共鸣。</p></div></div>
      <div class="feature"><div class="device"><img src="jinri-pofang-profile-page-scrolled.png"></div><div class="feature-info"><span class="num">07 / PROFILE</span><h3>个人中心</h3><p>记录表达、互动和成长，让匿名身份也拥有连续感。</p></div></div>
      <div class="feature"><div class="device"><img src="../portfolio-screens/02-leaderboard.png"></div><div class="feature-info"><span class="num">08 / TREND</span><h3>共鸣榜单</h3><p>以热度与共鸣发现当下最真实的集体情绪。</p></div></div>
    </div>
  </section>

  <section class="section systems">
    <div>
      <div class="eyebrow">05 · Visual Language</div>
      <h2 style="margin-top:20px">暗夜中的<br><span class="green">情绪信号</span></h2>
      <div class="palette">
        <div class="swatch" style="background:#b7ff3c;color:#101106"><b>NEON ACID</b><span>#B7FF3C</span></div>
        <div class="swatch" style="background:#08070d"><b>DEEP INK</b><span>#08070D</span></div>
        <div class="swatch" style="background:#1b1821"><b>CARD NIGHT</b><span>#1B1821</span></div>
        <div class="swatch" style="background:#6940a5"><b>EMOTION PURPLE</b><span>#6940A5</span></div>
      </div>
      <div class="keywords"><span class="keyword">霓虹</span><span class="keyword">情绪</span><span class="keyword">匿名</span><span class="keyword">共鸣</span><span class="keyword">年轻</span><span class="keyword">赛博</span></div>
    </div>
    <div class="system-shot">
      <div class="mascot-render"><img src="popo-3d-neon-transparent.png" alt="PoPo 3D IP 瑙掕壊"></div>
    </div>
    <div class="turnaround">
      <div class="turnaround-head">
        <div><div class="eyebrow">PoPo · Character Design</div><h3 style="margin-top:14px">IP 角色三视图</h3></div>
        <div class="character-intro">
          <h4>PoPo｜Emotion Collector</h4>
          <p>PoPo 是《今日破防》App 的原创 IP 角色，以互联网年轻人的真实情绪为灵感创作。头顶的裂痕象征每一次“破防”与成长，慵懒丧萌的表情则映射现代人的情绪状态。作为产品的情感载体，PoPo 连接用户之间的共鸣与表达，让负面情绪也能被温柔地看见。</p>
        </div>
      </div>
      <div class="turnaround-stage">
        <img src="popo-3d-turnaround-transparent.png" alt="PoPo 正面、侧面和背面三视图">
        <div class="turnaround-labels">
          <div><b>FRONT VIEW</b><span>正面</span></div>
          <div><b>SIDE VIEW</b><span>侧面</span></div>
          <div><b>BACK VIEW</b><span>背面</span></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section journey">
    <div class="journey-head">
      <div><div class="eyebrow">06 · Complete Journey</div><h2 style="margin-top:20px">完整体验<span class="green">长图</span></h2></div>
      <p>从广场浏览、个人互动到帖子讨论，完整长截图呈现真实产品信息密度与界面节奏。</p>
    </div>
    <div class="journey-grid">
      <div class="journey-card"><img src="../portfolio-screens/10-full-home.png"><div class="journey-label"><b>FULL FLOW 01</b><h3>广场完整信息流</h3></div></div>
      <div class="journey-card"><img src="../portfolio-screens/11-full-profile-avatar-start-3290.png"><div class="journey-label"><b>FULL FLOW 02</b><h3>个人中心</h3></div></div>
      <div class="journey-card"><img src="../portfolio-screens/12-full-post-detail.png"><div class="journey-label"><b>FULL FLOW 03</b><h3>详情与评论</h3></div></div>
    </div>
  </section>

  <footer class="section footer">
    <div><div class="eyebrow">TODAY BREAKDOWN · END</div><h2 style="margin-top:22px">今天也稳定<br><span class="green">破防中。</span></h2></div>
    <div class="footer-meta">ANONYMOUS EMOTION COMMUNITY<br>PRODUCT DESIGN · UI/UX CASE STUDY<br>2026</div>
  </footer>
</main>
  </div>
</div>
<script>
  const copyButton = document.getElementById("copy-notes");
  const notes = document.getElementById("modification-notes");
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(notes.value);
    } catch {
      notes.select();
      document.execCommand("copy");
      notes.setSelectionRange(notes.value.length, notes.value.length);
    }
    copyButton.textContent = "已复制";
    window.setTimeout(() => { copyButton.textContent = "复制修改意见"; }, 1600);
  });
</script>
</body>
</html>`;

await mkdir(outputDir, { recursive: true });
await writeFile(htmlPath, html, "utf8");

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 1920, height: 1080 } });
try {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".board").screenshot({ path: pngPath });
} finally {
  await browser.close();
}

console.log(`HTML: ${htmlPath}`);
console.log(`PNG: ${pngPath}`);
