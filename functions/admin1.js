export async function onRequestGet() {
  return new Response(renderAdminPage(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const ADMIN_PASSWORD = env.ADMIN1_PASSWORD || 'AH.hgfhxy1223';
  try {
    const body = await request.json();

    // 删除操作
    if (body.action === 'delete') {
      if (body.password !== ADMIN_PASSWORD) return json({ success: false, error: '密码错误' }, 403);
      const raw = await env.LINKS.get(body.code);
      if (!raw) return json({ success: false, error: '短链不存在' });
      const meta = JSON.parse(raw);
      meta.deleted = true;
      meta.deletedAt = Date.now();
      const ttl = Math.max(60, Math.floor((meta.expireAt - Date.now()) / 1000));
      await env.LINKS.put(body.code, JSON.stringify(meta), { expirationTtl: ttl });
      return json({ success: true });
    }

    // 登录+列表
    if (body.password !== ADMIN_PASSWORD) return json({ success: false, error: '密码错误' }, 403);
    const links = await loadLinks(env);
    const today = new Date(); today.setHours(0,0,0,0);
    const todayTs = today.getTime();
    let todayCount = links.filter(l => l.time >= todayTs).length;
    return json({ success: true, stats: { total: links.length, today: todayCount }, links });
  } catch {
    return json({ success: false, error: '服务器错误' }, 500);
  }
}

async function loadLinks(env) {
  const list = await env.LINKS.list({ limit: 1000 });
  const links = [];
  for (const key of list.keys) {
    if (key.name.startsWith('rl:')) continue;
    const raw = await env.LINKS.get(key.name);
    try {
      const meta = JSON.parse(raw);
      links.push({ code: key.name, url: meta.url, time: meta.time, ip: meta.ip || '', deleted: !!meta.deleted, expireAt: meta.expireAt });
    } catch {}
  }
  links.sort((a,b) => b.time - a.time);
  return links;
}

function renderAdminPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>管理员后台 · d.aozio.cn</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:#f0f2f5;color:#333;min-height:100vh}
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh}
.login-box{background:#fff;padding:40px;border-radius:12px;width:360px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.login-box h1{font-size:20px;margin-bottom:20px;color:#111}
.login-box input{width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px;outline:none}
.login-box button{width:100%;padding:12px;background:#c0392b;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer}
.login-err{color:#e74c3c;font-size:13px;margin-top:8px;display:none}
.dashboard{display:none;max-width:960px;margin:0 auto;padding:30px 20px}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.header h1{font-size:20px;color:#111}
.logout{font-size:13px;color:#999;cursor:pointer}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.stat-card{background:#fff;padding:20px;border-radius:12px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.stat-num{font-size:32px;font-weight:700;color:#111}
.stat-label{font-size:13px;color:#999;margin-top:4px}
.search-bar{margin-bottom:16px}
.search-bar input{width:100%;padding:10px 14px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none}
.table-wrap{background:#fff;border-radius:12px;overflow-x:auto;box-shadow:0 1px 4px rgba(0,0,0,.05)}
table{width:100%;border-collapse:collapse;min-width:750px}
th{background:#fafafa;text-align:left;padding:12px 14px;font-size:12px;color:#999;font-weight:500;border-bottom:1px solid #f0f0f0;white-space:nowrap}
td{padding:12px 14px;font-size:13px;border-bottom:1px solid #f5f5f5;vertical-align:top}
.del-row{opacity:.5}
.del-badge{background:#fdecea;color:#c0392b;font-size:11px;padding:2px 6px;border-radius:4px;margin-left:6px}
.short-link{color:#111;font-weight:500;cursor:pointer;white-space:nowrap}
.short-link:hover{text-decoration:underline}
.orig-url{color:#666;word-break:break-all;max-width:220px}
.orig-url .ellipsis{cursor:pointer;color:#999}
.orig-url .full{display:none;cursor:pointer}
.orig-url.expanded .ellipsis{display:none}
.orig-url.expanded .full{display:inline}
.time,.ip{color:#999;font-size:12px;white-space:nowrap}
.btn-del{padding:5px 12px;background:#c0392b;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;white-space:nowrap}
.btn-del:hover{background:#e74c3c}
.btn-del:disabled{opacity:.5;cursor:not-allowed}
.pagination{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:16px;font-size:13px;color:#666}
.pagination button{padding:6px 14px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;font-size:13px}
.pagination button:disabled{opacity:.4;cursor:not-allowed}
.empty{text-align:center;padding:40px;color:#bbb;font-size:14px}
</style>
</head>
<body>
<div class="login-wrap" id="loginView">
  <div class="login-box">
    <h1>管理员后台</h1>
    <input type="password" id="pwd" placeholder="管理员密码" autofocus>
    <button onclick="login()">登录</button>
    <div class="login-err" id="loginErr">密码错误</div>
  </div>
</div>
<div class="dashboard" id="dashView">
  <div class="header"><h1>短链管理</h1><span class="logout" onclick="logout()">退出</span></div>
  <div class="stats">
    <div class="stat-card"><div class="stat-num" id="totalNum">-</div><div class="stat-label">总短链</div></div>
    <div class="stat-card"><div class="stat-num" id="todayNum">-</div><div class="stat-label">今日短链</div></div>
  </div>
  <div class="search-bar"><input type="text" id="searchInput" placeholder="搜索：时间 / IP / 短链 / 原链接" oninput="page=1;renderPage()"></div>
  <div class="table-wrap"><table>
    <thead><tr><th>时间</th><th>IP</th><th>短链</th><th>原链接</th><th>操作</th></tr></thead>
    <tbody id="linkList"></tbody>
  </table></div>
  <div class="pagination">
    <button id="prevBtn" onclick="changePage(-1)">上一页</button>
    <span id="pageInfo"></span>
    <button id="nextBtn" onclick="changePage(1)">下一页</button>
  </div>
  <div class="empty" id="emptyTip" style="display:none">暂无短链</div>
</div>
<script>
var pwd=sessionStorage.getItem("admin1_pwd")||"";
var allLinks=[],page=1,pageSize=20;
function login(){var p=document.getElementById("pwd").value;
fetch("/admin1",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:p})})
.then(r=>r.json()).then(d=>{if(d.success){sessionStorage.setItem("admin1_pwd",p);pwd=p;showDash(d);}
else document.getElementById("loginErr").style.display="block";});}
function logout(){sessionStorage.removeItem("admin1_pwd");location.reload();}
function fmtNum(n){if(n>=10000)return(n/10000).toFixed(1).replace(/\\.0$/,"")+"w";if(n>=1000)return(n/1000).toFixed(1).replace(/\\.0$/,"")+"k";return String(n);}
function fmtTime(ts){if(!ts)return"-";var d=new Date(ts);function pad(n){return String(n).padStart(2,"0");}return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes());}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function copyText(t){navigator.clipboard.writeText(t);}
function getFiltered(){var q=document.getElementById("searchInput").value.toLowerCase();if(!q)return allLinks;
return allLinks.filter(l=>l.code.toLowerCase().indexOf(q)>=0||(l.ip||"").toLowerCase().indexOf(q)>=0||(l.url||"").toLowerCase().indexOf(q)>=0);}
function del(code,btn){
if(!confirm("确定删除短链 "+code+"？"))return;
btn.disabled=true;
fetch("/admin1",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pwd,action:"delete",code:code})})
.then(r=>r.json()).then(d=>{if(d.success){var l=allLinks.find(x=>x.code===code);if(l)l.deleted=true;renderPage();}
else{btn.disabled=false;alert(d.error||"删除失败");}});}
function renderPage(){
var f=getFiltered(),tp=Math.max(1,Math.ceil(f.length/pageSize));
if(page>tp)page=tp;if(page<1)page=1;
var sd=(page-1)*pageSize,pd=f.slice(sd,sd+pageSize);
var tb=document.getElementById("linkList");tb.innerHTML="";
document.getElementById("emptyTip").style.display=f.length===0?"block":"none";
for(var i=0;i<pd.length;i++){var l=pd[i],su="https://d.aozio.cn/"+l.code,long=l.url,il=long.length>50;
var tr=document.createElement("tr");
if(l.deleted)tr.className="del-row";
var html="";
html+="<td class='time'>"+fmtTime(l.time)+"</td>";
html+="<td class='ip'>"+esc(l.ip||"-")+"</td>";
html+="<td><span class='short-link' onclick='copyText(\\'"+esc(su)+"\\')'>"+esc(l.code)+(l.deleted?'<span class=\"del-badge\">已删</span>':'')+"</span></td>";
if(il)html+="<td><span class='orig-url'><span class='ellipsis' onclick='this.parentElement.classList.add(\"expanded\")'>"+esc(long.slice(0,50))+"… 展开</span><span class='full' onclick='copyText(\\'"+esc(long)+"\\')'>"+esc(long)+"（点击复制）</span></span></td>";
else html+="<td><span onclick='copyText(\\'"+esc(long)+"\\')' style='cursor:pointer;color:#666'>"+esc(long)+"</span></td>";
html+="<td><button class='btn-del' onclick='del(\\'"+esc(l.code)+"\\',this)'"+(l.deleted?" disabled":"")+">"+(l.deleted?"已删除":"删除")+"</button></td>";
tr.innerHTML=html;tb.appendChild(tr);}
document.getElementById("pageInfo").textContent=page+" / "+tp+"（共"+f.length+"条）";
document.getElementById("prevBtn").disabled=page<=1;
document.getElementById("nextBtn").disabled=page>=tp;}
function changePage(d){page+=d;renderPage();}
function showDash(d){document.getElementById("loginView").style.display="none";
document.getElementById("dashView").style.display="block";
document.getElementById("totalNum").textContent=fmtNum(d.stats.total);
document.getElementById("todayNum").textContent=fmtNum(d.stats.today);
allLinks=d.links;page=1;renderPage();}
if(pwd)fetch("/admin1",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pwd})})
.then(r=>r.json()).then(d=>{if(d.success)showDash(d);});
document.getElementById("pwd").addEventListener("keydown",e=>{if(e.key==="Enter")login();});
</script>
</body></html>`;
}

function json(obj,status){status=status||200;return new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json;charset=utf-8"}});}
