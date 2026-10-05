export async function onRequestPost(context) {
  const { request, env } = context;
  const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';

  try {
    // IP 限流：每个 IP 每分钟最多 10 次
    const rlKey = `rl:${clientIP}`;
    const rlData = await env.LINKS.get(rlKey, 'json');
    const now = Date.now();
    const windowMs = 60 * 1000;
    if (rlData && now - rlData.start < windowMs && rlData.count >= 10) {
      return json({ error: '操作太频繁，请1分钟后再试' }, 429);
    }
    const newCount = rlData && now - rlData.start < windowMs ? rlData.count + 1 : 1;
    await env.LINKS.put(rlKey, JSON.stringify({ start: now, count: newCount }), { expirationTtl: 60 });

    const body = await request.json();
    const url = (body.url || '').trim();
    const days = parseInt(body.days) || 30;

    if (!url) return json({ error: '请提供链接' }, 400);

    let parsed;
    try { parsed = new URL(url); } catch { return json({ error: '链接格式不正确' }, 400); }
    if (!['http:', 'https:'].includes(parsed.protocol)) return json({ error: '仅支持 http / https 链接' }, 400);

    // 多源恶意链接检测
    const blockReason = await checkUrlSafety(parsed.toString(), parsed.hostname);
    if (blockReason) {
      return json({ error: `该链接被安全检测标记为${blockReason}，无法生成短链` }, 400);
    }

    // 过期时间：最多180天
    const actualDays = Math.min(days, 180);
    const expireAt = now + actualDays * 24 * 60 * 60 * 1000;

    // 生成 6 位随机短码
    let code = generateCode(6);
    while (await env.LINKS.get(code)) code = generateCode(6);

    const meta = { url: parsed.toString(), time: now, ip: clientIP, expireAt, days: actualDays };
    const ttlSeconds = Math.max(60, Math.floor((expireAt - now) / 1000));
    await env.LINKS.put(code, JSON.stringify(meta), { expirationTtl: ttlSeconds });

    return json({ short: `https://d.aozio.cn/${code}`, code, days: actualDays });
  } catch (err) {
    return json({ error: '服务器错误，请稍后重试' }, 500);
  }
}

async function checkUrlSafety(url, domain) {
  // 先做本地启发式检查（同步，快）
  const localResult = checkLocalHeuristics(url, domain);
  if (localResult) return localResult;

  // 再查外部 API
  const checks = [checkPhishDestroy, checkPhishunt, checkScamLens];
  for (const check of checks) {
    try {
      const result = await check(url, domain);
      if (result) return result;
    } catch {}
  }
  return null;
}

function checkLocalHeuristics(url, domain) {
  const d = domain.toLowerCase();

  // IP 地址直接访问
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(d)) return 'IP直连地址';

  // 可疑 TLD
  const badTLDs = ['.xyz', '.top', '.click', '.loan', '.work', '.date', '.racing', '.review', '.trade', '.men', '.cfd', '.gq', '.ml', '.ga', '.tk'];
  for (const tld of badTLDs) {
    if (d.endsWith(tld)) return `可疑后缀 ${tld}`;
  }

  // 可疑关键词
  const badKeywords = ['login', 'verify', 'secure', 'wallet', 'airdrop', 'metamask', 'myether', 'binance', 'auth', 'signin', 'account', 'update', 'web3', 'claim', 'reward'];
  for (const kw of badKeywords) {
    if (d.includes(kw)) return `含可疑关键词 "${kw}"`;
  }

  return null;
}

async function checkPhishDestroy(url, domain) {
  try {
    const res = await fetch(`https://api.destroy.tools/v1/check?domain=${encodeURIComponent(domain)}`, {
      headers: { 'User-Agent': 'd-aozio-cn' }, signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    if (data.threat && data.severity !== 'low') return '钓鱼/诈骗网站';
  } catch {}
  return null;
}

async function checkPhishunt(url, domain) {
  try {
    const res = await fetch(`https://phishunt.io/api/v1/analyze?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'd-aozio-cn' }, signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    if (data.verdict === 'likely_phishing' || data.verdict === 'very_likely_phishing') return '钓鱼网站';
  } catch {}
  return null;
}

async function checkScamLens(url, domain) {
  try {
    const res = await fetch(`https://scamlens.org/v1/public/check?domain=${encodeURIComponent(domain)}`, {
      headers: { 'User-Agent': 'd-aozio-cn' }, signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    if (data.risk_level === 'high' || data.risk_level === 'critical') return '高风险诈骗网站';
  } catch {}
  return null;
}

function generateCode(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
