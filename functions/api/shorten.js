export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const url = (body.url || '').trim();

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

    // 生成 6 位随机短码，碰撞就重新生成
    let code = generateCode(6);
    while (await env.LINKS.get(code)) {
      code = generateCode(6);
    }

    // 存元数据：URL + 时间 + IP
    const meta = {
      url: parsed.toString(),
      time: Date.now(),
      ip: request.headers.get('cf-connecting-ip') || ''
    };
    await env.LINKS.put(code, JSON.stringify(meta));

    const short = `https://d.aozio.cn/${code}`;
    return json({ short, code });
  } catch (err) {
    return json({ error: '服务器错误，请稍后重试' }, 500);
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
