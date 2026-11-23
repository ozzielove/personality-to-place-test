"""Score a full answer sheet (question number -> letter) with the rules in the Scoring Methodology.

Steps 1 to 5 are implemented here from the written rules; Steps 6 to 9 call scoring.score_all unchanged.
The web app's TypeScript scorer is tested against this file's output (see export_web.py).
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse import load, SCALES
from scoring import score_all, pct

PAIRS = [('EI', 'E', 'I'), ('SN', 'S', 'N'), ('TF', 'T', 'F'), ('JP', 'J', 'P')]


def half_up(x, nd=0):
    f = 10 ** nd
    return math.floor(x * f + 0.5 + 1e-9) / f


def band(x):
    x = pct(x)
    return 'Slight' if x <= 55 else 'Moderate' if x <= 65 else 'Clear' if x <= 80 else 'Very Clear'


def profile(QS, answers):
    """answers: {question number: letter}. Unanswered questions are simply absent."""
    tall = {k: 0 for k in 'EISNTFJP'}
    at = {'A': 0, 'T': 0}
    earned = {s: 0 for s in SCALES}
    mx = {s: 0 for s in SCALES}
    car = {}; car_last = {}
    tag = {}; tag_last = {}
    dbs = []; pri1 = None; pri2 = None
    answered = 0; narrative = []
    for q in QS:
        L = answers.get(q['num'])
        if L is None:
            continue
        answered += 1
        # narrative items, as build.py lists them: a NOTE key and nothing scored
        if q.get('note') and not any(k in q for k in ('scales', 'cat', 'tag')):
            narrative.append([q['num'], q['opts'][ord(L) - 65]])
        if 'mbti' in q:
            pole, pts = q['mbti'][L]
            if pole and pts:
                if q['dim'] == 'AT':
                    at[pole] += pts
                else:
                    tall[pole] += pts
        for sc, d in q.get('scales', {}).items():
            v = d.get(L)
            if v is None:
                continue
            earned[sc] += v
            mx[sc] += 4 if q['likert'] else 10
        cat = q.get('cat', {})
        if 'CAR' in cat:
            c = cat['CAR'].get(L)
            if c:
                car[c] = car.get(c, 0) + 1; car_last[c] = q['num']
        if 'DB' in cat:
            c = cat['DB'].get(L)
            if c and c not in dbs:
                dbs.append(c)
        if 'PRI1' in cat:
            pri1 = cat['PRI1'].get(L) or pri1
        if 'PRI2' in cat:
            pri2 = cat['PRI2'].get(L) or pri2
        for t, n in q.get('tag', {}).get(L, []):
            tag[t] = tag.get(t, 0) + n; tag_last[t] = q['num']

    # Step 1
    typ = ''; clar = {}
    for _, a, b in PAIRS:
        tot = tall[a] + tall[b]
        pa = 100 * tall[a] / tot if tot else 50.0
        clar[a] = pa; clar[b] = 100 - pa
        typ += a if pa > 50 else b
    # Step 2
    identity = 'A' if at['A'] > at['T'] else 'T'
    at_tot = at['A'] + at['T']
    identity_pct = pct(100 * at[identity] / at_tot) if at_tot else 50
    winners = [a if clar[a] > 50 else b for _, a, b in PAIRS]
    bands = [band(clar[w]) for w in winners]; win_pct = [pct(clar[w]) for w in winners]
    # Step 3
    score1 = {}; U = {}
    for s in SCALES:
        score1[s] = half_up(10 * earned[s] / mx[s], 1) if mx[s] else 5.0
        U[s] = int(half_up(score1[s]))
    # Step 4: most points, ties to the code chosen in the later question
    ranked = sorted(car, key=lambda c: (-car[c], -car_last[c]))
    career1 = ranked[0] if ranked else None
    career2 = ranked[1] if len(ranked) > 1 else None
    # Step 5: 3+ points is active, keep five, highest first (ties: later question)
    active = sorted([t for t in tag if tag[t] >= 3], key=lambda t: (-tag[t], -tag_last[t]))[:5]
    return dict(answered=answered, narrative=narrative, identityPct=identity_pct, bands=bands, winPct=win_pct,
                tallies=tall, at=at, type=typ, clar=clar, identity=identity, earned=earned, max=mx,
                score1=score1, U=U, car=car, career1=career1, career2=career2, tagpts=tag, tags=active,
                dbs=dbs, pri1=pri1, pri2=pri2)


def score(QS, answers):
    P = profile(QS, answers)
    res, w, relaxed, n = score_all(P['U'], P['type'], P['clar'], P['career1'], P['career2'], P['tags'],
                                   P['dbs'], P['pri1'], P['pri2'])
    P['weights'] = w; P['relaxed'] = relaxed; P['survivors'] = n; P['_res'] = res
    P['ranking'] = [dict(zip=r['L']['zip'], name=r['L']['name'], base=r['base'], car=r['car'], tag=r['tag'],
                         aff=r['aff'], why=r['why'], total=r['total'], viol=r['viol']) for r in res]
    return P


if __name__ == '__main__':
    QS = [q for p in load() for s in p['subs'] for q in s['qs']]
    P = score(QS, {q['num']: 'A' for q in QS})
    print(P['type'], P['identity'], P['U'], [(r['name'], round(r['total'], 1)) for r in P['ranking'][:3]])
