export async function onRequestGet() {
  return new Response(renderAdminPage(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (body.password !== 'admin') return json({ success: false, error: '密码错误' }, 403);
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
      if (meta.deleted) continue;
      if (!meta.time) continue;
      links.push({ code: key.name, url: meta.url || '', time: meta.time || 0, ip: meta.ip || '', expireAt: meta.expireAt || 0 });
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
<title>后台</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f5;color:#333;min-height:100vh}
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh}
.login-box{background:#fff;padding:40px;border-radius:12px;width:360px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06)}
.login-box h1{font-size:20px;margin-bottom:20px;color:#111}
.login-box input{width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px;outline:none}
.login-box button{width:100%;padding:12px;background:#111;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer}
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
table{width:100%;border-collapse:collapse;min-width:700px}
th{background:#fafafa;text-align:left;padding:12px 14px;font-size:12px;color:#999;font-weight:500;border-bottom:1px solid #f0f0f0;white-space:nowrap}
td{padding:12px 14px;font-size:13px;border-bottom:1px solid #f5f5f5;vertical-align:top}
.short-link{color:#111;font-weight:500;cursor:pointer;white-space:nowrap}
.orig-url{color:#666;word-break:break-all;max-width:260px}
.orig-url .more{cursor:pointer;color:#999}
.orig-url .full{display:none;cursor:pointer}
.orig-url.expanded .more{display:none}
.orig-url.expanded .full{display:inline}
.time,.ip{color:#999;font-size:12px;white-space:nowrap}
.pagination{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:16px;font-size:13px;color:#666}
.pagination button{padding:6px 14px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;font-size:13px}
.pagination button:disabled{opacity:.4;cursor:not-allowed}
.empty{text-align:center;padding:40px;color:#bbb;font-size:14px}
</style>
</head>
<body>
<div class="login-wrap" id="loginView">
  <div class="login-box">
    <h1>短链接后台</h1>
    <p style="font-size:12px;color:#bbb;margin-bottom:16px;">访问密码：admin</p>
    <input type="password" id="pwd" placeholder="访问密码" autofocus>
    <button id="loginBtn">登录</button>
    <div class="login-err" id="loginErr">密码错误</div>
  </div>
</div>
<div class="dashboard" id="dashView">
  <div class="header"><h1>短链统计</h1><span class="logout" id="logoutBtn">退出</span></div>
  <div class="stats">
    <div class="stat-card"><div class="stat-num" id="totalNum">-</div><div class="stat-label">总短链</div></div>
    <div class="stat-card"><div class="stat-num" id="todayNum">-</div><div class="stat-label">今日短链</div></div>
  </div>
  <div class="search-bar"><input type="text" id="searchInput" placeholder="搜索：时间 / IP / 短链 / 原链接"></div>
  <div class="table-wrap"><table>
    <thead><tr><th>创建时间</th><th>过期时间</th><th>IP</th><th>短链</th><th>原链接</th></tr></thead>
    <tbody id="linkList"></tbody>
  </table></div>
  <div class="pagination">
    <button id="prevBtn">上一页</button>
    <span id="pageInfo"></span>
    <button id="nextBtn">下一页</button>
  </div>
  <div class="empty" id="emptyTip" style="display:none">暂无短链</div>
</div>
<script>
document.addEventListener("DOMContentLoaded",function(){
var pwd=sessionStorage.getItem("admin_pwd")||"";
var allLinks=[],page=1,pageSize=20;

function login(){
  var p=document.getElementById("pwd").value;
  fetch("/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:p})})
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.success){sessionStorage.setItem("admin_pwd",p);pwd=p;showDash(d);}
    else document.getElementById("loginErr").style.display="block";
  });
}
document.getElementById("loginBtn").onclick=login;
document.getElementById("pwd").addEventListener("keydown",function(e){if(e.key==="Enter")login();});
document.getElementById("logoutBtn").onclick=function(){sessionStorage.removeItem("admin_pwd");location.reload();};
document.getElementById("prevBtn").onclick=function(){page--;renderPage();};
document.getElementById("nextBtn").onclick=function(){page++;renderPage();};
document.getElementById("searchInput").addEventListener("input",function(){page=1;renderPage();});

function fmtNum(n){
  if(n>=10000)return(n/10000).toFixed(1).replace(/\\.0$/,"")+"w";
  if(n>=1000)return(n/1000).toFixed(1).replace(/\\.0$/,"")+"k";
  return String(n);
}
function fmtTime(ts){
  if(!ts)return"-";
  var d=new Date(ts);
  function pad(n){return String(n).padStart(2,"0");}
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes());
}
function copyText(t){navigator.clipboard.writeText(t);}
function getFiltered(){
  var q=document.getElementById("searchInput").value.toLowerCase();
  if(!q)return allLinks;
  return allLinks.filter(function(l){
    return l.code.toLowerCase().indexOf(q)>=0||(l.ip||"").toLowerCase().indexOf(q)>=0||(l.url||"").toLowerCase().indexOf(q)>=0;
  });
}
function renderPage(){
  var f=getFiltered();
  var tp=Math.max(1,Math.ceil(f.length/pageSize));
  if(page>tp)page=tp;if(page<1)page=1;
  var sd=(page-1)*pageSize;
  var pd=f.slice(sd,sd+pageSize);
  var tb=document.getElementById("linkList");
  tb.innerHTML="";
  document.getElementById("emptyTip").style.display=f.length===0?"block":"none";
  for(var i=0;i<pd.length;i++){
    (function(l){
      var su="https://d.aozio.cn/"+l.code;
      var long=l.url||"";
      var tr=document.createElement("tr");
      var td1=document.createElement("td");td1.className="time";td1.textContent=fmtTime(l.time);tr.appendChild(td1);
      var td1b=document.createElement("td");td1b.className="time";td1b.textContent=fmtTime(l.expireAt);tr.appendChild(td1b);
      var td2=document.createElement("td");td2.className="ip";td2.textContent=l.ip||"-";tr.appendChild(td2);
      var td3=document.createElement("td");
      var sl=document.createElement("span");sl.className="short-link";sl.textContent=su;
      sl.onclick=function(){copyText(su);};
      td3.appendChild(sl);tr.appendChild(td3);
      var td4=document.createElement("td");
      if(long.length>50){
        var sp=document.createElement("span");sp.className="orig-url";
        var more=document.createElement("span");more.className="more";more.textContent=long.slice(0,50)+"… 展开";
        var full=document.createElement("span");full.className="full";full.textContent=long+"（点击复制）";
        more.onclick=function(){sp.classList.add("expanded");};
        full.onclick=function(){copyText(long);};
        sp.appendChild(more);sp.appendChild(full);td4.appendChild(sp);
      } else {
        var s=document.createElement("span");s.textContent=long;s.style.cursor="pointer";s.style.color="#666";
        s.onclick=function(){copyText(long);};td4.appendChild(s);
      }
      tr.appendChild(td4);
      tb.appendChild(tr);
    })(pd[i]);
  }
  document.getElementById("pageInfo").textContent=page+" / "+tp+"（共"+f.length+"条）";
  document.getElementById("prevBtn").disabled=page<=1;
  document.getElementById("nextBtn").disabled=page>=tp;
}
function showDash(d){
  document.getElementById("loginView").style.display="none";
  document.getElementById("dashView").style.display="block";
  document.getElementById("totalNum").textContent=fmtNum(d.stats.total);
  document.getElementById("todayNum").textContent=fmtNum(d.stats.today);
  allLinks=d.links;page=1;renderPage();
}
if(pwd){
  fetch("/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pwd})})
  .then(function(r){return r.json();})
  .then(function(d){if(d.success)showDash(d);});
}
});
</script>
</body>
</html>`;
}

function json(obj,status){status=status||200;return new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json;charset=utf-8"}});}
