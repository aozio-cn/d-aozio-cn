const ADMIN_PASSWORD = 'admin';

export async function onRequestGet(context) {
  return new Response(renderAdminPage(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (body.password !== ADMIN_PASSWORD) {
      return json({ success: false, error: '访问码错误' }, 403);
    }

    const list = await env.LINKS.list({ limit: 1000 });
    const links = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    let todayCount = 0;

    for (const key of list.keys) {
      const code = key.name;
      const raw = await env.LINKS.get(code);
      let url = raw, time = null, ip = '';
      try {
        const meta = JSON.parse(raw);
        url = meta.url;
        time = meta.time;
        ip = meta.ip || '';
      } catch {}
      if (time && time >= todayTs) todayCount++;
      links.push({ code, url, time, ip });
    }

    links.sort((a, b) => (b.time || 0) - (a.time || 0));

    return json({
      success: true,
      stats: { total: list.keys.length, today: todayCount },
      links
    });
  } catch (err) {
    return json({ success: false, error: '服务器错误' }, 500);
  }
}

function renderAdminPage() {
  var html = '<!DOCTYPE html>\n' +
'<html lang="zh-CN">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>后台 · d.aozio.cn</title>\n' +
'<style>\n' +
'  * { margin: 0; padding: 0; box-sizing: border-box; }\n' +
'  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; background: #f5f5f5; color: #333; min-height: 100vh; }\n' +
'  .login-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; }\n' +
'  .login-box { background: #fff; padding: 40px; border-radius: 12px; width: 360px; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }\n' +
'  .login-box h1 { font-size: 20px; margin-bottom: 20px; color: #111; }\n' +
'  .login-box input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; margin-bottom: 12px; outline: none; }\n' +
'  .login-box input:focus { border-color: #999; }\n' +
'  .login-box button { width: 100%; padding: 12px; background: #111; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }\n' +
'  .login-box button:hover { background: #333; }\n' +
'  .login-err { color: #e74c3c; font-size: 13px; margin-top: 8px; display: none; }\n' +
'  .dashboard { display: none; max-width: 900px; margin: 0 auto; padding: 30px 20px; }\n' +
'  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }\n' +
'  .stat-card { background: #fff; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }\n' +
'  .stat-num { font-size: 36px; font-weight: 700; color: #111; }\n' +
'  .stat-label { font-size: 13px; color: #999; margin-top: 4px; }\n' +
'  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }\n' +
'  th { background: #fafafa; text-align: left; padding: 12px 14px; font-size: 12px; color: #999; font-weight: 500; border-bottom: 1px solid #f0f0f0; }\n' +
'  td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #f5f5f5; vertical-align: top; }\n' +
'  tr:last-child td { border-bottom: none; }\n' +
'  .short-link { color: #111; font-weight: 500; cursor: pointer; }\n' +
'  .short-link:hover { text-decoration: underline; }\n' +
'  .orig-url { color: #666; word-break: break-all; max-width: 280px; }\n' +
'  .orig-url .ellipsis { cursor: pointer; color: #999; }\n' +
'  .orig-url .full { display: none; cursor: pointer; }\n' +
'  .orig-url.expanded .ellipsis { display: none; }\n' +
'  .orig-url.expanded .full { display: inline; }\n' +
'  .time { color: #999; font-size: 12px; white-space: nowrap; }\n' +
'  .ip { color: #999; font-size: 12px; }\n' +
'  .empty { text-align: center; padding: 40px; color: #bbb; font-size: 14px; }\n' +
'  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }\n' +
'  .header h1 { font-size: 20px; color: #111; }\n' +
'  .logout { font-size: 13px; color: #999; cursor: pointer; }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'\n' +
'<div class="login-wrap" id="loginView">\n' +
'  <div class="login-box">\n' +
'    <h1>后台管理</h1>\n' +
'    <input type="password" id="pwd" placeholder="请输入访问码" autofocus>\n' +
'    <button onclick="login()">登录</button>\n' +
'    <div class="login-err" id="loginErr">访问码错误</div>\n' +
'  </div>\n' +
'</div>\n' +
'\n' +
'<div class="dashboard" id="dashView">\n' +
'  <div class="header">\n' +
'    <h1>短链后台</h1>\n' +
'    <span class="logout" onclick="logout()">退出</span>\n' +
'  </div>\n' +
'  <div class="stats">\n' +
'    <div class="stat-card">\n' +
'      <div class="stat-num" id="totalNum">-</div>\n' +
'      <div class="stat-label">总短链</div>\n' +
'    </div>\n' +
'    <div class="stat-card">\n' +
'      <div class="stat-num" id="todayNum">-</div>\n' +
'      <div class="stat-label">今日短链</div>\n' +
'    </div>\n' +
'  </div>\n' +
'  <table>\n' +
'    <thead>\n' +
'      <tr><th>短链</th><th>原链接</th><th>IP</th><th>时间</th></tr>\n' +
'    </thead>\n' +
'    <tbody id="linkList"></tbody>\n' +
'  </table>\n' +
'  <div class="empty" id="emptyTip" style="display:none">暂无短链</div>\n' +
'</div>\n' +
'\n' +
'<script>\n' +
'var pwd = sessionStorage.getItem("admin_pwd") || "";\n' +
'\n' +
'function login() {\n' +
'  var p = document.getElementById("pwd").value;\n' +
'  fetch("/admin", {\n' +
'    method: "POST",\n' +
'    headers: { "Content-Type": "application/json" },\n' +
'    body: JSON.stringify({ password: p })\n' +
'  }).then(function(r) { return r.json(); }).then(function(data) {\n' +
'    if (data.success) {\n' +
'      sessionStorage.setItem("admin_pwd", p);\n' +
'      pwd = p;\n' +
'      showDash(data);\n' +
'    } else {\n' +
'      document.getElementById("loginErr").style.display = "block";\n' +
'    }\n' +
'  });\n' +
'}\n' +
'\n' +
'function logout() {\n' +
'  sessionStorage.removeItem("admin_pwd");\n' +
'  location.reload();\n' +
'}\n' +
'\n' +
'function fmtNum(n) {\n' +
'  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\\.0$/, "") + "w";\n' +
'  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\\.0$/, "") + "k";\n' +
'  return String(n);\n' +
'}\n' +
'\n' +
'function fmtTime(ts) {\n' +
'  if (!ts) return "-";\n' +
'  var d = new Date(ts);\n' +
'  function pad(n) { return String(n).padStart(2, "0"); }\n' +
'  return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());\n' +
'}\n' +
'\n' +
'function esc(s) {\n' +
'  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\'/g, "&#39;");\n' +
'}\n' +
'\n' +
'function showDash(data) {\n' +
'  document.getElementById("loginView").style.display = "none";\n' +
'  document.getElementById("dashView").style.display = "block";\n' +
'  document.getElementById("totalNum").textContent = fmtNum(data.stats.total);\n' +
'  document.getElementById("todayNum").textContent = fmtNum(data.stats.today);\n' +
'\n' +
'  var tbody = document.getElementById("linkList");\n' +
'  tbody.innerHTML = "";\n' +
'  if (data.links.length === 0) {\n' +
'    document.getElementById("emptyTip").style.display = "block";\n' +
'    return;\n' +
'  }\n' +
'  for (var i = 0; i < data.links.length; i++) {\n' +
'    var l = data.links[i];\n' +
'    var shortUrl = "https://d.aozio.cn/" + l.code;\n' +
'    var long = l.url;\n' +
'    var isLong = long.length > 50;\n' +
'    var tr = document.createElement("tr");\n' +
'    var html = "";\n' +
'    html += \'<td><span class="short-link" onclick="copyText(\\\'\' + esc(shortUrl) + \'\\\')">\' + esc(shortUrl) + "</span></td>";\n' +
'    if (isLong) {\n' +
'      html += \'<td><span class="orig-url"><span class="ellipsis" onclick="this.parentElement.classList.add(\\\'expanded\\\')">\' + esc(long.slice(0,50)) + "… 展开</span><span class=\\\"full\\\" onclick=\\\"copyText(\\\'\\\' + esc(long) + \'\\\')\\\">" + esc(long) + "（点击复制）</span></span></td>";\n' +
'    } else {\n' +
'      html += \'<td><span onclick="copyText(\\\'\' + esc(long) + \'\\\')" style="cursor:pointer;color:#666">\' + esc(long) + "</span></td>";\n' +
'    }\n' +
'    html += \'<td class="ip">\' + (l.ip || "-") + "</td>";\n' +
'    html += \'<td class="time">\' + fmtTime(l.time) + "</td>";\n' +
'    tr.innerHTML = html;\n' +
'    tbody.appendChild(tr);\n' +
'  }\n' +
'}\n' +
'\n' +
'function copyText(t) {\n' +
'  navigator.clipboard.writeText(t);\n' +
'}\n' +
'\n' +
'if (pwd) {\n' +
'  fetch("/admin", {\n' +
'    method: "POST",\n' +
'    headers: { "Content-Type": "application/json" },\n' +
'    body: JSON.stringify({ password: pwd })\n' +
'  }).then(function(r) { return r.json(); }).then(function(data) {\n' +
'    if (data.success) showDash(data);\n' +
'  });\n' +
'}\n' +
'\n' +
'document.getElementById("pwd").addEventListener("keydown", function(e) {\n' +
'  if (e.key === "Enter") login();\n' +
'});\n' +
'</script>\n' +
'</body>\n' +
'</html>';
  return html;
}

function json(obj, status) {
  status = status || 200;
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
