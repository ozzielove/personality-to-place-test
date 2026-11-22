"""Independent checker for Personality_to_Place_Test.md.

Reads ONLY the rendered Markdown (questions, answer keys, location tables, worked examples),
re-implements the scoring rules as written in the Scoring Methodology, and reports any mismatch.
Run: python3 build/verify.py   (exit code 0 = all checks passed)
"""
import re, sys, math, collections, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MD = open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT,'Personality_to_Place_Test.md')).read().split('\n')
ERR = []; OK = []
def check(cond, msg):
    (OK if cond else ERR).append(msg)
    return cond

def section(start_pat, end_pat=r'^#{1,4} '):
    i = next(k for k, l in enumerate(MD) if re.match(start_pat, l))
    j = next((k for k in range(i + 1, len(MD)) if re.match(end_pat, MD[k])), len(MD))
    return MD[i + 1:j]
def tables(lines):
    out = []; cur = None
    for l in lines:
        if l.startswith('|'):
            cells = [c.strip().replace('\\|', '|') for c in re.split(r'(?<!\\)\|', l.strip())[1:-1]]
            if cur is None: cur = [cells]
            elif set(''.join(cells)) <= set('-'): pass
            else: cur.append(cells)
        elif cur is not None:
            out.append(cur); cur = None
    if cur: out.append(cur)
    return out

# ---------------- questions
qs = {}; order = []
cur = None
for l in MD:
    m = re.match(r'^\*\*(\d+)\.\*\* (.*)', l)
    if m:
        cur = int(m.group(1)); qs[cur] = {'text': m.group(2), 'opts': []}; order.append(cur); continue
    m = re.match(r'^- ([A-E])\) (.*)', l)
    if m and cur: qs[cur]['opts'].append(m.group(1))
    if l.startswith('## Scoring Methodology'): break
check(order == list(range(1, len(order) + 1)), f'question numbering continuous 1..{len(order)}')
check(len(order) == 563, f'total questions = {len(order)} (expected 563)')
for n in order:
    o = qs[n]['opts']; check(o == list('ABCDE'[:len(o)]) and len(o) >= 2, f'Q{n} options are consecutive letters')
LIKERT = {n for n in order if qs[n]['opts'] == list('ABCDE') and False}

# ---------------- MBTI keys
poles = {'EI': 'EI', 'SN': 'SN', 'TF': 'TF', 'JP': 'JP', 'AT': 'AT'}
def mbti_table(pat):
    return tables(section(pat))[0]
mbti = {}
for pat, dim, rng in [(r'^#### Answer Key — Extraversion', 'EI', (1, 48)), (r'^#### Answer Key — Sensing', 'SN', (49, 96)),
                      (r'^#### Answer Key — Thinking', 'TF', (97, 144)), (r'^#### Answer Key — Judging', 'JP', (145, 192)),
                      (r'^### Step 2', 'AT', (193, 216))]:
    t = mbti_table(pat); rows = t[1:]
    nums = [int(r[0]) for r in rows]
    check(nums == list(range(rng[0], rng[1] + 1)), f'{dim} key covers Q{rng[0]}-{rng[1]} exactly')
    p1, p2 = dim
    for r in rows:
        n = int(r[0]); fmt = r[1]; cells = dict(zip('ABCDE', r[2:]))
        letters = qs[n]['opts']
        keyed = [L for L in 'ABCDE' if cells[L] not in ('—', '')]
        check(keyed == letters, f'Q{n} key letters {keyed} match options {letters}')
        check((fmt == 'Likert') == (len(letters) == 5), f'Q{n} format {fmt} vs {len(letters)} options')
        vals = []
        for L in letters:
            c = cells[L]
            if c == '0': vals.append((None, 0)); continue
            m = re.match(r'^([A-Z])([12])$', c)
            check(bool(m) and m.group(1) in (p1, p2), f'Q{n}{L} cell {c} is a valid {dim} pole')
            if m: vals.append((m.group(1), int(m.group(2))))
        if fmt == 'Likert':
            ok = vals[2] == (None, 0) and vals[0][1] == 2 and vals[1][1] == 1 and vals[3][1] == 1 and vals[4][1] == 2 \
                and vals[0][0] == vals[1][0] and vals[3][0] == vals[4][0] and vals[0][0] != vals[4][0]
        else:
            ok = sorted(vals, key=str) and vals[0][1] == 2 and vals[1][1] == 1 and vals[2][1] == 1 and vals[3][1] == 2 \
                and vals[0][0] == vals[1][0] and vals[2][0] == vals[3][0] and vals[0][0] != vals[3][0]
        check(ok, f'Q{n} key is a symmetric 2/1/(0)/1/2 ladder')
        mbti[n] = dict(zip(letters, vals))
    for P in (p1, p2):
        check(sum(max([v for p, v in mbti[n].values() if p == P] or [0]) for n in range(rng[0], rng[1] + 1)) == 2 * (rng[1] - rng[0] + 1),
              f'{dim}: pole {P} max = {2*(rng[1]-rng[0]+1)}')
check('share at most 96 points' in '\n'.join(MD) and 'share at most 48 points' in '\n'.join(MD), 'max points per dimension stated (96 / 48)')

# ---------------- Place-fit key
SC = "URB PACE HEAT SEAS DRY MTN WATER DESERT FOREST ARTS OUT NIGHT SOC CIV FAITH COST FAM WALK QUIET DIV".split()
key = tables(section(r'^#### Place-Fit Answer Key'))[0][1:]
scales = collections.defaultdict(dict); cats = collections.defaultdict(dict)
for r in key:
    n = int(r[0]); feed = r[1]; cells = dict(zip('ABCDE', r[2:]))
    letters = qs[n]['opts']
    check(all((cells[L] != '') == (L in letters) for L in 'ABCDE'), f'Q{n} {feed}: cells exist exactly for options {letters}')
    check(217 <= n <= 563, f'Q{n} {feed} is in the place-fit range')
    if feed in SC:
        d = {}
        for L in letters:
            c = cells[L]
            if c == '—': continue
            check(re.fullmatch(r'\d+', c) is not None and 0 <= int(c) <= 10, f'Q{n} {feed} {L}={c} in 0..10')
            d[L] = int(c)
        scales[feed][n] = d
    else:
        cats[feed][n] = {L: cells[L] for L in letters if cells[L] != '—'}
check(set(scales) == set(SC), 'all 20 scales are fed by the key')
likert = {n for n in order if len(qs[n]['opts']) == 5 and qs[n]['text'].startswith('"')}
for sc in SC:
    for n, d in scales[sc].items():
        if n in likert:
            check(sorted(d.values()) == [0, 1, 2, 3, 4] and len(d) == 5, f'Q{n} {sc} Likert row is 0-4')
summ = tables(section(r'^#### Scale Feed Summary'))[0]
for r in summ[1:]:
    sc = r[0]; nums = [int(x) for x in r[2].split(', ')]
    check(nums == sorted(scales[sc]), f'summary list for {sc} matches the key ({len(nums)} items)')
    check(int(r[1]) == len(nums), f'summary count for {sc}')
    nl = sum(1 for n in nums if n in likert); nm = len(nums) - nl
    check(r[3] == f'{nm} MC + {nl} Likert', f'summary item types for {sc}')
    check(int(r[4]) == 10 * nm + 4 * nl, f'summary max for {sc} = {10*nm+4*nl}')
nar_line = next(l for l in section(r'^#### Narrative Items') if 'Questions:' in l)
nar = [int(x) for x in nar_line.split('Questions:')[1].strip(' .').split(', ')]
keyed = {int(r[0]) for r in key}
unscored = [n for n in range(217, 564) if n not in keyed]
check(nar == unscored, f'narrative list ({len(nar)}) equals the unscored questions in 217-563 ({len(unscored)})')
check(len(nar) == 29, f'29 narrative items (found {len(nar)})')
check(all(n in keyed or n in nar for n in range(217, 564)), 'every place-fit question is keyed or narrative')

# DB / PRI / CAR / TAG
dbt = tables(section(r'^### Step 6'))[0][1:]
dbcodes = {r[0] for r in dbt}
used = {v for n, d in cats['DB'].items() for v in d.values()}
check(used <= dbcodes, f'every DB code in the key has a filter rule ({sorted(used - dbcodes)})')
check(dbcodes <= used, f'every filter rule is reachable from a question ({sorted(dbcodes - used)})')
check(sorted(cats['DB']) == list(range(546, 562)), 'DB codes come only from Q546-561')
check(sorted(set(cats['PRI1']) | set(cats['PRI2'])) == [562, 563], 'priorities come from Q562-563')
check({v for d in list(cats['PRI1'].values()) + list(cats['PRI2'].values()) for v in d.values()} == {'CLIMATE', 'NATURE', 'COST', 'COMMUNITY', 'CITY'}, 'priority codes valid')

# ---------------- Location database
A = tables(section(r'^### Table A'))[0][1:]
B = tables(section(r'^### Table B'))[0]; C = tables(section(r'^### Table C'))[0]; D = tables(section(r'^### Table D'))[0][1:]
check(len(A) == len(B) - 1 == len(C) - 1 == len(D) == 73, f'73 locations in every table ({len(A)})')
LOCS = []
for a, b, c, d in zip(A, B[1:], C[1:], D):
    s = dict(zip(B[0][2:], map(int, b[2:]))); s.update(dict(zip(C[0][2:], map(int, c[2:]))))
    check(len(s) == 20 and all(0 <= v <= 10 for v in s.values()), f'{a[1]}: 20 ratings in 0..10')
    check(re.fullmatch(r'\d{5}', a[4]) is not None and a[6] and a[7] in 'RON' and a[8] in 'YN' and a[9] in 'YN', f'{a[1]}: ZIP/type/snow/coast/air fields valid')
    check(a[0] == b[0] == c[0] == d[0], f'{a[1]}: row numbers agree across tables')
    check(a[4] in d[1], f'{a[1]}: ZIP agrees between Table A and D')
    LOCS.append(dict(name=a[1], city=a[2], st=a[3], zip=a[4], region=a[5], snow=a[7], coast=a[8], air=a[9], s=s,
                     careers=d[2].split(), tags=d[3].split()))
check(len({(L['name'], L['city']) for L in LOCS}) == 73, 'no duplicate locations')
check(len({L['zip'] for L in LOCS}) == 73, 'no duplicate ZIP codes')
alltags = {t for L in LOCS for t in L['tags']}
tagq = {t for d in cats['TAG'].values() for v in d.values() for t in re.sub(r'×\d', '', v).split('+')}
check(tagq <= alltags, f'every quiz tag exists in the database ({sorted(tagq - alltags)})')

# ---------------- matching, as documented
PRI = {'CLIMATE': ['HEAT', 'SEAS', 'DRY'], 'NATURE': ['MTN', 'WATER', 'DESERT', 'FOREST', 'OUT'], 'COST': ['COST'],
       'COMMUNITY': ['SOC', 'CIV', 'FAITH', 'DIV', 'FAM'], 'CITY': ['URB', 'WALK', 'ARTS', 'NIGHT', 'PACE', 'QUIET']}
def lv(L, s): return L['s']['AFF' if s == 'COST' else s]
def dist(u, L, s):
    l = lv(L, s)
    if s == 'COST': return max(0, u - l)
    if s in ('MTN', 'WATER', 'DESERT', 'FOREST', 'QUIET'): return max(0, u - l) + 0.5 * max(0, l - u)
    return abs(u - l)
def rule(code, L, U):
    s = L['s']
    return {'NOSNOW': L['snow'] != 'R', 'NOHEAT': s['HEAT'] <= 8, 'NOHUMID': not (s['DRY'] <= 2 and s['HEAT'] >= 6), 'COAST': L['coast'] == 'Y',
            'MOUNTAINS': s['MTN'] >= 7, 'AIRPORT': L['air'] == 'Y', 'NOCAR': s['WALK'] >= 8, 'AFFORD': s['AFF'] >= 5, 'SCHOOLS': s['FAM'] >= 7,
            'QUIET': s['QUIET'] >= 6, 'URBANONLY': s['URB'] >= 7, 'RURALONLY': s['URB'] <= 3, 'LGBTQ': s['DIV'] >= 7 or 'LGBTQ' in L['tags'],
            'FAITH': s['FAITH'] >= 7, 'SECULAR': s['FAITH'] <= 4, 'CIVMATCH': abs(s['CIV'] - U['CIV']) <= 3}[code]
def rnd(x): return math.floor(x + 0.5 + 1e-9)
def run(U, typ, pcts, c1, c2, tags, dbs, p1, p2):
    surv = [L for L in LOCS if all(rule(c, L, U) for c in dbs)]
    w = {}
    for s in SC:
        x = 1.5 if (U[s] <= 2 or U[s] >= 8) else 1.0
        if s in PRI[p1]: x *= 2
        if p2 != p1 and s in PRI[p2]: x *= 1.5
        w[s] = x
    W = sum(w.values()); res = []
    for L in surv:
        s = L['s']; d = {k: dist(U[k], L, k) for k in SC}
        base = 100 * (1 - sum(w[k] * d[k] for k in SC) / (10 * W))
        if c1 == 'REMOTE': car = 3 + (2 if c2 in L['careers'] else 0)
        else: car = (4 if c1 in L['careers'] else 0) + (2 if c2 in L['careers'] else 0)
        tg = min(6, 1.5 * len(set(tags) & set(L['tags'])))
        ok = lambda x: x in typ and pcts[x] >= 56
        a = 0
        a += 0.5 * ok('E') * (s['NIGHT'] >= 7 or s['SOC'] >= 8)
        a += 0.5 * ok('I') * (s['QUIET'] >= 7)
        a += 0.5 * ok('S') * (s['OUT'] >= 8 or s['FAM'] >= 8 or 'HISTORY' in L['tags'])
        a += 0.5 * ok('N') * (s['ARTS'] >= 8 or 'COLLEGE' in L['tags'])
        a += 0.5 * ok('T') * bool({'TECH', 'FIN', 'GOV'} & set(L['careers']))
        a += 0.5 * ok('F') * (s['SOC'] >= 8 or s['DIV'] >= 8 or s['FAITH'] >= 8)
        a += 0.5 * ok('J') * (s['FAM'] >= 8 or 'HISTORY' in L['tags'] or 'FAITH' in L['tags'])
        a += 0.5 * ok('P') * (s['NIGHT'] >= 7 or s['ARTS'] >= 8 or 'OUTDOOR' in L['tags'])
        if 'N' in typ and 'F' in typ: a += 1.0 * (s['ARTS'] >= 7 and s['SOC'] >= 7)
        elif 'N' in typ and 'T' in typ: a += 1.0 * (bool({'TECH', 'EDU'} & set(L['careers'])) and bool({'COLLEGE', 'STARTUP'} & set(L['tags'])))
        elif 'S' in typ and 'J' in typ: a += 1.0 * (s['FAM'] >= 8 and (s['FAITH'] >= 6 or 'HISTORY' in L['tags']))
        else: a += 1.0 * (s['OUT'] >= 8 or s['NIGHT'] >= 8)
        a = min(3, a)
        viol = sum(1 for k in SC if w[k] >= 1.5 and d[k] >= 4)
        res.append((L, base, car, tg, a, base + car + tg + a, viol, abs(U['CIV'] - s['CIV']), d['COST'], d))
    res.sort(key=lambda r: (-round(r[5], 1), -round(r[1], 1), r[6], r[7], r[8]))
    return res, w, len(surv)

ex_starts = [k for k, l in enumerate(MD) if l.startswith('### Example ')]
for ei, st in enumerate(ex_starts):
    en = ex_starts[ei + 1] if ei + 1 < len(ex_starts) else next(k for k, l in enumerate(MD) if l.startswith('## Scoring Worksheet'))
    blk = MD[st:en]; name = MD[st].split(': ')[1]
    T = tables(blk)
    # MBTI tallies
    typ = ''; pcts = {}
    for r in T[0][1:5]:
        a, b = r[0].split(' / '); x, y = map(int, r[1].split(' / '))
        pa = 100 * x / (x + y); win = a if pa > 50 else b; wp = rnd(max(pa, 100 - pa))
        pcts[a] = rnd(pa); pcts[b] = rnd(100 - pa); typ += win
        band = 'Slight' if wp <= 55 else 'Moderate' if wp <= 65 else 'Clear' if wp <= 80 else 'Very Clear'
        check(r[3] == win and r[4] == f'{band} ({wp}%)', f'{name}: {a}/{b} letter and clarity ({r[3]} {r[4]} vs {win} {band} {wp}%)')
        check(r[2] == f'{pa:.1f}% / {100-pa:.1f}%', f'{name}: {a}/{b} percentages')
    ar = T[0][5]; x, y = map(int, ar[1].split(' / '))
    at = 'A' if x > y else 'T'
    check(f'Type: {typ}-{at}.' in blk, f'{name}: type line {typ}-{at}')
    # worked scale
    sc = re.search(r'One scale worked out: (\w+)', '\n'.join(blk)).group(1)
    earned = mx = 0
    for r in T[1][1:]:
        n, L, pts, rm = int(r[0]), r[1], int(r[2]), int(r[3])
        check(scales[sc].get(n, {}).get(L) == pts, f'{name}: worked {sc} Q{n}{L} = {pts} matches key')
        check(rm == (4 if n in likert else 10), f'{name}: worked {sc} Q{n} row max {rm}')
        earned += pts; mx += rm
    line = next(l for l in blk if l.startswith(f'{sc} = 10 ×'))
    m = re.match(rf'{sc} = 10 × (\d+) ÷ (\d+) = ([\d.]+) \(used as (\d+) in matching\)', line)
    sval = math.floor(10 * earned / mx * 10 + 0.5 + 1e-9) / 10
    check(m and int(m.group(1)) == earned and int(m.group(2)) == mx and abs(float(m.group(3)) - sval) < 1e-9 and int(m.group(4)) == rnd(sval),
          f'{name}: {sc} = 10×{earned}÷{mx} = {sval} -> {rnd(sval)}')
    U = dict(zip(T[2][0][1:], map(int, T[2][1][1:]))); U.update(dict(zip(T[3][0][1:], map(int, T[3][1][1:]))))
    check(U[sc] == rnd(sval), f'{name}: profile uses the worked {sc} value')
    ln = next(l for l in blk if l.startswith('Career Ecosystem:'))
    c1, c2 = re.findall(r'Career Ecosystem: (\w+) \(top\), (\w+) \(second\)', ln)[0]
    tags = re.search(r'Active tags: ([^.]*)\.', ln).group(1).split(', ')
    dbs = re.search(r'Dealbreakers: ([^.]*)\.', ln).group(1).split(', ')
    p1, p2 = re.search(r'PRI1 = (\w+), PRI2 = (\w+)', ln).groups()
    res, w, nsurv = run(U, typ, pcts, c1, c2, tags, dbs, p1, p2)
    check(f'Filtering: {nsurv} of 73 locations survive' in '\n'.join(blk), f'{name}: {nsurv} survivors')
    wl = next(l for l in blk if l.startswith('Weights above 1.0:'))
    check(wl == 'Weights above 1.0: ' + ', '.join(f'{k} {w[k]:g}' for k in SC if w[k] != 1.0) + '.', f'{name}: weights line')
    top5 = T[4][1:]
    for i, r in enumerate(top5):
        L, base, car, tg, a, tot = res[i][:6]
        exp = [str(i + 1), f"{L['name']}, {L['city']}, {L['st']}", L['zip'], f'{base:.1f}', f'+{car:g}', f'+{tg:g}', f'{tot:.1f}']
        got = [r[0], r[1], r[2], r[3], r[4], r[5], r[7]]
        check(got == exp and r[6].startswith(f'+{a:g}'), f'{name}: rank {i+1} {got} vs independent {exp} aff {a:g}')
    # base-fit arithmetic table
    bt = T[5]; L0, d0 = res[0][0], res[0][9]
    for r in bt[1:-1]:
        k = r[0]
        check([r[1], r[2], r[3], r[4], r[5]] == [str(U[k]), str(lv(L0, k)), f'{d0[k]:g}', f'{w[k]:g}', f'{w[k]*d0[k]:g}'], f'{name}: base-fit row {k}')
    SW = sum(w.values()); SWD = sum(w[k] * d0[k] for k in SC)
    check(f'Base Fit = 100 × [1 − {SWD:g} ÷ (10 × {SW:g})] = {res[0][1]:.1f}.' in blk, f'{name}: base fit line')
    for lab, j in [('TOP MATCH', 0), ('Runner-Up #1', 1), ('Runner-Up #2', 2)]:
        L, base, car, tg, a, tot = res[j][:6]
        check(any(l.startswith(f"{lab}: {L['name']}, {L['city']}, {L['st']} {L['zip']}. Final Fit {tot:.1f}") for l in blk), f'{name}: {lab} = {L["name"]} {tot:.1f}')
    print(f'{name}: {typ}-{at} -> ' + ' | '.join(f"{r[0]['name']}, {r[0]['city']} {r[0]['zip']} {r[5]:.1f}" for r in res[:3]))

print(f'{len(OK)} checks passed, {len(ERR)} failed')
for e in ERR[:60]: print('FAIL:', e)
sys.exit(1 if ERR else 0)
