"""ตรวจความถูกต้อง/ครบถ้วน/สมบูรณ์ ของพาร์ท "ข้อสอบพิเศษ" — 5 รอบ

รอบ 1  ครบทุกข้อ: เลขข้อใน PDF = ข้อมูลในระบบ (ไม่มีตกหล่น/ซ้ำ)
รอบ 2  เฉลยถูกและอ้างอิงได้: letter ตรง index, คำตอบตรงตัวเลือก, มีคำอธิบายทุกข้อ
รอบ 3  ตอบได้ทุกข้อ: มีโจทย์ (ข้อความหรือภาพ) + ตัวเลือกครบ 4 (ข้อความหรือภาพ)
รอบ 4  รายวิชาย่อย: ครอบคลุม 1..N ต่อเนื่อง ไม่ทับซ้อน + เมทาดาต้าตรง
รอบ 5  รูปภาพ: ทุกไฟล์ที่อ้างอิงมีจริง, ไม่มีไฟล์กำพร้า, ขนาดพออ่าน

usage: SPECIAL_PDF=... python3 tools/verify_5rounds.py
"""
import json
import os
import re
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, 'tools'))
import reader  # noqa: E402

L = 'กขคง'
IMG = re.compile(r'src="([^"]+)"')
RE_Q = re.compile(r'^\s*(\d{1,3})\s*[\.\)]\s*')
RE_ANS = re.compile(r'^\s*\d{1,3}\s*[\.\)]?\s*ตอบ')
PAGES = {'general': range(2, 16), 'precision1': range(20, 35),
         'precision2': range(35, 46), 'position1': range(139, 152),
         'position2': range(162, 173), 'real68': range(181, 183)}

DUMP = """
import { SPECIAL_SET_META, specialGeneral, specialPrecision1, specialPrecision2,
         specialPosition1, specialPosition2, specialReal68 } from 'REPO/src/data/special.js'
console.log(JSON.stringify({ meta: SPECIAL_SET_META, arrays: { general: specialGeneral,
  precision1: specialPrecision1, precision2: specialPrecision2,
  position1: specialPosition1, position2: specialPosition2, real68: specialReal68 } }))
""".replace('REPO', REPO)

out = subprocess.run(['node', '--input-type=module', '-e', DUMP],
                     capture_output=True, text=True)
if out.returncode:
    print(out.stderr)
    sys.exit(1)
payload = json.loads(out.stdout)
meta = {m['key']: m for m in payload['meta']}
data = payload['arrays']

fails = []
summary = []


def fail(msg):
    fails.append(msg)


def norm(s):
    return re.sub(r'\s+', '', s or '')


# ---------------------------------------------------------------- รอบ 1
print('== รอบ 1: ครบทุกข้อ ==')
pdf_nums = {}
for key, pages in PAGES.items():
    found = []
    for pno in pages:
        for _y, pcs in reader.page_rows(pno):
            x0, t0, bold, _size = pcs[0]
            m = RE_Q.match(t0)
            if m and x0 < 115 and not bold and not RE_ANS.match(t0):
                found.append(int(m.group(1)))
    pdf_nums[key] = found
    exp = list(range(1, meta[key]['count'] + 1))
    miss = [n for n in exp if n not in found]
    dup = sorted(n for n in set(found) if found.count(n) > 1)
    if miss:
        fail('R1 %s: ขาดข้อ %s' % (key, miss))
    if dup:
        fail('R1 %s: เลขข้อซ้ำ %s' % (key, dup))
    if len(data[key]) != meta[key]['count']:
        fail('R1 %s: จำนวนข้อ %d != %d' % (key, len(data[key]), meta[key]['count']))
    if [q['n'] for q in data[key]] != exp:
        fail('R1 %s: ลำดับเลขข้อไม่ต่อเนื่อง' % key)
    print('   %-11s pdf=%3d data=%3d' % (key, len(found), len(data[key])))

# ---------------------------------------------------------------- รอบ 2
print('== รอบ 2: เฉลยถูกต้อง ==')
ptexts = {}
for key, pages in PAGES.items():
    ptexts[key] = norm(' '.join(' '.join(p[1] for p in pcs)
                                for pno in pages for _y, pcs in reader.page_rows(pno)))
n_noexp = n_bad_letter = n_badopt = n_missing_text = 0
for key, arr in data.items():
    for q in arr:
        e = (q.get('e') or '').strip()
        if not e:
            n_noexp += 1
            fail('R2 %s q%d: ไม่มีคำอธิบาย/เฉลย' % (key, q['n']))
        if not (0 <= q['a'] <= 3):
            fail('R2 %s q%d: ดัชนีเฉลย %s' % (key, q['n'], q['a']))
            continue
        if len(q['o']) != 4:
            n_badopt += 1
            fail('R2 %s q%d: ตัวเลือก %d ข้อ' % (key, q['n'], len(q['o'])))
        m = re.match(r'^เฉลยข้อ\s*([กขคง])', e)
        if e.startswith('เฉลยข้อ'):
            if not m:
                fail('R2 %s q%d: รูปแบบเฉลยผิด %r' % (key, q['n'], e[:30]))
            elif m.group(1) != L[q['a']]:
                n_bad_letter += 1
                fail('R2 %s q%d: อักษรเฉลย %s != %s' % (key, q['n'], m.group(1), L[q['a']]))
        if not q.get('ofigs') and not q.get('pictOpts'):
            probe = norm(q['o'][q['a']])[:30]
            if probe and probe not in ptexts[key]:
                n_missing_text += 1
                fail('R2 %s q%d: ข้อความเฉลยไม่พบใน PDF: %s' % (key, q['n'], probe))
print('   ไม่มีคำอธิบาย %d · อักษรเฉลยผิด %d · ตัวเลือกไม่ครบ %d · ข้อความเฉลยไม่พบ %d'
      % (n_noexp, n_bad_letter, n_badopt, n_missing_text))

# ---------------------------------------------------------------- รอบ 3
print('== รอบ 3: ตอบได้ครบทุกข้อ ==')
st = {'text': 0, 'img': 0, 'strip': 0}
for key, arr in data.items():
    for q in arr:
        ofigs = [x for x in (q.get('ofigs') or []) if x]
        if ofigs:
            st['img'] += 1
            if len(ofigs) != 4:
                fail('R3 %s q%d: ตัวเลือกภาพ %d/4' % (key, q['n'], len(ofigs)))
        elif q.get('pictOpts'):
            st['strip'] += 1
        else:
            st['text'] += 1
            if not all((o or '').strip() for o in q['o']):
                fail('R3 %s q%d: ตัวเลือกว่าง' % (key, q['n']))
        if not (q.get('q') or '').strip() and not q.get('fig'):
            fail('R3 %s q%d: ไม่มีโจทย์ทั้งข้อความและภาพ' % (key, q['n']))
print('   ตัวเลือกข้อความ %d · ตัวเลือกภาพ 4 ภาพ %d · ภาพรวมทั้งข้อ %d'
      % (st['text'], st['img'], st['strip']))

# ---------------------------------------------------------------- รอบ 4
print('== รอบ 4: รายวิชาย่อย ==')
for key, m in meta.items():
    arr = data[key]
    covered = []
    for sec in m['sections']:
        hit = [q['n'] for q in arr if q.get('src') == sec['key']]
        if not hit or min(hit) != sec['from'] or max(hit) != sec['to']:
            fail('R4 %s/%s: ช่วงข้อไม่ตรง (%s)' % (key, sec['key'], (min(hit), max(hit)) if hit else None))
        if sec['count'] != sec['to'] - sec['from'] + 1:
            fail('R4 %s/%s: count ไม่ตรงช่วง' % (key, sec['key']))
        covered += list(range(sec['from'], sec['to'] + 1))
    if covered != list(range(1, len(arr) + 1)):
        fail('R4 %s: วิชาย่อยไม่ต่อเนื่อง/ทับซ้อน' % key)
print('   %d วิชาย่อย ครอบคลุม %d ข้อ' % (sum(len(m['sections']) for m in meta.values()),
                                          sum(len(v) for v in data.values())))

# ---------------------------------------------------------------- รอบ 5
print('== รอบ 5: รูปภาพ ==')
refs = set()
for key, arr in data.items():
    for q in arr:
        for html in [q.get('fig')] + list(q.get('ofigs') or []):
            for src in IMG.findall(html or ''):
                refs.add(src)
                p = os.path.join(REPO, 'public', src)
                if not os.path.exists(p):
                    fail('R5 ไม่พบไฟล์ %s' % src)
                elif os.path.getsize(p) < 700:
                    fail('R5 ไฟล์เล็กผิดปกติ %s (%d B)' % (src, os.path.getsize(p)))
disk = {'special/' + f for f in os.listdir(os.path.join(REPO, 'public', 'special'))}
if disk != refs:
    fail('R5 ไฟล์กำพร้า/ขาด: %s' % sorted(disk ^ refs)[:8])
total = sum(os.path.getsize(os.path.join(REPO, 'public', s)) for s in refs)
print('   อ้างอิง %d ภาพ · บนดิสก์ %d · รวม %.1f MB' % (len(refs), len(disk), total / 1e6))

print()
if fails:
    print('ไม่ผ่าน %d รายการ' % len(fails))
    for f in fails[:25]:
        print('  -', f)
    sys.exit(1)
print('ผ่านการตรวจทั้ง 5 รอบ ✓')
