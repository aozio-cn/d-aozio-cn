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
  var h = '';
  h += '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n';
  h += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  h += '<title>后台 · d.aozio.cn</title>\n<style>\n';
  h += '* { margin:0; padding:0; box-sizing:border-box; }\n';
  h += 'body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif; background:#f5f5f5; color:#333; min-height:100vh; }\n';
  h += '.login-wrap { display:flex; align-items:center; justify-content:center; min-height:100vh; }\n';
  h += '.login-box { background:#fff; padding:40px; border-radius:12px; width:360px; text-align:center; box-shadow:0 2px 12px rgba(0,0,0,0.06); }\n';
  h += '.login-box h1 { font-size:20px; margin-bottom:8px; color:#111; }\n';
  h += '.login-tip { font-size:13px; color:#999; margin-bottom:20px; }\n';
  h += '.login-tip b { color:#666; }\n';
  h += '.login-box input { width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:14px; margin-bottom:12px; outline:none; }\n';
  h += '.login-box input:focus { border-color:#999; }\n';
  h += '.login-box button { width:100%; padding:12px; background:#111; color:#fff; border:none; border-radius:8px; font-size:14px; cursor:pointer; }\n';
  h += '.login-box button:hover { background:#333; }\n';
  h += '.login-err { color:#e74c3c; font-size:13px; margin-top:8px; display:none; }\n';
  h += '.dashboard { display:none; max-width:960px; margin:0 auto; padding:30px 20px; }\n';
  h += '.header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }\n';
  h += '.header h1 { font-size:20px; color:#111; }\n';
  h += '.logout { font-size:13px; color:#999; cursor:pointer; }\n';
  h += '.stats { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }\n';
  h += '.stat-card { background:#fff; padding:20px; border-radius:12px; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,0.05); }\n';
  h += '.stat-num { font-size:32px; font-weight:700; color:#111; }\n';
  h += '.stat-label { font-size:13px; color:#999; margin-top:4px; }\n';
  h += '.search-bar { margin-bottom:16px; }\n';
  h += '.search-bar input { width:100%; padding:10px 14px; border:1px solid #e0e0e0; border-radius:8px; font-size:14px; outline:none; }\n';
  h += '.search-bar input:focus { border-color:#999; }\n';
  h += '.table-wrap { background:#fff; border-radius:12px; overflow-x:auto; box-shadow:0 1px 4px rgba(0,0,0,0.05); }\n';
  h += 'table { width:100%; border-collapse:collapse; min-width:700px; }\n';
  h += 'th { background:#fafafa; text-align:left; padding:12px 14px; font-size:12px; color:#999; font-weight:500; border-bottom:1px solid #f0f0f0; white-space:nowrap; }\n';
  h += 'td { padding:12px 14px; font-size:13px; border-bottom:1px solid #f5f5f5; vertical-align:top; }\n';
  h += 'tr:last-child td { border-bottom:none; }\n';
  h += '.short-link { color:#111; font-weight:500; cursor:pointer; white-space:nowrap; }\n';
  h += '.short-link:hover { text-decoration:underline; }\n';
  h += '.orig-url { color:#666; word-break:break-all; max-width:260px; }\n';
  h += '.orig-url .ellipsis { cursor:pointer; color:#999; }\n';
  h += '.orig-url .full { display:none; cursor:pointer; }\n';
  h += '.orig-url.expanded .ellipsis { display:none; }\n';
  h += '.orig-url.expanded .full { display:inline; }\n';
  h += '.time { color:#999; font-size:12px; white-space:nowrap; }\n';
  h += '.ip { color:#999; font-size:12px; white-space:nowrap; }\n';
  h += '.pagination { display:flex; justify-content:center; align-items:center; gap:12px; margin-top:16px; font-size:13px; color:#666; }\n';
  h += '.pagination button { padding:6px 14px; border:1px solid #ddd; background:#fff; border-radius:6px; cursor:pointer; font-size:13px; }\n';
  h += '.pagination button:disabled { opacity:0.4; cursor:not-allowed; }\n';
  h += '.pagination button:not(:disabled):hover { background:#f0f0f0; }\n';
  h += '.empty { text-align:center; padding:40px; color:#bbb; font-size:14px; }\n';
  h += '</style>\n</head>\n<body>\n';

  // 登录页
  h += '<div class="login-wrap" id="loginView">\n';
  h += '  <div class="login-box">\n';
  h += '    <h1>后台管理</h1>\n';
  h += '    <p class="login-tip">访问密码：<b>admin</b></p>\n';
  h += '    <input type="password" id="pwd" placeholder="请输入访问密码" autofocus>\n';
  h += '    <button onclick="login()">登录</button>\n';
  h += '    <div class="login-err" id="loginErr">密码错误</div>\n';
  h += '  </div>\n';
  h += '</div>\n';

  // 仪表盘
  h += '<div class="dashboard" id="dashView">\n';
  h += '  <div class="header">\n';
  h += '    <h1>短链后台</h1>\n';
  h += '    <span class="logout" onclick="logout()">退出</span>\n';
  h += '  </div>\n';
  h += '  <div class="stats">\n';
  h += '    <div class="stat-card"><div class="stat-num" id="totalNum">-</div><div class="stat-label">总短链</div></div>\n';
  h += '    <div class="stat-card"><div class="stat-num" id="todayNum">-</div><div class="stat-label">今日短链</div></div>\n';
  h += '  </div>\n';
  h += '  <div class="search-bar"><input type="text" id="searchInput" placeholder="搜索：时间 / IP / 短链 / 原链接" oninput="renderPage()"></div>\n';
  h += '  <div class="table-wrap">\n';
  h += '    <table>\n';
  h += '      <thead><tr><th>时间</th><th>IP</th><th>短链</th><th>原链接</th></tr></thead>\n';
  h += '      <tbody id="linkList"></tbody>\n';
  h += '    </table>\n';
  h += '  </div>\n';
  h += '  <div class="pagination">\n';
  h += '    <button id="prevBtn" onclick="changePage(-1)">上一页</button>\n';
  h += '    <span id="pageInfo"></span>\n';
  h += '    <button id="nextBtn" onclick="changePage(1)">下一页</button>\n';
  h += '  </div>\n';
  h += '  <div class="empty" id="emptyTip" style="display:none">暂无短链</div>\n';
  h += '</div>\n';

  // JS
  h += '<script>\n';
  h += 'var pwd = sessionStorage.getItem("admin_pwd") || "";\n';
  h += 'var allLinks = [];\n';
  h += 'var page = 1;\n';
  h += 'var pageSize = 20;\n';

  h += 'function login() {\n';
  h += '  var p = document.getElementById("pwd").value;\n';
  h += '  fetch("/admin", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({password:p}) })\n';
  h += '  .then(function(r){return r.json();}).then(function(data){\n';
  h += '    if(data.success){ sessionStorage.setItem("admin_pwd",p); pwd=p; showDash(data); }\n';
  h += '    else { document.getElementById("loginErr").style.display="block"; }\n';
  h += '  });\n';
  h += '}\n';

  h += 'function logout(){ sessionStorage.removeItem("admin_pwd"); location.reload(); }\n';

  h += 'function fmtNum(n){\n';
  h += '  if(n>=10000) return (n/10000).toFixed(1).replace(/\\.0$/,"")+"w";\n';
  h += '  if(n>=1000) return (n/1000).toFixed(1).replace(/\\.0$/,"")+"k";\n';
  h += '  return String(n);\n';
  h += '}\n';

  h += 'function fmtTime(ts){\n';
  h += '  if(!ts) return "-";\n';
  h += '  var d=new Date(ts);\n';
  h += '  function pad(n){return String(n).padStart(2,"0");}\n';
  h += '  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes());\n';
  h += '}\n';

  h += 'function esc(s){\n';
  h += '  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\'/g,"&#39;");\n';
  h += '}\n';

  h += 'function copyText(t){ navigator.clipboard.writeText(t); }\n';

  h += 'function getFiltered(){\n';
  h += '  var q = document.getElementById("searchInput").value.toLowerCase();\n';
  h += '  if(!q) return allLinks;\n';
  h += '  return allLinks.filter(function(l){\n';
  h += '    return l.code.toLowerCase().indexOf(q)>=0 || (l.ip||"").toLowerCase().indexOf(q)>=0 || (l.url||"").toLowerCase().indexOf(q)>=0;\n';
  h += '  });\n';
  h += '}\n';

  h += 'function renderPage(){\n';
  h += '  var filtered = getFiltered();\n';
  h += '  var totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));\n';
  h += '  if(page > totalPages) page = totalPages;\n';
  h += '  if(page < 1) page = 1;\n';
  h += '  var start = (page-1)*pageSize;\n';
  h += '  var pageData = filtered.slice(start, start+pageSize);\n';

  h += '  var tbody = document.getElementById("linkList");\n';
  h += '  tbody.innerHTML = "";\n';
  h += '  document.getElementById("emptyTip").style.display = filtered.length===0 ? "block" : "none";\n';

  h += '  for(var i=0;i<pageData.length;i++){\n';
  h += '    var l = pageData[i];\n';
  h += '    var shortUrl = "https://d.aozio.cn/"+l.code;\n';
  h += '    var long = l.url;\n';
  h += '    var isLong = long.length > 50;\n';
  h += '    var tr = document.createElement("tr");\n';
  h += '    var html = "";\n';
  h += '    html += "<td class=\'time\'>"+fmtTime(l.time)+"</td>";\n';
  h += '    html += "<td class=\'ip\'>"+esc(l.ip||"-")+"</td>";\n';
  h += '    html += "<td><span class=\'short-link\' onclick=\'copyText(\\\'"+esc(shortUrl)+"\\\')\'>"+esc(shortUrl)+"</span></td>";\n';
  h += '    if(isLong){\n';
  h += '      html += "<td><span class=\'orig-url\'><span class=\'ellipsis\' onclick=\'this.parentElement.classList.add(\"expanded\")\'>"+esc(long.slice(0,50))+"… 展开</span><span class=\'full\' onclick=\'copyText(\\\'"+esc(long)+"\\\')\'>"+esc(long)+"（点击复制）</span></span></td>";\n';
  h += '    } else {\n';
  h += '      html += "<td><span onclick=\'copyText(\\\'"+esc(long)+"\\\')\' style=\'cursor:pointer;color:#666\'>"+esc(long)+"</span></td>";\n';
  h += '    }\n';
  h += '    tr.innerHTML = html;\n';
  h += '    tbody.appendChild(tr);\n';
  h += '  }\n';

  h += '  document.getElementById("pageInfo").textContent = page+" / "+totalPages+"（共"+filtered.length+"条）";\n';
  h += '  document.getElementById("prevBtn").disabled = page<=1;\n';
  h += '  document.getElementById("nextBtn").disabled = page>=totalPages;\n';
  h += '}\n';

  h += 'function changePage(d){ page+=d; renderPage(); }\n';

  h += 'function showDash(data){\n';
  h += '  document.getElementById("loginView").style.display="none";\n';
  h += '  document.getElementById("dashView").style.display="block";\n';
  h += '  document.getElementById("totalNum").textContent=fmtNum(data.stats.total);\n';
  h += '  document.getElementById("todayNum").textContent=fmtNum(data.stats.today);\n';
  h += '  allLinks = data.links;\n';
  h += '  page = 1;\n';
  h += '  renderPage();\n';
  h += '}\n';

  h += 'if(pwd){\n';
  h += '  fetch("/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pwd})})\n';
  h += '  .then(function(r){return r.json();}).then(function(data){ if(data.success) showDash(data); });\n';
  h += '}\n';

  h += 'document.getElementById("pwd").addEventListener("keydown",function(e){ if(e.key==="Enter") login(); });\n';
  h += '</script>\n</body>\n</html>';
  return h;
}

function json(obj, status) {
  status = status || 200;
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
