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

    if (!url) {
      return json({ error: '请提供链接' }, 400);
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return json({ error: '链接格式不正确' }, 400);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return json({ error: '仅支持 http / https 链接' }, 400);
    }

    // Google Safe Browsing 检查
    if (env.GSB_API_KEY) {
      const gsbResult = await checkSafeBrowsing(parsed.toString(), env.GSB_API_KEY);
      if (gsbResult) {
        return json({ error: '该链接被 Google Safe Browsing 标记为不安全，无法生成短链' }, 400);
      }
    }

    // 过期时间：最多180天
    const maxDays = 180;
    const actualDays = Math.min(days, maxDays);
    const expireAt = now + actualDays * 24 * 60 * 60 * 1000;

    // 生成 6 位随机短码，碰撞就重新生成
    let code = generateCode(6);
    while (await env.LINKS.get(code)) {
      code = generateCode(6);
    }

    // 存元数据
    const meta = {
      url: parsed.toString(),
      time: now,
      ip: clientIP,
      expireAt: expireAt,
      days: actualDays
    };
    // KV TTL 用过期时间，自动删除
    const ttlSeconds = Math.max(60, Math.floor((expireAt - now) / 1000));
    await env.LINKS.put(code, JSON.stringify(meta), { expirationTtl: ttlSeconds });

    const short = `https://d.aozio.cn/${code}`;
    return json({ short, code, days: actualDays });
  } catch (err) {
    return json({ error: '服务器错误，请稍后重试' }, 500);
  }
}

async function checkSafeBrowsing(url, apiKey) {
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'd-aozio-cn', clientVersion: '1.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }]
        }
      })
    });
    const data = await res.json();
    return data && data.matches && data.matches.length > 0;
  } catch {
    return false;
  }
}

function generateCode(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    out += chars[arr[i] % chars.length];
  }
  return out;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
