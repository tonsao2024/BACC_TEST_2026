"""Emit src/data/special.js from the extracted dataset."""
import json, os, re

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DATA_PATH = os.path.join(REPO, '.special-build', 'prod.json')
import gen  # reuse the exam metadata

HEADER = '''/* พาร์ท "ข้อสอบพิเศษ" — ชุดข้อสอบจากไฟล์ต้นฉบับ
   “Baac69 พนักงานการเงินระดับ4 By พี่กุ๊กไก่ติวสอบบัญชี”
   ถอดข้อความ/ตัวเลือก/เฉลย/คำอธิบาย และครอปภาพประกอบจาก PDF ต้นฉบับ (185 หน้า)
   เจนเนอเรตอัตโนมัติจาก tools/special_build.py — ห้ามแก้ด้วยมือ
*/

'''


def js_str(s):
    return json.dumps(s, ensure_ascii=False)


LAT2TH = {'A': 'ก', 'B': 'ข', 'C': 'ค', 'D': 'ง', 'a': 'ก', 'b': 'ข', 'c': 'ค', 'd': 'ง'}


def thai_key(explain):
    """Rewrite an English 'เฉลยข้อ A.' key to Thai so it matches the choices."""
    return re.sub(r'(เฉลยข้อ\s*)([A-Da-d])(\s*[\.,])',
                  lambda m: m.group(1) + LAT2TH[m.group(2)] + m.group(3), explain)


def emit_question(q):
    lines = ['  {']
    lines.append(f'    "n": {q["num"]},')
    lines.append(f'    "t": {js_str(q["sectionLabel"] or "ข้อสอบพิเศษ")},')
    lines.append(f'    "l": "ปานกลาง",')
    lines.append(f'    "q": {js_str(q["stem"])},')
    lines.append('    "o": [')
    for o in q['opts']:
        lines.append(f'      {js_str(o)},')
    lines.append('    ],')
    lines.append(f'    "a": {q["answer"] if q["answer"] is not None else 0},')
    e = thai_key(q['explain'] or '')
    if not e:
        e = f'เฉลยข้อ {q["answerLetter"]}. {q["answerText"]}'.strip()
    lines.append(f'    "e": {js_str(e)},')
    if q['stemFig']:
        alt = q['stem'].replace('"', '').strip()[:60] or 'ภาพประกอบโจทย์'
        img = '<img src="%s" alt="%s" loading="lazy" />' % (q['stemFig'], alt)
        lines.append('    "fig": %s,' % js_str(img))
    if q['optFigs']:
        arr = []
        for f in q['optFigs']:
            arr.append(f'"<img src=\\"{f}\\" alt=\\"ตัวเลือกภาพ\\" loading=\\"lazy\\" />"')
        lines.append(f'    "ofigs": [{", ".join(arr)}],')
    if q.get('pictOpts'):
        lines.append('    "pictOpts": true,')
    lines.append(f'    "src": {js_str(q["sectionKey"] or "")},')
    lines.append('  },')
    return '\n'.join(lines)


def emit():
    DATA = json.load(open(DATA_PATH))
    out = [HEADER]
    sets = []
    for cfg in gen.EXAMS:
        qs = DATA[cfg['key']]
        var = 'special' + ''.join(p.capitalize() for p in re.split('[^a-zA-Z0-9]', cfg['key']) if p)
        out.append(f'export const {var} = [')
        for q in qs:
            out.append(emit_question(q))
        out.append(']')
        out.append('')
        sets.append((cfg, var, len(qs)))
    # metadata + sections
    out.append('/* ---------- รายวิชาย่อย (section) ของแต่ละชุด ---------- */')
    out.append('export const SPECIAL_SET_META = [')
    for cfg, var, n in sets:
        secs = ', '.join(
            '{ key: %s, label: %s, color: %s, from: %d, to: %d, count: %d }'
            % (js_str(s[2]), js_str(s[3]), js_str(s[4]), s[0], s[1], s[1] - s[0] + 1)
            for s in cfg['sections']
        )
        out.append('  {')
        out.append(f'    id: {js_str(cfg["id"])},')
        out.append(f'    key: {js_str(cfg["key"])},')
        out.append(f'    title: {js_str(cfg["title"])},')
        out.append(f'    short: {js_str(cfg["short"])},')
        out.append(f'    desc: {js_str(cfg["desc"])},')
        out.append(f'    minutes: {cfg["minutes"]},')
        out.append(f'    points: {cfg["points"]},')
        out.append(f'    color: {js_str(cfg["color"])},')
        out.append(f'    color2: {js_str(cfg["color2"])},')
        out.append(f'    count: {n},')
        out.append(f'    sections: [{secs}],')
        out.append(f'    questions: {var},')
        out.append('  },')
    out.append(']')
    out.append('')
    open(os.path.join(REPO, 'src', 'data', 'special.js'), 'w').write('\n'.join(out))
    print('written', os.path.getsize(os.path.join(REPO, 'src', 'data', 'special.js')))


import re
if __name__ == '__main__':
    emit()
