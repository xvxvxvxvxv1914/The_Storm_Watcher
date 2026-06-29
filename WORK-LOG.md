# Work Log — The Storm Watcher

> Текущ статус на свършеното и оставащото. Поддържай го при по-големи сесии.

---

## 2026-06-30 — SEO/индексиране, одит, theming, проверка на данните

### ✅ Направено (в PRODUCTION, branch `main`)

**SEO / индексиране**
- apex `thestormwatcher.com` → www вече е **308** (постоянен), не 307 (промяна във Vercel Domains).
- Махнат **дублиран sitemap** в GSC (apex версията); остана само `www.../sitemap.xml`.
- **Footer линк към `/blog`** (desktop + mobile) — блогът вече е достъпен за обхождане от всяка страница.
- Локализираните страници (`/bg /de …`) — старият `noindex` е поправен в production (потвърдено, че Googlebot вижда `index,follow`); чакат само recrawl.

**Дизайн / theming фиксове**
- 🐛 **Полета четими в светла тема** — `input/textarea/select` ползваха `text-white`, но light override-ът не ги покриваше → въведеният текст беше бял/невидим. Фикс в `src/index.css`.
- **Pricing фон** = като home (черно `#000008` + starfield), вместо собствено тъмно синьо → без seam преди footer-а.
- **Blog/BlogPost фон** → `transparent` (махнат one-off `#050510`) за пълна консистентност.
- **Focus цвят на полетата** унифициран към брандово оранжево (`#f97316`) — беше 4 различни акцента.
- **a11y**: aria-label на 2 иконни бутона (avatar-cropper close, remove-favorite).

**Инфраструктура / достъп**
- Настроен **Google Search Console достъп** (service account + `gscServer` MCP) — виж паметта `gsc-mcp-setup`.
- Rollback точки: таг `stable-2026-06-20-pre-design`, клон `backup/pre-design-2026-06-20`.

### ✅ Проверено (работи коректно)
- **Магнитни бури / Kp данни**: GFZ (primary) + `/api/gfz` proxy + NOAA fallback + прогноза + alerts + solar wind — всички HTTP 200, кръстосано съгласувани. G-scale мапинг коректен спрямо NOAA. `noaaApi` тестове 27/27. (Към 2026-06-30 Kp ≈ 0.0, тихо; прогноза за G1 на 30 юни.)
- **Code health**: typecheck 0, lint 0, тестове минават.
- **Production грешки** (Vercel): 0 реални; само 1 безобиден `url.parse` deprecation warning от зависимост (не наш код).
- **Theming**: тъмна тема консистентна на всички страници (черно + starfield + стъклени карти).

---

### ⏳ Остава (само на потребителя — GSC UI, няма API)
1. **Request indexing** в GSC за езиците (`/bg /de /es /fr /ja /ru /zh`) + блога (`/blog` + постовете). Лимит ~10/ден; Day-1 приоритет: `/aurora-map`, `/blog`, ключови блог постове.
2. **„URL is not available to Google"** — ако се появи пак, провери точния ред в „details" (или е Cloudflare **Bot Fight Mode**, който подхвърля challenge на Googlebot → Cloudflare dashboard → Security → Bots).
3. **След ~5-7 дни**: повторна проверка в GSC дали езиците/блогът са влезли в индекса след recrawl-а.

### 💡 По избор / отложено (с причина)
- **`redesign/premium-dark` branch** — потребителят revert-на редизайна (не му хареса); branch-ът е запазен като fallback. Да се изтрие само при изрично желание.
- **Споделен `<Input>` компонент** — рефактор за поддръжка; не е спешно (бъгът е фикснат глобално), рисково за критичните auth форми.
- **Cloudflare** — изчистване на противоречивите AI-bot правила в live robots.txt (нужен dashboard/token).
- **Dev vulnerabilities** (vite/esbuild/tsx) — само dev/build, 0 production експозиция; fix иска breaking vite 8 ъпгрейд — отложено.
- **CLAUDE.md TODO** — стоящи mobile задачи (Android FCM push, Glance widget, IAP plugin install) — извън обхвата на тази сесия.

---

### Git workflow (важно)
- Push по подразбиране **само в staging**; **main само при изричен ред** за всеки feature.
- staging и main са **разклонени** (main има merge commits) → `git push origin staging:main` се отхвърля; за единичен commit в main използвай **cherry-pick**.
