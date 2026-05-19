#!/usr/bin/env python3
"""Add missing i18n keys discovered in audit to all locale files."""

import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'locales')

# Keys to add to ALL 16 locales (no || fallback in code — visible as raw key)
CRITICAL = {
    'en': {
        'planguard.availableOn': 'Available on Pro and Premium plans.',
        'auth.error': 'An error occurred. Please try again.',
        'nav.user': 'User',
    },
    'bg': {
        'planguard.availableOn': 'Достъпно с Pro и Premium.',
        'auth.error': 'Възникна грешка. Моля, опитайте отново.',
        'nav.user': 'Потребител',
    },
    'es': {
        'planguard.availableOn': 'Disponible en los planes Pro y Premium.',
        'auth.error': 'Ocurrió un error. Inténtalo de nuevo.',
        'nav.user': 'Usuario',
    },
    'fr': {
        'planguard.availableOn': 'Disponible avec Pro et Premium.',
        'auth.error': "Une erreur s'est produite. Veuillez réessayer.",
        'nav.user': 'Utilisateur',
    },
    'de': {
        'planguard.availableOn': 'Verfügbar mit Pro und Premium.',
        'auth.error': 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
        'nav.user': 'Benutzer',
    },
    'ru': {
        'planguard.availableOn': 'Доступно для Pro и Premium.',
        'auth.error': 'Произошла ошибка. Пожалуйста, повторите попытку.',
        'nav.user': 'Пользователь',
    },
    'zh': {
        'planguard.availableOn': '适用于 Pro 和 Premium 计划。',
        'auth.error': '发生错误，请重试。',
        'nav.user': '用户',
    },
    'ja': {
        'planguard.availableOn': 'Pro と Premium プランでご利用いただけます。',
        'auth.error': 'エラーが発生しました。もう一度お試しください。',
        'nav.user': 'ユーザー',
    },
    'no': {
        'planguard.availableOn': 'Tilgjengelig på Pro og Premium.',
        'auth.error': 'Det oppstod en feil. Vennligst prøv igjen.',
        'nav.user': 'Bruker',
    },
    'fi': {
        'planguard.availableOn': 'Saatavilla Pro- ja Premium-paketeissa.',
        'auth.error': 'Tapahtui virhe. Yritä uudelleen.',
        'nav.user': 'Käyttäjä',
    },
    'sv': {
        'planguard.availableOn': 'Tillgänglig med Pro och Premium.',
        'auth.error': 'Ett fel uppstod. Försök igen.',
        'nav.user': 'Användare',
    },
    'is': {
        'planguard.availableOn': 'Fáanlegt með Pro og Premium.',
        'auth.error': 'Villa kom upp. Reyndu aftur.',
        'nav.user': 'Notandi',
    },
    'da': {
        'planguard.availableOn': 'Tilgængelig med Pro og Premium.',
        'auth.error': 'Der opstod en fejl. Prøv igen.',
        'nav.user': 'Bruger',
    },
    'pl': {
        'planguard.availableOn': 'Dostępne w planach Pro i Premium.',
        'auth.error': 'Wystąpił błąd. Spróbuj ponownie.',
        'nav.user': 'Użytkownik',
    },
    'uk': {
        'planguard.availableOn': 'Доступно з Pro та Premium.',
        'auth.error': 'Сталася помилка. Будь ласка, спробуйте ще раз.',
        'nav.user': 'Користувач',
    },
    'ko': {
        'planguard.availableOn': 'Pro 및 Premium 플랜에서 사용 가능합니다.',
        'auth.error': '오류가 발생했습니다. 다시 시도해 주세요.',
        'nav.user': '사용자',
    },
}

# Extra keys for en.ts only (code already has || 'English fallback')
EN_ONLY = {
    'alerts.fetchError': 'Could not load alerts',
    'alerts.fetchErrorDesc': 'NOAA servers may be temporarily unavailable.',
    'alerts.retry': 'Try again',
    'aurora.calendar.noLocationHint': 'No location saved — cloud cover not available. Set a preferred location in Settings.',
    'aurora.calendar.noLocationShort': 'No cloud data —',
    'gallery.deleteTitle': 'Delete photo?',
    'gallery.deleteConfirm': 'This photo will be permanently removed from the gallery.',
    'gallery.deleteYes': 'Delete',
    'home.stormScore.imageSaved': 'Image saved!',
    'hunt.cooldownHint': 'One report per hour to keep the data accurate.',
    'profile.back': 'Back',
    'profile.deleteTypeEmail': 'Type your email address to confirm:',
}


def escape_ts(value: str) -> str:
    """Escape single quotes for TypeScript string literal."""
    return value.replace("'", "\\'")


def already_has_key(content: str, key: str) -> bool:
    return f"'{key}'" in content


def inject_before_closing(content: str, new_lines: str) -> str:
    """Insert new_lines before the final `};` in the file."""
    idx = content.rfind('\n};')
    if idx == -1:
        return content
    return content[:idx] + '\n' + new_lines + content[idx:]


for lang, additions in CRITICAL.items():
    filepath = os.path.join(BASE, f'{lang}.ts')
    if not os.path.exists(filepath):
        print(f'SKIP (not found): {filepath}')
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Merge with en-only extras for english
    all_additions = dict(additions)
    if lang == 'en':
        all_additions.update(EN_ONLY)

    lines_to_add = []
    for key, val in all_additions.items():
        if already_has_key(content, key):
            print(f'  SKIP existing key [{lang}] {key}')
            continue
        lines_to_add.append(f"  '{key}': '{escape_ts(val)}',")

    if not lines_to_add:
        print(f'[{lang}] nothing to add')
        continue

    block = '\n'.join(lines_to_add)
    new_content = inject_before_closing(content, block)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f'[{lang}] added {len(lines_to_add)} keys')

print('\nDone.')
