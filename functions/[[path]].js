export async function onRequestGet(context) {
  const { env, params, request } = context;

  const code = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');

  // 空路径（首页）→ 交给静态资源
  if (!code) {
    return env.ASSETS.fetch(request);
  }

  const raw = await env.LINKS.get(code);

  if (raw) {
    // 兼容新旧格式：新格式是 JSON，旧格式是纯 URL
    let target;
    try {
      const meta = JSON.parse(raw);
      target = meta.url;
    } catch {
      target = raw;
    }
    return new Response(renderWarningPage(target), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  return new Response(render404(code), {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function renderWarningPage(target) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>跳转提示 · d.aozio.cn</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; background: #fff; color: #333; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
  .box { max-width: 440px; width: 100%; text-align: center; }
  .icon { font-size: 44px; margin-bottom: 16px; }
  h1 { font-size: 22px; font-weight: 600; color: #111; margin-bottom: 10px; }
  .tip { color: #888; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
  .url-box { font-size: 12px; color: #aaa; word-break: break-all; padding: 12px; background: #f7f7f7; border-radius: 8px; margin-bottom: 20px; text-align: left; }
  .btn { display: inline-block; padding: 11px 28px; background: #111; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; text-decoration: none; }
  .btn:hover { background: #333; }
  .cd { margin-top: 14px; font-size: 12px; color: #bbb; }
</style>
</head>
<body>
  <div class="box">
    <div class="icon">⚠️</div>
    <h1>即将跳转到外部链接</h1>
    <p class="tip">该链接内容与本站无关，请自行判断安全性</p>
    <div class="url-box">${escapeHtml(target)}</div>
    <a href="${escapeHtml(target)}" class="btn">立即跳转</a>
    <div class="cd">0.5 秒后自动跳转…</div>
  </div>
  <script>
    setTimeout(function() { location.href = ${JSON.stringify(target)}; }, 500);
  </script>
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
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; background:#fff; color:#333; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; text-align:center; }
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
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
