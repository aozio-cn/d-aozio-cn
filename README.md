# d.aozio.cn 短链接生成器

纯前端 + Cloudflare Pages Functions + KV 存储，免费托管，自带 CDN 加速。

## 项目结构

```
d-aozio-cn/
├── index.html              # 前端页面（极简风格）
├── functions/
│   ├── api/
│   │   └── shorten.js      # POST /api/shorten — 生成短链
│   └── [[path]].js         # GET /:code — 短链跳转 302
└── README.md
```

## 部署步骤（Cloudflare Pages）

### 1. 上传代码到 GitHub
把这个文件夹推到你的 GitHub 仓库（私有也行）。

### 2. 创建 Pages 项目
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧选 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 选中你刚推的仓库
4. 构建配置全部留空：
   - Framework preset: `None`
   - Build command: （留空）
   - Build output directory: `/` （就是根目录）
5. 点 **Save and Deploy**，先部署一次。

### 3. 创建 KV 命名空间
1. 左侧 **Workers & Pages** → **KV** → **Create a namespace**
2. 名字填 `LINKS`，点 Add。

### 4. 绑定 KV 到 Pages 项目
1. 进入你刚创建的 Pages 项目
2. 顶部 **Settings** → **Functions** → **KV namespace bindings**
3. 点 **Add binding**：
   - Variable name: `LINKS`
   - KV namespace: 下拉选你刚建的 `LINKS`
4. 保存后，去 **Deployments** 里点 **Retry deployment** 重新部署一次（让 KV 绑定生效）。

### 5. 绑定自定义域名 d.aozio.cn
1. Pages 项目 → **Custom domains** → **Add custom domain**
2. 输入 `d.aozio.cn`
3. Cloudflare 会自动加 CNAME 记录（因为 aozio.cn 已经在 CF 管理下），等几分钟 SSL 证书签发完就能访问了。

## 完成后效果
- 打开 `https://d.aozio.cn` → 输入长链接 → 点生成 → 得到 `https://d.aozio.cn/xxxxxx`
- 任何人访问这个短链 → 自动 302 跳到原链接

## 免费额度（每天）
- KV 读：100,000 次
- KV 写：1,000 次
- Pages 请求：无限（软限制）

个人用完全够。
