import { Helmet } from 'react-helmet-async';
import { Heart, Brain, Moon, AlertTriangle, Shield, Activity } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import StarField from '../components/StarField';

const content = {
  en: {
    title: 'Magnetic Storms & Human Health',
    subtitle: 'How geomagnetic activity affects the human body — and what you can do about it.',
    sections: [
      {
        icon: <Activity className="w-6 h-6" />,
        color: '#f97316',
        heading: 'What Is a Geomagnetic Storm?',
        body: `A geomagnetic storm occurs when a burst of solar wind — charged particles from the Sun — strikes Earth's magnetic field hard enough to disturb it. The disturbance can last from a few hours to several days. Scientists measure its strength using the Kp index (0–9) and the Dst index, which tracks how much the field drops during the event.\n\nStorms are classified G1–G5. A G1 storm (Kp 5) causes minor disruptions; a G5 (Kp 9) is rare and can knock out power grids and satellites.`,
      },
      {
        icon: <Heart className="w-6 h-6" />,
        color: '#ef4444',
        heading: 'Cardiovascular System',
        body: `Multiple peer-reviewed studies have found a correlation between strong geomagnetic storms and an increase in heart attacks, arrhythmias, and sudden cardiac deaths — particularly in the 24–48 hours following storm onset.\n\nThe mechanism is thought to involve melatonin suppression and disruption of the autonomic nervous system, which regulates heart rate and blood pressure. People with pre-existing heart disease, high blood pressure, or blood-clotting disorders are considered most vulnerable.\n\nDuring a G2–G3 storm or higher, if you have cardiovascular conditions, avoid intense physical exertion, stay well hydrated, and keep your medication close.`,
      },
      {
        icon: <Brain className="w-6 h-6" />,
        color: '#a855f7',
        heading: 'Brain & Nervous System',
        body: `The human nervous system is sensitive to low-frequency electromagnetic fields. During geomagnetic storms, many people report headaches, dizziness, difficulty concentrating, and a general feeling of mental fog.\n\nResearch suggests that geomagnetic activity influences serotonin and melatonin production in the brain. Disrupted serotonin levels can affect mood, cognition, and pain sensitivity — which explains why some people feel more irritable, anxious, or confused during active periods.\n\nPeople with epilepsy, migraines, or neurological conditions may experience more frequent episodes during strong storms.`,
      },
      {
        icon: <Moon className="w-6 h-6" />,
        color: '#3b82f6',
        heading: 'Sleep Disturbances',
        body: `The pineal gland produces melatonin — the hormone that regulates sleep — in response to darkness and the Earth's natural magnetic field. Geomagnetic storms interfere with this process, suppressing melatonin production and disrupting circadian rhythms.\n\nThe result: difficulty falling asleep, lighter sleep, more vivid or disturbing dreams, and waking up feeling unrested. Studies have shown that nights coinciding with Kp ≥ 5 correlate with increased reports of insomnia across large populations.\n\nTo counter this, try to maintain a consistent sleep schedule during active periods, avoid screens before bed, and keep the bedroom as dark as possible.`,
      },
      {
        icon: <AlertTriangle className="w-6 h-6" />,
        color: '#eab308',
        heading: 'Who Is Most at Risk?',
        body: `While most healthy adults feel little or no effect from moderate geomagnetic activity, some groups are more sensitive:\n\n• People with cardiovascular disease, hypertension, or arrhythmias\n• People with pacemakers or implanted cardiac defibrillators — strong storms can in rare cases affect device function\n• People with neurological conditions (epilepsy, migraines, MS)\n• The elderly\n• People already under significant physical or emotional stress\n• Sensitive individuals who consistently report symptoms during past storms\n\nPregnant women are also advised to limit prolonged outdoor exposure during extreme G4–G5 events, as a precaution.`,
      },
      {
        icon: <Shield className="w-6 h-6" />,
        color: '#10b981',
        heading: 'What You Can Do',
        body: `There is no way to block geomagnetic storms, but you can reduce their impact:\n\n• Monitor activity — use this app to stay informed. A DISTURBED or STORM status is your signal to be mindful.\n• Rest more — your body is under additional stress. Don't push through fatigue.\n• Stay hydrated — water supports healthy blood viscosity and cardiovascular function.\n• Reduce stimulants — caffeine and alcohol amplify cardiovascular and nervous system strain.\n• Spend time in nature — grounding (walking barefoot on grass or soil) has been shown to reduce physiological stress markers.\n• Postpone demanding tasks — surgeries, long flights, and intense negotiations are best rescheduled when possible.\n• Take your medication — do not skip doses during active periods if you have a chronic condition.`,
      },
    ],
    sources: 'Based on published research in journals including Space Weather, Journal of Atmospheric and Solar-Terrestrial Physics, and Biomedicine & Pharmacotherapy. Geomagnetic data provided by GFZ Potsdam and NIGGG.',
  },
  bg: {
    title: 'Магнитни бури и човешкото здраве',
    subtitle: 'Как геомагнитната активност влияе на човешкия организъм — и какво можете да направите.',
    sections: [
      {
        icon: <Activity className="w-6 h-6" />,
        color: '#f97316',
        heading: 'Какво е геомагнитна буря?',
        body: `Геомагнитна буря възниква, когато поток от слънчев вятър — заредени частици от Слънцето — удари магнитното поле на Земята достатъчно силно, за да го наруши. Смущението може да продължи от няколко часа до няколко дни. Учените измерват силата му чрез Kp индекса (0–9) и Dst индекса, който проследява доколко полето спада по време на събитието.\n\nБурите се класифицират от G1 до G5. Буря G1 (Kp 5) причинява леки смущения; G5 (Kp 9) е рядка и може да изключи електрически мрежи и да повреди сателити.`,
      },
      {
        icon: <Heart className="w-6 h-6" />,
        color: '#ef4444',
        heading: 'Сърдечно-съдова система',
        body: `Множество рецензирани научни изследвания намират корелация между силни геомагнитни бури и увеличаване на инфарктите, аритмиите и внезапните сърдечни смърти — особено в рамките на 24–48 часа след началото на бурята.\n\nПредполагаемият механизъм включва потискане на мелатонина и нарушаване на автономната нервна система, която регулира сърдечния ритъм и кръвното налягане. Хората с предшестващи сърдечни заболявания, хипертония или нарушения в кръвосъсирването са смятани за най-уязвими.\n\nПо време на буря G2–G3 или по-силна, ако имате сърдечно-съдови заболявания, избягвайте интензивно физическо натоварване, поддържайте добра хидратация и дръжте медикаментите си наблизо.`,
      },
      {
        icon: <Brain className="w-6 h-6" />,
        color: '#a855f7',
        heading: 'Мозък и нервна система',
        body: `Човешката нервна система е чувствителна към нискочестотни електромагнитни полета. По време на геомагнитни бури много хора съобщават за главоболие, световъртеж, затруднена концентрация и обща умствена мъгла.\n\nИзследванията показват, че геомагнитната активност влияе върху производството на серотонин и мелатонин в мозъка. Нарушените нива на серотонин могат да засегнат настроението, познавателните функции и болковата чувствителност — което обяснява защо някои хора се чувстват по-раздразнителни, тревожни или объркани по време на активни периоди.\n\nХора с епилепсия, мигрена или неврологични заболявания могат да изпитват по-чести епизоди по време на силни бури.`,
      },
      {
        icon: <Moon className="w-6 h-6" />,
        color: '#3b82f6',
        heading: 'Нарушения на съня',
        body: `Епифизната жлеза произвежда мелатонин — хормонът, регулиращ съня — в отговор на тъмнина и естественото магнитно поле на Земята. Геомагнитните бури нарушават този процес, потискат производството на мелатонин и разстройват циркадните ритми.\n\nРезултатът: трудно заспиване, по-повърхностен сън, по-живи или обезпокоителни сънища и събуждане без усещане за почивка. Проучвания показват, че нощите, съвпадащи с Kp ≥ 5, корелират с увеличени съобщения за безсъние сред широки популации.\n\nЗа да противодействате, поддържайте постоянен режим на сън по време на активни периоди, избягвайте екрани преди лягане и поддържайте спалнята максимално тъмна.`,
      },
      {
        icon: <AlertTriangle className="w-6 h-6" />,
        color: '#eab308',
        heading: 'Кой е най-застрашен?',
        body: `Докато повечето здрави възрастни усещат малко или никакъв ефект от умерена геомагнитна активност, някои групи са по-чувствителни:\n\n• Хора със сърдечно-съдови заболявания, хипертония или аритмии\n• Хора с пейсмейкъри или имплантирани сърдечни дефибрилатори — силните бури могат в редки случаи да засегнат функцията на устройствата\n• Хора с неврологични заболявания (епилепсия, мигрена, МС)\n• Възрастни хора\n• Хора, намиращи се под значителен физически или емоционален стрес\n• Чувствителни лица, които последователно съобщават за симптоми по време на предишни бури\n\nПрепоръчва се и бременните жени да ограничат продължителния престой на открито по време на екстремни събития G4–G5, като предпазна мярка.`,
      },
      {
        icon: <Shield className="w-6 h-6" />,
        color: '#10b981',
        heading: 'Какво можете да направите',
        body: `Няма начин да блокирате геомагнитните бури, но можете да намалите въздействието им:\n\n• Следете активността — използвайте това приложение. Статус DISTURBED или STORM е сигнал за повишено внимание.\n• Почивайте повече — организмът ви е под допълнителен стрес. Не се принуждавайте да преодолявате умората.\n• Поддържайте хидратацията — водата подпомага здравия вискозитет на кръвта и сърдечно-съдовата функция.\n• Намалете стимулантите — кофеинът и алкохолът усилват натоварването върху сърдечно-съдовата и нервната система.\n• Прекарвайте време в природата — заземяването (ходене бос по трева или пръст) е доказано, че намалява физиологичните показатели за стрес.\n• Отложете натоварващи задачи — операции, дълги полети и интензивни преговори е най-добре да се пренасрочат, когато е възможно.\n• Приемайте медикаментите си — не пропускайте дози по време на активни периоди, ако имате хронично заболяване.`,
      },
    ],
    sources: 'Базирано на публикувани изследвания в списания, включително Space Weather, Journal of Atmospheric and Solar-Terrestrial Physics и Biomedicine & Pharmacotherapy. Геомагнитните данни са предоставени от GFZ Potsdam и NIGGG.',
  },
};

export default function MagneticEffects() {
  const { language } = useLanguage();
  const lang = (language === 'bg' ? 'bg' : 'en') as keyof typeof content;
  const c = content[lang];

  return (
    <>
      <Helmet>
        <title>{c.title} — The Storm Watcher</title>
      </Helmet>

      <div className="min-h-screen pt-24 md:pt-20 pb-16 relative">
        <StarField />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Hero */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest mb-6">
              <Heart className="w-3.5 h-3.5" /> Health & Science
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">{c.title}</h1>
            <p className="text-lg text-[#94a3b8] leading-relaxed">{c.subtitle}</p>
          </div>

          {/* Sections */}
          <div className="space-y-10">
            {c.sections.map((section, i) => (
              <div key={i} className="glass-surface rounded-2xl p-8 border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl" style={{ background: section.color + '20', color: section.color }}>
                    {section.icon}
                  </div>
                  <h2 className="text-xl font-bold text-white">{section.heading}</h2>
                </div>
                <div className="space-y-3">
                  {section.body.split('\n\n').map((para, j) => (
                    <p key={j} className="text-[#94a3b8] leading-relaxed text-sm whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sources */}
          <p className="mt-10 text-xs text-[#475569] leading-relaxed text-center italic">{c.sources}</p>
        </div>
      </div>
    </>
  );
}
