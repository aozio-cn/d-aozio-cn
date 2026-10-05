#!/usr/bin/env python3
"""d.aozio.cn 短链接服务 - 纯标准库，无外部依赖"""
import json
import os
import re
import secrets
import string
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "links.json")
PORT = 8899
DOMAIN = "https://d.aozio.cn"

# 加载/初始化数据
def load_links():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {}

def save_links(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

LINKS = load_links()

# 生成 6 位随机短码
def gen_code(length=6):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

class ShortHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/":
            self.serve_index()
        elif path == "/api/stats":
            self.serve_stats()
        else:
            code = path.strip("/")
            self.serve_redirect(code)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/shorten":
            self.handle_shorten()
        else:
            self.send_json({"error": "Not found"}, 404)

    def serve_index(self):
        with open(os.path.join(BASE_DIR, "index.html"), "rb") as f:
            content = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", len(content))
        self.end_headers()
        self.wfile.write(content)

    def serve_stats(self):
        self.send_json({"total": len(LINKS)})

    def serve_redirect(self, code):
        if code in LINKS:
            target = LINKS[code]
            self.send_response(302)
            self.send_header("Location", target)
            self.end_headers()
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>404 · d.aozio.cn</title>
<style>body{{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#fff;color:#333;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}}h1{{font-size:48px;font-weight:600;color:#111;margin-bottom:8px}}p{{color:#999;font-size:15px;margin-bottom:24px}}a{{color:#666;text-decoration:none;font-size:14px}}a:hover{{text-decoration:underline}}</style>
</head><body><h1>404</h1><p>短链接「{code}」不存在或已失效</p><a href="/">← 生成新短链接</a></body></html>""".encode())

    def handle_shorten(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")
        try:
            data = json.loads(body)
            url = (data.get("url") or "").strip()
        except:
            self.send_json({"error": "请求格式错误"}, 400)
            return

        if not url:
            self.send_json({"error": "请输入链接"}, 400)
            return

        # 自动补 https://
        if not re.match(r'^https?://', url):
            url = "https://" + url

        # 校验 URL
        try:
            result = urlparse(url)
            if not result.scheme or not result.netloc:
                raise ValueError()
            url = result.geturl()
        except:
            self.send_json({"error": "链接格式不正确"}, 400)
            return

        # 生成不重复的短码
        code = gen_code(6)
        while code in LINKS:
            code = gen_code(6)

        LINKS[code] = url
        save_links(LINKS)

        self.send_json({"short": f"{DOMAIN}/{code}", "code": code})

    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass  # 静默默认日志

if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", PORT), ShortHandler)
    print(f"d.aozio.cn shortener running on http://127.0.0.1:{PORT}")
    server.serve_forever()
