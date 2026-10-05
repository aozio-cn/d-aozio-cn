# d.aozio.cn 短链接生成器

极简风格短链接生成工具，纯静态部署在 GitHub Pages。

## 功能

- 输入长链接 → 一键生成 6 位随机短码
- 每个短链是仓库里的一个文件夹（`短码/index.html`）
- 跳转页 0.5 秒后自动跳转
- 后台 `/admin`：访问码 `admin`，总短链/今日统计、搜索、分页
- 自动补全 http/https 协议
- 6 位随机码 = 62⁶ ≈ 568 亿种组合，自动碰撞检测

## 项目结构

```
d-aozio-cn/
├── index.html              # 首页（输入框 + 生成短链）
├── admin/
│   └── index.html          # 后台管理（统计 + 列表）
├── {短码}/
│   └── index.html          # 每个短链一个文件夹，内含跳转页
└── README.md
```

## 技术栈

- 纯 HTML + JavaScript，无后端
- 部署：GitHub Pages
- CDN/反代：Cloudflare

## 本地运行

直接打开 `index.html` 即可，无需服务器。

## 开源协议

MIT
