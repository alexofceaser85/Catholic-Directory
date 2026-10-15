"""Puts tools/logo/crucifix.png inside public/img/logo.svg (replacing the one already there).

The image has to live inside the SVG: browsers don't load separate image files from an SVG
used as a logo or tab icon. Run from the project folder:  python3 tools/logo/embed.py
"""
import base64
import re
from pathlib import Path

LOGO = Path('public/img/logo.svg')
IMAGE = Path('tools/logo/crucifix.png')

data = base64.b64encode(IMAGE.read_bytes()).decode()
svg = LOGO.read_text()
svg, count = re.subn(r'href="data:image/png;base64,[^"]*"', f'href="data:image/png;base64,{data}"', svg)
if count != 1:
    raise SystemExit(f'Expected one embedded image in {LOGO}, found {count}.')
LOGO.write_text(svg)
print(f'Embedded {IMAGE} ({len(data) // 1024} KB) into {LOGO}')
