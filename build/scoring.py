import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import sys
sys.path.insert(0,os.path.join(ROOT,'src'))
from locations import LOCS, SCALES20
PRIGROUPS={'CLIMATE':['HEAT','SEAS','DRY'],'NATURE':['MTN','WATER','DESERT','FOREST','OUT'],'COST':['COST'],
 'COMMUNITY':['SOC','CIV','FAITH','DIV','FAM'],'CITY':['URB','WALK','ARTS','NIGHT','PACE','QUIET']}
ASYM_HALF={'MTN','WATER','DESERT','FOREST','QUIET'}
USCALES="URB PACE HEAT SEAS DRY MTN WATER DESERT FOREST ARTS OUT NIGHT SOC CIV FAITH COST FAM WALK QUIET DIV".split()
DB_RULES={
 'NOSNOW':('Exclude locations with regular winter snow (Snow = R).',lambda L,U:L['snow']!='R'),
 'NOHEAT':('Exclude locations with Warmth (HEAT) of 9 or 10.',lambda L,U:L['s']['HEAT']<=8),
 'NOHUMID':('Exclude locations with DRY of 2 or less AND HEAT of 6 or more (hot, humid summers).',lambda L,U:not(L['s']['DRY']<=2 and L['s']['HEAT']>=6)),
 'COAST':('Keep only locations with Coast = Y (ocean coastline within about 20 minutes).',lambda L,U:L['coast']=='Y'),
 'MOUNTAINS':('Keep only locations with Mountains (MTN) of 7 or more.',lambda L,U:L['s']['MTN']>=7),
 'AIRPORT':('Keep only locations with Air = Y.',lambda L,U:L['air']=='Y'),
 'NOCAR':('Keep only locations with Walkability (WALK) of 8 or more.',lambda L,U:L['s']['WALK']>=8),
 'AFFORD':('Keep only locations with Affordability (AFF) of 5 or more.',lambda L,U:L['s']['AFF']>=5),
 'SCHOOLS':('Keep only locations with Family Orientation (FAM) of 7 or more.',lambda L,U:L['s']['FAM']>=7),
 'QUIET':('Keep only locations with Quietness (QUIET) of 6 or more.',lambda L,U:L['s']['QUIET']>=6),
 'URBANONLY':('Keep only locations with Urban Density (URB) of 7 or more.',lambda L,U:L['s']['URB']>=7),
 'RURALONLY':('Keep only locations with Urban Density (URB) of 3 or less.',lambda L,U:L['s']['URB']<=3),
 'LGBTQ':('Keep only locations with Diversity & Inclusion (DIV) of 7 or more, or carrying the LGBTQ tag.',lambda L,U:L['s']['DIV']>=7 or 'LGBTQ' in L['tags']),
 'FAITH':('Keep only locations with Spiritual Community (FAITH) of 7 or more.',lambda L,U:L['s']['FAITH']>=7),
 'SECULAR':('Keep only locations with Spiritual Community (FAITH) of 4 or less.',lambda L,U:L['s']['FAITH']<=4),
 'CIVMATCH':('Keep only locations whose Civic Climate (CIV) is within 3 points of your CIV score.',lambda L,U:abs(L['s']['CIV']-U['CIV'])<=3),
 'NO_NE':('Exclude the Northeast & Mid-Atlantic region.',lambda L,U:L['region']!='Northeast & Mid-Atlantic'),
 'NO_SE':('Exclude the Southeast region.',lambda L,U:L['region']!='Southeast'),
 'NO_MW':('Exclude the Midwest region.',lambda L,U:L['region']!='Midwest'),
 'NO_SC':('Exclude the South Central region.',lambda L,U:L['region']!='South Central'),
 'NO_MS':('Exclude the Mountain & Southwest region.',lambda L,U:L['region']!='Mountain & Southwest'),
 'NO_PAC':('Exclude the Pacific region.',lambda L,U:L['region']!='Pacific'),
}
RELAX_ORDER=['AIRPORT','QUIET','SCHOOLS','NOCAR','MOUNTAINS','COAST','AFFORD','NOHUMID','NOHEAT','NOSNOW','URBANONLY','RURALONLY',
 'NO_NE','NO_SE','NO_MW','NO_SC','NO_MS','NO_PAC','FAITH','SECULAR','CIVMATCH','LGBTQ']

def loc_val(L,s):
    return L['s']['AFF'] if s=='COST' else L['s'][s]

def distance(U,L,s):
    u=U[s]; l=loc_val(L,s)
    if s=='COST': return max(0,u-l)
    if s in ASYM_HALF: return max(0,u-l)+0.5*max(0,l-u)
    return abs(u-l)

def weights(U,pri1,pri2):
    w={}
    for s in USCALES:
        x=1.0
        if U[s]<=2 or U[s]>=8: x*=1.5
        if pri1 and s in PRIGROUPS[pri1]: x*=2.0
        if pri2 and pri2!=pri1 and s in PRIGROUPS[pri2]: x*=1.5
        w[s]=x
    return w

def pct(x):
    # whole-number percentage, halves rounded up (used for clarity bands and the affinity threshold)
    import math
    return int(math.floor(x+0.5+1e-9))

def affinity(mbti,clar,L):
    s=L['s']; b=0.0; reasons=[]
    strong={sec for sec in L['careers']}
    def ok(letter): return pct(clar.get(letter,0))>=56
    rules=[('E',s['NIGHT']>=7 or s['SOC']>=8),('I',s['QUIET']>=7),
           ('S',s['OUT']>=8 or s['FAM']>=8 or 'HISTORY' in L['tags']),('N',s['ARTS']>=8 or 'COLLEGE' in L['tags']),
           ('T',bool(strong & {'TECH','FIN','GOV'})),('F',s['SOC']>=8 or s['DIV']>=8 or s['FAITH']>=8),
           ('J',s['FAM']>=8 or 'HISTORY' in L['tags'] or 'FAITH' in L['tags']),('P',s['NIGHT']>=7 or s['ARTS']>=8 or 'OUTDOOR' in L['tags'])]
    for letter,cond in rules:
        if letter in mbti and ok(letter) and cond: b+=0.5; reasons.append(letter)
    t=mbti
    temp=None
    if 'N' in t and 'F' in t: temp=('NF',s['ARTS']>=7 and s['SOC']>=7)
    elif 'N' in t and 'T' in t: temp=('NT',bool(strong & {'TECH','EDU'}) and bool({'COLLEGE','STARTUP'} & set(L['tags'])))
    elif 'S' in t and 'J' in t: temp=('SJ',s['FAM']>=8 and (s['FAITH']>=6 or 'HISTORY' in L['tags']))
    elif 'S' in t and 'P' in t: temp=('SP',s['OUT']>=8 or s['NIGHT']>=8)
    if temp and temp[1]: b+=1.0; reasons.append(temp[0])
    return min(3.0,b),reasons

def score_all(U,mbti,clar,career1,career2,tags,dbs,pri1,pri2):
    # filter
    active=list(dbs); relaxed=[]
    def survivors(act):
        return [L for L in LOCS if all(DB_RULES[d][1](L,U) for d in act)]
    surv=survivors(active)
    for d in RELAX_ORDER:
        if len(surv)>=3: break
        if d in active:
            active.remove(d); relaxed.append(d); surv=survivors(active)
    w=weights(U,pri1,pri2); W=sum(w.values())
    res=[]
    for L in surv:
        D={s:distance(U,L,s) for s in USCALES}
        base=100*(1-sum(w[s]*D[s] for s in USCALES)/(10*W))
        car=0.0
        if career1=='REMOTE': car=3.0+(2.0 if career2 in L['careers'] else 0.0)
        else:
            if career1 in L['careers']: car+=4.0
            if career2 and career2 in L['careers']: car+=2.0
        tg=min(6.0,1.5*len(set(tags)&set(L['tags'])))
        aff,why=affinity(mbti,clar,L)
        viol=sum(1 for s in USCALES if w[s]>=1.5 and D[s]>=4)
        res.append(dict(L=L,base=base,car=car,tag=tg,aff=aff,why=why,total=base+car+tg+aff,viol=viol,D=D,
                        civ=abs(U['CIV']-L['s']['CIV']),costgap=D['COST']))
    res.sort(key=lambda r:(-round(r['total'],1),-round(r['base'],1),r['viol'],r['civ'],r['costgap']))
    return res,w,relaxed,len(surv)
