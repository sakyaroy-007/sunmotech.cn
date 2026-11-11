#!/usr/bin/env python3
"""Assemble sunmotech.cn pages from src/partials + src/pages, then subset the CJK serif font.

Usage (from the repo root):
    python3 -I src/build.py            # pages only
    python3 -I src/build.py --fonts    # pages + font subset (needs fontTools + brotli)

Each file in src/pages starts with a JSON header between <!--meta and -->:
    {"out": "beatkitchen/index.html", "title": "...", "desc": "...", "body": "page-bk", "scripts": ["sequencer"]}
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
SITE = 'https://sunmotech.cn'

ICONS = {
    'ARROW': '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>',
    'ARROW_DOWN': '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v10M4 9l4 4 4-4"/></svg>',
    'ARROW_UR': '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5"/></svg>',
    'COPY': '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="2"/><path d="M10.5 3.5v-.5a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5"/></svg>',
    'CHECK': '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2.5 6.2 2.3 2.3 4.7-5"/></svg>',
    'X': '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m3.5 3.5 5 5m0-5-5 5"/></svg>',
    'STAR': '<svg class="star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12C6.6 11.4 11.4 6.6 12 0Z"/></svg>',
    'INFO': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 9v5M10 6.2v.1" stroke-linecap="round"/></svg>',
    'PLAY': '<svg class="play" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6 3.8v12.4a.8.8 0 0 0 1.2.7l10-6.2a.8.8 0 0 0 0-1.4l-10-6.2a.8.8 0 0 0-1.2.7Z"/></svg>',
    'PAUSE': '<svg class="pause" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="3.5" height="12" rx="1"/><rect x="11.5" y="4" width="3.5" height="12" rx="1"/></svg>',
    'G_NATIVE': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3.5"/><rect x="7" y="7" width="6" height="6" rx="1.2"/><path d="M7 1v2M10 1v2M13 1v2M7 17v2M10 17v2M13 17v2M1 7h2M1 10h2M1 13h2M17 7h2M17 10h2M17 13h2"/></svg>',
    'G_VERIFY': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="m13.5 13.5 4 4M6.5 9l1.8 1.8L12 7.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'G_REAL': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="2" y="4" width="16" height="10" rx="2"/><path d="M7 17h6M10 14v3M5.5 10.5l2.5-3 2.5 2 3.5-3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'G_SIMPLE': '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 6h14M3 10h9M3 14h5" stroke-linecap="round"/><circle cx="15.5" cy="14" r="2.5"/></svg>',
}

MARK = ('<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="currentColor" clip-path="url(#sm-t)"/>'
        '<circle cx="16" cy="16" r="13" fill="currentColor" opacity=".38" clip-path="url(#sm-b)"/></svg>')
SPRITE = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
          '<clipPath id="sm-t"><path d="M0 0H32V18C29.33 20.5 26.67 20.5 24 18C21.33 15.5 18.67 15.5 16 18C13.33 20.5 10.67 20.5 8 18C5.33 15.5 2.67 15.5 0 18Z"/></clipPath>'
          '<clipPath id="sm-b"><path d="M0 32H32V20.6C29.33 23.1 26.67 23.1 24 20.6C21.33 18.1 18.67 18.1 16 20.6C13.33 23.1 10.67 23.1 8 20.6C5.33 18.1 2.67 18.1 0 20.6Z"/></clipPath>'
          '</defs></svg>')


def read(*p):
    with open(os.path.join(*p), encoding='utf-8') as f:
        return f.read()


def fill(text, ctx):
    text = text.replace('{{MARK}}', MARK)
    for k, v in ICONS.items():
        text = text.replace('{{' + k + '}}', v)
    for k, v in ctx.items():
        text = text.replace('{{' + k + '}}', v)
    left = re.findall(r'\{\{[A-Z_]+\}\}', text)
    if left:
        raise SystemExit('unfilled placeholders: %s' % sorted(set(left)))
    return text


def build():
    head = read(SRC, 'partials', 'head.html')
    nav = read(SRC, 'partials', 'nav.html')
    foot = read(SRC, 'partials', 'footer.html')
    serif_text = []
    outs = []
    for name in sorted(os.listdir(os.path.join(SRC, 'pages'))):
        if not name.endswith('.html'):
            continue
        raw = read(SRC, 'pages', name)
        m = re.match(r'\s*<!--meta\s*(\{.*?\})\s*-->\s*', raw, re.S)
        if not m:
            raise SystemExit('missing meta header in ' + name)
        meta = json.loads(m.group(1))
        body = raw[m.end():]
        out = meta['out']
        url_path = '/' + out[:-len('index.html')] if out.endswith('index.html') else '/' + out
        scripts = ''.join('<script src="/assets/js/%s.js" defer></script>' % s for s in meta.get('scripts', []))
        ctx = {
            'TITLE': meta['title'],
            'DESC': meta['desc'],
            'URL': SITE + url_path,
            'BODY_CLASS': meta.get('body', ''),
            'SCRIPTS': scripts,
            'ROBOTS': meta.get('robots', 'index,follow'),
        }
        page = fill(head, ctx) + SPRITE + fill(nav, ctx) + '<main id="main">' + fill(body, ctx) + '</main>' + fill(foot, ctx) + '</body>\n</html>\n'
        dest = os.path.join(ROOT, out)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'w', encoding='utf-8') as f:
            f.write(page)
        outs.append(out)
        serif_text += re.findall(r'class="serif[^"]*"[^>]*>(.*?)</', page, re.S)
    print('pages:', ', '.join(outs))
    return ''.join(serif_text)


def subset_fonts(serif_text):
    from fontTools import subset  # noqa: imported lazily, only needed with --fonts
    src_font = os.environ.get('NOTO_SERIF_SC')
    if not src_font:
        raise SystemExit('set NOTO_SERIF_SC to the path of NotoSerifSC-Medium.otf')
    chars = set(ch for ch in serif_text if ord(ch) > 0x2E7F)
    chars |= set('，。、：；！？「」《》（）·—…')
    text = ''.join(sorted(chars))
    out = os.path.join(ROOT, 'assets', 'fonts', 'SunmoSerifSC.woff2')
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.name_legacy = True
    opts.name_languages = ['*']
    opts.notdef_outline = True
    font = subset.load_font(src_font, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    subset.save_font(font, out, opts)
    print('serif subset: %d chars -> %s (%d bytes)' % (len(text), out, os.path.getsize(out)))


if __name__ == '__main__':
    t = build()
    if '--fonts' in sys.argv:
        subset_fonts(t)
