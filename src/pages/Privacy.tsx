import PageMeta from '../components/PageMeta';
import { useLanguage } from '../contexts/LanguageContext';
import { Shield } from 'lucide-react';

type LangContent = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: { title: string; items?: string[]; text?: string }[];
};

const content: Record<string, LangContent> = {
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: May 2026',
    intro: "The Storm Watcher ('we', 'us', 'our') respects your privacy. This policy explains what data we collect, why, and how we protect it.",
    sections: [
      { title: 'Data We Collect', items: [
        'Account data: email address and display name when you create an account.',
        'Location preferences: your saved locations (city names and coordinates) stored locally on your device and optionally in your account.',
        'Mood logs: symptom and mood entries you submit voluntarily. These are linked to your account and used to generate your personal geomagnetic sensitivity profile.',
        'App settings: notification threshold, units preference, and language selection.',
        'Usage data: anonymous analytics to understand which features are used most (no personal identifiers).',
      ]},
      { title: 'How We Use Your Data', items: [
        'To provide and personalise the service (aurora alerts, mood tracking, location-based forecasts).',
        'To send push notifications when geomagnetic activity exceeds your chosen threshold.',
        'To improve the app based on aggregated, anonymous usage patterns.',
        'We do not sell your data to third parties.',
      ]},
      { title: 'Third-Party Services', items: [
        'Supabase (supabase.com) — authentication and database. Your account data is stored on Supabase servers in the EU region. Supabase is GDPR-compliant.',
        'NOAA Space Weather Prediction Center — space weather data. No personal data is sent to NOAA.',
        'NASA DONKI — solar event data. No personal data is sent to NASA.',
        'Open-Meteo — weather and UV data. Only your coordinates are sent to retrieve local forecasts.',
      ]},
      { title: 'Cookies & Local Storage', text: 'We use browser local storage to save your preferences (theme, language, location) on your device. We use minimal session cookies required for authentication. We do not use advertising or tracking cookies.' },
      { title: 'Data Retention', text: 'Your account data is retained as long as your account is active. You can delete your account at any time from the Profile page, which permanently removes all your data from our servers within 30 days.' },
      { title: 'Your Rights (GDPR)', text: 'If you are in the European Economic Area, you have the right to access, correct, or delete your personal data. You may also request data portability or restrict processing. Contact us at the email below to exercise these rights.' },
      { title: "Children's Privacy", text: 'The Storm Watcher is not directed at children under 13. We do not knowingly collect data from children.' },
      { title: 'Changes to This Policy', text: 'We may update this policy occasionally. We will notify registered users of significant changes via email.' },
      { title: 'Contact', text: 'For privacy questions, contact us at hello@thestormwatcher.com' },
    ],
  },
  bg: {
    title: 'Политика за поверителност',
    lastUpdated: 'Последна актуализация: май 2026 г.',
    intro: 'The Storm Watcher („ние", „нас", „наш") зачита вашата поверителност. Тази политика обяснява какви данни събираме, защо и как ги защитаваме.',
    sections: [
      { title: 'Данни, които събираме', items: [
        'Данни за акаунт: имейл адрес и показвано име при създаване на акаунт.',
        'Предпочитания за местоположение: запазените от вас местоположения (имена на градове и координати), съхранявани локално на устройството ви и по желание в акаунта ви.',
        'Дневници за настроение: записи за симптоми и настроение, които подавате доброволно. Те са свързани с акаунта ви и се използват за изграждане на личния ви профил на геомагнитна чувствителност.',
        'Настройки на приложението: праг за известия, предпочитание за мерни единици и избор на език.',
        'Данни за използване: анонимна аналитика за разбиране кои функции се използват най-много (без лични идентификатори).',
      ]},
      { title: 'Как използваме вашите данни', items: [
        'За предоставяне и персонализиране на услугата (сигнали за аврора, проследяване на настроението, прогнози по местоположение).',
        'За изпращане на push известия, когато геомагнитната активност надхвърли избрания от вас праг.',
        'За подобряване на приложението въз основа на обобщени анонимни модели на използване.',
        'Ние не продаваме вашите данни на трети страни.',
      ]},
      { title: 'Услуги на трети страни', items: [
        'Supabase (supabase.com) — удостоверяване и база данни. Данните за акаунта ви се съхраняват на сървъри на Supabase в ЕС региона. Supabase е в съответствие с GDPR.',
        'NOAA Център за прогнозиране на космическото време — данни за космическото време. Никакви лични данни не се изпращат до NOAA.',
        'NASA DONKI — данни за слънчеви събития. Никакви лични данни не се изпращат до NASA.',
        'Open-Meteo — данни за времето и UV. Само вашите координати се изпращат за извличане на местни прогнози.',
      ]},
      { title: 'Бисквитки и локално хранилище', text: 'Използваме локалното хранилище на браузъра, за да запазим предпочитанията ви (тема, език, местоположение) на устройството ви. Използваме минимални сесийни бисквитки, необходими за удостоверяване. Не използваме рекламни или проследяващи бисквитки.' },
      { title: 'Съхранение на данните', text: 'Данните за акаунта ви се съхраняват, докато акаунтът ви е активен. Можете да изтриете акаунта си по всяко време от страницата на профила, което окончателно премахва всичките ви данни от нашите сървъри в рамките на 30 дни.' },
      { title: 'Вашите права (GDPR)', text: 'Ако се намирате в Европейското икономическо пространство, имате право на достъп, коригиране или изтриване на личните си данни. Можете също да поискате преносимост на данни или ограничаване на обработването. Свържете се с нас на посочения по-долу имейл, за да упражните тези права.' },
      { title: 'Поверителност на деца', text: 'The Storm Watcher не е насочен към деца под 13 години. Ние не събираме съзнателно данни от деца.' },
      { title: 'Промени в тази политика', text: 'Може периодично да актуализираме тази политика. Ще уведомяваме регистрираните потребители за значителни промени по имейл.' },
      { title: 'Контакт', text: 'За въпроси относно поверителността се свържете с нас на hello@thestormwatcher.com' },
    ],
  },
  de: {
    title: 'Datenschutzerklärung',
    lastUpdated: 'Zuletzt aktualisiert: Mai 2026',
    intro: 'The Storm Watcher („wir", „uns", „unser") respektiert Ihre Privatsphäre. Diese Richtlinie erläutert, welche Daten wir erheben, warum und wie wir sie schützen.',
    sections: [
      { title: 'Daten, die wir erheben', items: [
        'Kontodaten: E-Mail-Adresse und Anzeigename bei der Kontoerstellung.',
        'Standortpräferenzen: Ihre gespeicherten Standorte (Städtenamen und Koordinaten), lokal auf Ihrem Gerät und optional in Ihrem Konto gespeichert.',
        'Stimmungsprotokolle: Symptom- und Stimmungseinträge, die Sie freiwillig übermitteln. Diese sind mit Ihrem Konto verknüpft und werden verwendet, um Ihr persönliches geomagnetisches Empfindlichkeitsprofil zu erstellen.',
        'App-Einstellungen: Benachrichtigungsschwellenwert, Einheitenpräferenz und Sprachauswahl.',
        'Nutzungsdaten: Anonyme Analysen, um zu verstehen, welche Funktionen am häufigsten genutzt werden (keine persönlichen Identifikatoren).',
      ]},
      { title: 'Wie wir Ihre Daten verwenden', items: [
        'Zur Bereitstellung und Personalisierung des Dienstes (Polarlichtwarnungen, Stimmungsverfolgung, standortbasierte Prognosen).',
        'Zum Senden von Push-Benachrichtigungen, wenn die geomagnetische Aktivität Ihren gewählten Schwellenwert überschreitet.',
        'Zur Verbesserung der App auf Basis aggregierter, anonymer Nutzungsmuster.',
        'Wir verkaufen Ihre Daten nicht an Dritte.',
      ]},
      { title: 'Drittanbieterdienste', items: [
        'Supabase (supabase.com) — Authentifizierung und Datenbank. Ihre Kontodaten werden auf Supabase-Servern in der EU-Region gespeichert. Supabase ist DSGVO-konform.',
        'NOAA Space Weather Prediction Center — Weltraumwetterdaten. Es werden keine personenbezogenen Daten an NOAA übermittelt.',
        'NASA DONKI — Solareventdaten. Es werden keine personenbezogenen Daten an die NASA übermittelt.',
        'Open-Meteo — Wetter- und UV-Daten. Nur Ihre Koordinaten werden zur Abfrage lokaler Prognosen übermittelt.',
      ]},
      { title: 'Cookies & lokaler Speicher', text: 'Wir verwenden den lokalen Browser-Speicher, um Ihre Einstellungen (Design, Sprache, Standort) auf Ihrem Gerät zu speichern. Wir verwenden minimale Sitzungs-Cookies, die für die Authentifizierung erforderlich sind. Wir verwenden keine Werbe- oder Tracking-Cookies.' },
      { title: 'Datenspeicherung', text: 'Ihre Kontodaten werden gespeichert, solange Ihr Konto aktiv ist. Sie können Ihr Konto jederzeit über die Profilseite löschen, wodurch alle Ihre Daten innerhalb von 30 Tagen dauerhaft von unseren Servern entfernt werden.' },
      { title: 'Ihre Rechte (DSGVO)', text: 'Wenn Sie sich im Europäischen Wirtschaftsraum befinden, haben Sie das Recht auf Zugang, Berichtigung oder Löschung Ihrer personenbezogenen Daten. Sie können auch Datenübertragbarkeit oder Einschränkung der Verarbeitung beantragen. Kontaktieren Sie uns unter der unten stehenden E-Mail-Adresse, um diese Rechte auszuüben.' },
      { title: 'Datenschutz für Kinder', text: 'The Storm Watcher richtet sich nicht an Kinder unter 13 Jahren. Wir erheben wissentlich keine Daten von Kindern.' },
      { title: 'Änderungen dieser Richtlinie', text: 'Wir können diese Richtlinie gelegentlich aktualisieren. Registrierte Nutzer werden über wesentliche Änderungen per E-Mail informiert.' },
      { title: 'Kontakt', text: 'Bei Datenschutzfragen kontaktieren Sie uns unter hello@thestormwatcher.com' },
    ],
  },
  es: {
    title: 'Política de privacidad',
    lastUpdated: 'Última actualización: mayo de 2026',
    intro: 'The Storm Watcher («nosotros», «nos», «nuestro») respeta su privacidad. Esta política explica qué datos recopilamos, por qué y cómo los protegemos.',
    sections: [
      { title: 'Datos que recopilamos', items: [
        'Datos de cuenta: dirección de correo electrónico y nombre para mostrar al crear una cuenta.',
        'Preferencias de ubicación: sus ubicaciones guardadas (nombres de ciudades y coordenadas) almacenadas localmente en su dispositivo y opcionalmente en su cuenta.',
        'Registros de estado de ánimo: entradas de síntomas y estado de ánimo que envía voluntariamente. Están vinculadas a su cuenta y se utilizan para generar su perfil personal de sensibilidad geomagnética.',
        'Configuración de la aplicación: umbral de notificaciones, preferencia de unidades y selección de idioma.',
        'Datos de uso: análisis anónimos para comprender qué funciones se utilizan más (sin identificadores personales).',
      ]},
      { title: 'Cómo usamos sus datos', items: [
        'Para proporcionar y personalizar el servicio (alertas de auroras, seguimiento del estado de ánimo, pronósticos basados en ubicación).',
        'Para enviar notificaciones push cuando la actividad geomagnética supere el umbral que usted elija.',
        'Para mejorar la aplicación basándonos en patrones de uso anónimos y agregados.',
        'No vendemos sus datos a terceros.',
      ]},
      { title: 'Servicios de terceros', items: [
        'Supabase (supabase.com) — autenticación y base de datos. Los datos de su cuenta se almacenan en servidores de Supabase en la región de la UE. Supabase cumple con el RGPD.',
        'Centro de Predicción del Clima Espacial de la NOAA — datos del clima espacial. No se envían datos personales a la NOAA.',
        'NASA DONKI — datos de eventos solares. No se envían datos personales a la NASA.',
        'Open-Meteo — datos meteorológicos y de UV. Solo se envían sus coordenadas para recuperar pronósticos locales.',
      ]},
      { title: 'Cookies y almacenamiento local', text: 'Utilizamos el almacenamiento local del navegador para guardar sus preferencias (tema, idioma, ubicación) en su dispositivo. Usamos cookies de sesión mínimas necesarias para la autenticación. No utilizamos cookies publicitarias ni de seguimiento.' },
      { title: 'Retención de datos', text: 'Los datos de su cuenta se conservan mientras su cuenta esté activa. Puede eliminar su cuenta en cualquier momento desde la página de Perfil, lo que elimina permanentemente todos sus datos de nuestros servidores en un plazo de 30 días.' },
      { title: 'Sus derechos (RGPD)', text: 'Si se encuentra en el Espacio Económico Europeo, tiene derecho a acceder, corregir o eliminar sus datos personales. También puede solicitar la portabilidad de datos o la restricción del procesamiento. Contáctenos en el correo electrónico indicado a continuación para ejercer estos derechos.' },
      { title: 'Privacidad de los niños', text: 'The Storm Watcher no está dirigido a menores de 13 años. No recopilamos datos de niños de forma consciente.' },
      { title: 'Cambios en esta política', text: 'Podemos actualizar esta política ocasionalmente. Notificaremos a los usuarios registrados sobre cambios significativos por correo electrónico.' },
      { title: 'Contacto', text: 'Para preguntas sobre privacidad, contáctenos en hello@thestormwatcher.com' },
    ],
  },
  fr: {
    title: 'Politique de confidentialité',
    lastUpdated: 'Dernière mise à jour : mai 2026',
    intro: "The Storm Watcher (« nous », « notre ») respecte votre vie privée. Cette politique explique quelles données nous collectons, pourquoi et comment nous les protégeons.",
    sections: [
      { title: 'Données que nous collectons', items: [
        "Données de compte : adresse e-mail et nom d'affichage lors de la création d'un compte.",
        'Préférences de localisation : vos emplacements sauvegardés (noms de villes et coordonnées) stockés localement sur votre appareil et optionnellement dans votre compte.',
        "Journaux d'humeur : entrées de symptômes et d'humeur que vous soumettez volontairement. Elles sont liées à votre compte et utilisées pour générer votre profil personnel de sensibilité géomagnétique.",
        "Paramètres de l'application : seuil de notification, préférence d'unités et sélection de langue.",
        'Données d\'utilisation : analyses anonymes pour comprendre quelles fonctionnalités sont les plus utilisées (sans identifiants personnels).',
      ]},
      { title: 'Comment nous utilisons vos données', items: [
        'Pour fournir et personnaliser le service (alertes aurores, suivi de l\'humeur, prévisions basées sur la localisation).',
        'Pour envoyer des notifications push lorsque l\'activité géomagnétique dépasse votre seuil choisi.',
        'Pour améliorer l\'application sur la base de modèles d\'utilisation agrégés et anonymes.',
        'Nous ne vendons pas vos données à des tiers.',
      ]},
      { title: 'Services tiers', items: [
        'Supabase (supabase.com) — authentification et base de données. Les données de votre compte sont stockées sur les serveurs de Supabase dans la région UE. Supabase est conforme au RGPD.',
        'Centre de prévision météorologique spatiale de la NOAA — données météorologiques spatiales. Aucune donnée personnelle n\'est envoyée à la NOAA.',
        'NASA DONKI — données sur les événements solaires. Aucune donnée personnelle n\'est envoyée à la NASA.',
        'Open-Meteo — données météorologiques et UV. Seules vos coordonnées sont envoyées pour récupérer des prévisions locales.',
      ]},
      { title: 'Cookies et stockage local', text: "Nous utilisons le stockage local du navigateur pour sauvegarder vos préférences (thème, langue, localisation) sur votre appareil. Nous utilisons des cookies de session minimaux requis pour l'authentification. Nous n'utilisons pas de cookies publicitaires ou de suivi." },
      { title: 'Conservation des données', text: "Les données de votre compte sont conservées tant que votre compte est actif. Vous pouvez supprimer votre compte à tout moment depuis la page Profil, ce qui supprime définitivement toutes vos données de nos serveurs dans les 30 jours." },
      { title: 'Vos droits (RGPD)', text: "Si vous vous trouvez dans l'Espace économique européen, vous avez le droit d'accéder, de corriger ou de supprimer vos données personnelles. Vous pouvez également demander la portabilité des données ou la limitation du traitement. Contactez-nous à l'adresse e-mail ci-dessous pour exercer ces droits." },
      { title: 'Confidentialité des enfants', text: "The Storm Watcher ne s'adresse pas aux enfants de moins de 13 ans. Nous ne collectons pas sciemment de données auprès d'enfants." },
      { title: 'Modifications de cette politique', text: 'Nous pouvons mettre à jour cette politique occasionnellement. Nous informerons les utilisateurs enregistrés des changements significatifs par e-mail.' },
      { title: 'Contact', text: 'Pour toute question relative à la confidentialité, contactez-nous à hello@thestormwatcher.com' },
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    lastUpdated: '最終更新日：2026年5月',
    intro: 'The Storm Watcher（「私たち」「当社」）はお客様のプライバシーを尊重します。このポリシーでは、収集するデータの内容、収集理由、および保護方法について説明します。',
    sections: [
      { title: '収集するデータ', items: [
        'アカウントデータ：アカウント作成時のメールアドレスおよび表示名。',
        '位置情報の設定：お客様が保存した場所（都市名と座標）。デバイスにローカル保存され、任意でアカウントにも保存されます。',
        '気分ログ：自発的に送信した症状や気分の記録。アカウントに紐付けられ、個人の地磁気感受性プロファイルの生成に使用されます。',
        'アプリ設定：通知閾値、単位の設定、言語選択。',
        '利用データ：どの機能が最も使われているかを把握するための匿名分析（個人識別子なし）。',
      ]},
      { title: 'データの利用方法', items: [
        'サービスの提供とパーソナライズのため（オーロラアラート、気分トラッキング、位置情報に基づく予報）。',
        '地磁気活動がお客様の設定した閾値を超えた場合にプッシュ通知を送信するため。',
        '集計された匿名の利用パターンに基づいてアプリを改善するため。',
        '当社はお客様のデータを第三者に販売しません。',
      ]},
      { title: '第三者サービス', items: [
        'Supabase（supabase.com）— 認証およびデータベース。アカウントデータはEUリージョンのSupabaseサーバーに保存されます。SupabaseはGDPR準拠です。',
        'NOAA宇宙天気予報センター — 宇宙天気データ。個人データはNOAAに送信されません。',
        'NASA DONKI — 太陽フレアイベントデータ。個人データはNASAに送信されません。',
        'Open-Meteo — 気象およびUVデータ。ローカル予報の取得のために座標のみが送信されます。',
      ]},
      { title: 'クッキーとローカルストレージ', text: 'ブラウザのローカルストレージを使用して、お客様の設定（テーマ、言語、位置情報）をデバイスに保存します。認証に必要な最小限のセッションクッキーを使用します。広告クッキーやトラッキングクッキーは使用しません。' },
      { title: 'データ保持期間', text: 'アカウントデータはアカウントが有効な間保持されます。プロフィールページからいつでもアカウントを削除でき、30日以内にすべてのデータがサーバーから完全に削除されます。' },
      { title: 'お客様の権利（GDPR）', text: '欧州経済領域にお住まいの方は、個人データへのアクセス、修正、削除を求める権利があります。データのポータビリティや処理の制限を請求することもできます。これらの権利を行使するには、以下のメールアドレスまでご連絡ください。' },
      { title: '子どものプライバシー', text: 'The Storm Watcherは13歳未満の子どもを対象としていません。当社は意図的に子どものデータを収集することはありません。' },
      { title: '本ポリシーの変更', text: '本ポリシーは随時更新される場合があります。重大な変更があった場合は、登録ユーザーにメールでお知らせします。' },
      { title: 'お問い合わせ', text: 'プライバシーに関するご質問は hello@thestormwatcher.com までご連絡ください。' },
    ],
  },
  ru: {
    title: 'Политика конфиденциальности',
    lastUpdated: 'Последнее обновление: май 2026 г.',
    intro: 'The Storm Watcher («мы», «нас», «наш») уважает вашу конфиденциальность. Эта политика объясняет, какие данные мы собираем, зачем и как мы их защищаем.',
    sections: [
      { title: 'Данные, которые мы собираем', items: [
        'Данные аккаунта: адрес электронной почты и отображаемое имя при создании аккаунта.',
        'Настройки местоположения: ваши сохранённые местоположения (названия городов и координаты), хранящиеся локально на вашем устройстве и опционально в вашем аккаунте.',
        'Журналы настроения: записи о симптомах и настроении, которые вы добровольно отправляете. Они связаны с вашим аккаунтом и используются для создания вашего личного профиля геомагнитной чувствительности.',
        'Настройки приложения: порог уведомлений, предпочтения единиц измерения и выбор языка.',
        'Данные об использовании: анонимная аналитика для понимания того, какие функции используются наиболее часто (без личных идентификаторов).',
      ]},
      { title: 'Как мы используем ваши данные', items: [
        'Для предоставления и персонализации сервиса (оповещения о полярных сияниях, отслеживание настроения, прогнозы на основе местоположения).',
        'Для отправки push-уведомлений, когда геомагнитная активность превышает выбранный вами порог.',
        'Для улучшения приложения на основе агрегированных анонимных паттернов использования.',
        'Мы не продаём ваши данные третьим лицам.',
      ]},
      { title: 'Сторонние сервисы', items: [
        'Supabase (supabase.com) — аутентификация и база данных. Данные вашего аккаунта хранятся на серверах Supabase в регионе ЕС. Supabase соответствует требованиям GDPR.',
        'Центр прогнозирования космической погоды NOAA — данные о космической погоде. Никакие личные данные не передаются в NOAA.',
        'NASA DONKI — данные о солнечных событиях. Никакие личные данные не передаются в NASA.',
        'Open-Meteo — данные о погоде и UV-излучении. Только ваши координаты отправляются для получения местных прогнозов.',
      ]},
      { title: 'Файлы cookie и локальное хранилище', text: 'Мы используем локальное хранилище браузера для сохранения ваших предпочтений (тема, язык, местоположение) на вашем устройстве. Мы используем минимальные сеансовые файлы cookie, необходимые для аутентификации. Мы не используем рекламные или отслеживающие файлы cookie.' },
      { title: 'Хранение данных', text: 'Данные вашего аккаунта хранятся до тех пор, пока ваш аккаунт активен. Вы можете удалить свой аккаунт в любое время на странице Профиля, что приведёт к окончательному удалению всех ваших данных с наших серверов в течение 30 дней.' },
      { title: 'Ваши права (GDPR)', text: 'Если вы находитесь в Европейском экономическом пространстве, вы имеете право на доступ, исправление или удаление своих персональных данных. Вы также можете запросить переносимость данных или ограничение обработки. Свяжитесь с нами по электронной почте, указанной ниже, чтобы воспользоваться этими правами.' },
      { title: 'Конфиденциальность детей', text: 'The Storm Watcher не предназначен для детей до 13 лет. Мы не собираем данные от детей намеренно.' },
      { title: 'Изменения в этой политике', text: 'Мы можем периодически обновлять эту политику. Зарегистрированные пользователи будут уведомлены о значительных изменениях по электронной почте.' },
      { title: 'Контакт', text: 'По вопросам конфиденциальности свяжитесь с нами по адресу hello@thestormwatcher.com' },
    ],
  },
  zh: {
    title: '隐私政策',
    lastUpdated: '最后更新：2026年5月',
    intro: 'The Storm Watcher（"我们"、"我们的"）尊重您的隐私。本政策说明我们收集哪些数据、原因及如何保护这些数据。',
    sections: [
      { title: '我们收集的数据', items: [
        '账户数据：创建账户时的电子邮件地址和显示名称。',
        '位置偏好：您保存的位置（城市名称和坐标），存储在您的设备本地，也可选择存储在您的账户中。',
        '心情日志：您自愿提交的症状和心情记录。这些记录与您的账户关联，用于生成您的个人地磁敏感性档案。',
        '应用设置：通知阈值、单位偏好和语言选择。',
        '使用数据：匿名分析，用于了解哪些功能使用频率最高（不含个人标识符）。',
      ]},
      { title: '我们如何使用您的数据', items: [
        '用于提供和个性化服务（极光提醒、心情追踪、基于位置的天气预报）。',
        '当地磁活动超过您设定的阈值时发送推送通知。',
        '基于聚合的匿名使用模式改进应用。',
        '我们不会将您的数据出售给第三方。',
      ]},
      { title: '第三方服务', items: [
        'Supabase（supabase.com）— 身份验证和数据库。您的账户数据存储在欧盟地区的Supabase服务器上。Supabase符合GDPR要求。',
        'NOAA空间天气预报中心 — 空间天气数据。不会向NOAA发送任何个人数据。',
        'NASA DONKI — 太阳事件数据。不会向NASA发送任何个人数据。',
        'Open-Meteo — 天气和紫外线数据。仅发送您的坐标以获取本地预报。',
      ]},
      { title: 'Cookie与本地存储', text: '我们使用浏览器本地存储在您的设备上保存您的偏好设置（主题、语言、位置）。我们使用身份验证所需的最少会话Cookie。我们不使用广告或追踪Cookie。' },
      { title: '数据保留', text: '您的账户数据在账户有效期间保留。您可以随时在个人资料页面删除账户，所有数据将在30天内从我们的服务器永久删除。' },
      { title: '您的权利（GDPR）', text: '如果您位于欧洲经济区，您有权访问、更正或删除您的个人数据。您也可以申请数据可携性或限制处理。请通过以下电子邮件联系我们以行使这些权利。' },
      { title: '儿童隐私', text: 'The Storm Watcher不面向13岁以下的儿童。我们不会故意收集儿童的数据。' },
      { title: '本政策的变更', text: '我们可能会不定期更新本政策。我们将通过电子邮件通知注册用户重大变更。' },
      { title: '联系我们', text: '如有隐私相关问题，请发送邮件至 hello@thestormwatcher.com 联系我们。' },
    ],
  },
};

const Privacy = () => {
  const { language } = useLanguage();
  const c = content[language] ?? content.en;

  return (
    <div className="min-h-screen pt-20 pb-24">
      <PageMeta
        title="Privacy Policy — The Storm Watcher"
        description="Privacy Policy for The Storm Watcher. Learn how we collect, use and protect your data."
        path="/privacy"
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6 mt-4">
          <div className="w-10 h-10 rounded-xl bg-[#10b981]/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#10b981]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{c.title}</h1>
            <p className="text-xs text-white/40">{c.lastUpdated}</p>
          </div>
        </div>

        <p className="text-[#94a3b8] text-sm leading-relaxed mb-8 pb-8 border-b border-white/8">
          {c.intro}
        </p>

        <div className="space-y-8">
          {c.sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-base font-semibold text-white mb-3">{section.title}</h2>
              {section.items ? (
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[#94a3b8] leading-relaxed">
                      <span className="text-[#10b981] mt-0.5 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#94a3b8] leading-relaxed">{section.text}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Privacy;
