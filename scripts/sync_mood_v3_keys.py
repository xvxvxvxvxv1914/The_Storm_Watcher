#!/usr/bin/env python3
"""
Sync v3 Mood redesign keys (streak, facts carousel, Kp labels) to all 16 locales.
Run: python3 scripts/sync_mood_v3_keys.py
"""
import re, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'locales')


def get_keys(lang):
    return set(re.findall(r"^\s+'([^']+)'\s*:", open(os.path.join(BASE, f'{lang}.ts')).read(), re.MULTILINE))


def escape(v):
    return v.replace("\\", "\\\\").replace("'", "\\'")


def inject(lang, additions):
    path = os.path.join(BASE, f'{lang}.ts')
    content = open(path, encoding='utf-8').read()
    existing = get_keys(lang)
    lines = []
    for k, v in additions.items():
        if k not in existing:
            lines.append(f"  '{k}': '{escape(v)}',")
    if not lines:
        print(f"  [{lang}] nothing to add")
        return
    block = '\n'.join(lines)
    idx = content.rfind('\n};')
    new = content[:idx] + '\n' + block + content[idx:]
    open(path, 'w', encoding='utf-8').write(new)
    print(f"  [{lang}] +{len(lines)} keys")


LOCALES = {
'en': {
    'mood.day':             'day',
    'mood.days':            'days',
    'mood.streakLabel':     'Current streak',
    'mood.last7Days':       'Last 7 days',
    'mood.kp.quiet':        'Quiet',
    'mood.kp.unsettled':    'Unsettled',
    'mood.kp.storm':        'Geomagnetic Storm',
    'mood.kp.severe':       'Severe Storm',
    'mood.fact.headaches':  'Studies show migraine attacks increase by up to 27% during major geomagnetic storms (Kp ≥ 5), especially in latitudes above 50°N.',
    'mood.fact.sleep':      'Disturbances in Earth\'s magnetic field can suppress melatonin production, leading to lighter sleep and vivid dreams during storms.',
    'mood.fact.heartRate':  'Russian and Italian studies have correlated geomagnetic activity with measurable changes in heart rate variability and blood pressure.',
    'mood.fact.intuition':  'Many aurora-zone residents report a "storm intuition" — feeling tense or restless hours before a major event reaches Earth.',
},
'bg': {
    'mood.day':             'ден',
    'mood.days':            'дни',
    'mood.streakLabel':     'Текуща серия',
    'mood.last7Days':       'Последните 7 дни',
    'mood.kp.quiet':        'Спокойно',
    'mood.kp.unsettled':    'Неспокойно',
    'mood.kp.storm':        'Геомагнитна буря',
    'mood.kp.severe':       'Силна буря',
    'mood.fact.headaches':  'Изследвания показват, че мигренните атаки се увеличават с до 27% по време на силни геомагнитни бури (Kp ≥ 5), особено в географски ширини над 50°N.',
    'mood.fact.sleep':      'Смущенията в магнитното поле на Земята могат да потиснат производството на мелатонин, водещо до по-лек сън и ярки сънища по време на бури.',
    'mood.fact.heartRate':  'Руски и италиански изследвания свързват геомагнитната активност с измерими промени в сърдечния ритъм и кръвното налягане.',
    'mood.fact.intuition':  'Много жители на аврора-зоните съобщават за "интуиция за буря" — чувство на напрежение или безпокойство часове преди голямото събитие да достигне Земята.',
},
'de': {
    'mood.day':             'Tag',
    'mood.days':            'Tage',
    'mood.streakLabel':     'Aktuelle Serie',
    'mood.last7Days':       'Letzte 7 Tage',
    'mood.kp.quiet':        'Ruhig',
    'mood.kp.unsettled':    'Unruhig',
    'mood.kp.storm':        'Geomagnetischer Sturm',
    'mood.kp.severe':       'Schwerer Sturm',
    'mood.fact.headaches':  'Studien zeigen, dass Migräneanfälle bei großen geomagnetischen Stürmen (Kp ≥ 5) um bis zu 27% zunehmen, besonders in Breiten über 50°N.',
    'mood.fact.sleep':      'Störungen des Erdmagnetfelds können die Melatoninproduktion unterdrücken und zu leichterem Schlaf und lebhaften Träumen während Stürmen führen.',
    'mood.fact.heartRate':  'Russische und italienische Studien korrelieren geomagnetische Aktivität mit messbaren Veränderungen in Herzfrequenzvariabilität und Blutdruck.',
    'mood.fact.intuition':  'Viele Bewohner der Polarlichtzone berichten von einer "Sturm-Intuition" — Anspannung Stunden vor einem großen Ereignis.',
},
'es': {
    'mood.day':             'día',
    'mood.days':            'días',
    'mood.streakLabel':     'Racha actual',
    'mood.last7Days':       'Últimos 7 días',
    'mood.kp.quiet':        'Tranquilo',
    'mood.kp.unsettled':    'Agitado',
    'mood.kp.storm':        'Tormenta geomagnética',
    'mood.kp.severe':       'Tormenta severa',
    'mood.fact.headaches':  'Estudios muestran que los ataques de migraña aumentan hasta un 27% durante grandes tormentas geomagnéticas (Kp ≥ 5), especialmente en latitudes superiores a 50°N.',
    'mood.fact.sleep':      'Las perturbaciones del campo magnético terrestre pueden suprimir la producción de melatonina, causando sueño ligero y sueños vívidos durante tormentas.',
    'mood.fact.heartRate':  'Estudios rusos e italianos han correlacionado la actividad geomagnética con cambios medibles en la variabilidad cardíaca y presión arterial.',
    'mood.fact.intuition':  'Muchos residentes de zonas aurorales reportan una "intuición de tormenta" — tensión horas antes de un evento mayor.',
},
'fr': {
    'mood.day':             'jour',
    'mood.days':            'jours',
    'mood.streakLabel':     'Série actuelle',
    'mood.last7Days':       '7 derniers jours',
    'mood.kp.quiet':        'Calme',
    'mood.kp.unsettled':    'Agité',
    'mood.kp.storm':        'Tempête géomagnétique',
    'mood.kp.severe':       'Tempête sévère',
    'mood.fact.headaches':  'Les études montrent que les crises de migraine augmentent jusqu\'à 27% lors de grandes tempêtes géomagnétiques (Kp ≥ 5), surtout au-dessus de 50°N.',
    'mood.fact.sleep':      'Les perturbations du champ magnétique terrestre peuvent supprimer la production de mélatonine, entraînant un sommeil léger et des rêves vifs.',
    'mood.fact.heartRate':  'Des études russes et italiennes corrèlent l\'activité géomagnétique avec des changements mesurables de la variabilité cardiaque et de la tension artérielle.',
    'mood.fact.intuition':  'De nombreux habitants des zones aurorales rapportent une "intuition de tempête" — tension des heures avant un événement majeur.',
},
'ru': {
    'mood.day':             'день',
    'mood.days':            'дней',
    'mood.streakLabel':     'Текущая серия',
    'mood.last7Days':       'Последние 7 дней',
    'mood.kp.quiet':        'Спокойно',
    'mood.kp.unsettled':    'Неспокойно',
    'mood.kp.storm':        'Геомагнитная буря',
    'mood.kp.severe':       'Сильная буря',
    'mood.fact.headaches':  'Исследования показывают, что приступы мигрени увеличиваются до 27% во время сильных геомагнитных бурь (Kp ≥ 5), особенно выше 50°N.',
    'mood.fact.sleep':      'Возмущения магнитного поля Земли могут подавлять выработку мелатонина, приводя к лёгкому сну и ярким сновидениям во время бурь.',
    'mood.fact.heartRate':  'Русские и итальянские исследования связывают геомагнитную активность с измеримыми изменениями вариабельности сердечного ритма и кровяного давления.',
    'mood.fact.intuition':  'Многие жители авроральных зон сообщают об "интуиции бури" — напряжении за часы до крупного события.',
},
'zh': {
    'mood.day':             '天',
    'mood.days':            '天',
    'mood.streakLabel':     '当前连续天数',
    'mood.last7Days':       '最近7天',
    'mood.kp.quiet':        '平静',
    'mood.kp.unsettled':    '不稳定',
    'mood.kp.storm':        '地磁暴',
    'mood.kp.severe':       '严重风暴',
    'mood.fact.headaches':  '研究表明，在重大地磁风暴期间（Kp ≥ 5），偏头痛发作率可增加多达27%，特别是在50°N以上的纬度。',
    'mood.fact.sleep':      '地球磁场扰动可抑制褪黑激素的产生，导致风暴期间睡眠较浅和栩栩如生的梦境。',
    'mood.fact.heartRate':  '俄罗斯和意大利的研究将地磁活动与心率变异性和血压的可测量变化相关联。',
    'mood.fact.intuition':  '许多极光区居民报告"风暴直觉"——在重大事件到达地球前数小时感到紧张或不安。',
},
'ja': {
    'mood.day':             '日',
    'mood.days':            '日',
    'mood.streakLabel':     '現在の連続日数',
    'mood.last7Days':       '過去7日間',
    'mood.kp.quiet':        '静穏',
    'mood.kp.unsettled':    '不安定',
    'mood.kp.storm':        '地磁気嵐',
    'mood.kp.severe':       '激しい嵐',
    'mood.fact.headaches':  '研究によると、大規模な地磁気嵐（Kp ≥ 5）の際、特に北緯50°以上の地域で偏頭痛発作が最大27%増加します。',
    'mood.fact.sleep':      '地球の磁場の乱れはメラトニンの生成を抑制し、嵐の間の浅い睡眠と鮮明な夢につながる可能性があります。',
    'mood.fact.heartRate':  'ロシアとイタリアの研究は、地磁気活動と心拍変動および血圧の測定可能な変化との相関関係を示しています。',
    'mood.fact.intuition':  '多くのオーロラ帯の住民は、大きなイベントが地球に到達する数時間前に緊張を感じる「嵐の直感」を報告しています。',
},
'no': {
    'mood.day':             'dag',
    'mood.days':            'dager',
    'mood.streakLabel':     'Nåværende rekke',
    'mood.last7Days':       'Siste 7 dager',
    'mood.kp.quiet':        'Rolig',
    'mood.kp.unsettled':    'Urolig',
    'mood.kp.storm':        'Geomagnetisk storm',
    'mood.kp.severe':       'Alvorlig storm',
    'mood.fact.headaches':  'Studier viser at migreneanfall øker med opptil 27% under store geomagnetiske stormer (Kp ≥ 5), spesielt på breddegrader over 50°N.',
    'mood.fact.sleep':      'Forstyrrelser i jordens magnetfelt kan undertrykke melatoninproduksjon, noe som fører til lettere søvn og levende drømmer under stormer.',
    'mood.fact.heartRate':  'Russiske og italienske studier har korrelert geomagnetisk aktivitet med målbare endringer i hjertefrekvensvariabilitet og blodtrykk.',
    'mood.fact.intuition':  'Mange innbyggere i nordlys-sonen rapporterer en "storm-intuisjon" — spenning timer før en stor hendelse når jorden.',
},
'fi': {
    'mood.day':             'päivä',
    'mood.days':            'päivää',
    'mood.streakLabel':     'Nykyinen putki',
    'mood.last7Days':       'Viimeiset 7 päivää',
    'mood.kp.quiet':        'Rauhallinen',
    'mood.kp.unsettled':    'Levoton',
    'mood.kp.storm':        'Geomagneettinen myrsky',
    'mood.kp.severe':       'Vakava myrsky',
    'mood.fact.headaches':  'Tutkimukset osoittavat, että migreenikohtaukset lisääntyvät jopa 27% suurten geomagneettisten myrskyjen (Kp ≥ 5) aikana, erityisesti yli 50°N leveysasteilla.',
    'mood.fact.sleep':      'Maan magneettikentän häiriöt voivat tukahduttaa melatoniinin tuotantoa, mikä johtaa kevyempään uneen ja eläviin uniin myrskyjen aikana.',
    'mood.fact.heartRate':  'Venäläiset ja italialaiset tutkimukset ovat korreloineet geomagneettisen aktiivisuuden mitattaviin muutoksiin sykevälivaihtelussa ja verenpaineessa.',
    'mood.fact.intuition':  'Monet revontulivyöhykkeen asukkaat raportoivat "myrskyintuitiota" — jännitystä tunteja ennen suuren tapahtuman saapumista.',
},
'sv': {
    'mood.day':             'dag',
    'mood.days':            'dagar',
    'mood.streakLabel':     'Nuvarande svit',
    'mood.last7Days':       'Senaste 7 dagarna',
    'mood.kp.quiet':        'Lugnt',
    'mood.kp.unsettled':    'Oroligt',
    'mood.kp.storm':        'Geomagnetisk storm',
    'mood.kp.severe':       'Svår storm',
    'mood.fact.headaches':  'Studier visar att migränanfall ökar med upp till 27% under stora geomagnetiska stormar (Kp ≥ 5), särskilt på breddgrader över 50°N.',
    'mood.fact.sleep':      'Störningar i jordens magnetfält kan undertrycka melatoninproduktion, vilket leder till lättare sömn och livliga drömmar under stormar.',
    'mood.fact.heartRate':  'Ryska och italienska studier har korrelerat geomagnetisk aktivitet med mätbara förändringar i hjärtfrekvensvariabilitet och blodtryck.',
    'mood.fact.intuition':  'Många invånare i norrskenszonen rapporterar en "stormintuition" — spänning timmar innan en stor händelse når jorden.',
},
'is': {
    'mood.day':             'dagur',
    'mood.days':            'dagar',
    'mood.streakLabel':     'Núverandi runa',
    'mood.last7Days':       'Síðustu 7 dagar',
    'mood.kp.quiet':        'Kyrrlátt',
    'mood.kp.unsettled':    'Órólegt',
    'mood.kp.storm':        'Jarðsegulsstormur',
    'mood.kp.severe':       'Alvarlegur stormur',
    'mood.fact.headaches':  'Rannsóknir sýna að mígreniköst aukast um allt að 27% í stórum jarðsegulsstormum (Kp ≥ 5), sérstaklega á breiddargráðum yfir 50°N.',
    'mood.fact.sleep':      'Truflanir á segulsviði jarðar geta bælt framleiðslu melatóníns, sem leiðir til léttari svefns og lifandi drauma í stormum.',
    'mood.fact.heartRate':  'Rússneskar og ítalskar rannsóknir hafa tengt jarðsegulsvirkni við mælanlegar breytingar á hjartsláttartíðnibreytileika og blóðþrýstingi.',
    'mood.fact.intuition':  'Margir íbúar norðurljósabeltisins greina frá "stormtilfinningu" — spennu klukkustundum fyrir stóran atburð.',
},
'da': {
    'mood.day':             'dag',
    'mood.days':            'dage',
    'mood.streakLabel':     'Nuværende stime',
    'mood.last7Days':       'Sidste 7 dage',
    'mood.kp.quiet':        'Roligt',
    'mood.kp.unsettled':    'Uroligt',
    'mood.kp.storm':        'Geomagnetisk storm',
    'mood.kp.severe':       'Alvorlig storm',
    'mood.fact.headaches':  'Studier viser, at migræneanfald øges med op til 27% under store geomagnetiske storme (Kp ≥ 5), især over 50°N.',
    'mood.fact.sleep':      'Forstyrrelser i Jordens magnetfelt kan undertrykke melatoninproduktion, hvilket fører til lettere søvn og livlige drømme under storme.',
    'mood.fact.heartRate':  'Russiske og italienske studier har korreleret geomagnetisk aktivitet med målbare ændringer i hjertefrekvensvariabilitet og blodtryk.',
    'mood.fact.intuition':  'Mange beboere i nordlys-zonen rapporterer en "storm-intuition" — spænding timer før en stor begivenhed når Jorden.',
},
'pl': {
    'mood.day':             'dzień',
    'mood.days':            'dni',
    'mood.streakLabel':     'Aktualna seria',
    'mood.last7Days':       'Ostatnie 7 dni',
    'mood.kp.quiet':        'Spokojnie',
    'mood.kp.unsettled':    'Niespokojnie',
    'mood.kp.storm':        'Burza geomagnetyczna',
    'mood.kp.severe':       'Silna burza',
    'mood.fact.headaches':  'Badania pokazują, że ataki migreny wzrastają nawet o 27% podczas dużych burz geomagnetycznych (Kp ≥ 5), szczególnie powyżej 50°N.',
    'mood.fact.sleep':      'Zaburzenia pola magnetycznego Ziemi mogą tłumić produkcję melatoniny, prowadząc do lżejszego snu i żywych snów podczas burz.',
    'mood.fact.heartRate':  'Rosyjskie i włoskie badania powiązały aktywność geomagnetyczną z mierzalnymi zmianami w zmienności rytmu serca i ciśnieniu krwi.',
    'mood.fact.intuition':  'Wielu mieszkańców strefy zorzy zgłasza "intuicję burzy" — napięcie godziny przed głównym wydarzeniem.',
},
'uk': {
    'mood.day':             'день',
    'mood.days':            'днів',
    'mood.streakLabel':     'Поточна серія',
    'mood.last7Days':       'Останні 7 днів',
    'mood.kp.quiet':        'Спокійно',
    'mood.kp.unsettled':    'Неспокійно',
    'mood.kp.storm':        'Геомагнітна буря',
    'mood.kp.severe':       'Сильна буря',
    'mood.fact.headaches':  'Дослідження показують, що напади мігрені зростають до 27% під час сильних геомагнітних бур (Kp ≥ 5), особливо вище 50°N.',
    'mood.fact.sleep':      'Збурення магнітного поля Землі можуть пригнічувати вироблення мелатоніну, що призводить до легкого сну та яскравих сновидінь.',
    'mood.fact.heartRate':  'Російські та італійські дослідження пов\'язують геомагнітну активність з вимірюваними змінами варіабельності серцевого ритму та артеріального тиску.',
    'mood.fact.intuition':  'Багато мешканців зон полярного сяйва повідомляють про "інтуїцію бурі" — напругу за години до великої події.',
},
'ko': {
    'mood.day':             '일',
    'mood.days':            '일',
    'mood.streakLabel':     '현재 연속',
    'mood.last7Days':       '지난 7일',
    'mood.kp.quiet':        '평온',
    'mood.kp.unsettled':    '불안정',
    'mood.kp.storm':        '지자기 폭풍',
    'mood.kp.severe':       '심각한 폭풍',
    'mood.fact.headaches':  '연구에 따르면 주요 지자기 폭풍(Kp ≥ 5) 동안 편두통 발작이 최대 27% 증가하며, 특히 북위 50° 이상에서 그렇습니다.',
    'mood.fact.sleep':      '지구 자기장의 교란은 멜라토닌 생성을 억제하여 폭풍 동안 얕은 잠과 생생한 꿈으로 이어질 수 있습니다.',
    'mood.fact.heartRate':  '러시아와 이탈리아 연구는 지자기 활동을 심박 변동성과 혈압의 측정 가능한 변화와 연관시켰습니다.',
    'mood.fact.intuition':  '많은 오로라 지역 주민들이 주요 사건이 지구에 도달하기 몇 시간 전에 긴장감을 느끼는 "폭풍 직감"을 보고합니다.',
},
}

print("Syncing mood v3 keys to 16 locales…")
for lang, additions in LOCALES.items():
    inject(lang, additions)

print("\nVerifying…")
en_keys = get_keys('en')
for lang in LOCALES.keys():
    missing = sorted(en_keys - get_keys(lang))
    if missing:
        print(f"  [{lang}] missing {len(missing)}: {missing[:3]}")
    else:
        print(f"  [{lang}] ✅")
