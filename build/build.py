import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import sys, re
sys.path.insert(0,os.path.join(ROOT,'build')); sys.path.insert(0,os.path.join(ROOT,'src'))
from parse import load, LET, SCALES
from locations import LOCS
from scoring import *
from personas import PERSONAS

parts=load()
QS=[q for p in parts for s in p['subs'] for q in s['qs']]
TOTAL=len(QS)
E=[]  # elements
def h(level,text): E.append(('h',level,text))
def p(text): E.append(('p',text))
def bl(items): E.append(('ul',items))
def nl(items): E.append(('ol',items))
def tbl(headers,rows,small=False): E.append(('table',headers,rows,small))
def pb(): E.append(('pb',))

def rng(p_):
    qs=[q for s in p_['subs'] for q in s['qs']]; return qs[0]['num'],qs[-1]['num'],len(qs)

SCALE_INFO=[
 ('URB','Urban Density','Remote countryside','Dense big-city core','URB'),
 ('PACE','Pace of Life','Slow, unhurried','Fast, ambitious, hustling','PACE'),
 ('HEAT','Climate Warmth','Cold winters, cool summers','Hot or subtropical year-round','HEAT'),
 ('SEAS','Four-Season Climate','No real seasons','Strong, distinct four seasons','SEAS'),
 ('DRY','Dry & Sunny Climate','Humid, cloudy, or rainy','Arid and sunny','DRY'),
 ('MTN','Mountain Access','No mountains wanted / none nearby','Big mountains at the doorstep','MTN'),
 ('WATER','Water Access (coast, lake, river)','Water not important / landlocked','Ocean, big lake, or river at the doorstep','WATER'),
 ('DESERT','Desert Landscape','Dislikes desert / none nearby','Loves desert / desert setting','DESERT'),
 ('FOREST','Green & Forest','Green not important / sparse','Lush forest and greenery','FOREST'),
 ('ARTS','Arts & Culture','Arts not a priority / minimal','Deep, varied arts scene','ARTS'),
 ('OUT','Outdoor Adventure','Indoor life / little recreation','Elite outdoor-adventure culture','OUT'),
 ('NIGHT','Nightlife & Social Buzz','Early nights / sleepy','Late-night bars, music, crowds','NIGHT'),
 ('SOC','Social Openness & Neighborliness','Private, reserved, anonymous','Very friendly, neighborly, joiner culture','SOC'),
 ('CIV','Civic Climate (non-partisan)','Traditional-leaning (right)','Progressive-leaning (left); 5 = center/mixed','CIV'),
 ('FAITH','Spiritual Community','Secular; faith not visible','Faith central to community life','FAITH'),
 ('COST','Cost Sensitivity (you) / Affordability (place)','You: cost no object. Place: very expensive','You: need very low costs. Place: very affordable','AFF'),
 ('FAM','Family Orientation','Adult-centered, few kids','Kid- and family-centered, strong schools','FAM'),
 ('WALK','Walkability','Car required for everything','Car-free life is easy','WALK'),
 ('QUIET','Need for Quiet (you) / Quietness (place)','You: love noise. Place: loud','You: need silence. Place: very quiet','QUIET'),
 ('DIV','Diversity & Inclusion','Homogeneous is fine / homogeneous','Highly diverse, visibly inclusive (incl. LGBTQ+)','DIV'),
]
CAREERS=[('TECH','Technology, software, engineering, data'),('GOV','Government, military, policy, law, nonprofits'),('HLTH','Healthcare, life sciences, caregiving'),
 ('CREA','Arts, media, design, entertainment'),('TRADE','Skilled trades, manufacturing, energy, logistics'),('FIN','Finance, insurance, real estate, corporate HQs'),
 ('EDU','Education and academia'),('HOSP','Hospitality, food, tourism, retail'),('AGRI','Agriculture, ranching, land and sea'),('REMOTE','Location-independent work or not working (special rule)')]
TAGS=[('ARTSY','Arts colony, galleries, theater, creative class'),('MUSIC','Live-music city or strong music tradition'),('FOODIE','Destination food and drink scene'),
 ('NIGHTLIFE','Late-night bar and club culture'),('OUTDOOR','Outdoor-adventure culture'),('SKI','Ski-town access'),('BEACH','Beach or boating lifestyle'),
 ('COLLEGE','College-town or university energy'),('STARTUP','Startup and tech-founder scene'),('LGBTQ','Visible LGBTQ+ community'),('FAITH','Faith-centered community life'),
 ('HISTORY','Historic architecture and heritage culture'),('SPORTS','Big sports culture'),('MAKER','Maker, DIY, craft, and trades culture'),
 ('FARM','Agrarian, homesteading, farmers-market culture'),('WELLNESS','Wellness, yoga, alternative spirituality'),('RETIRE','Retiree-friendly or active-adult community')]

# ------------------------------------------------------------------ FRONT MATTER
h(0,'The Personality-to-Place Inventory')
p(f'An MBTI-style personality test in {TOTAL} questions that ends with a recommendation for the U.S. city, state, ZIP code, and neighborhood that fits your personality best.')
h(1,'Introduction')
p('Most personality tests stop at a four-letter type. This one keeps going. Parts I through V measure the classic four preference dimensions (Extraversion/Introversion, Sensing/Intuition, Thinking/Feeling, Judging/Perceiving) plus an optional Assertive/Turbulent identity scale. Each dimension is broken into sub-dimensions, edge cases, and real-life scenarios. Parts VI through XV then look at your career, tastes, life stage, values, stress and conflict style, social energy, curiosity, physical-environment needs, subcultures, and dealbreakers.')
p('The scoring section turns your answers into a four-letter type and a 20-scale Place Profile. It applies your dealbreakers as filters and matches you against a database of '+str(len(LOCS))+' real American neighborhoods and communities, from Brooklyn brownstones and Seattle\'s Capitol Hill to Amish country in Ohio, Montana ski towns, Sun Belt suburbs, and Driftless farm towns. The goal is not the place someone like you most often lives. It is the place where your personality has the best chance to thrive.')
h(1,'Instructions')
bl([f'Length: {TOTAL} numbered questions. Expect roughly 90 to 150 minutes. You can split it across several sittings; a natural break comes after Part V (question {rng(parts[4])[1]}).',
 'Answer honestly, as you actually are on an ordinary week, not as you wish you were or think you should be. Gut answers are usually the most accurate.',
 'Choose exactly one letter per question. If two options fit, pick the one that fits slightly better. If none fit, pick the closest. You may skip a question that truly does not apply; skipped questions are simply not scored.',
 'Agreement questions use five options: A) Strongly agree, B) Agree, C) Neutral, D) Disagree, E) Strongly disagree.',
 'Any option labeled "Prefer not to say" is never scored and never counts against you.',
 'Write your answers on a sheet as number-letter pairs (for example, 1-B, 2-D, 3-A). You will need them for the scoring steps at the end.',
 'Civic and spiritual questions use non-partisan, non-sectarian language. No answer is better than another; they exist only to match you with communities where you would feel at home.',
 'Important: this inventory is for fun and self-reflection. It is not a clinical, diagnostic, or scientifically validated instrument, it is not the official Myers-Briggs Type Indicator®, and it is not affiliated with the Myers-Briggs Company. Location ratings are approximate editorial judgments. Visit, research, and talk to locals before making any real-life move.'])
h(1,'Contents')
rows=[]
for pp in parts:
    a,b,c=rng(pp); rows.append([pp['title'],f'{a}–{b}',str(c)])
rows.append(['Scoring Methodology, Location Database, Results Template, and Worked Examples','—','—'])
tbl(['Section','Questions','Count'],rows)
pb()
# ------------------------------------------------------------------ QUESTIONS
for pp in parts:
    h(1,pp['title'])
    if pp['intro']: p(pp['intro'])
    for s in pp['subs']:
        h(2,s['title'])
        for q in s['qs']:
            E.append(('q',q['num'],q['text'],q['opts']))
    pb()
# ------------------------------------------------------------------ SCORING
h(1,'Scoring Methodology')
p('Scoring has nine steps. Steps 1 and 2 give your personality type. Steps 3 to 5 build your Place Profile. Steps 6 to 9 filter and rank the location database. A pencil, your answer sheet, and a calculator are enough, and a spreadsheet makes it faster.')
nl(['Score the four MBTI-style dimensions and find your four-letter type and clarity (Parts I–IV).',
    'Score the optional Assertive/Turbulent identity (Part V).',
    'Score the 20 Place-Fit Scales from Parts VI–XIV (each 0–10).',
    'Tally your Career Ecosystem and pick your top two sectors.',
    'Tally your Subculture Tags and keep your top five active tags.',
    'Apply your Dealbreakers (Part XV) as filters on the location database.',
    'Compute the Base Fit for each surviving location using the weighted-distance formula, including your priority weights.',
    'Add bonuses: Career Ecosystem, Subculture Tags, and the modest MBTI Affinity layer.',
    'Rank, apply tie-breakers, and write up your top match and two runners-up using the Results Template.'])
h(2,'Step 1 — MBTI-Style Type (Parts I–IV)')
p('Every question in Parts I–IV awards 0, 1, or 2 points to one pole of its dimension. Use the answer key below: find your question number and the letter you chose. The cell tells you which pole gets points and how many (for example, "I2" = 2 points to Introversion; "0" = no points). Agreement questions (marked "Likert") follow the same table. Some questions list their options in reverse order on purpose, so always use the key rather than assuming A is one pole.')
p('Each dimension has 48 questions, and each question gives at most 2 points, so the two poles of a dimension share at most 96 points in total (either pole can reach 96 on its own only if every answer went its way). Neutral Likert answers (C) give 0 points, so most people total well under 96. Part V has 24 questions, so Assertive and Turbulent share at most 48 points.')
nl(['For each dimension, add up the points for each pole (for example, total E points and total I points).',
    'Percentage for a pole = 100 × (that pole\'s points) ÷ (both poles\' points combined). For example, E = 22 and I = 58 gives I = 72.5% and E = 27.5%. (If a dimension somehow totals 0 points, treat it as 50/50.)',
    'Your letter for that dimension is the pole above 50%. If it is exactly 50/50, use the conventional tie-break: I, N, F, or P.',
    'Round the winning percentage to the nearest whole number (halves round up, so 72.5% becomes 73% and 65.8% becomes 66%). Clarity uses that whole number: 50–55% = Slight, 56–65% = Moderate, 66–80% = Clear, 81–100% = Very Clear. The same rounded number is used for the 56% threshold in the MBTI Affinity bonus (Step 8).',
    'Your four-letter type combines the four winning letters (for example, INFP). Report it with clarity, for example "INFP (I Clear 73%, N Clear 78%, F Clear 74%, P Moderate 63%)".'])
tbl(['Winning %','Clarity','Interpretation'],[['50–55%','Slight','Flexible; you use both poles and context decides.'],['56–65%','Moderate','A real but adaptable preference.'],['66–80%','Clear','A consistent, recognizable preference.'],['81–100%','Very Clear','A defining trait; environments that ignore it will feel draining.']])
def keycell(q,L):
    if L not in q['mbti']: return '—'
    pole,pts=q['mbti'][L]
    return '0' if not pole or pts==0 else f'{pole}{pts}'
for dim,label,(a,b) in [('EI','Extraversion (E) / Introversion (I)',(1,48)),('SN','Sensing (S) / Intuition (N)',(49,96)),('TF','Thinking (T) / Feeling (F)',(97,144)),('JP','Judging (J) / Perceiving (P)',(145,192))]:
    h(3,f'Answer Key — {label}, Questions {a}–{b}')
    rows=[]
    for q in QS[a-1:b]:
        assert q.get('dim')==dim
        rows.append([str(q['num']),'Likert' if q['likert'] else 'MC']+[keycell(q,L) for L in LET])
    tbl(['Q','Format','A','B','C','D','E'],rows,small=True)
h(2,'Step 2 — Identity: Assertive (A) vs. Turbulent (T) (Part V)')
p('Score Part V like Step 1, using the key below. "A2" = 2 points Assertive, "T1" = 1 point Turbulent. Append the result to your type with a hyphen (for example, INFP-T). If the two totals are exactly equal, use T. The identity scale does not change the four letters and is not used in location matching. It appears in the results narrative only: Turbulent types get a note about stress-buffering features such as quiet, nature, and close community, and Assertive types get a note about tolerating faster, higher-stakes environments.')
rows=[[str(q['num']),'Likert' if q['likert'] else 'MC']+[keycell(q,L) for L in LET] for q in QS[192:216]]
tbl(['Q','Format','A','B','C','D','E'],rows,small=True)
# ---- scales
h(2,'Step 3 — The 20 Place-Fit Scales (Parts VI–XIV)')
p('Each place-fit scale runs from 0 to 10, and each location in the database is rated on the same scales. Two scales are mirrored: your Cost Sensitivity (COST) is compared with a location\'s Affordability (AFF), and your Need for Quiet (QUIET) with a location\'s Quietness.')
tbl(['Code','Scale','0 means','10 means','Location column'],[[a,b,c,d,e] for a,b,c,d,e in SCALE_INFO])
h(3,'How to score a scale')
nl(['Find every question that feeds the scale in the Place-Fit Answer Key below. Each row shows the points each letter earns on one scale. A dash (—) means that answer is not scored for that scale, and the question then drops out of that scale\'s denominator.',
    'Points earned = sum of the points for the letters you chose.',
    'Maximum available = 10 for every multiple-choice row where your answer was scored for that scale, plus 4 for every agreement (Likert) row where it was scored. Every number in a multiple-choice row is a position on the 0–10 scale (for example, URB 5 = a mid-sized, middle-density place), so a middle answer earns middle credit even when no option in that row reaches 10.',
    'Scale score = 10 × (points earned) ÷ (maximum available), rounded to one decimal. In other words, it is the average position of your answers on the 0–10 scale, with agreement answers stretched from 0–4 to 0–10. If no question for a scale was scored, set it to 5.0 (neutral).',
    'Agreement items marked L+ score A=4, B=3, C=2, D=1, E=0; items marked L− score A=0, B=1, C=2, D=3, E=4. These are already written out in the key.',
    'You can match with the one-decimal scores directly. If you prefer whole numbers (as the worked examples do), round to the nearest whole number with halves rounding up. A score is "strong" for weighting in Step 7 if it is 2 or less, or 8 or more.'])
p('Example: you answer three COST questions: two multiple-choice items where your answers are worth 10 and 6, and one agreement item where you earn 3 of 4. Points earned = 19 and maximum available = 10 + 10 + 4 = 24, so COST = 10 × 19 ÷ 24 = 7.9, meaning you are quite cost-sensitive.')
h(3,'Place-Fit Answer Key (Parts VI–XV)')
p('Rows labeled CAR (career sector), TAG (subculture tag), DB (dealbreaker), and PRI (priority) are scored in Steps 4–7. Questions that appear only in the Narrative Items list after this table have no row here.')
def fmt(v):
    if v is None: return '—'
    if isinstance(v,list): return '+'.join(f'{t}' if n==1 else f'{t}×{n}' for t,n in v)
    return str(v)
rows=[]
for q in QS[216:]:
    letters=LET[:len(q['opts'])]
    for sc,d in q.get('scales',{}).items():
        rows.append([str(q['num']),sc]+[fmt(d.get(L)) if L in letters else '' for L in LET])
    for c,d in q.get('cat',{}).items():
        rows.append([str(q['num']),c]+[fmt(d.get(L)) if L in letters else '' for L in LET])
    if 'tag' in q:
        rows.append([str(q['num']),'TAG']+[fmt(q['tag'].get(L)) if L in letters else '' for L in LET])
tbl(['Q','Feeds','A','B','C','D','E'],rows,small=True)
h(3,'Scale Feed Summary')
rows=[]
for sc in SCALES:
    nums=[q['num'] for q in QS if sc in q.get('scales',{})]
    nmc=sum(1 for q in QS if sc in q.get('scales',{}) and not q['likert']); nlk=len(nums)-nmc
    mx=10*nmc+4*nlk
    rows.append([sc,str(len(nums)),', '.join(map(str,nums)),f'{nmc} MC + {nlk} Likert',str(mx)])
tbl(['Scale','# Items','Questions','Item types','Max points if every item scored'],rows,small=True)
h(3,'Narrative Items (not numerically scored)')
nar=[q for q in QS if q.get('note') and not any(k in q for k in ('scales','cat','tag'))]
p('These questions describe how you lead, handle conflict, react under stress, and take in information. They add no points. Record your letters and use the option wording directly in the "Personality Snapshot" part of the Results Template (for example, "You lead as a strong second-in-command; you recover from arguments within hours."). Questions: '+', '.join(str(q['num']) for q in nar)+'.')
# ---- careers & tags
h(2,'Step 4 — Career Ecosystem')
p('Count one point for each CAR code you selected (rows labeled CAR in the key). Your top sector is the code with the most points, and your second sector is the runner-up. Break ties by the later question, since later items are more specific. Special rule: if REMOTE is your top code, every location receives a +3 career bonus, and your second sector is used for the +2 bonus described in Step 8.')
tbl(['Code','Sector'],[list(x) for x in CAREERS])
h(2,'Step 5 — Subculture Tags')
p('Count the tag points from TAG rows: 1 point per tag named on the option you chose; agreement items give 2 points for Strongly agree and 1 for Agree, shown as "×2" or as a single tag in the key. Any tag with 3 or more points is active. Keep up to five active tags, highest first. Locations carry the same tags in the database.')
tbl(['Tag','Meaning'],[list(x) for x in TAGS])
# ---- dealbreakers
h(2,'Step 6 — Dealbreaker Filters (Part XV)')
p('Questions 546–561 can produce DB codes. Apply each code to the location database and remove every location that fails. If fewer than three locations survive, relax your dealbreakers one at a time in the order shown in the third column (1 = relaxed first) until at least three survive, and say so in your results. Identity-safety and values filters are relaxed last.')
tbl(['DB code','Filter rule','Relax order'],[[k,v[0],str(RELAX_ORDER.index(k)+1)] for k,v in DB_RULES.items()],small=True)
p('Priorities (questions 562 and 563): PRI1 multiplies the weight of every scale in the chosen group by 2.0, and PRI2 multiplies its group by 1.5. Groups: CLIMATE = HEAT, SEAS, DRY. NATURE = MTN, WATER, DESERT, FOREST, OUT. COST = COST. COMMUNITY = SOC, CIV, FAITH, DIV, FAM. CITY = URB, WALK, ARTS, NIGHT, PACE, QUIET. If both answers are the same, apply only the 2.0 multiplier.')
# ---- formula
h(2,'Step 7 — Matching Formula (Base Fit)')
p('For every surviving location, compute a distance d on each of the 20 scales between your score U and the location rating Lc:')
bl(['Symmetric scales (URB, PACE, HEAT, SEAS, DRY, ARTS, OUT, NIGHT, SOC, CIV, FAITH, FAM, WALK, DIV): d = |U − Lc|.',
    'Cost: d = max(0, U_COST − Lc_AFF). You are penalized only when a place is less affordable than your sensitivity allows. A cheaper place costs nothing.',
    'Nature and quiet scales (MTN, WATER, DESERT, FOREST, QUIET): d = max(0, U − Lc) + 0.5 × max(0, Lc − U). Missing something you want gets the full penalty. Having something you do not care about gets half.'])
p('Weights. Each scale starts at weight w = 1.0. Multiply by 1.5 if your score is strong (2 or less, or 8 or more), because strong preferences matter more. Then multiply by 2.0 if the scale is in your Priority #1 group, and by 1.5 if it is in your Priority #2 group.')
p('Base Fit = 100 × [ 1 − ( Σ w × d ) ÷ ( 10 × Σ w ) ]. A Base Fit of 100 is a perfect match on every scale, and each point of weighted average distance costs 10 points.')
h(2,'Step 8 — Bonuses: Career, Subculture, and MBTI Affinity')
bl(['Career Ecosystem bonus: +4 if your top sector appears in the location\'s Career Strengths, and +2 more if your second sector appears. REMOTE rule: +3 to every location, plus +2 if your second sector appears.',
    'Subculture bonus: +1.5 for each of your active tags that the location carries, capped at +6.',
    'MBTI Affinity bonus, capped at +3 total. It is deliberately small next to Base Fit, so it nudges close calls without driving the result. A letter bonus counts only if that letter\'s rounded winning percentage from Step 1 is at least 56% (Moderate or stronger). A temperament bonus (NF, NT, SJ, SP) depends only on your four letters.'])
tbl(['Letter / Temperament','Bonus','Condition at the location'],[
 ['E','+0.5','NIGHT ≥ 7 or SOC ≥ 8 (a buzzing or very sociable place)'],
 ['I','+0.5','QUIET ≥ 7 (room to recharge)'],
 ['S','+0.5','OUT ≥ 8, FAM ≥ 8, or HISTORY tag (tangible, grounded pleasures)'],
 ['N','+0.5','ARTS ≥ 8 or COLLEGE tag (ideas and novelty)'],
 ['T','+0.5','Career Strengths include TECH, FIN, or GOV (merit-driven systems)'],
 ['F','+0.5','SOC ≥ 8, DIV ≥ 8, or FAITH ≥ 8 (warm, values-rich community)'],
 ['J','+0.5','FAM ≥ 8, or HISTORY or FAITH tag (order and institutions)'],
 ['P','+0.5','NIGHT ≥ 7, ARTS ≥ 8, or OUTDOOR tag (spontaneity and play)'],
 ['NF (Idealists)','+1.0','ARTS ≥ 7 and SOC ≥ 7 (arts plus community)'],
 ['NT (Rationals)','+1.0','Career Strengths include TECH or EDU, and the location has a COLLEGE or STARTUP tag'],
 ['SJ (Guardians)','+1.0','FAM ≥ 8 and (FAITH ≥ 6 or HISTORY tag)'],
 ['SP (Artisans)','+1.0','OUT ≥ 8 or NIGHT ≥ 8 (action and adventure)']])
h(2,'Step 9 — Final Fit Score, Ranking, and Tie-Breakers')
p('Final Fit Score = Base Fit + Career bonus + Subculture bonus + MBTI Affinity bonus. The score can go above 100. Rank all surviving locations by Final Fit, rounded to one decimal. The highest is your Top Match, and the next two are your Runners-Up. If two locations tie, break the tie in this order:')
nl(['Higher Base Fit (personality-environment fit beats bonuses).',
    'Fewer strong-preference violations: count the scales with weight ≥ 1.5 where d ≥ 4. Fewer is better.',
    'Smaller Civic Climate gap |U_CIV − Lc_CIV|.',
    'Smaller cost gap (d on COST).',
    'If still tied, the location in a region you have never lived in wins, because the test favors discovery.'])
p('Sanity check: if your Top Match has a d of 6 or more on any Priority #1 scale, read the runner-ups carefully. A large single gap can hide behind a high average.')
# ---- location DB
pb()
h(1,'Location Database')
p(f'The database holds {len(LOCS)} real neighborhoods and communities across six regions, covering dense urban cores, streetcar neighborhoods, college towns, mountain and beach towns, Sun Belt suburbs, faith-centered and traditional-leaning communities, retirement communities, affordable Midwestern and Southern cities, and remote rural towns. Ratings are approximate editorial judgments on a 0–10 scale, meant to describe general character, not exact statistics. Conditions change, so verify anything that matters before acting on it. ZIP codes identify the core of each neighborhood. Neighborhood boundaries and ZIP boundaries rarely match exactly.')
p('Legend: Snow: R = regular winter snow, O = occasional, N = rare or none. Coast: Y = ocean coastline within about 20 minutes. Air: Y = a large airport with extensive nonstop service within about an hour. AFF = Affordability (10 = very affordable). QUIET = Quietness (10 = very quiet). CIV: 0 = traditional-leaning, 5 = mixed/center, 10 = progressive-leaning.')
h(2,'Table A — Identity and Access')
tbl(['#','Neighborhood / Community','City','ST','ZIP','Region','Type','Snow','Coast','Air'],
    [[str(i+1),L['name'],L['city'],L['state'],L['zip'],L['region'],L['type'],L['snow'],L['coast'],L['air']] for i,L in enumerate(LOCS)],small=True)
h(2,'Table B — Scale Ratings, Part 1 (Density, Climate, Landscape)')
c1="URB PACE HEAT SEAS DRY MTN WATER DESERT FOREST ARTS".split()
tbl(['#','Location']+c1,[[str(i+1),f"{L['name']}, {L['city'].split(' (')[0]} {L['state']}"]+[str(L['s'][c]) for c in c1] for i,L in enumerate(LOCS)],small=True)
h(2,'Table C — Scale Ratings, Part 2 (Lifestyle, Community, Cost)')
c2="OUT NIGHT SOC CIV FAITH AFF FAM WALK QUIET DIV".split()
tbl(['#','Location']+c2,[[str(i+1),f"{L['name']}, {L['city'].split(' (')[0]} {L['state']}"]+[str(L['s'][c]) for c in c2] for i,L in enumerate(LOCS)],small=True)
h(2,'Table D — Career Strengths, Subculture Tags, and Character')
tbl(['#','Location (ZIP)','Career Strengths','Tags','Character'],[[str(i+1),f"{L['name']}, {L['city']}, {L['state']} {L['zip']}",' '.join(L['careers']),' '.join(L['tags']),L['desc']] for i,L in enumerate(LOCS)],small=True)
# ---- narrative helpers
def lvl(v,words):  # words for 0-3,4-6,7-10
    return words[0] if v<=3 else (words[1] if v<=6 else words[2])
def justify(r,P):
    L=r['L']; s=L['s']; U=P['U']
    tags=sorted(set(P['tags'])&set(L['tags']))
    civ=s['CIV']; civw='traditional-leaning' if civ<=3 else ('mixed / center' if civ<=6 else 'progressive-leaning')
    out=[]
    out.append(f"Community culture: {L['desc']}")
    out.append(f"Walkability: {lvl(s['WALK'],['car-dependent','partly walkable','very walkable'])} (WALK {s['WALK']} vs. your {U['WALK']}).")
    out.append(f"Arts scene: {lvl(s['ARTS'],['modest','solid','outstanding'])} (ARTS {s['ARTS']} vs. your {U['ARTS']}).")
    out.append(f"Outdoor access: {lvl(s['OUT'],['limited','good','exceptional'])}. Mountains {s['MTN']}, water {s['WATER']}, forest {s['FOREST']}, desert {s['DESERT']}.")
    out.append(f"Weather: warmth {s['HEAT']}, seasons {s['SEAS']}, dryness {s['DRY']}, snow {dict(R='regular',O='occasional',N='rare')[L['snow']]} (your HEAT {U['HEAT']}, SEAS {U['SEAS']}, DRY {U['DRY']}).")
    out.append(f"Civic climate: {civw} (CIV {civ} vs. your {U['CIV']}); faith community {lvl(s['FAITH'],['low-key','present','central'])} (FAITH {s['FAITH']} vs. your {U['FAITH']}).")
    out.append(f"Cost vs. financial mindset: affordability {s['AFF']} against your cost sensitivity {U['COST']}: {'within your comfort zone' if r['D']['COST']==0 else 'a stretch of '+str(r['D']['COST'])+' points; budget accordingly'}.")
    out.append(f"Social density and pace: density {s['URB']} (yours {U['URB']}), pace {s['PACE']} (yours {U['PACE']}), sociability {s['SOC']} (yours {U['SOC']}), quietness {s['QUIET']} (yours {U['QUIET']}).")
    out.append(f"Niche subcultures: {', '.join(tags) if tags else 'none of your active tags, though see the character notes'}. Career fit: {', '.join(L['careers'])}.")
    return out
def mbti_from(t):
    pairs=[('E','I'),('S','N'),('T','F'),('J','P')]
    typ='';clar={}
    for a,b in pairs:
        pa=100*t[a]/(t[a]+t[b]); clar[a]=pa; clar[b]=100-pa
        typ+= a if pa>50 else b
    at='A' if t['A']>t['T_'] else 'T'
    return typ,clar,at
def band(x):
    x=pct(x); return 'Slight' if x<=55 else 'Moderate' if x<=65 else 'Clear' if x<=80 else 'Very Clear'
def half_up(x,nd=0):
    import math
    f=10**nd; return math.floor(x*f+0.5+1e-9)/f
def derive(P,sc):
    target=P['U'][sc]/10; rows=[]; earned=0; mx=0
    for q in QS:
        d=q.get('scales',{}).get(sc)
        if not d: continue
        vals={L:v for L,v in d.items() if v is not None}
        m=4 if q['likert'] else 10
        L=min(vals,key=lambda k:(abs(vals[k]/m-target),k))
        # if even the closest scored option is far from this person's position, they pick an option
        # that this row does not score, and the question drops out of the scale
        if abs(vals[L]/m-target)>0.25: continue
        rows.append([str(q['num']),L,str(vals[L]),str(m)]); earned+=vals[L]; mx+=m
    score=half_up(10*earned/mx,1)
    return rows,earned,mx,score
# ---- results template
pb()
h(1,'Results Template')
p('Copy this template and fill it in. Each of the three recommendations gets a short justification covering the ten fit factors.')
tbl(['Field','Your result'],[['Name / date',''],['Four-letter type and clarity','e.g., ENFJ (E Moderate 61%, N Clear 70%, F Clear 74%, J Moderate 63%)'],['Identity','A or T, with %'],
 ['Personality snapshot','Two or three sentences built from your narrative items (leadership, conflict, stress, information style)'],
 ['Place Profile','All 20 scale scores, with any strong preferences (≤2 or ≥8) highlighted'],['Career Ecosystem','Top sector / second sector'],['Active Subculture Tags','Up to five'],
 ['Dealbreakers applied','Codes, plus any relaxed and why'],['Priorities','PRI1 / PRI2'],['TOP MATCH','Neighborhood, City, State, ZIP, Final Fit (Base + Career + Tags + Affinity)'],
 ['Runner-Up #1','Same fields'],['Runner-Up #2','Same fields']])
p('Justification checklist, one line each, for every recommendation:')
nl(['Community culture: who lives there and what the place values.','Walkability: daily life on foot versus by car.','Arts scene: depth and style of the scene.',
    'Outdoor access: which landscapes and activities are close.','Weather: warmth, seasons, sun and humidity, and snow against your tolerance.',
    'Political and civic climate: a non-partisan description against your Civic Climate score.','Cost versus financial mindset: affordability against your Cost Sensitivity.',
    'Social density: crowds, neighborliness, and how quickly newcomers fit in.','Pace: the speed of life against yours.','Niche subcultures: your active tags present there, plus career fit.'])
# ---- worked examples
pb()
h(1,'Worked Examples')
p('Three sample test-takers, scored from start to finish. Each example shows the MBTI tallies, one place-fit scale worked out item by item from the answer key (to show the arithmetic), the full Place Profile, the filters, the ranked results, and a written recommendation.')
for i,P in enumerate(PERSONAS,1):
    sc=P['showscale']; drows,earned,mx,score=derive(P,sc); P['U'][sc]=int(half_up(score))
    typ,clar,at=mbti_from(P['tallies'])
    h(2,f"Example {i}: {P['name']}")
    p(f"Profile: {P['name']} is {P['summary']}.")
    h(3,'MBTI-style tallies')
    t=P['tallies']; rows=[]
    for a,b in [('E','I'),('S','N'),('T','F'),('J','P')]:
        win=a if clar[a]>50 else b
        rows.append([f'{a} / {b}',f'{t[a]} / {t[b]}',f'{clar[a]:.1f}% / {clar[b]:.1f}%',win,f'{band(clar[win])} ({pct(clar[win])}%)'])
    rows.append(['A / T',f"{t['A']} / {t['T_']}",f"{100*t['A']/(t['A']+t['T_']):.1f}% / {100*t['T_']/(t['A']+t['T_']):.1f}%",at,'(identity, narrative only)'])
    tbl(['Dimension','Points','Percentages','Letter','Clarity'],rows)
    p(f"Type: {typ}-{at}.")
    h(3,f'One scale worked out: {sc}')
    p(f"Below is how {P['name']}'s {sc} score comes out of the answer key: question, letter chosen, points earned, and the maximum for that row (10 for multiple choice, 4 for agreement items). Questions where {P['name']} chose an option that does not score {sc} drop out and are not listed.")
    tbl(['Q','Answer','Points','Row max'],drows,small=True)
    p(f"{sc} = 10 × {earned} ÷ {mx} = {score:.1f} (used as {int(half_up(score))} in matching).")
    h(3,'Full Place Profile')
    keys=list(P['U'].keys())
    tbl(['Scale']+keys[:10],[['Score']+[str(P['U'][k]) for k in keys[:10]]],small=True)
    tbl(['Scale']+keys[10:],[['Score']+[str(P['U'][k]) for k in keys[10:]]],small=True)
    res,w,relaxed,n=score_all(P['U'],typ,clar,P['career1'],P['career2'],P['tags'],P['dbs'],P['pri1'],P['pri2'])
    p(f"Career Ecosystem: {P['career1']} (top), {P['career2']} (second). Active tags: {', '.join(P['tags'])}. Dealbreakers: {', '.join(P['dbs'])}. Priorities: PRI1 = {P['pri1']}, PRI2 = {P['pri2']}.")
    p(f"Filtering: {n} of {len(LOCS)} locations survive the dealbreakers{'; relaxed: '+', '.join(relaxed) if relaxed else ''}.")
    strong=[k for k in keys if w[k]>=1.5]
    p('Weights above 1.0: '+', '.join(f'{k} {w[k]:g}' for k in keys if w[k]!=1.0)+'.')
    h(3,'Top five by Final Fit')
    tbl(['Rank','Location','ZIP','Base Fit','Career','Tags','Affinity','Final Fit'],
        [[str(j+1),f"{r['L']['name']}, {r['L']['city']}, {r['L']['state']}",r['L']['zip'],f"{r['base']:.1f}",f"+{r['car']:g}",f"+{r['tag']:g}",f"+{r['aff']:g} ({' '.join(r['why']) or '—'})",f"{r['total']:.1f}"] for j,r in enumerate(res[:5])],small=True)
    top=res[0]; L=top['L']
    # worked base-fit arithmetic for top
    h(3,f"Base Fit arithmetic for the top match ({L['name']}, {L['city'].split(' (')[0]})")
    rows=[[k,str(P['U'][k]),str(loc_val(L,k)),f"{top['D'][k]:g}",f"{w[k]:g}",f"{w[k]*top['D'][k]:g}"] for k in keys]
    SW=sum(w.values()); SWD=sum(w[k]*top['D'][k] for k in keys)
    rows.append(['Total','','','',f'{SW:g}',f'{SWD:g}'])
    tbl(['Scale','You (U)','Place (Lc)','d','w','w × d'],rows,small=True)
    p(f"Base Fit = 100 × [1 − {SWD:g} ÷ (10 × {SW:g})] = {top['base']:.1f}.")
    h(3,'Recommendation')
    for lab,r in [('TOP MATCH',res[0]),('Runner-Up #1',res[1]),('Runner-Up #2',res[2])]:
        L=r['L']
        p(f"{lab}: {L['name']}, {L['city']}, {L['state']} {L['zip']}. Final Fit {r['total']:.1f} (Base {r['base']:.1f} + Career {r['car']:g} + Tags {r['tag']:g} + Affinity {r['aff']:g}).")
        bl(justify(r,P))
    E.append(('note',P['name']))
# ---- worksheet
pb()
h(1,'Scoring Worksheet')
tbl(['Dimension','Pole 1 points','Pole 2 points','Winning %','Letter','Clarity'],[[d,'','','','',''] for d in ['E / I','S / N','T / F','J / P','A / T']])
tbl(['Scale','Points earned','Max available','Score (0–10)','Strong? (≤2 / ≥8)'],[[s_,'','','',''] for s_ in SCALES])
tbl(['Item','Entry'],[['Career top / second',''],['Active tags (up to 5)',''],['Dealbreaker codes',''],['PRI1 / PRI2','']])
tbl(['Rank','Location','Base Fit','Career','Tags','Affinity','Final Fit'],[[str(k),'','','','','',''] for k in range(1,6)])
h(1,'A Final Word')
p('A personality test cannot know the smell of a particular bakery, the warmth of one neighbor, or the job that finds you. Treat your Top Match as a strong hypothesis. Visit in the worst season, walk the streets at night and on a Sunday morning, check current housing costs, schools, and job listings, and talk to people who live there. Then trust yourself.')
