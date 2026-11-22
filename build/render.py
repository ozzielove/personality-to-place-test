import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import sys
sys.path.insert(0,os.path.join(ROOT,'build'))
exec(open(os.path.join(ROOT,'build','build.py')).read())
OUT=ROOT+os.sep
# ---------------- Markdown
def esc(t): return t.replace('|','\\|')
md=[]
for el in E:
    k=el[0]
    if k=='h':
        md.append('#'*(el[1]+1)+' '+el[2]); md.append('')
    elif k=='p': md.append(el[1]); md.append('')
    elif k=='ul': md += ['- '+x for x in el[1]]; md.append('')
    elif k=='ol': md += [f'{i}. '+x for i,x in enumerate(el[1],1)]; md.append('')
    elif k=='q':
        _,n,text,opts=el
        md.append(f'**{n}.** {text}'); md.append('')
        md += [f'- {L}) {o}' for L,o in zip(LET,opts)]; md.append('')
    elif k=='table':
        _,hd,rows,small=el
        md.append('| '+' | '.join(esc(x) for x in hd)+' |'); md.append('|'+'|'.join(['---']*len(hd))+'|')
        md += ['| '+' | '.join(esc(x) for x in r)+' |' for r in rows]; md.append('')
    elif k=='pb': md.append('---'); md.append('')
open(OUT+'Personality_to_Place_Test.md','w').write('\n'.join(md))
# ---------------- DOCX
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
doc=Document()
sec=doc.sections[0]
sec.page_width=Inches(8.5); sec.page_height=Inches(11)
for m in ('left_margin','right_margin'): setattr(sec,m,Inches(0.7))
sec.top_margin=Inches(0.7); sec.bottom_margin=Inches(0.7)
st=doc.styles['Normal']; st.font.name='Calibri'; st.font.size=Pt(10.5)
st.element.rPr.rFonts.set(qn('w:eastAsia'),'Calibri')
st.paragraph_format.space_after=Pt(4)
NAVY=RGBColor(0x1F,0x3A,0x5F)
for nm,sz in [('Title',26),('Heading 1',18),('Heading 2',14),('Heading 3',12)]:
    s=doc.styles[nm]; s.font.name='Calibri'; s.font.size=Pt(sz); s.font.color.rgb=NAVY
    rpr=s.element.get_or_add_rPr(); rf=rpr.find(qn('w:rFonts'))
    if rf is None: rf=OxmlElement('w:rFonts'); rpr.append(rf)
    for a in ('w:ascii','w:hAnsi','w:eastAsia','w:cs'): rf.set(qn(a),'Calibri')
# footer page numbers
fp=sec.footer.paragraphs[0]; fp.alignment=WD_ALIGN_PARAGRAPH.CENTER
run=fp.add_run('The Personality-to-Place Inventory  ·  Page '); run.font.size=Pt(8)
r2=fp.add_run(); r2.font.size=Pt(8)
for t,txt in [('begin',None),(None,'PAGE'),('end',None)]:
    if t:
        f=OxmlElement('w:fldChar'); f.set(qn('w:fldCharType'),t); r2._r.append(f)
    else:
        it=OxmlElement('w:instrText'); it.set(qn('xml:space'),'preserve'); it.text=txt; r2._r.append(it)
def shade(cell,color):
    tcPr=cell._tc.get_or_add_tcPr(); sh=OxmlElement('w:shd'); sh.set(qn('w:val'),'clear'); sh.set(qn('w:color'),'auto'); sh.set(qn('w:fill'),color); tcPr.append(sh)
def repeat_header(row):
    trPr=row._tr.get_or_add_trPr(); e=OxmlElement('w:tblHeader'); e.set(qn('w:val'),'true'); trPr.append(e)
first_h0=True
for el in E:
    k=el[0]
    if k=='h':
        lvl=el[1]
        if lvl==0:
            para=doc.add_paragraph(el[2],style='Title'); para.alignment=WD_ALIGN_PARAGRAPH.CENTER
        else:
            doc.add_heading(el[2],level=lvl)
    elif k=='p':
        para=doc.add_paragraph(el[1])
    elif k=='ul':
        for x in el[1]:
            para=doc.add_paragraph(x,style='List Bullet')
            para.paragraph_format.space_after=Pt(2)
    elif k=='ol':
        for i,x in enumerate(el[1],1):
            para=doc.add_paragraph()
            para.paragraph_format.left_indent=Inches(0.3); para.paragraph_format.first_line_indent=Inches(-0.25)
            para.paragraph_format.space_after=Pt(2)
            r=para.add_run(f'{i}.  '); r.bold=True
            para.add_run(x)
    elif k=='q':
        _,n,text,opts=el
        para=doc.add_paragraph(); para.paragraph_format.space_before=Pt(6); para.paragraph_format.space_after=Pt(1)
        para.paragraph_format.keep_with_next=True
        r=para.add_run(f'{n}. '); r.bold=True; r.font.color.rgb=NAVY
        r=para.add_run(text); r.bold=True
        for i,(L,o) in enumerate(zip(LET,opts)):
            op=doc.add_paragraph(); op.paragraph_format.left_indent=Inches(0.35); op.paragraph_format.space_after=Pt(0)
            if i<len(opts)-1: op.paragraph_format.keep_with_next=True
            rr=op.add_run(f'{L})  '); rr.bold=True; rr.font.size=Pt(10)
            rr=op.add_run(o); rr.font.size=Pt(10)
    elif k=='table':
        _,hd,rows,small=el
        t=doc.add_table(rows=1,cols=len(hd)); t.style='Table Grid'; t.alignment=WD_TABLE_ALIGNMENT.CENTER
        fs=Pt(7.5) if small else Pt(9)
        for i,x in enumerate(hd):
            c=t.rows[0].cells[i]; c.text=''; r=c.paragraphs[0].add_run(x); r.bold=True; r.font.size=fs; r.font.color.rgb=RGBColor(0xFF,0xFF,0xFF); shade(c,'1F3A5F')
        repeat_header(t.rows[0])
        for ri,row in enumerate(rows):
            cells=t.add_row().cells
            for i,x in enumerate(row):
                cells[i].text=''; pr=cells[i].paragraphs[0]; pr.paragraph_format.space_after=Pt(0)
                r=pr.add_run(x); r.font.size=fs
                if ri%2==1: shade(cells[i],'EEF2F7')
        lens=[max([len(hd[i])*0.8]+[len(r[i]) for r in rows]) for i in range(len(hd))]
        lens=[min(max(l,3),60) for l in lens]; tot=sum(lens)
        widths=[Inches(7.1*l/tot) for l in lens]
        t.autofit=False
        for i,col in enumerate(t.columns): col.width=widths[i]
        tblPr=t._tbl.tblPr; lay=OxmlElement('w:tblLayout'); lay.set(qn('w:type'),'fixed'); tblPr.append(lay)
        for row in t.rows:
            for i,c in enumerate(row.cells): c.width=widths[i]
        doc.add_paragraph()
    elif k=='pb':
        doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
doc.core_properties.author='Personality-to-Place Inventory'; doc.core_properties.title='The Personality-to-Place Inventory'; doc.core_properties.comments=''
doc.save(OUT+'Personality_to_Place_Test.docx')
print('done')
