#!/usr/bin/env python3
"""
Generate sitemap.xml with all 16 supported languages from LanguageContext.
Run from project root: python3 scripts/generate_sitemap.py
"""
import os
from datetime import date

BASE = 'https://www.thestormwatcher.com'

LANGUAGES = ['en', 'bg', 'da', 'de', 'es', 'fi', 'fr', 'is', 'ja', 'ko', 'no', 'pl', 'ru', 'sv', 'uk', 'zh']

ROUTES = [
    ('/',                 'hourly', '1.0'),
    ('/dashboard',        'hourly', '0.9'),
    ('/aurora',           'daily',  '0.9'),
    ('/forecast',         'hourly', '0.9'),
    ('/alerts',           'hourly', '0.8'),
    ('/calendar',         'daily',  '0.8'),
    ('/mood',             'daily',  '0.7'),
    ('/livestream',       'daily',  '0.7'),
    ('/gallery',          'daily',  '0.7'),
    ('/hunt',             'daily',  '0.7'),
    ('/uv',               'daily',  '0.7'),
    ('/sun',              'daily',  '0.7'),
    ('/sky',              'daily',  '0.7'),
    ('/iss',              'hourly', '0.7'),
    ('/magnetic-effects', 'weekly', '0.6'),
    ('/faq',              'weekly', '0.6'),
    ('/about',            'monthly','0.5'),
    ('/pricing',          'weekly', '0.6'),
    ('/privacy',          'yearly', '0.3'),
    ('/terms',            'yearly', '0.3'),
]

LASTMOD = date.today().isoformat()


def url_block(path: str, changefreq: str, priority: str) -> str:
    full = f'{BASE}{path}'
    lines = [
        '  <url>',
        f'    <loc>{full}</loc>',
        f'    <lastmod>{LASTMOD}</lastmod><changefreq>{changefreq}</changefreq><priority>{priority}</priority>',
    ]
    for lang in LANGUAGES:
        href = full if lang == 'en' else f'{full}?lang={lang}' if path != '/' else f'{BASE}/?lang={lang}'
        lines.append(f'    <xhtml:link rel="alternate" hreflang="{lang}" href="{href}"/>')
    lines.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{full}"/>')
    lines.append('  </url>')
    return '\n'.join(lines)


def main():
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ]
    for path, freq, prio in ROUTES:
        parts.append(url_block(path, freq, prio))
    parts.append('</urlset>')

    out = os.path.join(os.path.dirname(__file__), '..', 'public', 'sitemap.xml')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts) + '\n')
    print(f'Generated sitemap.xml: {len(ROUTES)} routes × {len(LANGUAGES)} languages')


if __name__ == '__main__':
    main()
