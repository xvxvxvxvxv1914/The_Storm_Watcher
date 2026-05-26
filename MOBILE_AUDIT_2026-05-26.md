# 📱 The Storm Watcher — Mobile Audit (iOS + Android)

**Дата:** 2026-05-26
**Версии:** iOS 1.0 (build 1) · Android versionCode 1, versionName 1.0
**Capacitor:** 8.3.1
**App ID:** `com.stormwatcher.app`
**Target:** Apple App Store + Google Play
**Одитор:** Claude Opus 4.7

---

## 🎯 Резюме

Приложението е **PWA през Capacitor wrapper** — целият UI е web-base, native кодът е тънък слой (iOS widget + AppDelegate background refresh; Android няма native код).

**Реална оценка:**

| Категория | Оценка | Коментар |
|---|---|---|
| 🔴 **Критични crash-ове** | 1/10 | Приложението crash-ва при стартиране на iOS (Notification API) |
| 🟠 **Сигурност** | 6/10 | OK защита, но липсват certificate pinning, jailbreak detection, secure storage |
| 🟡 **UX / Mobile-first** | 6/10 | Tab bar OK, но липсват haptics, pull-to-refresh, native gestures |
| 🟡 **Performance** | 5/10 | Bundle = 503K root + 1.2M globe — твърде голям за мобилен първи зареждане |
| 🔴 **Store Readiness** | 3/10 | Apple/Google ще отхвърлят (no IAP, no privacy manifest, no app icons set, version=1.0 build=1) |
| 🟢 **Native bridge** | 7/10 | Капацитор настроен правилно, iOS widget работи перфектно |
| 🟢 **Architecture** | 8/10 | Чисто разделение, lazy loading, code splitting |

**Общо:** Приложението не е готово за production. Има **1 критичен crash bug** и около **10 store-blocker** issue-та преди да може да се submit-не за ревю.

---

## 🚨 Намерени проблеми по приоритет

### 🔴 CRITICAL (must-fix преди следващ build)

#### C1. iOS WKWebView crash: `ReferenceError: Can't find variable: Notification`
**Файлове:** [src/hooks/useKpAlert.ts:18](src/hooks/useKpAlert.ts#L18), [src/components/KpAlertPrompt.tsx:19,40,42](src/components/KpAlertPrompt.tsx#L19), [src/components/PushNotificationBell.tsx:14,27](src/components/PushNotificationBell.tsx#L14)

`useKpAlert()` се извиква на App boot ([src/App.tsx:51](src/App.tsx#L51)) и достъпва `Notification.permission` без guard. iOS WKWebView **няма Web Notification API** → приложението crash-ва на splash екрана.

`KpAlertPrompt` използва `isSupported` guard на effect-а, **но `handleEnable` извиква `new Notification(...)` без guard** — ще crash-не ако някак достигне.

**Fix:**
```ts
// src/hooks/useKpAlert.ts
useEffect(() => {
  if (typeof Notification === 'undefined') return;     // ← guard
  if (Notification.permission !== 'granted') return;
  // ...
}, []);
```

И в `KpAlertPrompt.handleEnable` — guard преди `new Notification(...)`.

**Алтернатива по-добра:** изнеси Web Notification зад `isWebPushSupported()` хелпър и за iOS native използвай `@capacitor/push-notifications` + APNs.

---

#### C2. Apple/Google IAP не е имплементиран — Store rejection
**Контекст:** [CLAUDE.md](CLAUDE.md) — TODO раздел.

Stripe плащанията работят само за уеб. `VITE_PAYMENTS_ENABLED=false` на mobile, така че сега `/pricing` показва всичко безплатно. Apple **ще rejectне** на A2.1 ("apps that unlock features...must use IAP") и Google също.

**Решения:**
1. Скрий `/pricing` маршрута изцяло за native (по `Capacitor.isNativePlatform()`)
2. Или имплементирай `@capacitor-community/in-app-purchase-2` + Apple StoreKit2 + Google Play Billing
3. Supabase Edge Function за receipt validation → sync `profiles.plan`

---

#### C3. App version = 1.0 / build = 1 — едно и също за all builds
**iOS:** `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` (xcodeproj)
**Android:** [android/app/build.gradle:11-12](android/app/build.gradle#L11) → `versionCode 1`, `versionName "1.0"`

При нов upload в App Store Connect / Play Console ще получим грешка "build with this version already exists". Преди първи production submit увеличи и двете и въведи semver scheme.

---

#### C4. Липсва Privacy Manifest за iOS (задължителен от Apple от май 2024)
**Файл:** Няма `ios/App/App/PrivacyInfo.xcprivacy`

Apple **отхвърля** apps без `PrivacyInfo.xcprivacy`, който декларира:
- Required Reason API usage (UserDefaults, FileTimestamp, SystemBootTime, DiskSpace)
- Tracking domains
- Data collection (имейли, location, photos)

Виж: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files

---

#### C5. Android — `targetSdk = 34`, Google изисква 35+ (от Aug 2025)
**Файл:** [android/variables.gradle:4](android/variables.gradle#L4)

`targetSdkVersion = 34` беше валидно до август 2025. Сега Play Console **блокира** ъплоудване на нови apps с targetSdk < 35. Update на 35 и тествай AndroidManifest behavior промените (foreground services, photo picker, etc.).

---

### 🟠 HIGH (преди първи production push)

#### H1. iOS Info.plist `LSRequiresIPhoneOS` без `UIDeviceFamily` за iPad
[ios/App/App/Info.plist:25,32](ios/App/App/Info.plist#L25)

`UIRequiredDeviceCapabilities = arm64` е добре, но няма `UIDeviceFamily`. Сега ще се появи и на iPad с iPhone scaling. Реши:
- Ако искаш само iPhone: `<key>UIDeviceFamily</key><array><integer>1</integer></array>`
- Ако искаш iPad native: добави iPad screenshot-и в App Store Connect, тествай landscape

#### H2. Android `allowBackup="false"` но няма `dataExtractionRules`
[android/app/src/main/AndroidManifest.xml:4](android/app/src/main/AndroidManifest.xml#L4)

От Android 12+ има нов API — `android:dataExtractionRules`. С `allowBackup="false"` потребителите ще загубят локални предпочитания при device migration. Помисли да го пуснеш с правила:
```xml
<application
    android:dataExtractionRules="@xml/data_extraction_rules"
    android:fullBackupContent="@xml/backup_rules"
    ...>
```

#### H3. Android няма network_security_config.xml
Best practice е да се добави `xml/network_security_config.xml` с certificate pinning и ATS-like политика. Apple вече има (ATS in Info.plist), Android няма.

#### H4. Native splash duration = 0 — flash на бяло
[capacitor.config.ts:19](capacitor.config.ts#L19) — `launchShowDuration: 0`

Native iOS splash се скрива моментално и [SplashAnimation.tsx](src/components/SplashAnimation.tsx) поема. Но между двете може да има 1 frame бяло (зависи от device). По-добре:
```ts
SplashScreen: {
  launchShowDuration: 1500,
  launchAutoHide: true,  // или скрий ръчно когато React-а е готов
  backgroundColor: '#0a0a1a',
}
```

И премахни `import('@capacitor/splash-screen').then(SplashScreen.hide)` от `SplashAnimation.tsx` — или го направи conditional.

#### H5. iOS `LaunchScreen.storyboard` използва `retina4_7` device
[ios/App/App/Base.lproj/LaunchScreen.storyboard:3](ios/App/App/Base.lproj/LaunchScreen.storyboard#L3)

`retina4_7` (iPhone 8) е legacy — на iPhone 15/16 ще има letterboxing. Update на iPhone 15 device + autolayout constraints.

#### H6. Push notifications работят САМО докато tab/app е отворен
[src/hooks/useKpAlert.ts:9-46](src/hooks/useKpAlert.ts) — `setInterval` polling всеки 5 мин

Web Notifications в WKWebView/Android Chrome не са истински push — те fire-ват само ако app-а е foreground. За истински storm alerts когато телефонът е заключен трябва:
- **iOS:** `@capacitor/push-notifications` + APNs + Supabase Edge Function който прави APNs HTTP/2 request
- **Android:** FCM (Firebase Cloud Messaging) — google-services.json се checkва в build.gradle, но не е добавен още
- Регистрирай device tokens в `push_subscriptions` таблицата (вече я има!)
- Storm cron (`api/cron/storm-alert.ts`) праща и към APNs/FCM, не само web push

#### H7. Тъмен splash на iOS не подкрепя light theme
[ios/App/App/Base.lproj/LaunchScreen.storyboard:3](ios/App/App/Base.lproj/LaunchScreen.storyboard#L3) — `appearance="light"`

Storyboard е дефиниран със светъл фон, но `Info.plist` няма `UIUserInterfaceStyle` lock. Иска или dark-locked, или адаптивен (с Color Assets за `colorPrimary`).

#### H8. Android има само 1 set от splash drawables за всички DPI комбинации
26 drawable папки (port/land/night/varying DPI). Това е default Capacitor template. Виж `android/app/src/main/res/drawable-*/splash.png` — ако са просто `@capacitor/assets` generated, провери дали maskable иконата е правилна (повечето device-и cropват по различен начин).

---

### 🟡 MEDIUM (важни за UX и quality)

#### M1. Липсва Haptic Feedback на критични actions
Никъде не виждам `Haptics.impact()`. Tab bar натискане, "Add to gallery", "Submit aurora sighting" — всички тези заслужават haptic. Добави `@capacitor/haptics`:
```ts
import { Haptics, ImpactStyle } from '@capacitor/haptics';
await Haptics.impact({ style: ImpactStyle.Medium });
```

#### M2. Липсва Pull-to-Refresh
Class native iOS/Android UX. На Dashboard, Forecast, Aurora — pull надолу да refresh-не данните. Може и с pure React (touch events + transform) или с библиотека.

#### M3. Status bar overlay не се променя според страница
[capacitor.config.ts:14](capacitor.config.ts#L14) — статичен `style: 'dark'`, `backgroundColor: '#0a0a1a'`

При theme toggle (light/dark) status bar остава тъмен → недобър contrast. Промени с `StatusBar.setStyle()` при `useTheme` промяна.

#### M4. Bottom Tab Bar — close button = 40px (под 44px минимума на Apple HIG)
[src/components/BottomTabBar.tsx:163](src/components/BottomTabBar.tsx#L163) — `w-10 h-10`

Apple HIG: минимум **44x44pt** touch target. Същото за Material Design = 48dp. Огледай:
- Close button в more sheet → 44x44
- Lang switcher icon (vermillion w-4 h-4 — само icon-а, целият бутон може да е по-голям)

#### M5. Tab bar tabs имат `min-w-[64px]` но иконите са центрирани с малък click area
[src/components/BottomTabBar.tsx:112,131](src/components/BottomTabBar.tsx#L112)

`py-1.5` = малка vertical hit area. Изпробвай поне `py-2.5` за по-лесно tap-ване.

#### M6. Swipe navigation order не покрива всички tab-ове
[src/hooks/useSwipeNavigation.ts:4-11](src/hooks/useSwipeNavigation.ts#L4) — само 6 routes

Tab bar има 5 главни (Home, Dashboard, Forecast, Aurora, More). Swipe order пропуска `/alerts` и `/mood` за някои потребители ще е объркващо. Уеднакви с tab bar или го изключи и разчитай само на back/forward.

#### M7. Swipe nav не подава `direction` за page transition
[src/hooks/useSwipeNavigation.ts:45-48](src/hooks/useSwipeNavigation.ts#L45)

Подава `state: { direction: 'left' }`, но в `AnimatedRoutes`/`AnimatedPage` не виждам да се чете. Резултат: swipe не показва page slide анимация — само jump.

#### M8. Липсва "Back Gesture" handling за iOS edge swipe
По default iOS поддържа edge swipe back. WKWebView с React Router не interfere-ра, но след swipe от ляво edge-а `useSwipeNavigation.handleTouchStart` връща веднага (`< 30`). OK. Обаче ако се навигира с router-а в long stack (например `/dashboard` → `/aurora` → `/gallery`), iOS gesture не работи защото няма native UINavigationController. Помисли за `@capacitor-community/ios-native-back-gesture` или ръчна имплементация.

#### M9. Network requests нямат retry / offline detection
По всички services виждам fetch без retry. На мобилно (3G/5G drop, walking out of WiFi) request-ите ще fail-нат. Direct fix: `fetch-retry` wrapper или axios-retry. По-добре: глобален "offline" banner когато `navigator.onLine === false`.

#### M10. Service worker `update on reload` не работи добре в Capacitor
[src/main.tsx:10](src/main.tsx#L10) — `registerSW({ immediate: true })`

На native, файловете се сервират от `capacitor://localhost` — SW работи, но reload-ите не са същите като в browser. Тествай дали `CHUNK_LOAD_FAILED` recovery [src/main.tsx:17-32](src/main.tsx#L17) изобщо trigger-ва на native (probably не).

#### M11. `globe-vendor` = 1.2MB JS — мобилен disaster
[dist/assets/globe-vendor-D7sP2iDG.js](dist/assets/globe-vendor-D7sP2iDG.js)

Aurora page chunks: `globe-vendor` 1.2M + `three-vendor` 566K = **~1.8MB JS** за една страница. На 4G ще зареди за 5-10 сек. Решения:
- Lazy load Aurora globe **след първото painting** (placeholder първо, тогава Three.js)
- Compress with brotli (Vercel прави автоматично, но провери)
- За native (Capacitor) → файловете са локални, проблемът е само за PWA

#### M12. `FAQ` chunk = 202K (вкл. 204K [faqContent.ts](src/content/faqContent.ts))
204K JSON-like съдържание във всичките 16 езика се embed-ва в bundle-а. Решение:
- Lazy-load само текущия език от `/content/faq-{lang}.json` runtime
- Или раздели в 16 chunks с manual `import()`

#### M13. Locale файлове общо ~50K × 16 = 800K JS за всички езици
[dist/assets/](dist/assets/) — `bg-CpGImKd_.js` (69K), `ru-DIEOu1Pe.js` (70K), `uk-vEnQ553f.js` (65K)...

Това е OK ако lazy-load работи (всеки потребител зарежда само своя). Провери че `LanguageContext` използва `import()` динамично и не имрортва всичките.

#### M14. Geolocation request prompt качество
13 страници викат `navigator.geolocation` директно. На iOS native ще покаже native permission prompt (защото `NSLocationWhenInUseUsageDescription` е сетнат), но wrapping в Capacitor може да изисква `@capacitor/geolocation`. Сега виждам, че директно се вика `navigator.geolocation` — провери в реален device дали permission prompt-ът се появява правилно.

#### M15. Camera permission е поискан но камера не се ползва
[ios/App/App/Info.plist:37](ios/App/App/Info.plist#L37) — `NSCameraUsageDescription`

В кода никъде не виждам `getUserMedia` или `@capacitor/camera`. Gallery upload използва `<input type="file">`. Apple ще пита защо иска camera permission. Решения:
- Или премахни описанието
- Или имплементирай "Take photo" бутон в Gallery с `@capacitor/camera`

#### M16. iOS support за tablet portrait-upside-down — само за iPad
[ios/App/App/Info.plist:50-62](ios/App/App/Info.plist#L50)

iPhone няма `PortraitUpsideDown` (по дизайн). Reasonable.

#### M17. Липсва deep linking за специфични storm events
[src/App.tsx:73-82](src/App.tsx#L73) — `stormwatcher://dashboard` работи, но не и `stormwatcher://event/CME-2026-05-26`
За marketing/push notifications с storm events deep linking е essential.

#### M18. Не виждам `@capacitor/app-launcher` или App State listener за foreground refresh
Когато потребителят отваря приложението от background, данните остават stale. Добави:
```ts
CapApp.addListener('appStateChange', ({ isActive }) => {
  if (isActive) refreshAllData();
});
```

#### M19. Не виждам Capacitor Plugin за offline storage синхронизация
Storm alerts, favorite locations — всичко е в Supabase. Ако offline, потребителят не вижда нищо. Добави `@capacitor/preferences` за cached snapshots на най-важните данни (last Kp, last forecast).

#### M20. Sentry maskAllText: true ще скрие всичко в screen recordings
[src/main.tsx:41-45](src/main.tsx#L41)

Това е GDPR-correct, но дебъг-вирането става невъзможно (всичкият текст е блок). Подмени с allow-list за DOM-elements които *не* съдържат лични данни (тoо като Kp graph values, button labels).

#### M21. Sentry не разпознава iOS native errors (само web)
React Sentry hooks само JS грешките. За native iOS Swift code (AppDelegate background tasks, widget) трябва **Sentry Cocoa SDK** интегриран в Xcode проекта. Без него native crash-овете изчезват в етера.

#### M22. iOS widget background task interval = 15 min, но system често skip-ва
[ios/App/App/AppDelegate.swift:60](ios/App/App/AppDelegate.swift#L60)

`BGAppRefreshTaskRequest.earliestBeginDate = 15 min` — това е минимум, реалното време може да е 1-2 часа. iOS може и да изключи task-а изцяло ако потребителят рядко отваря приложението. Това е iOS-restriction, но добавите fallback: ако `widget_updated` е > 1 час, widget показва "Tap to refresh".

#### M23. Widget показва `widget_updated` от 90 sec maxAge — твърде кратко
[ios/App/StormWidget/StormWidget.swift:5](ios/App/StormWidget/StormWidget.swift#L5) — `sharedDataMaxAge: 90`

90 sec значи widget-ът ще show "no data" almost веднага. Reasonable стойност е 5-10 min, защото iOS Background refresh е unreliable.

---

### 🔵 LOW (polish / nice-to-have)

#### L1. Tab bar има 5 tabs (4 + More) — Apple HIG препоръчва max 5 visible
✅ Текущото е fine

#### L2. `useSwipeNavigation` използва `document` listeners — не e cleaned up при unmount на child
Минорна проблем — leak на listeners при бързо routing.

#### L3. Theme color в iOS Info.plist различно от splash
StatusBar `backgroundColor: '#0a0a1a'` но `theme-color` в index.html също `#0a0a1a` ✅

#### L4. Splash icon — `Sun` lucide-react SVG показан в SplashAnimation
[src/components/SplashAnimation.tsx:67](src/components/SplashAnimation.tsx#L67)

Това е WEB splash. Native splash на iOS показва `splash.png` от `LaunchScreen.storyboard`. Двете може да са различни. Преглед: visually проверете в device.

#### L5. Липсват App Store Screenshots в правилни sizes
Apple изисква: 6.7" (1290×2796), 6.5", 5.5" — освен ако активирате scaling.

#### L6. Липсва iOS App Clip / Android Instant App
Тип "preview" преди download. Optional но добавя discoverability.

#### L7. `index.html` препроцесира `apple-mobile-web-app-capable` (deprecated → `mobile-web-app-capable`)
[index.html:9](index.html#L9)

W3C: `apple-mobile-web-app-capable` е deprecated в полза на `mobile-web-app-capable`. Добави и него.

#### L8. PWA shortcuts (`manifest.json`) — само Dashboard и Forecast
[public/manifest.json:32-44](public/manifest.json#L32)

Добави още — `Aurora`, `Alerts`, `Mood`.

#### L9. PWA icons — само 192 (any) + 512 (maskable). Липсва 512 (any) и 1024
Apple Touch Icon също не виждам в HTML.

#### L10. Splash има 2.6s timer hard-coded
[src/App.tsx:47](src/App.tsx#L47)

`2600ms` независимо от device speed. Подмени с "splash hide когато data is ready" pattern.

#### L11. iOS widget използва hard-coded language list (7 езика)
[ios/App/StormWidget/StormWidget.swift:30](ios/App/StormWidget/StormWidget.swift#L30) — `["bg", "de", "es", "fr", "ja", "ru", "zh"]`

Уеб apprupp поддържа 16 езика. Widget-ът пропуска da, fi, is, ko, no, pl, sv, uk. Добави още.

#### L12. Android `largeHeap="true"` — не е оптимално
[android/app/src/main/AndroidManifest.xml:11](android/app/src/main/AndroidManifest.xml#L11)

WebView с Three.js може да изисква heap, но изпробвайте без него — щом не crash-ва, премахнете.

---

## 🎨 Препоръки за дизайн (UI/UX modernization)

### D1. Native-feeling page transitions
Сега Framer Motion прави fade transitions. Native iOS е slide-from-right с back-swipe gesture. По-добре:
- `framer-motion` + `useSwipeNavigation` синхронизирани
- Или go full-native с Capacitor + react-native-navigation alternatives

### D2. Bottom sheet (More menu) — добави drag gesture
Сега More sheet се закрива само с tap отвън. Native iOS sheets поддържат drag-down-to-dismiss. Добави с `framer-motion` `drag="y"` + `dragConstraints`.

### D3. SwipeActions на list items
В Gallery, Mood entries, Favorites — swipe left за delete (iOS Mail style). Native UX. Импл с `framer-motion`.

### D4. Tab bar icon animations при switch
Tap → icon scale 1.0 → 1.15 → 1.0 + haptic. Бързо visual feedback.

### D5. Aurora page — full-screen immersive mode
Когато потребителят гледа Globe, скрий tab bar + status bar overlay. "Cinema mode" experience.

### D6. Storm alert design — modernize
Сега тяхно `alert-storm-bar.tsx` (предполагам). Направи го с pulse animation и haptic feedback при появяване (само за първи път на новия storm).

### D7. Onboarding tour (react-joyride) — replace with native carousel
react-joyride е web-like overlay. Native apps използват swipe-able cards с illustrations. iOS first-launch experience.

### D8. Empty states — illustrations вместо текст
"No gallery photos yet" → SVG illustration на празна галерия + CTA button.

### D9. Skeleton loaders ВМЕСТО spinners
Поне виждам че `Skeleton` файл съществува. Провери че е използван навсякъде където зарежда async data.

### D10. Dark mode варианти на splash и status bar
Сега всичко е тъмно. Light theme потребителят ще види dark splash → jarring transition. Color Assets с dark/light в Xcode + theme-color media query в index.html.

### D11. Typography size optimization
Body text 14px е добре, но `text-[10px]` за tab labels е малко при low vision. Apple HIG препоръчва **17pt** base (≈ 17px). Виж secondary текстове.

### D12. Aurora visibility map — pinch-to-zoom + interactive markers
Heatmap сега изглежда статичен. Native UX = pinch-zoom, tap markers за detail.

---

## 🚀 Нови фийчъри за добавяне

### F1. Sound effects при storm alerts (opt-in)
Когато Kp ≥ 6 (G2 storm), play short notification sound (Capacitor `Howler.js` lib или native `AVAudioPlayer`).

### F2. Aurora forecast notifications със смарт timing
"Tonight 22:00-02:00 — Kp 5.8 forecast — clear skies in your area. Want to be reminded?"
Computer learning от user behavior (натиска ли accept-те notifications).

### F3. Live activities (iOS Dynamic Island)
По време на active storm, показвай Kp index в Dynamic Island (iPhone 14 Pro+). Need: `ActivityKit` + `@livekit/capacitor-live-activities`.

### F4. Apple Watch companion app
Native watchOS app showing Kp index. Streams data from main app via WatchConnectivity. Това е "wow factor" feature.

### F5. AR mode — point phone at sky to see aurora prediction overlay
ARKit (iOS) + ARCore (Android). Use compass + altitude → calculate where aurora *would* appear → overlay green wave на camera feed.

### F6. Photo geotagging + "Aurora seen here" pins map
Когато юзърът ъплоадне снимка от aurora, ако има EXIF GPS, постави pin на community map. Виж други sightings от close-by потребители.

### F7. Weekly aurora report email/push
"This week: 2 G1 storms, best viewing window Thursday 22:00, your magnetic latitude 64°N gives 78% chance." Personalized, drives engagement.

### F8. Social sharing — "I saw the aurora!" with timestamp + Kp
Auto-generate shareable image with Kp value, location, time. Use existing `generateStormImage.ts`.

### F9. Favorite locations + multi-location forecast
Сега има само 1 preferred location. Pro feature: ≥5 saved spots с notifications per location.

### F10. Calendar export — добави forecast events към native calendar
"G2 storm forecast 2026-05-30 22:00" → tap → add to iOS Calendar / Google Calendar. Native plugin: `@ionic-native/calendar`.

### F11. Widget — interactive Kp graph (iOS 17+)
WidgetKit `Button` widgets (iOS 17+) — tap widget → directly open Dashboard. Сега виждам StormWidget показва само static info.

### F12. Solar wind sonification
"Listen" to the solar wind — convert proton flux to audio frequency. Niche but cool, viral на social.

### F13. Community chat / forum за aurora hunters
"Reports from Finland tonight" thread. Push notifications when someone in your area posts. Може и Reddit-like.

### F14. Photography tips / camera settings помощник
"For Kp 5.5 storm — try ISO 1600, f/2.8, 8s exposure". Помощник за photo enthusiasts.

### F15. Magnetic compass calibration
Native `@capacitor/motion` API — show real magnetic field strength измервания (паралел с NIGGG data).

### F16. Stargazing dark sky map
Pollution overlay → "Drive 30km north for darker skies". Bortle scale calculations.

### F17. Aurora streaks tracker
Колко поредни нощи юзърът е видял aurora. Gamification.

### F18. Educational interactive content
3D model на Earth's magnetic field + interactive solar storm animation. Education market.

---

## 🔒 Security checklist

- [ ] **Certificate pinning** за Supabase и NOAA — protect от MITM
- [ ] **Jailbreak/root detection** за payment-critical действия (`@capacitor-community/jailbreak-root-detection`)
- [ ] **Secure storage** за auth tokens — сега в localStorage, на native трябва Keychain/EncryptedSharedPreferences (`@capacitor-community/secure-storage`)
- [ ] **App Transport Security** — iOS вече `NSAllowsArbitraryLoads = false` ✅
- [ ] **Android network_security_config.xml** — не е настроен ❌
- [ ] **Privacy Manifest** (PrivacyInfo.xcprivacy) — не е настроен ❌
- [ ] **GDPR consent** — `CookieConsent` компонент има, но на native cookies не са същата концепция → промени на "Privacy & Analytics Consent"
- [ ] **Crash reporting на iOS native** — Sentry Cocoa SDK ❌
- [ ] **Code obfuscation** — Android `minifyEnabled true` ✅ (но провери proguard-rules.pro)
- [ ] **Anti-tampering** за iOS .ipa — не е критично освен ако IAP е добавен

---

## 📊 Performance optimizations

### P1. Lazy-load globe-vendor САМО когато Aurora page е visited
Now тя е в `manualChunks` → когато потребителят отвори Aurora, чака 1.8MB JS. Решение: split в Aurora component:
```ts
const Globe = lazy(() => import('react-globe.gl'));
```
+ Show spinner with "Loading 3D globe..." message.

### P2. Tree-shake `three` — използваш само subset от mesh, light, geometry
`three` = 566K. Реално ползваш Earth sphere + aurora lines. Може с `three/build/three.module.js` cherry-pick imports.

### P3. Replace `react-globe.gl` with leaner solution за mobile
Има по-малки 3D глобуси (`globe-1px`, custom Canvas2D drawing). Може и WebGL без Three.js layer.

### P4. Image optimization
Provide `srcset` + WebP/AVIF за gallery thumbnails. Cloudflare Images или Vercel `next/image` for transformation.

### P5. Reduce locale bundle size
Provider-side translation truncation — мобилно потребители рядко използват FAQ извън своя език. Lazy-load FAQ content per language.

### P6. Pre-load critical resources с `<link rel="preload">`
Виждам само `noaa.gov` Kp index preload. Добави и Supabase auth endpoint.

### P7. Service worker не precaches `/api/*` правилно за native
`NetworkFirst` за NOAA — добре. Но в Capacitor SW работи различно. Помисли да изключиш SW изцяло на native:
```ts
// main.tsx
if (!('Capacitor' in window)) {
  registerSW({ immediate: true });
}
```

### P8. Reduce `index-*.js` root bundle
503K за initial = твърде много. Премести не-critical features (Sentry init, Vercel Analytics, OnboardingTour) в `requestIdleCallback`.

### P9. Initial render — skeleton homepage без data fetch
Сега Home чака API calls. Show static skeleton instantly, render Live numbers after.

### P10. Capacitor server URL — добави `server.androidScheme` for HTTPS

```ts
// capacitor.config.ts
server: {
  androidScheme: 'https',  // bypasses some Android quirks with file://
}
```

---

## 🗒️ Подобрения по съществуващи страници

### Dashboard
- Pull-to-refresh
- Add widget shortcut "Add to Home Screen" link
- Live tile с current Kp (animated)
- Hide bottom tab bar when scrolling down (mobile pattern)

### Forecast (Aurora 3-day)
- Tap на ден → full hour-by-hour breakdown
- Sentry заплахи: "Strong G2 storm Thursday — set reminder?"

### Aurora page
- Globe lazy-loaded with placeholder
- Add "View from your location" с tilt geolocation
- AR mode button (F5)

### Gallery
- Camera capture button (F6)
- Swipe-to-delete (D3)
- Pull-to-refresh
- Bottom navigation through photos

### Hunt
- Map view с pins (F6) for community sightings
- Live "spotters online now" indicator

### Settings
- Reorganize: Account → Privacy → Notifications → Display → About
- Add "Export my data" GDPR button
- Add "Delete account" CTA (вече има edge function, но провери че е UI)

### Auth
- Sign in with Apple (must for App Store)
- Sign in with Google (UX)
- Biometric unlock (`@capacitor-community/biometric-auth`)
- Magic link as default (better mobile UX than password)

### Profile
- Avatar upload (native camera picker)
- Subscription management redirect (но след IAP impl)

---

## 📋 Препоръчан Plan за утре

### Sprint 1 — CRITICAL (3-4 часа)
1. **Fix C1** — Notification API crash → guard всички occurrences + restart iOS app
2. **Fix C3** — Bump version → iOS Marketing Version 1.1, Android versionCode 2
3. **Fix C5** — Update Android `targetSdkVersion` to 35
4. **Add C4** — Create `PrivacyInfo.xcprivacy`

### Sprint 2 — HIGH (4-5 часа)
5. **Fix H1** — Add `UIDeviceFamily` (iPhone only) или iPad layout
6. **Fix H3** — Android `network_security_config.xml`
7. **Fix H4** — Splash duration polish
8. **Add H6** — Capacitor push notifications + FCM + APNs setup (без actual server send yet)
9. **Add Sentry Cocoa SDK** (M21)
10. **Add `@capacitor/haptics`** + integrate в tab bar (M1)

### Sprint 3 — MEDIUM (5-6 часа)
11. Add **pull-to-refresh** на Dashboard, Forecast, Aurora (M2)
12. **Status bar dynamic** style based on theme (M3)
13. **Touch target sizes** ≥ 44pt (M4)
14. **App State listener** for foreground refresh (M18)
15. **Bundle optimization** — lazy-load globe properly (P1)
16. **Camera capture** in Gallery (F6, M15)

### Sprint 4 — NEW FEATURES (1-2 дни)
17. **Sign in with Apple** (Auth, store requirement)
18. **Live Activities** for active storms (F3)
19. **Calendar export** for storm events (F10)
20. **AR mode prototype** (F5)
21. **Watch app** (F4)

### Sprint 5 — Store Submission Prep
22. **Privacy Manifest** ✅
23. **Screenshots** в правилни sizes
24. **App Store Connect listing** — keywords, description in 16 languages
25. **TestFlight beta** → 10 testers
26. **Play Store internal track**

---

## 🔗 Полезни референции

- Apple HIG: https://developer.apple.com/design/human-interface-guidelines/
- Material Design 3: https://m3.material.io/
- Capacitor docs: https://capacitorjs.com/docs
- Privacy Manifest: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files
- Android targetSDK requirements: https://developer.android.com/google/play/requirements/target-sdk
- StoreKit 2 (IAP): https://developer.apple.com/documentation/storekit
- Live Activities: https://developer.apple.com/design/human-interface-guidelines/live-activities

---

## 📌 Файл за справка утре

**Файл:** `MOBILE_AUDIT_2026-05-26.md`
**Общо находки:** 5 Critical · 8 High · 23 Medium · 12 Low · 12 Design · 18 Feature ideas · 10 Security · 10 Performance

**Първо действие при start утре:**
1. Fix C1 (Notification crash) — приложението сега не зарежда на iOS
2. Push нов iOS build
3. Тествай на устройство че splash → home screen работи
4. После върви по приоритетите
