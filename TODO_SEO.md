# SEO TODO List

## 1. FAQ Page — Keyword-Rich Content Expansion
**Priority: High**
**Goal:** The /faq page is the biggest organic SEO opportunity. Aurora chasers search for specific questions — we need to own those results.

### What to do:
- Open src/pages/FAQ.tsx
- Add at least 10-15 new questions covering these high-volume search topics:
  - "What is the Kp index?" — explain the scale 0-9, what each level means for aurora visibility
  - "What Kp do I need to see the northern lights?" — by latitude (Norway, Finland, Sweden, Scotland, Germany, etc.)
  - "What is a geomagnetic storm?" — G1-G5 scale explanation
  - "What is Bz and why does it matter for aurora?" — negative Bz = better aurora
  - "What is solar wind speed and how does it affect aurora?"
  - "What is an X-ray solar flare?" — C/M/X class explanation
  - "What is a CME (coronal mass ejection)?"
  - "When is the best time to see the northern lights?" — season, time of night, solar cycle
  - "Can I see aurora from [country]?" — cover Norway, Sweden, Finland, Iceland, Scotland, Canada, USA (Alaska, northern states)
  - "What is the aurora oval?"
  - "Why can't I see aurora even when Kp is high?" — cloud cover, light pollution, magnetic latitude vs geographic latitude
  - "What is magnetic latitude vs geographic latitude?"
  - "How do I get aurora alerts on my phone?"
  - "What is space weather?"
  - "What causes the northern lights?"
- Make sure each answer is 3-5 sentences minimum — long enough to be useful, short enough to stay focused
- Add the new Q&A to the existing FAQPage JSON-LD structured data in the page so Google shows rich snippets
- After adding all questions, run: npm run build:ssg
- Then commit: git add prerendered/faq/index.html src/pages/FAQ.tsx && git commit -m "seo: expand FAQ with 15 keyword-rich aurora and space weather questions" && git push

---

## 2. Multilingual SEO — Scandinavian & Northern European Languages
**Priority: High**
**Goal:** Aurora chasers in Norway, Sweden, Finland are the primary growth market. They search in their own language.

### What to do:
- Check the existing i18n files in src/locales/ (or wherever translation files are stored)
- For each of these languages: Norwegian (no), Swedish (sv), Finnish (fi), and also improve existing German (de)
- Make sure these pages have fully translated and unique meta titles + descriptions:
  - / (Home)
  - /aurora
  - /forecast
  - /faq
  - /alerts
  - /about
- The hreflang tags already exist in the codebase — verify they point to correct URLs
- Currently hreflang uses ?lang=xx query params — verify this is working correctly or switch to subpath routing if needed (/no/, /sv/ etc.)
- After translations are updated, run: npm run build:ssg
- Commit: git add prerendered/ src/locales/ && git commit -m "seo: improve multilingual meta tags for Norwegian, Swedish, Finnish" && git push

---

## 3. Backlinks — Community & Organic Link Building
**Priority: Medium**
**Goal:** Get high-quality inbound links from aurora and space weather communities. One link from a trusted domain (university, government weather site, popular forum) is worth 100 small ones.

### What to do (manual outreach — not code):
- **Reddit:**
  - Post in r/aurora — share a useful feature (e.g. the Kp alert system, the magnetometer data)
  - Post in r/space and r/SpaceWeather
  - Don't spam — post genuinely useful content with a link to the relevant page
- **Aurora photography communities:**
  - Facebook groups: "Aurora Hunters", "Northern Lights Photos"
  - Instagram: tag aurora photographers, offer the tool as a resource
- **Blogs & travel sites:**
  - Reach out to Scandinavian travel bloggers who write about aurora tourism
  - Offer a short guest post or tool mention in exchange for a link
- **Scientific community:**
  - Contact the Bulgarian Academy of Sciences (Panagyurishte station) — they may link to the site since it uses their data
  - Contact GFZ Potsdam — same reason
- **App directories:**
  - Submit to Product Hunt
  - Submit to AlternativeTo.net (list as alternative to SpaceWeatherLive, AuroraMe, etc.)
  - Submit to Capterra or similar SaaS directories

---

## 4. Google Search Console — Monitor & Act
**Priority: Ongoing**
**Goal:** Use the data to find quick wins.

### What to do (check every 2 weeks):
- Go to search.google.com/search-console
- Check "Ефективност" (Performance) → look at which queries bring impressions but low clicks (CTR < 3%) → improve the meta title/description for those pages
- Check "Страници" (Pages) → look for pages with "Открити — в момента не е индексирано" status → investigate why
- Check "Основни показатели" (Core Web Vitals) → fix any pages marked as Poor
- Use "Проверка на URL адрес" to request indexing for any new or updated pages
- After any significant content change, always run: npm run build:ssg && git push

---

## 5. Content Pages — Long-form SEO Articles (Future)
**Priority: Low — Future**
**Goal:** Create standalone content pages that rank for informational queries.

### What to do (future work, not urgent):
- Create /blog or /guides section
- Write long-form articles (800-1500 words each):
  - "Aurora Forecast Norway 2026 — Best Locations and Viewing Tips"
  - "Understanding the Kp Index — Complete Guide for Aurora Chasers"
  - "Geomagnetic Storm May 2024 — What Happened and What to Expect Next"
  - "Aurora Borealis vs Aurora Australis — What's the Difference?"
- Each article should use the PageMeta component with a unique title and description
- Add each new article to public/sitemap.xml
- After adding articles, run: npm run build:ssg && git push
