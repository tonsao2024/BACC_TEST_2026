#!/usr/bin/env python3
"""แปลงข้อความที่แตกจาก docx (out_bank/*.txt) ให้เป็นชุดข้อมูล src/data/set1-3.js

โครงเอกสารต้นฉบับ (ทุกเล่มเหมือนกัน — ผ่าน QA 12 รอบ):
  [intro] ข้อ 1. ...  › ...  1)..4)  ... ข้อ 100. ...
  เฉลยและคำอธิบาย — <ชื่อพาร์ท>
  ข้อ 1. เฉลย  X. <คำตอบ>
  <คำอธิบายหลายบรรทัด>
  ...
  [TABLE กระดาษคำตอบ ○ ...]

- out_bank/bank01.txt มี 3 วิชา (แยกด้วยหัวข้อเฉลย 3 ชุด) → ใช้เฉพาะ วิชาที่ 2 (ความละเอียดแม่นยำ)
- out_bank/p14.txt มี marker [IMG /word/media/imageN.png] ในตัวโจทย์ → แนบเป็น fig: <img>
usage: python tools/build_bank.py
"""
import json
import os
import re
import sys

SRC = 'out_bank'
OUT = 'src/data'

LETTER = {'1': 0, '2': 1, '3': 2, '4': 3, 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3,
          'a': 0, 'b': 1, 'c': 2, 'd': 3}

RE_Q = re.compile(r'^(◆)?\s*ข้อ\s*(\d+)\.\s*(.*)$')
RE_ANS = re.compile(r'^ข้อ\s*(\d+)\.\s*เฉลย\s+([1-4กขคงa-d])\.\s*(.*)$')
RE_ANSHEAD = re.compile(r'^\s*เฉลยและคำอธิบาย')
RE_TOPIC = re.compile(r'^(?!\[)(.+?)\s*›\s*(.+)$')
RE_OPT = re.compile(r'^([1-4])\)\s+(.*)$')
RE_IMG = re.compile(r'^\[IMG\s+(/\S+)\]$')


def clean(s):
    return re.sub(r'[ \t]+', ' ', s.replace(' ', ' ').replace('​', '')).strip()


def read_lines(path):
    with open(path, encoding='utf-8') as f:
        # ไม่ยุบช่องว่างภายในบรรทัด — พาร์ท 2 (ความละเอียดแม่นยำ) ใช้จำนวนช่องว่างเป็นสาระสำคัญ
        return [l.replace(' ', ' ').replace('\u00a0', ' ').strip() for l in f.read().split('\n')]


def split_sections(lines):
    """แยกเป็น (qzone_lines, azone_lines) คู่กัน โดยตัดที่หัวข้อ เฉลยและคำอธิบาย..."""
    sections = []
    buf = []
    cur_q = []
    for line in lines:
        if RE_ANSHEAD.match(line):
            cur_q = buf
            buf = None
            break
        if buf is not None:
            buf.append(line)
        else:
            buf = [line]
    # วนแบบง่าย: หา index ของหัวข้อเฉลยทั้งหมด แล้วตัดช่วง
    heads = [i for i, l in enumerate(lines) if RE_ANSHEAD.match(l)]
    if not heads:
        return []
    for idx, h in enumerate(heads):
        q_start = sections[-1][1] if sections else 0
        q_end = h
        a_start = h + 1
        a_end = heads[idx + 1] if idx + 1 < len(heads) else len(lines)
        sections.append((q_start, q_end, a_start, a_end))
    out = []
    for a, b, c, d in sections:
        ql, al = lines[a:b], lines[c:d]
        # ตัดหัวทิ้งจนถึง marker วิชา/พาร์ท ตัวสุดท้าย (กันโซนเฉลยของวิชาก่อนหน้าหลุดมา)
        marks = [i for i, l in enumerate(ql) if re.match(r'^(วิชาที่\s*\d|พาร์ท\s*\d)', l)]
        if marks:
            ql = ql[marks[-1]:]
        out.append((ql, al))
    return out


def parse_questions(qlines, exact_space=False):
    """exact_space=True → คงช่องว่างภายในตัวเลือกไว้ (พาร์ทความละเอียดแม่นยำ)"""
    qs = []
    cur = None
    lastopt = None
    in_tbl = False

    def val(s):
        return s if exact_space else clean(s)

    def push():
        nonlocal cur
        if cur is not None:
            qs.append(cur)
        cur = None

    for s in qlines:
        if not s:
            continue
        if s == '[TABLE]':
            in_tbl = True
            continue
        if s == '[/TABLE]':
            in_tbl = False
            continue
        if in_tbl:
            continue
        m = RE_Q.match(s)
        if m:
            push()
            cur = {'n': int(m.group(2)), 'q': clean(m.group(3)), 'o': [None] * 4,
                   't': '', 'part': '', 'imgs': [], 'trap': bool(m.group(1))}
            lastopt = None
            continue
        if cur is None:
            continue
        im = RE_IMG.match(s)
        if im:
            cur['imgs'].append(os.path.basename(im.group(1)))
            continue
        tm = RE_TOPIC.match(s)
        if tm and not cur['t']:
            cur['part'] = clean(tm.group(1))
            cur['t'] = clean(tm.group(2))
            continue
        om = RE_OPT.match(s)
        if om:
            i = int(om.group(1)) - 1
            cur['o'][i] = val(om.group(2))
            lastopt = i
            continue
        # บรรทัดต่อเนื่อง: ต่อท้ายตัวเลือกล่าสุด ไม่งั้นต่อท้ายโจทย์
        if lastopt is not None:
            cur['o'][lastopt] = ((cur['o'][lastopt] or '') + ' ' + val(s)).strip()
        else:
            cur['q'] = (cur['q'] + ' ' + clean(s)).strip()
    push()
    return qs


def parse_answers(alines):
    ans = {}
    n = None
    in_tbl = False
    for s in alines:
        if s == '[TABLE]':
            in_tbl = True
            continue
        if s == '[/TABLE]':
            in_tbl = False
            continue
        if in_tbl or not s:
            continue
        m = RE_ANS.match(s)
        if m:
            n = int(m.group(1))
            ans[n] = {'a': LETTER[m.group(2)], 'etext': clean(m.group(3)), 'lines': []}
            continue
        if n is not None:
            im = RE_IMG.match(s)
            if im:
                continue
            ans[n]['lines'].append(s)
    return ans


def assemble(qs, ans, img_prefix=None):
    """รวมโจทย์+เฉลย เป็น item ของระบบ พร้อม QA"""
    items = []
    problems = []
    seen = set()
    for q in qs:
        n = q['n']
        opts = [o for o in q['o'] if o]
        a = ans.get(n)
        if len(opts) != 4:
            problems.append(f'ข้อ {n}: ตัวเลือก {len(opts)}/4')
            continue
        if a is None:
            problems.append(f'ข้อ {n}: ไม่พบเฉลย')
            continue
        key = (re.sub(r'\s+', '', q['q']).lower() + '|'
               + '||'.join(o.lower() for o in opts)
               + '|' + ','.join(q['imgs']))
        if key in seen:
            problems.append(f'ข้อ {n}: โจทย์และตัวเลือกซ้ำเป๊ะ')
            continue
        seen.add(key)
        e_lines = [a['etext']] if a['etext'] else []
        e_lines += a['lines']
        item = {
            't': q['t'] or q['part'] or 'ทั่วไป',
            'l': 'ยาก' if q['trap'] else 'ปานกลาง',
            'q': q['q'],
            'o': opts,
            'a': a['a'],
            'e': '\n'.join(e_lines).strip(),
        }
        if q['imgs'] and img_prefix:
            tags = ''.join(
                f'<img src="{img_prefix}{name}" alt="ภาพประกอบโจทย์" loading="lazy" />'
                for name in q['imgs'])
            item['fig'] = tags
        elif q['imgs']:
            problems.append(f'ข้อ {n}: มีภาพแต่ไม่ได้กำหนด img_prefix')
        items.append(item)
    return items, problems


def qa_report(name, items, expect=100):
    from collections import Counter
    dist_a = Counter(i['a'] for i in items)
    dist_t = Counter(i['t'] for i in items)
    return {
        'name': name, 'count': len(items), 'expect': expect,
        'ok': len(items) == expect,
        'answers': dict(sorted(dist_a.items())),
        'topics': dict(dist_t.most_common()),
        'with_fig': sum(1 for i in items if 'fig' in i),
        'empty_e': sum(1 for i in items if not i['e']),
    }


def emit_js(path, header, exports):
    parts = [f'/* {header}\n   เจนเนอเรตอัตโนมัติจากไฟล์ต้นฉบับ (tools/build_bank.py) — ห้ามแก้ด้วยมือ */\n']
    for name, arr in exports:
        parts.append(f'export const {name} = {json.dumps(arr, ensure_ascii=False, indent=2)}\n')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))


def main():
    reports = []
    all_problems = {}

    def build(txt_name, label, section_idx=0, img_prefix=None, exact_space=False):
        lines = read_lines(os.path.join(SRC, txt_name))
        sections = split_sections(lines)
        if section_idx >= len(sections):
            raise RuntimeError(f'{txt_name}: ไม่พบเซกชันที่ {section_idx} (มี {len(sections)})')
        ql, al = sections[section_idx]
        qs = parse_questions(ql, exact_space=exact_space)
        ans = parse_answers(al)
        items, problems = assemble(qs, ans, img_prefix)
        reports.append(qa_report(label, items))
        if problems:
            all_problems[label] = problems
        return items

    set1 = [
        ('part11', build('p11.txt', '1-1')),
        ('part12', build('p12.txt', '1-2')),
        ('part13', build('p13.txt', '1-3')),
        ('part14', build('p14.txt', '1-4', img_prefix='bank/p14/')),
        ('part15', build('p15.txt', '1-5')),
    ]
    part2 = build('bank01.txt', '2', section_idx=1, exact_space=True)
    set3 = [
        ('part31', build('p31.txt', '3-1')),
        ('part32', build('p32.txt', '3-2')),
        ('part33', build('p33.txt', '3-3')),
        ('part34', build('p34.txt', '3-4')),
        ('part35', build('p35.txt', '3-5')),
    ]

    emit_js(os.path.join(OUT, 'set1.js'), 'Part 1 — ความรู้ความสามารถทั่วไป (1.1–1.5) · 100 ข้อ/พาร์ท · ต้นฉบับ ธ.ก.ส. 2569', set1)
    emit_js(os.path.join(OUT, 'set2.js'), 'Part 2 — ความละเอียดแม่นยำ · 100 ข้อ · ต้นฉบับคลัง 300 ข้อ (วิชาที่ 2)', [('part2', part2)])
    emit_js(os.path.join(OUT, 'set3.js'), 'Part 3 — ความรู้เฉพาะตำแหน่ง (3.1–3.5) · 100 ข้อ/พาร์ท · ต้นฉบับ ธ.ก.ส. 2569', set3)

    print(json.dumps(reports, ensure_ascii=False, indent=1))
    if all_problems:
        print('\nPROBLEMS:')
        for k, v in all_problems.items():
            print(f'  {k}: {len(v)}')
            for p in v[:8]:
                print('   -', p)
        sys.exit(1)
    bad = [r for r in reports if not r['ok']]
    if bad:
        print('\nCOUNT MISMATCH:', [r['name'] for r in bad])
        sys.exit(2)
    print('\nALL OK — 11 พาร์ท × 100 ข้อ')


if __name__ == '__main__':
    main()
