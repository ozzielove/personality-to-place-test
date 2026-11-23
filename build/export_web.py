"""Export the test for the web app in web/.

Writes:
  web/data/test-data.json      questions (numbered and ordered exactly as in the PDF), keys, locations, labels
  web/tests/fixtures.json      answer sheets with the expected scores, used to test the TypeScript scorer

Run after any change to src/ or build/scoring.py:  python3 build/export_web.py
"""
import json, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse import load, SCALES, LET
from scoring import LOCS, DB_RULES, RELAX_ORDER, PRIGROUPS, USCALES, score_all, affinity, pct
from locations import SCALES20
from personas import PERSONAS
from score_answers import score, half_up, band
import build as docbuild  # the document builder: its justify() writes the printed recommendation lines

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.environ.get('P2P_WEB_OUT') or os.path.join(ROOT, 'web')  # P2P_WEB_OUT: write elsewhere (used by the drift canary)

SCALE_INFO = [
 ('URB','Urban Density','Remote countryside','Dense big-city core'),
 ('PACE','Pace of Life','Slow, unhurried','Fast, ambitious, hustling'),
 ('HEAT','Climate Warmth','Cold winters, cool summers','Hot or subtropical year-round'),
 ('SEAS','Four-Season Climate','No real seasons','Strong, distinct four seasons'),
 ('DRY','Dry & Sunny Climate','Humid, cloudy, or rainy','Arid and sunny'),
 ('MTN','Mountain Access','No mountains wanted','Big mountains at the doorstep'),
 ('WATER','Water Access','Water not important','Ocean, big lake, or river at the doorstep'),
 ('DESERT','Desert Landscape','Dislikes desert','Loves desert'),
 ('FOREST','Green & Forest','Green not important','Lush forest and greenery'),
 ('ARTS','Arts & Culture','Arts not a priority','Deep, varied arts scene'),
 ('OUT','Outdoor Adventure','Indoor life','Elite outdoor-adventure culture'),
 ('NIGHT','Nightlife & Social Buzz','Early nights','Late-night bars, music, crowds'),
 ('SOC','Social Openness','Private, reserved, anonymous','Very friendly, neighborly'),
 ('CIV','Civic Climate','Traditional-leaning','Progressive-leaning'),
 ('FAITH','Spiritual Community','Secular','Faith central to community life'),
 ('COST','Cost Sensitivity','Cost no object','Need very low costs'),
 ('FAM','Family Orientation','Adult-centered','Kid- and family-centered'),
 ('WALK','Walkability','Car required for everything','Car-free life is easy'),
 ('QUIET','Need for Quiet','Love noise','Need silence'),
 ('DIV','Diversity & Inclusion','Homogeneous is fine','Highly diverse, visibly inclusive'),
]
CAREERS = [('TECH','Technology, software, engineering, data'),('GOV','Government, military, policy, law, nonprofits'),('HLTH','Healthcare, life sciences, caregiving'),
 ('CREA','Arts, media, design, entertainment'),('TRADE','Skilled trades, manufacturing, energy, logistics'),('FIN','Finance, insurance, real estate, corporate HQs'),
 ('EDU','Education and academia'),('HOSP','Hospitality, food, tourism, retail'),('AGRI','Agriculture, ranching, land and sea'),('REMOTE','Location-independent work or not working')]
TAGS = [('ARTSY','Arts colony, galleries, theater, creative class'),('MUSIC','Live-music city or strong music tradition'),('FOODIE','Destination food and drink scene'),
 ('NIGHTLIFE','Late-night bar and club culture'),('OUTDOOR','Outdoor-adventure culture'),('SKI','Ski-town access'),('BEACH','Beach or boating lifestyle'),
 ('COLLEGE','College-town or university energy'),('STARTUP','Startup and tech-founder scene'),('LGBTQ','Visible LGBTQ+ community'),('FAITH','Faith-centered community life'),
 ('HISTORY','Historic architecture and heritage culture'),('SPORTS','Big sports culture'),('MAKER','Maker, DIY, craft, and trades culture'),
 ('FARM','Agrarian, homesteading, farmers-market culture'),('WELLNESS','Wellness, yoga, alternative spirituality'),('RETIRE','Retiree-friendly or active-adult community')]


def export_data(parts):
    out_parts = []; out_qs = []
    for pi, p in enumerate(parts):
        qs = [q for s in p['subs'] for q in s['qs']]
        label, _, name = p['title'].partition(' — ')
        out_parts.append(dict(label=label.replace('PART', 'Part'), name=name or label, intro=p['intro'],
                              start=qs[0]['num'], end=qs[-1]['num'],
                              subs=[dict(title=s['title'], start=s['qs'][0]['num'], end=s['qs'][-1]['num']) for s in p['subs']]))
        for s in p['subs']:
            for q in s['qs']:
                o = dict(n=q['num'], p=pi, t=q['text'], o=q['opts'])
                if q['likert']: o['l'] = 1
                if 'mbti' in q:
                    o['d'] = q['dim']
                    o['m'] = {L: (list(v) if v[0] else None) for L, v in q['mbti'].items()}
                if 'scales' in q: o['s'] = q['scales']
                if 'cat' in q: o['c'] = q['cat']
                if 'tag' in q: o['g'] = {L: [list(x) for x in v] for L, v in q['tag'].items()}
                out_qs.append(o)
    locs = [dict(name=L['name'], city=L['city'], state=L['state'], zip=L['zip'], region=L['region'], type=L['type'],
                 snow=L['snow'], coast=L['coast'], air=L['air'], s=L['s'], careers=L['careers'], tags=L['tags'], desc=L['desc']) for L in LOCS]
    return dict(parts=out_parts, questions=out_qs, locations=locs,
                scales=[dict(code=a, name=b, low=c, high=d) for a, b, c, d in SCALE_INFO],
                careers=dict(CAREERS), tags=dict(TAGS),
                dbRules={k: v[0] for k, v in DB_RULES.items()}, relaxOrder=RELAX_ORDER, priGroups=PRIGROUPS)


def slim(P):
    return dict(answered=P['answered'], narrative=P['narrative'], identityPct=P['identityPct'], bands=P['bands'],
                winPct=P['winPct'], car=P['car'], tagPts=P['tagpts'], earned=P['earned'], max=P['max'],
                type=P['type'], identity=P['identity'], tallies=P['tallies'], at=P['at'], clar=P['clar'],
                score1=P['score1'], U=P['U'], career1=P['career1'], career2=P['career2'], tags=P['tags'],
                dbs=P['dbs'], pri1=P['pri1'], pri2=P['pri2'], relaxed=P['relaxed'], survivors=P['survivors'],
                weights=P['weights'],
                justify=[docbuild.justify(r, P) for r in P['_res'][:3]],
                ranking=[dict(zip=r['zip'], base=r['base'], car=r['car'], tag=r['tag'], aff=r['aff'], why=r['why'],
                              total=r['total'], viol=r['viol']) for r in P['ranking']])


def export_fixtures(QS):
    rnd = random.Random(563)
    sheets = []
    def letters(q): return LET[:len(q['opts'])]
    # fixed patterns
    sheets.append(('all A', {q['num']: 'A' for q in QS}))
    sheets.append(('all last', {q['num']: letters(q)[-1] for q in QS}))
    sheets.append(('all B', {q['num']: 'B' for q in QS}))
    sheets.append(('empty', {}))
    sheets.append(('personality only', {q['num']: rnd.choice(letters(q)) for q in QS if q['num'] <= 216}))
    sheets.append(('place only', {q['num']: rnd.choice(letters(q)) for q in QS if q['num'] > 216}))
    # dealbreaker-heavy: every dealbreaker on, forces the relax path
    db = {q['num']: rnd.choice(letters(q)) for q in QS}
    for q in QS:
        if 'DB' in q.get('cat', {}): db[q['num']] = 'A'
    sheets.append(('every dealbreaker', db))
    # random sheets with different skip rates and lean (bias toward early or late letters)
    for i in range(60):
        skip = rnd.choice([0, 0, 0.05, 0.3, 0.7])
        lean = rnd.choice([None, 0, 1])
        a = {}
        for q in QS:
            if rnd.random() < skip: continue
            ls = letters(q)
            if lean is None: a[q['num']] = rnd.choice(ls)
            elif lean == 0: a[q['num']] = ls[min(len(ls) - 1, int(abs(rnd.gauss(0, 1.2))))]
            else: a[q['num']] = ls[max(0, len(ls) - 1 - int(abs(rnd.gauss(0, 1.2))))]
        sheets.append((f'random {i} skip={skip} lean={lean}', a))
    cases = [dict(name=n, answers={str(k): v for k, v in a.items()}, expect=slim(score(QS, a))) for n, a in sheets]
    # the three worked examples from the document, scored straight from their printed profiles
    personas = []
    for P in PERSONAS:
        t = P['tallies']; typ = ''; clar = {}
        for a, b in [('E', 'I'), ('S', 'N'), ('T', 'F'), ('J', 'P')]:
            pa = 100 * t[a] / (t[a] + t[b]); clar[a] = pa; clar[b] = 100 - pa; typ += a if pa > 50 else b
        res, w, relaxed, n = score_all(P['U'], typ, clar, P['career1'], P['career2'], P['tags'], P['dbs'], P['pri1'], P['pri2'])
        personas.append(dict(name=P['name'], U=P['U'], type=typ, clar=clar, career1=P['career1'], career2=P['career2'],
                             tags=P['tags'], dbs=P['dbs'], pri1=P['pri1'], pri2=P['pri2'], survivors=n, relaxed=relaxed,
                             top=[dict(zip=r['L']['zip'], total=r['total'], base=r['base']) for r in res[:5]],
                             justify=[docbuild.justify(r, P) for r in res[:3]]))
    return dict(cases=cases, personas=personas, **unit_tables())


REGIONS = ['Northeast & Mid-Atlantic', 'Southeast', 'Midwest', 'South Central', 'Mountain & Southwest', 'Pacific']
POLES = [('E', 'I'), ('S', 'N'), ('T', 'F'), ('J', 'P')]


def unit_tables():
    """Small inputs with Python's answers, aimed at thresholds the real database may never touch."""
    rnd = random.Random(73)
    careers = [c for c, _ in CAREERS if c != 'REMOTE']; tags = [t for t, _ in TAGS]

    def fake_loc(i):
        return dict(name=f'Test {i}', city='Nowhere', state='ZZ', zip=f'{i:05d}', region=rnd.choice(REGIONS), type='Synthetic',
                    snow=rnd.choice('RON'), coast=rnd.choice('YN'), air=rnd.choice('YN'),
                    s={k: rnd.randint(0, 10) for k in SCALES20},
                    careers=rnd.sample(careers, rnd.randint(1, 4)), tags=rnd.sample(tags, rnd.randint(0, 6)), desc='Synthetic.')

    def fake_type():
        clar = {}; typ = ''
        for a, b in POLES:
            pa = rnd.choice([0, 30, 44.4, 44.5, 44.6, 49.9, 50, 50.1, 55.4, 55.5, 55.6, 56, 60, 72.5, 100, round(rnd.uniform(0, 100), 3)])
            clar[a] = pa; clar[b] = 100 - pa; typ += a if pa > 50 else b
        return typ, clar

    # rounding helpers
    xs = [0, 0.25, 0.75, 1.25, 2.5, 3.5, 0.05, 0.15, 0.35, 2.675, 7.45, 7.55, 9.95, 49.5, 50.5, 54.5, 55.5, 65.5, 65.8, 72.5, 80.5,
          91.25, 91.35, 91.75, 99.95, 100, -0.25, -0.75, -1.25, -91.25, 33.333333, 66.666667] + [round(rnd.uniform(-5, 105), rnd.choice([1, 2, 3, 6])) for _ in range(150)]
    xs += [k / 4 for k in range(-9, 420, 2)]  # every x.25 and x.75: the exact ties for one-decimal rounding
    rounding = [dict(x=x, round1=round(x, 1), pct=pct(x), half0=half_up(x), half1=half_up(x, 1)) for x in xs]
    bands = [[p / 2, band(p / 2)] for p in range(100, 201)]

    # dealbreaker rules on synthetic places: full grids for the two-variable rules, random for the rest
    db = []
    def db_case(L, U): db.append(dict(L=L, U=U, expect={k: bool(v[1](L, U)) for k, v in DB_RULES.items()}))
    i = 0
    for a in range(11):
        for b in range(11):
            i += 1; L = fake_loc(i); L['s']['DRY'] = a; L['s']['HEAT'] = b; L['s']['CIV'] = a
            db_case(L, {s: (b if s == 'CIV' else rnd.randint(0, 10)) for s in USCALES})
    for _ in range(300):
        i += 1; db_case(fake_loc(i), {s: rnd.randint(0, 10) for s in USCALES})

    # affinity bonus on synthetic places
    aff = []
    for _ in range(1500):
        i += 1; L = fake_loc(i)
        for k in ('NIGHT', 'SOC', 'QUIET', 'OUT', 'FAM', 'ARTS', 'DIV', 'FAITH'):
            L['s'][k] = rnd.choice([5, 6, 7, 8, 9])  # crowd the thresholds
        typ, clar = fake_type(); b, why = affinity(typ, clar, L)
        aff.append(dict(L=L, type=typ, clar=clar, bonus=b, why=why))

    # full ranking on the real database from random profiles
    ranks = []
    groups = list(PRIGROUPS) + [None]
    for n in range(250):
        typ, clar = fake_type()
        U = {s: rnd.choice([0, 1, 2, 3, 5, 7, 8, 9, 10, rnd.randint(0, 10)]) for s in USCALES}
        c1 = rnd.choice(careers + ['REMOTE', 'REMOTE', None]); c2 = rnd.choice(careers + ['REMOTE', None])
        tg = list(rnd.choice(LOCS)['tags'][:5]) if n % 3 == 0 else rnd.sample(tags, rnd.randint(0, 5))
        dbs = rnd.sample(list(DB_RULES), rnd.choice([0, 0, 1, 2, 3, 6, 12]))
        p1 = rnd.choice(groups); p2 = p1 if n % 7 == 0 else rnd.choice(groups)
        res, w, relaxed, cnt = score_all(U, typ, clar, c1, c2, tg, dbs, p1, p2)
        ranks.append(dict(U=U, type=typ, clar=clar, career1=c1, career2=c2, tags=tg, dbs=dbs, pri1=p1, pri2=p2,
                          weights=w, relaxed=relaxed, survivors=cnt,
                          ranking=[dict(zip=r['L']['zip'], base=r['base'], car=r['car'], tag=r['tag'], aff=r['aff'],
                                        why=r['why'], total=r['total'], viol=r['viol']) for r in res]))
    return dict(rounding=rounding, bands=bands, dbCases=db, affinityCases=aff, rankCases=ranks)


if __name__ == '__main__':
    parts = load()
    QS = [q for p in parts for s in p['subs'] for q in s['qs']]
    os.makedirs(os.path.join(WEB, 'data'), exist_ok=True)
    os.makedirs(os.path.join(WEB, 'tests'), exist_ok=True)
    data = export_data(parts)
    with open(os.path.join(WEB, 'data', 'test-data.json'), 'w') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    fx = export_fixtures(QS)
    with open(os.path.join(WEB, 'tests', 'fixtures.json'), 'w') as f:
        json.dump(fx, f, ensure_ascii=False, separators=(',', ':'))
    print('questions', len(data['questions']), 'locations', len(data['locations']), 'fixture cases', len(fx['cases']), 'personas', len(fx['personas']),
          'unit rows', {k: len(fx[k]) for k in ('rounding', 'bands', 'dbCases', 'affinityCases', 'rankCases')})
    for p in fx['personas']:
        print(p['name'], p['type'], [(r['zip'], round(r['total'], 1)) for r in p['top'][:3]])
