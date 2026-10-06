import { onRequestGet as adminGet, onRequestPost as adminPost } from './admin.js';
import { onRequestGet as admin1Get, onRequestPost as admin1Post } from './admin1.js';

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const code = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');

  if (code === 'admin') return adminGet(context);
  if (code === 'admin1') return admin1Get(context);

  if (!code) return env.ASSETS.fetch(request);

  const raw = await env.LINKS.get(code);

  if (raw) {
    let meta;
    try { meta = JSON.parse(raw); } catch { return env.ASSETS.fetch(request); }

    if (meta.deleted) {
      return new Response(renderDeletedPage(code), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    return new Response(renderWarningPage(meta.url), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  return new Response(render404(code), {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

export async function onRequestPost(context) {
  const { params } = context;
  const code = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if (code === 'admin') return adminPost(context);
  if (code === 'admin1') return admin1Post(context);
  return new Response('Not Found', { status: 404 });
}

function renderWarningPage(target) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>跳转提示 · d.aozio.cn</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif; background:#f5f6f7; color:#333; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; }
  .box { max-width:520px; width:100%; background:#fff; border-radius:12px; padding:40px 32px; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
  .warn-icon { width:48px; height:48px; background:#fff7e6; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:24px; }
  h1 { font-size:18px; font-weight:600; color:#111; text-align:center; margin-bottom:12px; }
  .desc { font-size:14px; color:#666; line-height:1.6; text-align:center; margin-bottom:20px; }
  .url-box { background:#f7f8fa; border-radius:8px; padding:12px 14px; font-size:13px; color:#333; word-break:break-all; margin-bottom:24px; line-height:1.5; }
  .url-label { font-size:12px; color:#999; margin-bottom:6px; }
  .btns { display:flex; gap:12px; }
  .btn { flex:1; padding:11px; border-radius:8px; font-size:14px; text-align:center; cursor:pointer; border:none; text-decoration:none; display:block; }
  .btn-primary { background:#111; color:#fff; }
  .btn-primary:hover { background:#333; }
  .btn-cancel { background:#f0f0f0; color:#666; }
  .btn-cancel:hover { background:#e5e5e5; }
  .footer { margin-top:28px; text-align:center; font-size:12px; color:#bbb; line-height:1.8; }
  .footer a { color:#aaa; text-decoration:none; }
</style>
</head>
<body>
  <div class="box">
    <div class="warn-icon">⚠️</div>
    <h1>即将跳转到外部网站</h1>
    <p class="desc">请注意辨别风险，该链接内容与本站无关</p>
    <div class="url-label">目标地址：</div>
    <div class="url-box">${escapeHtml(target)}</div>
    <div class="btns">
      <a href="${escapeHtml(target)}" class="btn btn-primary">继续访问</a>
      <a href="/" class="btn btn-cancel">取消</a>
    </div>
  </div>
  <div class="footer">
    <div>© 2026 星诺综合团队</div>
    <div>举报/投诉：<a href="mailto:huangxingyan@aozio.cn">huangxingyan@aozio.cn</a></div>
  </div>
</body>
</html>`;
}

function renderDeletedPage(code) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>链接已删除 · d.aozio.cn</title>
<style>
  body { font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; background:#f5f6f7; color:#333; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; text-align:center; }
  .icon { font-size:48px; margin-bottom:16px; }
  h1 { font-size:20px; font-weight:600; color:#111; margin-bottom:8px; }
  p { color:#999; font-size:14px; margin-bottom:24px; }
  a { color:#666; text-decoration:none; font-size:14px; }
  a:hover { text-decoration:underline; }
</style>
</head>
<body>
  <div class="icon">🚫</div>
  <h1>链接已删除</h1>
  <p>短链接「${escapeHtml(code)}」已被管理员删除</p>
</body>
</html>`;
}

function render404(code) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>404 · d.aozio.cn</title>
<style>
  body { font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; background:#f5f6f7; color:#333; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; text-align:center; }
  h1 { font-size:48px; font-weight:600; color:#111; margin-bottom:8px; }
  p { color:#999; font-size:15px; margin-bottom:24px; }
  a { color:#666; text-decoration:none; font-size:14px; }
  a:hover { text-decoration:underline; }
</style>
</head>
<body>
  <h1>404</h1>
  <p>短链接「${escapeHtml(code)}」不存在或已失效</p>
  <a href="/">← 生成新短链接</a>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
