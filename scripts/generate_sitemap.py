#!/usr/bin/env python3
"""
Generate sitemap.xml with all 16 supported languages from LanguageContext.
Run from project root: python3 scripts/generate_sitemap.py
"""
import os
from datetime import date

BASE = 'https://www.thestormwatcher.com'

LANGUAGES = ['en', 'bg', 'da', 'de', 'es', 'fi', 'fr', 'is', 'ja', 'ko', 'no', 'pl', 'ru', 'sv', 'uk', 'zh']

HREFLANG_CODES = {'zh': 'zh-Hans'}

ROUTES = [
    ('/',                 'hourly', '1.0'),
    ('/dashboard',        'hourly', '0.9'),
    ('/aurora',           'daily',  '0.9'),
    ('/aurora-map',       'hourly', '0.8'),
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

# Blog posts (English only — no hreflang variants until translations are merged)
BLOG_SLUGS = [
    'what-is-kp-index',
    'what-is-geomagnetic-storm',
    'how-to-see-northern-lights',
    'what-is-solar-wind',
    'g1-to-g5-storm-levels',
    'best-places-aurora-europe',
    'what-is-solar-flare',
    'aurora-forecast-explained',
    'space-weather-effects-on-earth',
    'what-is-iss',
]

LASTMOD = date.today().isoformat()


def lang_url(lang: str, path: str) -> str:
    if lang == 'en':
        return f'{BASE}{path}'
    suffix = '' if path == '/' else path
    return f'{BASE}/{lang}{suffix}'


def url_block(path: str, changefreq: str, priority: str) -> str:
    full = f'{BASE}{path}'
    lines = [
        '  <url>',
        f'    <loc>{full}</loc>',
        f'    <lastmod>{LASTMOD}</lastmod><changefreq>{changefreq}</changefreq><priority>{priority}</priority>',
    ]
    lines.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{full}"/>')
    for lang in LANGUAGES:
        hreflang = HREFLANG_CODES.get(lang, lang)
        href = lang_url(lang, path)
        lines.append(f'    <xhtml:link rel="alternate" hreflang="{hreflang}" href="{href}"/>')
    lines.append('  </url>')
    # Language-specific <url> entries for non-English variants
    for lang in LANGUAGES:
        if lang == 'en':
            continue
        hreflang = HREFLANG_CODES.get(lang, lang)
        href = lang_url(lang, path)
        lines += [
            '  <url>',
            f'    <loc>{href}</loc>',
            f'    <lastmod>{LASTMOD}</lastmod><changefreq>{changefreq}</changefreq><priority>{priority}</priority>',
            f'    <xhtml:link rel="alternate" hreflang="{hreflang}" href="{href}"/>',
            f'    <xhtml:link rel="alternate" hreflang="x-default" href="{full}"/>',
            '  </url>',
        ]
    return '\n'.join(lines)


def blog_url_block(slug: str) -> str:
    path = f'/blog/{slug}'
    full = f'{BASE}{path}'
    return '\n'.join([
        '  <url>',
        f'    <loc>{full}</loc>',
        f'    <lastmod>{LASTMOD}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority>',
        '  </url>',
    ])


def main():
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ]
    for path, freq, prio in ROUTES:
        parts.append(url_block(path, freq, prio))
    # Blog index
    parts.append('\n'.join([
        '  <url>',
        f'    <loc>{BASE}/blog</loc>',
        f'    <lastmod>{LASTMOD}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority>',
        '  </url>',
    ]))
    # Blog posts
    for slug in BLOG_SLUGS:
        parts.append(blog_url_block(slug))
    parts.append('</urlset>')

    out = os.path.join(os.path.dirname(__file__), '..', 'public', 'sitemap.xml')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts) + '\n')
    print(f'Generated sitemap.xml: {len(ROUTES)} routes × {len(LANGUAGES)} languages + {len(BLOG_SLUGS) + 1} blog pages')


if __name__ == '__main__':
    main()
