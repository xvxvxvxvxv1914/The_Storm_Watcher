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

---

## 6. B2B API Product — Aurora & Space Weather Data as a Service
**Priority: Medium — Future Revenue Stream**
**Goal:** Sell processed, value-added space weather data to businesses that need aurora forecasting but don't want to deal with raw NOAA/NASA APIs directly.

### Legal basis:
- NOAA, NASA and GFZ Potsdam data is publicly available and free for commercial use
- We CANNOT sell the raw data or claim it as ours
- We CAN sell: processing, aggregation, formatting, alerts, history, and derived metrics
- Always attribute data sources in API responses (e.g. "source": "NOAA SWPC")

### What the API product should offer (differentiators from free NOAA):

**Endpoint 1: Aurora Probability Score**
- GET /api/v1/aurora?lat=68.5&lon=27.3
- Returns a single 0-100 probability score for a specific GPS coordinate
- Combines Kp index + Bz component + solar wind speed + cloud cover + magnetic latitude + darkness window
- NOAA does not offer this — it's our own calculation

**Endpoint 2: Geomagnetic Storm Alerts (Webhook)**
- POST /api/v1/alerts/subscribe
- Client registers a webhook URL + threshold (e.g. Kp > 5)
- We fire a POST to their webhook when conditions are met
- NOAA has email alerts but no webhook/API alerts

**Endpoint 3: Aggregated Real-Time Feed**
- GET /api/v1/realtime
- Returns combined data from NOAA + GFZ Potsdam + NIGGG Panagyurishte in one clean JSON response
- Saves clients from hitting 3 separate APIs and merging data themselves

**Endpoint 4: Historical Archive**
- GET /api/v1/history?start=2024-01-01&end=2024-12-31&metric=kp
- NOAA keeps limited rolling history — we store everything in Supabase permanently
- Aurora tour operators need historical data to plan seasons and market their trips

**Endpoint 5: Location-based Visibility Forecast**
- GET /api/v1/forecast?lat=69.6&lon=18.9&days=3
- 3-day aurora visibility forecast for a specific location
- Combines space weather forecast + weather forecast (cloud cover) + sunrise/sunset times

### Target customers:
- Aurora tour operators in Norway, Finland, Sweden, Iceland (Hurtigruten, Lights over Lapland, etc.)
- Hotels and resorts in the auroral belt that want to offer aurora alerts to guests
- Travel apps and booking platforms (Airbnb Experiences, GetYourGuide)
- Mobile app developers who want aurora data without building the infrastructure
- Research institutions that need aggregated real-time data
- Insurance companies assessing geomagnetic storm risk for satellites/power grids

### Pricing model:
- Free tier: 100 API calls/month (for developers to test)
- Starter: $49/month — 10,000 calls/month, real-time + forecast endpoints
- Business: $199/month — 100,000 calls/month, all endpoints + webhooks + history
- Enterprise: custom pricing — SLA, dedicated support, white-label option

### Technical implementation (when ready):
- Create api/v1/ folder with Vercel serverless functions
- Use Supabase for storing historical data and API keys
- Implement API key authentication (generate key on signup, validate on each request)
- Add rate limiting per API key using Supabase or Upstash Redis
- Build a simple developer dashboard at /developers showing usage, docs, and key management
- Use Stripe to gate access by plan (already planned for main app)
- Write OpenAPI/Swagger documentation at /api/docs
- Add "For Developers" link in the footer

### First step when ready to implement:
1. Create a simple /developers landing page explaining the API
2. Add a waitlist form (just email collection) to gauge interest before building
3. Reach out directly to 5-10 aurora tour operators in Scandinavia with a cold email offering beta access
4. Only build the full API after confirming at least 3 paying customers
