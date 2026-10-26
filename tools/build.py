"""Собирает index.html + css/ + js/ + assets/avatars в один автономный файл.

Запуск из корня проекта:  python tools/build.py
Результат:                dist/spiderverse-party.html
"""
import base64
import mimetypes
import re
from pathlib import Path

mimetypes.add_type('image/webp', '.webp')

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist' / 'spiderverse-party.html'


def data_uri(path):
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()


def inline_js(match):
    rel = match.group(1)
    code = (ROOT / rel).read_text(encoding='utf-8')
    # встроить картинки, на которые ссылаются скрипты (аватары)
    code = re.sub(r'"(assets/[^"]+)"', lambda m: '"' + data_uri(ROOT / m.group(1)) + '"', code)
    return f'<script>/* {rel} */\n{code}</script>'


def inline_css(match):
    rel = match.group(1)
    return f'<style>/* {rel} */\n{(ROOT / rel).read_text(encoding="utf-8")}</style>'


def main():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
    html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, html)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding='utf-8', newline='\n')
    print(f'{OUT.relative_to(ROOT)}: {OUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
