import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import re, glob, random, os
SRC=os.path.join(ROOT,'src')
LIKERT=['Strongly agree','Agree','Neutral','Disagree','Strongly disagree']
MBTI_DIMS={'EI':('E','I'),'SN':('S','N'),'TF':('T','F'),'JP':('J','P'),'AT':('A','T')}
SCALES="URB PACE HEAT SEAS DRY MTN WATER DESERT FOREST ARTS OUT NIGHT SOC CIV FAITH COST FAM WALK QUIET DIV".split()
LET='ABCDE'

def parse_key(line, q):
    for seg in line.split(' | '):
        toks=seg.split()
        code=toks[0]; rest=toks[1:]
        if code=='NOTE':
            q['note']=True; continue
        if code in MBTI_DIMS:
            q['dim']=code; p1,p2=MBTI_DIMS[code]
            if rest[0].startswith('L='):
                pole=rest[0][2:]; other=p2 if pole==p1 else p1
                q['mbti']={'A':(pole,2),'B':(pole,1),'C':(None,0),'D':(other,1),'E':(other,2)}
            else:
                m={}
                for t in rest:
                    k,v=t.split('=')
                    m[k]=(v[0],int(v[1:])) if v!='0' else (None,0)
                q['mbti']=m
            continue
        if code in ('CAR','DB','PRI1','PRI2'):
            d={}
            for t in rest:
                k,v=t.split('='); d[k]=None if v=='-' else v
            q.setdefault('cat',{})[code]=d; continue
        if code=='TAG':
            d=q.setdefault('tag',{})
            if rest[0].startswith('L+'):
                tg=rest[0][2:]; d['A']=[(tg,2)]; d['B']=[(tg,1)]
            else:
                for t in rest:
                    k,v=t.split('=')
                    if v!='-': d.setdefault(k,[]).append((v,1))
            continue
        if code in SCALES:
            if rest[0] in ('L+','L-'):
                vals=[4,3,2,1,0] if rest[0]=='L+' else [0,1,2,3,4]
                q.setdefault('scales',{})[code]={L:v for L,v in zip(LET,vals)}
            else:
                d={}
                for t in rest:
                    k,v=t.split('='); d[k]=None if v=='-' else int(v)
                q.setdefault('scales',{})[code]=d
            continue
        raise ValueError(f'unknown key code {code} in {line}')

def load():
    parts=[]; cur=None; sub=None; q=None
    for f in sorted(glob.glob(SRC+'/*.txt')):
        for raw in open(f):
            line=raw.rstrip('\n')
            if not line.strip(): continue
            if line.startswith('# '):
                cur={'title':line[2:],'intro':'','subs':[]}; parts.append(cur)
            elif line.startswith('> '):
                cur['intro']=line[2:]
            elif line.startswith('## '):
                sub={'title':line[3:],'qs':[]}; cur['subs'].append(sub)
            elif line.startswith('Q. '):
                q={'text':line[3:],'opts':[],'likert':False,'file':os.path.basename(f)}; sub['qs'].append(q)
            elif line=='L.':
                q['likert']=True; q['opts']=LIKERT[:]
            elif re.match(r'^[A-F]\. ',line):
                q['opts'].append(line[3:])
            elif line.startswith('K. '):
                parse_key(line[3:],q)
            else:
                raise ValueError('bad line: '+line)
    # numbering, reversal, validation
    rnd=random.Random(2026); n=0
    for p in parts:
        for s in p['subs']:
            for q in s['qs']:
                n+=1; q['num']=n
                letters=LET[:len(q['opts'])]
                assert 2<=len(q['opts'])<=5, (n,q['text'])
                if 'mbti' in q and not q['likert'] and len(q['opts'])==4:
                    m=q['mbti']
                    if m['A'][1]==2 and m['D'][1]==2 and rnd.random()<0.5:
                        q['opts']=q['opts'][::-1]
                        q['mbti']={'A':m['D'],'B':m['C'],'C':m['B'],'D':m['A']}
                if 'mbti' in q:
                    for L in letters: assert L in q['mbti'],(n,L)
                for sc,d in q.get('scales',{}).items():
                    for L in letters: assert L in d,(n,sc,L,q['text'])
                    for k in d: assert k in letters,(n,sc,k)
                for c,d in q.get('cat',{}).items():
                    for k in d: assert k in letters,(n,c,k)
                for k in q.get('tag',{}): assert k in letters,(n,'tag',k)
                if not any(k in q for k in ('mbti','scales','cat','tag','note')):
                    raise ValueError(f'Q{n} has no key')
    return parts

if __name__=='__main__':
    parts=load()
    tot=sum(len(s['qs']) for p in parts for s in p['subs'])
    for p in parts:
        qs=[q for s in p['subs'] for q in s['qs']]
        print(f"{qs[0]['num']:>3}-{qs[-1]['num']:>3} ({len(qs)}) {p['title']}")
    print('TOTAL',tot)
