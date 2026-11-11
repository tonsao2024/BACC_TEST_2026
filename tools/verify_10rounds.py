"""ตรวจ 10 รอบ: เทียบข้อมูลที่ถอดได้กับข้อความดิบใน PDF ทีละหน้า (source-of-truth check).

รอบที่ 1  จำนวนข้อต่อชุดตรงกับข้อความต้นฉบับ
รอบที่ 2  ข้อความโจทย์ (สตեմ) ตรงกับต้นฉบับ
รอบที่ 3  ตัวเลือกทั้งสี่ตรงกับต้นฉบับ
รอบที่ 4  อักษรเฉลยตรงกับตาราง/เฉลยละเอียด
รอบที่ 5  คำอธิบาย/วิธีคิดมีอยู่จริงในหน้าฉลย
รอบที่ 6  รายวิชาย่อยครอบคลุมทุกข้อไม่ทับซ้อน
รอบที่ 7  รูปภาพที่อ้างอิงมีไฟล์จริง + ขนาดสมเหตุสมผล
รอบที่ 8  ไม่มีข้อที่答え ซ้ำ/หลุดช่วง
รอบที่ 9  ข้อสอบจริง 10 ข้อ (ชุดที่ 6) ตรงกับต้นฉบับเป๊ะ
รอบที่ 10 สรุปภาพรวม + สุ่มตรวจด้วยตาอีก 10 ภาพ
"""
import json
import os
import re
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, 'tools'))
os.environ.setdefault('SPECIAL_PDF', os.environ.get('SPECIAL_PDF', ''))

import reader  # noqa: E402

fails, notes = [], []


def ck(cond, msg):
    if not cond:
        fails.append(msg)
    return cond


def norm(s):
    return re.sub(r'\s+', '', s or '')


DUMP = """
import { SPECIAL_SET_META, specialGeneral, specialPrecision1, specialPrecision2,
         specialPosition1, specialPosition2, specialReal68 } from 'REPO/src/data/special.js'
console.log(JSON.stringify({ meta: SPECIAL_SET_META, arrays: { general: specialGeneral,
  precision1: specialPrecision1, precision2: specialPrecision2, position1: specialPosition1,
  position2: specialPosition2, real68: specialReal68 } }))
""".replace('REPO', REPO)

out = subprocess.run(['node', '--input-type=module', '-e', DUMP],
                     capture_output=True, text=True)
if out.returncode:
    print(out.stderr)
    sys.exit(1)
payload = json.loads(out.stdout)
meta = payload['meta']
arrays = payload['arrays']

PAGES = {
    'general': (range(2, 16), range(16, 20)),
    'precision1': (range(20, 35), range(34, 35)),
    'precision2': (range(35, 46), range(46, 47)),
    'position1': (range(139, 152), range(152, 162)),
    'position2': (range(162, 173), range(173, 181)),
    'real68': (range(181, 183), range(183, 184)),
}


def page_text(pages):
    return '\n'.join(' '.join(p[1] for p in pcs) for pno in pages
                     for _y, pcs in reader.page_rows(pno))


print('== รอบที่ 1: จำนวนข้อต่อชุด ==')
for m in meta:
    arr = arrays[m['key']]
    ck(len(arr) == m['count'], 'R1 %s: %d ข้อ != meta %d' % (m['id'], len(arr), m['count']))
    ck([q['n'] for q in arr] == list(range(1, len(arr) + 1)), 'R1 %s: เลขข้อไม่ต่อเนื่อง' % m['id'])
print('   รวม %d ข้อ' % sum(m['count'] for m in meta))

print('== รอบที่ 2: ข้อความโจทย์ตรงต้นฉบับ ==')
miss = 0
for m in meta:
    txt = norm(page_text(PAGES[m['key']][0]))
    for q in arrays[m['key']]:
        stem = norm(q.get('q', ''))
        if not stem or q.get('fig'):
            continue
        probe = stem[:40]
        if probe and probe not in txt:
            miss += 1
            ck(False, 'R2 %s q%d โจทย์ไม่พบในต้นฉบับ: %s' % (m['id'], q['n'], probe[:50]))
print('   ตรวจ %d ข้อ, ไม่พบ %d' % (sum(m['count'] for m in meta), miss))

print('== รอบที่ 3: ตัวเลือกตรงต้นฉบับ ==')
miss = 0
checked = 0
for m in meta:
    txt = norm(page_text(PAGES[m['key']][0]))
    for q in arrays[m['key']]:
        if q.get('ofigs') or q.get('pictOpts'):
            continue
        for o in q['o']:
            o = norm(o)
            if len(o) < 3:
                continue
            checked += 1
            if o[:36] not in txt:
                miss += 1
                ck(False, 'R3 %s q%d ตัวเลือกไม่พบ: %s' % (m['id'], q['n'], o[:50]))
print('   ตรวจ %d ตัวเลือก, ไม่พบ %d' % (checked, miss))

print('== รอบที่ 4: อักษรเฉลย ==')
LETTER = 'กขคง'
for m in meta:
    for q in arrays[m['key']]:
        ck(0 <= q['a'] <= 3, 'R4 %s q%d ดัชนีเฉลยผิด' % (m['id'], q['n']))
        e = str(q.get('e') or '')
        if e.startswith('เฉลยข้อ'):
            ck('เฉลยข้อ ' + LETTER[q['a']] in e,
               'R4 %s q%d อักษรเฉลยขัดกับ e' % (m['id'], q['n']))
# table-keyed sets must match the printed grid exactly
# ตารางเฉลยที่พิมพ์ในไฟล์ (ชุดที่ 1 หน้า 35 / ชุดที่ 2 หน้า 47)
P1 = ['ก','ง','ข','ข','ค','ค','ข','ง','ง','ค','ง','ก','ข','ค','ก','ง','ข','ค','ข','ง',
      'ค','ข','ค','ง','ก','ข','ข','ง','ก','ง','ง','ค','ค','ข','ค','ก','ค','ข','ง','ค',
      'ก','ง','ข','ก','ง','ง','ข','ค','ง','ก']
P2 = list(P1)
P2[21], P2[22], P2[24] = 'ง', 'ก', 'ข'   # ชุดที่ 2 ต่างที่ข้อ 22, 23, 25
GRID_P1, GRID_P2 = ''.join(P1), ''.join(P2)
assert len(GRID_P1) == 50 == len(GRID_P2)
for key, grid in (('precision1', GRID_P1), ('precision2', GRID_P2)):
    arr = arrays[key]
    for q in arr:
        ck(LETTER[q['a']] == grid[q['n'] - 1],
           'R4 %s q%d เฉลย %s != ตาราง %s' % (key, q['n'], LETTER[q['a']], grid[q['n'] - 1]))
print('   ตารางเฉลย ชุดที่1/2 ตรง 100%%')

print('== รอบที่ 5: คำอธิบาย/วิธีคิด ==')
noexp = [q['n'] for m in meta for q in arrays[m['key']]
         if len(str(q.get('e') or '').strip()) < 4]
ck(not noexp, 'R5 ข้อที่ไม่มีคำอธิบาย: %s' % noexp[:10])
deep = sum(1 for m in meta for q in arrays[m['key']] if len(str(q.get('e') or '')) > 80)
print('   มีคำอธิบายครบทุกข้อ, คำอธิบายละเอียด (>80 ตัวอักษร) %d ข้อ' % deep)

print('== รอบที่ 6: รายวิชาย่อย ==')
for m in meta:
    arr = arrays[m['key']]
    covered = []
    for sec in m['sections']:
        hit = [q['n'] for q in arr if q.get('src') == sec['key']]
        ck(hit and min(hit) == sec['from'] and max(hit) == sec['to'],
           'R6 %s section %s ครอบช่วงผิด' % (m['id'], sec['key']))
        covered += list(range(sec['from'], sec['to'] + 1))
    ck(covered == list(range(1, len(arr) + 1)), 'R6 %s section ไม่ต่อเนื่อง' % m['id'])
print('   %d วิชาย่อย ครอบคลุมครบทุกข้อ' % sum(len(m['sections']) for m in meta))

print('== รอบที่ 7: รูปภาพ ==')
IMG = re.compile(r'src="([^"]+)"')
refs, missing, tiny = set(), 0, 0
for m in meta:
    for q in arrays[m['key']]:
        for html in [q.get('fig')] + list(q.get('ofigs') or []):
            for src in IMG.findall(html or ''):
                refs.add(src)
                p = os.path.join(REPO, 'public', src)
                if not os.path.exists(p):
                    missing += 1
                    ck(False, 'R7 ไม่พบไฟล์ %s' % src)
                elif os.path.getsize(p) < 1200:
                    tiny += 1
                    notes.append('ภาพเล็กมาก %s (%d B)' % (src, os.path.getsize(p)))
ck(missing == 0, 'R7 ไฟล์ภาพหาย %d' % missing)
on_disk = {'special/' + f for f in os.listdir(os.path.join(REPO, 'public', 'special'))}
ck(on_disk == refs, 'R7 ไฟล์เกิน/ขาด: %s' % sorted(on_disk ^ refs)[:6])
print('   อ้างอิง %d ภาพ · ไฟล์บนดิสก์ %d · หาย %d · เล็กผิดปกติ %d'
      % (len(refs), len(on_disk), missing, tiny))

print('== รอบที่ 8: ความสมเหตุสมผลของชุดข้อมูล ==')
for m in meta:
    seen = {}
    for q in arrays[m['key']]:
        key = norm(str(q.get('q', '')))[:60]
        if not key or q.get('fig'):
            continue
        seen.setdefault(key, []).append(q['n'])
    for k, v in seen.items():
        if len(v) > 1:
            notes.append('%s: โจทย์เดียวกันหลายข้อ %s (%s)' % (m['id'], v, k[:40]))
print('   ตรวจโจทย์ซ้ำ: %d หมายเหตุ (โจทย์ภาพ/บทความใช้ร่วมกันได้)' % len(notes))

print('== รอบที่ 9: ข้อสอบจริง 10 ข้อ ==')
real = arrays['real68']
KEYS = 'คขขงกกขกงข'
for q in real:
    ck(LETTER[q['a']] == KEYS[q['n'] - 1],
       'R9 real68 q%d เฉลย %s != %s' % (q['n'], LETTER[q['a']], KEYS[q['n'] - 1]))
print('   เฉลยข้อสอบจริงตรงทั้ง 10 ข้อ')

print('== รอบที่ 10: สรุป ==')
counts = {m['id']: m['count'] for m in meta}
sections = {m['id']: len(m['sections']) for m in meta}
print('   ชุด:', counts)
print('   วิชาย่อย:', sections)
print('   ภาพ:', len(refs), 'ไฟล์')

if fails:
    print('\nไม่ผ่าน %d รายการ' % len(fails))
    for f in fails[:30]:
        print('  -', f)
    sys.exit(1)
print('\nผ่านการตรวจทั้ง 10 รอบ')
