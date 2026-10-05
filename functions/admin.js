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

    // 列出所有短链
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
      } catch {
        // 旧格式纯 URL
      }
      if (time && time >= todayTs) todayCount++;
      links.push({ code, url, time, ip });
    }

    // 按时间倒序
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
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>后台 · d.aozio.cn</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; background: #f5f5f5; color: #333; min-height: 100vh; }
  .login-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .login-box { background: #fff; padding: 40px; border-radius: 12px; width: 360px; text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
  .login-box h1 { font-size: 20px; margin-bottom: 20px; color: #111; }
  .login-box input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; margin-bottom: 12px; outline: none; }
  .login-box input:focus { border-color: #999; }
  .login-box button { width: 100%; padding: 12px; background: #111; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
  .login-box button:hover { background: #333; }
  .login-err { color: #e74c3c; font-size: 13px; margin-top: 8px; display: none; }
  .dashboard { display: none; max-width: 900px; margin: 0 auto; padding: 30px 20px; }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .stat-card { background: #fff; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
  .stat-num { font-size: 36px; font-weight: 700; color: #111; }
  .stat-label { font-size: 13px; color: #999; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
  th { background: #fafafa; text-align: left; padding: 12px 14px; font-size: 12px; color: #999; font-weight: 500; border-bottom: 1px solid #f0f0f0; }
  td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #f5f5f5; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .short-link { color: #111; font-weight: 500; cursor: pointer; }
  .short-link:hover { text-decoration: underline; }
  .orig-url { color: #666; word-break: break-all; max-width: 280px; }
  .orig-url .ellipsis { cursor: pointer; color: #999; }
  .orig-url .full { display: none; }
  .orig-url.expanded .ellipsis { display: none; }
  .orig-url.expanded .full { display: inline; }
  .time { color: #999; font-size: 12px; white-space: nowrap; }
  .ip { color: #999; font-size: 12px; }
  .empty { text-align: center; padding: 40px; color: #bbb; font-size: 14px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .header h1 { font-size: 20px; color: #111; }
  .logout { font-size: 13px; color: #999; cursor: pointer; }
</style>
</head>
<body>

<div class="login-wrap" id="loginView">
  <div class="login-box">
    <h1>后台管理</h1>
    <input type="password" id="pwd" placeholder="请输入访问码" autofocus>
    <button onclick="login()">登录</button>
    <div class="login-err" id="loginErr">访问码错误</div>
  </div>
</div>

<div class="dashboard" id="dashView">
  <div class="header">
    <h1>短链后台</h1>
    <span class="logout" onclick="logout()">退出</span>
  </div>
  <div class="stats">
    <div class="stat-card">
      <div class="stat-num" id="totalNum">-</div>
      <div class="stat-label">总短链</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" id="todayNum">-</div>
      <div class="stat-label">今日短链</div>
    </div>
  </div>
  <table>
    <thead>
      <tr><th>短链</th><th>原链接</th><th>IP</th><th>时间</th></tr>
    </thead>
    <tbody id="linkList"></tbody>
  </table>
  <div class="empty" id="emptyTip" style="display:none">暂无短链</div>
</div>

<script>
let pwd = sessionStorage.getItem('admin_pwd') || '';

async function login() {
  const p = document.getElementById('pwd').value;
  const res = await fetch('/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: p })
  });
  const data = await res.json();
  if (data.success) {
    sessionStorage.setItem('admin_pwd', p);
    pwd = p;
    showDash(data);
  } else {
    document.getElementById('loginErr').style.display = 'block';
  }
}

function logout() {
  sessionStorage.removeItem('admin_pwd');
  location.reload();
}

function fmtNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function fmtTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function showDash(data) {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('dashView').style.display = 'block';
  document.getElementById('totalNum').textContent = fmtNum(data.stats.total);
  document.getElementById('todayNum').textContent = fmtNum(data.stats.today);

  const tbody = document.getElementById('linkList');
  tbody.innerHTML = '';
  if (data.links.length === 0) {
    document.getElementById('emptyTip').style.display = 'block';
    return;
  }
  for (const l of data.links) {
    const tr = document.createElement('tr');
    const shortUrl = 'https://d.aozio.cn/' + l.code;
    const long = l.url;
    const isLong = long.length > 50;
    tr.innerHTML = \`
      <td><span class="short-link" onclick="copyText('\${shortUrl.replace(/'/g, "\\\\'")}')">\${shortUrl}</span></td>
      <td><span class="orig-url \${isLong ? '' : ''}">\${
        isLong
          ? \`<span class="ellipsis" onclick="this.parentElement.classList.add('expanded')">\${long.slice(0,50)}… 展开</span><span class="full" onclick="copyText('\${long.replace(/'/g, "\\\\'")}')">\${long}（点击复制）</span>\`
          : \`<span onclick="copyText('\${long.replace(/'/g, "\\\\'")}')" style="cursor:pointer">\${long}</span>\`
      }</span></td>
      <td class="ip">\${l.ip || '-'}</td>
      <td class="time">\${fmtTime(l.time)}</td>
    \`;
    tbody.appendChild(tr);
  }
}

function copyText(t) {
  navigator.clipboard.writeText(t).then(() => {});
}

// 已登录则自动加载
if (pwd) {
  fetch('/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pwd })
  }).then(r => r.json()).then(data => {
    if (data.success) showDash(data);
  });
}

document.getElementById('pwd').addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});
</script>
</body>
</html>`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
