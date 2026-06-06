import { Shield } from 'lucide-react';
import PageMeta from '../components/PageMeta';
import { useLanguage } from '../contexts/LanguageContext';
import StarField from '../components/StarField';

type Section = { title: string; items?: string[]; text?: string };
type LangContent = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: Section[];
};

const content: Record<string, LangContent> = {
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: May 2025',
    intro:
      'By using The Storm Watcher, you agree to these Terms of Service. Please read them carefully before using our service.',
    sections: [
      {
        title: 'Service Description',
        items: [
          'The Storm Watcher provides space weather monitoring information including solar activity, geomagnetic data, and aurora forecasts.',
          'Data is sourced from NOAA SWPC, Open-Meteo, and other public APIs.',
          'The service is provided for informational and educational purposes only.',
        ],
      },
      {
        title: 'Medical Disclaimer',
        items: [
          'The Storm Watcher is NOT a medical device and does not provide medical advice.',
          'Information about magnetic field effects on health is educational only and should not replace professional medical advice.',
          'Always consult a qualified healthcare provider for medical concerns.',
          'Do not make medical decisions based solely on information from this service.',
        ],
      },
      {
        title: 'Data Accuracy Disclaimer',
        items: [
          'Space weather data is provided on a best-effort basis and may not always be accurate or up to date.',
          'Forecasts and predictions are probabilistic and should not be relied upon for critical decisions.',
          'We are not liable for any damages resulting from inaccurate or delayed data.',
        ],
      },
      {
        title: 'User Accounts',
        items: [
          'You are responsible for maintaining the security of your account credentials.',
          'You must not share your account with others or use another user\'s account.',
          'We reserve the right to suspend or terminate accounts that violate these terms.',
        ],
      },
      {
        title: 'Prohibited Uses',
        items: [
          'You may not use the service for any unlawful purpose.',
          'You may not attempt to disrupt or interfere with the service.',
          'You may not scrape, harvest, or collect user data from the service.',
          'Automated access beyond normal use is prohibited without written permission.',
        ],
      },
      {
        title: 'Intellectual Property',
        items: [
          'All content, design, and code of The Storm Watcher is our intellectual property.',
          'You may not copy, reproduce, or redistribute our content without permission.',
          'Data from third-party sources remains the property of those sources.',
        ],
      },
      {
        title: 'Limitation of Liability',
        text: 'To the fullest extent permitted by law, The Storm Watcher and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including but not limited to loss of data, loss of profits, or personal injury.',
      },
      {
        title: 'Changes to Terms',
        text: 'We reserve the right to modify these Terms at any time. We will notify users of significant changes via the app or email. Continued use of the service after changes constitutes acceptance of the new Terms.',
      },
      {
        title: 'Contact',
        text: 'For questions about these Terms, please contact us at contact@thestormwatcher.com.',
      },
    ],
  },
  bg: {
    title: 'Условия за ползване',
    lastUpdated: 'Последна актуализация: май 2025 г.',
    intro:
      'Използвайки The Storm Watcher, вие се съгласявате с тези Условия за ползване. Моля, прочетете ги внимателно преди да използвате нашата услуга.',
    sections: [
      {
        title: 'Описание на услугата',
        items: [
          'The Storm Watcher предоставя информация за мониторинг на космическото време, включително слънчева активност, геомагнитни данни и прогнози за полярно сияние.',
          'Данните идват от NOAA SWPC, Open-Meteo и други публични API-та.',
          'Услугата се предоставя само за информационни и образователни цели.',
        ],
      },
      {
        title: 'Медицински отказ от отговорност',
        items: [
          'The Storm Watcher НЕ е медицинско устройство и не предоставя медицински съвети.',
          'Информацията за влиянието на магнитните полета върху здравето е само образователна и не трябва да замества консултация с лекар.',
          'Винаги се консултирайте с квалифициран здравен специалист при медицински проблеми.',
          'Не вземайте медицински решения, базирани единствено на информация от тази услуга.',
        ],
      },
      {
        title: 'Отказ от отговорност за точността на данните',
        items: [
          'Данните за космическото време се предоставят на принципа на най-добрите усилия и може да не са винаги точни или актуални.',
          'Прогнозите са вероятностни и не трябва да се разчита на тях за критични решения.',
          'Ние не носим отговорност за щети, произтичащи от неточни или забавени данни.',
        ],
      },
      {
        title: 'Потребителски акаунти',
        items: [
          'Вие носите отговорност за сигурността на данните за вход в акаунта си.',
          'Не трябва да споделяте акаунта си с други или да използвате чужд акаунт.',
          'Запазваме правото да спрем или прекратим акаунти, нарушаващи тези условия.',
        ],
      },
      {
        title: 'Забранени употреби',
        items: [
          'Не може да използвате услугата за незаконни цели.',
          'Не може да се опитвате да нарушавате или пречите на услугата.',
          'Не може да събирате потребителски данни от услугата чрез скрейпинг.',
          'Автоматизираният достъп отвъд нормалното използване е забранен без писмено разрешение.',
        ],
      },
      {
        title: 'Интелектуална собственост',
        items: [
          'Цялото съдържание, дизайн и код на The Storm Watcher е наша интелектуална собственост.',
          'Не може да копирате, възпроизвеждате или разпространявате нашето съдържание без разрешение.',
          'Данните от трети страни остават собственост на тези източници.',
        ],
      },
      {
        title: 'Ограничаване на отговорността',
        text: 'В максималната степен, разрешена от закона, The Storm Watcher и неговите оператори не носят отговорност за никакви косвени, случайни, специални, последващи или наказателни вреди, произтичащи от използването на услугата, включително, но не само, загуба на данни, загуба на печалба или телесна повреда.',
      },
      {
        title: 'Промени в Условията',
        text: 'Запазваме правото да изменяме тези Условия по всяко време. Ще уведомяваме потребителите за значими промени чрез приложението или по имейл. Продължаването на използването на услугата след промените представлява приемане на новите Условия.',
      },
      {
        title: 'Контакт',
        text: 'За въпроси относно тези Условия, моля свържете се с нас на contact@thestormwatcher.com.',
      },
    ],
  },
  de: {
    title: 'Nutzungsbedingungen',
    lastUpdated: 'Zuletzt aktualisiert: Mai 2025',
    intro:
      'Durch die Nutzung von The Storm Watcher stimmen Sie diesen Nutzungsbedingungen zu. Bitte lesen Sie diese sorgfältig durch, bevor Sie unseren Dienst nutzen.',
    sections: [
      {
        title: 'Dienstbeschreibung',
        items: [
          'The Storm Watcher bietet Informationen zur Überwachung des Weltraumwetters, einschließlich Sonnenaktivität, geomagnetischer Daten und Polarlichtprognosen.',
          'Die Daten stammen von NOAA SWPC, Open-Meteo und anderen öffentlichen APIs.',
          'Der Dienst wird ausschließlich zu Informations- und Bildungszwecken bereitgestellt.',
        ],
      },
      {
        title: 'Medizinischer Haftungsausschluss',
        items: [
          'The Storm Watcher ist KEIN Medizinprodukt und bietet keine medizinische Beratung.',
          'Informationen über die Auswirkungen von Magnetfeldern auf die Gesundheit dienen nur der Aufklärung und ersetzen keine professionelle medizinische Beratung.',
          'Wenden Sie sich bei medizinischen Bedenken immer an einen qualifizierten Arzt.',
          'Treffen Sie keine medizinischen Entscheidungen ausschließlich auf Basis der Informationen dieses Dienstes.',
        ],
      },
      {
        title: 'Haftungsausschluss für Datengenauigkeit',
        items: [
          'Weltraumwetterdaten werden nach bestem Bemühen bereitgestellt und sind möglicherweise nicht immer genau oder aktuell.',
          'Prognosen sind probabilistischer Natur und sollten nicht für kritische Entscheidungen herangezogen werden.',
          'Wir haften nicht für Schäden, die aus ungenauen oder verzögerten Daten resultieren.',
        ],
      },
      {
        title: 'Benutzerkonten',
        items: [
          'Sie sind für die Sicherheit Ihrer Kontoanmeldedaten verantwortlich.',
          'Sie dürfen Ihr Konto nicht mit anderen teilen oder das Konto eines anderen Nutzers verwenden.',
          'Wir behalten uns das Recht vor, Konten, die gegen diese Bedingungen verstoßen, zu sperren oder zu kündigen.',
        ],
      },
      {
        title: 'Verbotene Nutzungen',
        items: [
          'Sie dürfen den Dienst nicht für illegale Zwecke nutzen.',
          'Sie dürfen nicht versuchen, den Dienst zu stören oder zu beeinträchtigen.',
          'Sie dürfen keine Nutzerdaten aus dem Dienst scrapen, harvesten oder sammeln.',
          'Automatisierter Zugriff über die normale Nutzung hinaus ist ohne schriftliche Genehmigung verboten.',
        ],
      },
      {
        title: 'Geistiges Eigentum',
        items: [
          'Alle Inhalte, das Design und der Code von The Storm Watcher sind unser geistiges Eigentum.',
          'Sie dürfen unsere Inhalte ohne Genehmigung nicht kopieren, reproduzieren oder weiterverbreiten.',
          'Daten aus Drittquellen bleiben Eigentum dieser Quellen.',
        ],
      },
      {
        title: 'Haftungsbeschränkung',
        text: 'Soweit gesetzlich zulässig, haften The Storm Watcher und seine Betreiber nicht für indirekte, zufällige, besondere, Folge- oder Strafschäden, die aus der Nutzung des Dienstes entstehen, einschließlich, aber nicht beschränkt auf Datenverlust, Gewinnverlust oder Personenschäden.',
      },
      {
        title: 'Änderungen der Bedingungen',
        text: 'Wir behalten uns das Recht vor, diese Bedingungen jederzeit zu ändern. Wir werden Benutzer über wesentliche Änderungen per App oder E-Mail informieren. Die fortgesetzte Nutzung des Dienstes nach Änderungen gilt als Zustimmung zu den neuen Bedingungen.',
      },
      {
        title: 'Kontakt',
        text: 'Bei Fragen zu diesen Bedingungen kontaktieren Sie uns bitte unter contact@thestormwatcher.com.',
      },
    ],
  },
  es: {
    title: 'Términos de Servicio',
    lastUpdated: 'Última actualización: mayo de 2025',
    intro:
      'Al usar The Storm Watcher, usted acepta estos Términos de Servicio. Por favor, léalos detenidamente antes de usar nuestro servicio.',
    sections: [
      {
        title: 'Descripción del Servicio',
        items: [
          'The Storm Watcher proporciona información de monitoreo del clima espacial, incluyendo actividad solar, datos geomagnéticos y pronósticos de auroras.',
          'Los datos provienen de NOAA SWPC, Open-Meteo y otras APIs públicas.',
          'El servicio se proporciona únicamente con fines informativos y educativos.',
        ],
      },
      {
        title: 'Descargo de Responsabilidad Médica',
        items: [
          'The Storm Watcher NO es un dispositivo médico y no proporciona asesoramiento médico.',
          'La información sobre los efectos de los campos magnéticos en la salud es solo educativa y no debe reemplazar el consejo médico profesional.',
          'Consulte siempre a un profesional de la salud calificado ante preocupaciones médicas.',
          'No tome decisiones médicas basándose únicamente en la información de este servicio.',
        ],
      },
      {
        title: 'Descargo de Responsabilidad sobre la Precisión de los Datos',
        items: [
          'Los datos del clima espacial se proporcionan con el mejor esfuerzo posible y pueden no ser siempre precisos o estar actualizados.',
          'Los pronósticos son probabilísticos y no deben usarse para decisiones críticas.',
          'No somos responsables de los daños derivados de datos inexactos o retrasados.',
        ],
      },
      {
        title: 'Cuentas de Usuario',
        items: [
          'Usted es responsable de mantener la seguridad de sus credenciales de cuenta.',
          'No debe compartir su cuenta con otros ni usar la cuenta de otro usuario.',
          'Nos reservamos el derecho de suspender o cancelar cuentas que violen estos términos.',
        ],
      },
      {
        title: 'Usos Prohibidos',
        items: [
          'No puede usar el servicio para ningún propósito ilegal.',
          'No puede intentar interrumpir o interferir con el servicio.',
          'No puede extraer, recopilar o coleccionar datos de usuarios del servicio.',
          'El acceso automatizado más allá del uso normal está prohibido sin permiso escrito.',
        ],
      },
      {
        title: 'Propiedad Intelectual',
        items: [
          'Todo el contenido, diseño y código de The Storm Watcher es nuestra propiedad intelectual.',
          'No puede copiar, reproducir o redistribuir nuestro contenido sin permiso.',
          'Los datos de fuentes de terceros siguen siendo propiedad de esas fuentes.',
        ],
      },
      {
        title: 'Limitación de Responsabilidad',
        text: 'En la máxima medida permitida por la ley, The Storm Watcher y sus operadores no serán responsables de ningún daño indirecto, incidental, especial, consecuente o punitivo que surja del uso del servicio, incluyendo, entre otros, pérdida de datos, pérdida de beneficios o lesiones personales.',
      },
      {
        title: 'Cambios en los Términos',
        text: 'Nos reservamos el derecho de modificar estos Términos en cualquier momento. Notificaremos a los usuarios sobre cambios significativos a través de la app o por correo electrónico. El uso continuado del servicio después de los cambios constituye la aceptación de los nuevos Términos.',
      },
      {
        title: 'Contacto',
        text: 'Para preguntas sobre estos Términos, contáctenos en contact@thestormwatcher.com.',
      },
    ],
  },
  fr: {
    title: "Conditions d'Utilisation",
    lastUpdated: 'Dernière mise à jour : mai 2025',
    intro:
      "En utilisant The Storm Watcher, vous acceptez ces Conditions d'Utilisation. Veuillez les lire attentivement avant d'utiliser notre service.",
    sections: [
      {
        title: 'Description du Service',
        items: [
          "The Storm Watcher fournit des informations de surveillance de la météo spatiale, notamment l'activité solaire, les données géomagnétiques et les prévisions d'aurores.",
          "Les données proviennent de NOAA SWPC, Open-Meteo et d'autres API publiques.",
          "Le service est fourni à des fins informatives et éducatives uniquement.",
        ],
      },
      {
        title: 'Avertissement Médical',
        items: [
          "The Storm Watcher N'EST PAS un dispositif médical et ne fournit pas de conseils médicaux.",
          "Les informations sur les effets des champs magnétiques sur la santé sont uniquement éducatives et ne doivent pas remplacer un avis médical professionnel.",
          "Consultez toujours un professionnel de santé qualifié pour des préoccupations médicales.",
          "Ne prenez pas de décisions médicales basées uniquement sur les informations de ce service.",
        ],
      },
      {
        title: "Avertissement sur l'Exactitude des Données",
        items: [
          "Les données météorologiques spatiales sont fournies au mieux et peuvent ne pas toujours être exactes ou à jour.",
          "Les prévisions sont probabilistes et ne doivent pas être utilisées pour des décisions critiques.",
          "Nous ne sommes pas responsables des dommages résultant de données inexactes ou retardées.",
        ],
      },
      {
        title: 'Comptes Utilisateurs',
        items: [
          "Vous êtes responsable de la sécurité de vos identifiants de compte.",
          "Vous ne devez pas partager votre compte avec d'autres ni utiliser le compte d'un autre utilisateur.",
          "Nous nous réservons le droit de suspendre ou de résilier les comptes qui enfreignent ces conditions.",
        ],
      },
      {
        title: 'Utilisations Interdites',
        items: [
          "Vous ne pouvez pas utiliser le service à des fins illégales.",
          "Vous ne pouvez pas tenter de perturber ou d'interférer avec le service.",
          "Vous ne pouvez pas extraire, récolter ou collecter des données d'utilisateurs du service.",
          "L'accès automatisé au-delà de l'utilisation normale est interdit sans autorisation écrite.",
        ],
      },
      {
        title: 'Propriété Intellectuelle',
        items: [
          "Tout le contenu, le design et le code de The Storm Watcher sont notre propriété intellectuelle.",
          "Vous ne pouvez pas copier, reproduire ou redistribuer notre contenu sans autorisation.",
          "Les données provenant de sources tierces restent la propriété de ces sources.",
        ],
      },
      {
        title: 'Limitation de Responsabilité',
        text: "Dans toute la mesure permise par la loi, The Storm Watcher et ses opérateurs ne seront pas responsables des dommages indirects, accessoires, spéciaux, consécutifs ou punitifs découlant de votre utilisation du service, y compris, sans limitation, la perte de données, la perte de bénéfices ou les blessures corporelles.",
      },
      {
        title: 'Modifications des Conditions',
        text: "Nous nous réservons le droit de modifier ces Conditions à tout moment. Nous informerons les utilisateurs des changements significatifs via l'application ou par e-mail. L'utilisation continue du service après les modifications constitue une acceptation des nouvelles Conditions.",
      },
      {
        title: 'Contact',
        text: "Pour toute question concernant ces Conditions, veuillez nous contacter à contact@thestormwatcher.com.",
      },
    ],
  },
  ja: {
    title: '利用規約',
    lastUpdated: '最終更新：2025年5月',
    intro:
      'The Storm Watcherを使用することにより、この利用規約に同意するものとします。サービスを使用する前に、注意深くお読みください。',
    sections: [
      {
        title: 'サービスの説明',
        items: [
          'The Storm Watcherは、太陽活動、地磁気データ、オーロラ予報を含む宇宙天気監視情報を提供します。',
          'データはNOAA SWPC、Open-Meteo、その他の公開APIから提供されています。',
          'このサービスは情報提供および教育目的のみで提供されています。',
        ],
      },
      {
        title: '医療免責事項',
        items: [
          'The Storm Watcherは医療機器ではなく、医療アドバイスを提供しません。',
          '磁場が健康に与える影響に関する情報は教育目的のみであり、専門的な医療アドバイスの代替にはなりません。',
          '医療上の懸念については、常に資格を持つ医療専門家に相談してください。',
          'このサービスの情報だけを基に医療上の決定を行わないでください。',
        ],
      },
      {
        title: 'データ精度に関する免責事項',
        items: [
          '宇宙天気データはベストエフォートで提供されており、常に正確または最新であるとは限りません。',
          '予報は確率的なものであり、重要な決定の根拠とすべきではありません。',
          '不正確または遅延したデータから生じる損害について、当社は責任を負いません。',
        ],
      },
      {
        title: 'ユーザーアカウント',
        items: [
          'アカウントの資格情報のセキュリティを維持する責任はお客様にあります。',
          '他のユーザーとアカウントを共有したり、他のユーザーのアカウントを使用したりしてはなりません。',
          '当社は、これらの規約に違反するアカウントを停止または終了する権利を留保します。',
        ],
      },
      {
        title: '禁止事項',
        items: [
          '違法な目的でサービスを使用することはできません。',
          'サービスを妨害または干渉しようとすることはできません。',
          'サービスからユーザーデータをスクレイピング、収集、または取得することはできません。',
          '書面による許可なく、通常の使用を超えた自動アクセスは禁止されています。',
        ],
      },
      {
        title: '知的財産',
        items: [
          'The Storm Watcherのすべてのコンテンツ、デザイン、コードは当社の知的財産です。',
          '許可なく当社のコンテンツをコピー、複製、再配布することはできません。',
          'サードパーティのソースからのデータはそれらのソースの財産のままです。',
        ],
      },
      {
        title: '責任の制限',
        text: '法律で認められる最大限の範囲で、The Storm Watcherおよびその運営者は、データの損失、利益の損失、または身体的傷害を含むがこれらに限定されない、サービスの使用から生じる間接的、偶発的、特別、結果的、または懲罰的損害について責任を負いません。',
      },
      {
        title: '規約の変更',
        text: '当社はいつでもこの規約を変更する権利を留保します。重要な変更についてはアプリまたはメールでユーザーに通知します。変更後もサービスを継続して使用することは、新しい規約への同意を意味します。',
      },
      {
        title: 'お問い合わせ',
        text: 'この規約についてのご質問は、contact@thestormwatcher.comまでお問い合わせください。',
      },
    ],
  },
  ru: {
    title: 'Условия использования',
    lastUpdated: 'Последнее обновление: май 2025 г.',
    intro:
      'Используя The Storm Watcher, вы соглашаетесь с настоящими Условиями использования. Пожалуйста, внимательно прочитайте их перед использованием нашего сервиса.',
    sections: [
      {
        title: 'Описание сервиса',
        items: [
          'The Storm Watcher предоставляет информацию о мониторинге космической погоды, включая солнечную активность, геомагнитные данные и прогнозы полярного сияния.',
          'Данные поступают от NOAA SWPC, Open-Meteo и других публичных API.',
          'Сервис предоставляется исключительно в информационных и образовательных целях.',
        ],
      },
      {
        title: 'Медицинский отказ от ответственности',
        items: [
          'The Storm Watcher НЕ является медицинским устройством и не предоставляет медицинских консультаций.',
          'Информация о влиянии магнитных полей на здоровье носит исключительно образовательный характер и не должна заменять профессиональную медицинскую консультацию.',
          'Всегда консультируйтесь с квалифицированным медицинским специалистом по вопросам здоровья.',
          'Не принимайте медицинских решений, основываясь исключительно на информации из этого сервиса.',
        ],
      },
      {
        title: 'Отказ от ответственности за точность данных',
        items: [
          'Данные о космической погоде предоставляются по принципу максимальных усилий и могут не всегда быть точными или актуальными.',
          'Прогнозы носят вероятностный характер и не должны использоваться для принятия критически важных решений.',
          'Мы не несём ответственности за ущерб, возникший в результате неточных или задержанных данных.',
        ],
      },
      {
        title: 'Учётные записи пользователей',
        items: [
          'Вы несёте ответственность за безопасность учётных данных вашей учётной записи.',
          'Вы не должны делиться своей учётной записью с другими или использовать чужую учётную запись.',
          'Мы оставляем за собой право приостановить или удалить учётные записи, нарушающие настоящие условия.',
        ],
      },
      {
        title: 'Запрещённые виды использования',
        items: [
          'Вы не можете использовать сервис в незаконных целях.',
          'Вы не можете пытаться нарушить работу сервиса или вмешиваться в неё.',
          'Вы не можете собирать или извлекать пользовательские данные из сервиса.',
          'Автоматизированный доступ сверх обычного использования запрещён без письменного разрешения.',
        ],
      },
      {
        title: 'Интеллектуальная собственность',
        items: [
          'Весь контент, дизайн и код The Storm Watcher являются нашей интеллектуальной собственностью.',
          'Вы не можете копировать, воспроизводить или распространять наш контент без разрешения.',
          'Данные из сторонних источников остаются собственностью этих источников.',
        ],
      },
      {
        title: 'Ограничение ответственности',
        text: 'В максимальной степени, допустимой законом, The Storm Watcher и его операторы не несут ответственности за любые косвенные, случайные, специальные, последующие или штрафные убытки, возникающие в результате использования сервиса, включая, но не ограничиваясь, потерей данных, потерей прибыли или личным ущербом.',
      },
      {
        title: 'Изменения условий',
        text: 'Мы оставляем за собой право изменять настоящие Условия в любое время. Мы будем уведомлять пользователей о существенных изменениях через приложение или по электронной почте. Продолжение использования сервиса после изменений означает принятие новых Условий.',
      },
      {
        title: 'Контакты',
        text: 'По вопросам, касающимся настоящих Условий, свяжитесь с нами по адресу contact@thestormwatcher.com.',
      },
    ],
  },
  zh: {
    title: '服务条款',
    lastUpdated: '最后更新：2025年5月',
    intro: '使用The Storm Watcher即表示您同意这些服务条款。在使用我们的服务之前，请仔细阅读。',
    sections: [
      {
        title: '服务描述',
        items: [
          'The Storm Watcher提供太空天气监测信息，包括太阳活动、地磁数据和极光预报。',
          '数据来源于NOAA SWPC、Open-Meteo及其他公开API。',
          '该服务仅供信息和教育目的使用。',
        ],
      },
      {
        title: '医疗免责声明',
        items: [
          'The Storm Watcher不是医疗设备，不提供医疗建议。',
          '关于磁场对健康影响的信息仅供教育目的，不应替代专业医疗建议。',
          '如有医疗问题，请始终咨询合格的医疗专业人员。',
          '请勿仅凭本服务的信息做出医疗决定。',
        ],
      },
      {
        title: '数据准确性免责声明',
        items: [
          '太空天气数据按尽力原则提供，可能并不总是准确或最新。',
          '预报具有概率性，不应依赖于做出关键决策。',
          '我们不对因数据不准确或延迟造成的损害负责。',
        ],
      },
      {
        title: '用户账户',
        items: [
          '您有责任维护账户凭证的安全性。',
          '您不得与他人共享账户或使用他人账户。',
          '我们保留暂停或终止违反这些条款的账户的权利。',
        ],
      },
      {
        title: '禁止使用',
        items: [
          '您不得将服务用于任何非法目的。',
          '您不得试图干扰或破坏服务。',
          '您不得从服务中抓取、采集或收集用户数据。',
          '未经书面许可，禁止超出正常使用范围的自动访问。',
        ],
      },
      {
        title: '知识产权',
        items: [
          'The Storm Watcher的所有内容、设计和代码均为我们的知识产权。',
          '未经许可，您不得复制、转载或再分发我们的内容。',
          '来自第三方来源的数据仍属于这些来源的财产。',
        ],
      },
      {
        title: '责任限制',
        text: '在法律允许的最大范围内，The Storm Watcher及其运营者对因使用服务而产生的任何间接、附带、特殊、后果性或惩罚性损害不承担责任，包括但不限于数据丢失、利润损失或人身伤害。',
      },
      {
        title: '条款变更',
        text: '我们保留随时修改这些条款的权利。我们将通过应用或电子邮件通知用户重大变更。变更后继续使用服务即表示接受新条款。',
      },
      {
        title: '联系我们',
        text: '如有关于这些条款的问题，请通过contact@thestormwatcher.com联系我们。',
      },
    ],
  },
};

const Terms = () => {
  const { language } = useLanguage();
  const lang = content[language] ?? content.en;

  return (
    <div className="min-h-screen py-8 sm:py-16">
      <StarField />
      <PageMeta
        title="Terms of Service — The Storm Watcher"
        description="Read the Terms of Service for The Storm Watcher space weather monitoring application."
        path="/terms"
      >
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Terms of Service — The Storm Watcher",
          "url": "https://thestormwatcher.com/terms"
        })}</script>
      </PageMeta>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#10b981]/20 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[#10b981]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white">{lang.title}</h1>
            <p className="text-[#64748b] text-xs sm:text-sm mt-0.5">{lang.lastUpdated}</p>
          </div>
        </div>

        <p className="text-[#94a3b8] text-sm sm:text-base leading-relaxed mb-8">{lang.intro}</p>

        <div className="space-y-6 sm:space-y-8">
          {lang.sections.map((section, i) => (
            <div key={i} className="glass-surface rounded-xl p-4 sm:p-6">
              <h2 className="text-white font-semibold text-base sm:text-lg mb-3">{section.title}</h2>
              {section.items ? (
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex gap-2 text-[#94a3b8] text-sm leading-relaxed">
                      <span className="text-[#10b981] mt-0.5 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#94a3b8] text-sm leading-relaxed">{section.text}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Terms;
