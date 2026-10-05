export async function onRequestGet(context) {
  const { env, params } = context;

  // catch-all 路由：params.path 是路径段数组，例如 ["abc123"]
  const code = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');

  if (!code) {
    return new Response('Not Found', { status: 404 });
  }

  // 从 KV 查找对应的长链接
  const target = await env.LINKS.get(code);

  if (target) {
    return Response.redirect(target, 302);
  }

  // 没找到 → 404 页面
  return new Response(render404(code), {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function render404(code) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>404 · d.aozio.cn</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; background:#fff; color:#333; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; text-align:center; }
  h1 { font-size:48px; font-weight:600; color:#111; margin-bottom:8px; }
  p { color:#999; font-size:15px; margin-bottom:24px; }
  a { color:#666; text-decoration:none; font-size:14px; }
  a:hover { text-decoration:underline; }
</style>
</head>
<body>
  <h1>404</h1>
  <p>短链接「${escapeHtml(code)}」不存在或已失效</p>
  <a href="https://d.aozio.cn">← 生成新短链接</a>
</body>
</html>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
