"""Generate src/data/special.js + public/special/*.png for the 'ข้อสอบพิเศษ' part."""
import json, os, re, shutil
import figs4
import reader
import answers as A
import assemble

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
IMG_OUT = os.path.join(REPO, 'public', 'special')
JS_OUT = os.path.join(REPO, 'src', 'data', 'special.js')

# ---------------------------------------------------------------- exam definitions
EXAMS = [
    {
        'key': 'general', 'id': 'special-general',
        'title': 'แนวข้อสอบความรู้ความสามารถทั่วไป',
        'short': 'ความรู้ทั่วไป',
        'desc': 'ข้อสอบปรนัย 80 ข้อ (100 คะแนน) ใช้เวลา 1 ชั่วโมง 30 นาที — คณิตศาสตร์ ภาษาไทย ภาษาอังกฤษ และมิติสัมพันธ์',
        'minutes': 90, 'points': 100, 'color': '#1D4ED8', 'color2': '#60A5FA',
        'pages': range(2, 16), 'ans': ('detail', range(16, 20)),
        'sections': [
            (1, 11, 'math', 'คณิตศาสตร์และอนุกรม', '#1D4ED8'),
            (12, 20, 'visual', 'มิติสัมพันธ์และเหตุผลเชิงภาพ', '#C2410C'),
            (21, 33, 'thai', 'ภาษาไทย · การอ่านจับใจความ', '#0F766E'),
            (34, 50, 'thai2', 'ภาษาไทย · สรุปความและลำดับข้อความ', '#0E7490'),
            (51, 60, 'english', 'ภาษาอังกฤษ · Structure & Vocabulary', '#0369A1'),
            (61, 65, 'english2', 'ภาษาอังกฤษ · Conversation', '#075985'),
            (66, 80, 'english3', 'ภาษาอังกฤษ · Reading Comprehension', '#0C4A6E'),
        ],
    },
    {
        'key': 'precision1', 'id': 'special-precision-1',
        'title': 'แนวข้อสอบความละเอียดแม่นยำ ชุดที่ 1',
        'short': 'ละเอียดแม่นยำ 1',
        'desc': 'ข้อสอบจำนวน 50 ข้อ (50 คะแนน) ใช้เวลา 30 นาที — เปรียบเทียบอักขระ หาภาพเหมือน และอ่านข้อมูลจากภาพ',
        'minutes': 30, 'points': 50, 'color': '#E11D48', 'color2': '#FDA4AF',
        'pages': range(20, 35), 'ans': ('table', [34]),
        'sections': [
            (1, 9, 'compare', 'เปรียบเทียบอักขระและตัวเลข', '#E11D48'),
            (10, 19, 'findimg', 'หาภาพที่เหมือนและแตกต่าง', '#C2410C'),
            (20, 24, 'chart', 'วิเคราะห์กราฟและตาราง', '#0E7490'),
            (25, 33, 'visual', 'มิติสัมพันธ์ · พับกล่องและหมุนภาพ', '#1D4ED8'),
            (34, 50, 'app', 'อ่านข้อมูลจากภาพ · แอปเป๋าตัง/คนละครึ่ง', '#0891B2'),
        ],
    },
    {
        'key': 'precision2', 'id': 'special-precision-2',
        'title': 'แนวข้อสอบความละเอียดแม่นยำ ชุดที่ 2',
        'short': 'ละเอียดแม่นยำ 2',
        'desc': 'ข้อสอบจำนวน 50 ข้อ (50 คะแนน) ใช้เวลา 30 นาที — เปรียบเทียบอักขระ หาภาพเหมือน ภาษี สลากกินแบ่ง และลูกบาศก์',
        'minutes': 30, 'points': 50, 'color': '#BE123C', 'color2': '#FECDD3',
        'pages': range(35, 46), 'ans': ('table', [46]),
        'sections': [
            (1, 5, 'compare', 'เปรียบเทียบอักขระและตัวเลข', '#E11D48'),
            (6, 25, 'findimg', 'หาภาพที่เหมือนและแตกต่าง', '#C2410C'),
            (26, 30, 'tax', 'วิเคราะห์ข้อมูลภาษีเงินได้', '#0E7490'),
            (31, 34, 'odd', 'มิติสัมพันธ์ · ภาพต่างพวก', '#1D4ED8'),
            (35, 40, 'lottery', 'อ่านข้อมูลจากภาพสลากกินแบ่ง', '#0891B2'),
            (41, 45, 'symbol', 'แปลงข้อความเป็นสัญลักษณ์', '#047857'),
            (46, 50, 'cube', 'มิติสัมพันธ์ · ลูกบาศก์และเงา', '#0B3B8C'),
        ],
    },
    {
        'key': 'position1', 'id': 'special-position-1',
        'title': 'แนวข้อสอบความรู้เฉพาะตำแหน่ง ชุดที่ 1',
        'short': 'เฉพาะตำแหน่ง 1',
        'desc': 'ข้อสอบ 100 ข้อ (100 คะแนน) — บัญชี การเงินการธนาคาร ยุทธศาสตร์ ธ.ก.ส. เศรษฐศาสตร์ สินเชื่อ การตลาด และ Competency',
        'minutes': 100, 'points': 100, 'color': '#0B3B8C', 'color2': '#6EA8FE',
        'pages': range(139, 152), 'ans': ('detail', range(152, 162)),
        'sections': [
            (1, 26, 'accounting', 'หลักการบัญชี', '#0B3B8C'),
            (27, 45, 'banking', 'การเงิน การธนาคาร และสินเชื่อเบื้องต้น', '#1E40AF'),
            (46, 51, 'vision', 'วิสัยทัศน์ พันธกิจ และยุทธศาสตร์ ธ.ก.ส.', '#1D4ED8'),
            (52, 60, 'economy', 'เศรษฐกิจ สังคม การเมือง และ Fintech', '#0891B2'),
            (61, 76, 'economics', 'เศรษฐศาสตร์เบื้องต้น', '#0E7490'),
            (77, 82, 'community', 'การพัฒนาชนบทและชุมชน', '#047857'),
            (83, 89, 'marketing', 'การตลาด', '#7C3AED'),
            (90, 100, 'competency', 'ขีดความสามารถหลัก (Competency)', '#0B2149'),
        ],
    },
    {
        'key': 'position2', 'id': 'special-position-2',
        'title': 'แนวข้อสอบความรู้เฉพาะตำแหน่ง ชุดที่ 2',
        'short': 'เฉพาะตำแหน่ง 2',
        'desc': 'ข้อสอบ 100 ข้อ (100 คะแนน) — บัญชี การเงินการธนาคาร ยุทธศาสตร์ ธ.ก.ส. เศรษฐศาสตร์ ชุมชน การตลาด Competency และจริยธรรม',
        'minutes': 100, 'points': 100, 'color': '#1E3A8A', 'color2': '#93C5FD',
        'pages': range(162, 173), 'ans': ('detail', range(173, 181)),
        'sections': [
            (1, 25, 'accounting', 'หลักการบัญชี', '#0B3B8C'),
            (26, 47, 'banking', 'การเงิน การธนาคาร และสินเชื่อเบื้องต้น', '#1E40AF'),
            (48, 51, 'vision', 'วิสัยทัศน์ พันธกิจ และยุทธศาสตร์ ธ.ก.ส.', '#1D4ED8'),
            (52, 55, 'economy', 'เศรษฐกิจ สังคม การเมือง และ Fintech', '#0891B2'),
            (56, 70, 'economics', 'เศรษฐศาสตร์เบื้องต้น', '#0E7490'),
            (71, 85, 'community', 'การพัฒนาชนบทและชุมชน', '#047857'),
            (86, 90, 'marketing', 'การตลาด', '#7C3AED'),
            (91, 95, 'competency', 'ขีดความสามารถหลัก (Competency)', '#0B2149'),
            (96, 100, 'ethics', 'จริยธรรม จรรยาบรรณ ธรรมาภิบาล และกฎหมายฟอกเงิน', '#334155'),
        ],
    },
    {
        'key': 'real68', 'id': 'special-real-2568',
        'title': 'ข้อสอบจริงรอบวันที่ 14 ธ.ค. 2568',
        'short': 'ข้อสอบจริง 14 ธ.ค. 68',
        'desc': 'ข้อสอบจริง 10 ข้อ (รอบเฉพาะพื้นที่บุคคลภายนอก) — ต้นทุนธนาคาร เงินฝาก ปปง. ตราสาร และนโยบายการคลัง',
        'minutes': 12, 'points': 10, 'color': '#0B2149', 'color2': '#2563EB',
        'pages': range(181, 183), 'ans': ('detail', range(183, 184)),
        'sections': [
            (1, 10, 'real', 'ข้อสอบจริงรอบวันที่ 14 ธ.ค. 2568', '#0B2149'),
        ],
    },
]


def norm(s):
    s = re.sub(r'\s+', '', s or '')
    return s.lower()


def answer_index(q, letter, atext):
    idx = assemble.LETTER_IDX.get(letter)
    at = norm(atext)
    if at:
        scored = []
        for i, opt in enumerate(q['opts']):
            o = norm(opt)
            if not o:
                continue
            o2, a2 = o, at
            # strip trailing ellipsis / leading quotes for lenient compare
            if o2 == a2:
                scored.append((1000 + len(o2), i))
            elif o2.startswith(a2) or a2.startswith(o2):
                scored.append((600 + min(len(o2), len(a2)), i))
            elif a2 in o2 or o2 in a2:
                scored.append((300 + min(len(o2), len(a2)), i))
        if scored:
            scored.sort(reverse=True)
            if scored[0][0] >= 300:
                return scored[0][1], 'text'
    return idx, ('letter' if idx is not None else 'none')


# questions whose key line is absent from the PDF answer section (verified by eye
# against the printed question); value is the 0-based option index.
# value: (0-based option index, explanation paragraph)
ANSWER_OVERRIDES = {
    # ตลาดหลักทรัพย์ ... ผู้ลงทุนมีฐานะเป็นเจ้าของ -> ตลาดทุน
    # (ต้นฉบับไม่มีบรรทัดเฉลยข้อนี้ — ตรวจจากโจทย์/ตัวเลือกเอง)
    'position2': {27: (1, 'ตลาดทุน (Capital Market) เป็นตลาดที่ระดมทุนระยะยาว '
                        'ผู้ลงทุนที่ซื้อหุ้นสามัญมีฐานะเป็นเจ้าของกิจการ '
                        'ต่างจากตลาดเงินซึ่งเป็นตลาดของเงินทุนระยะสั้น')},
}

# ต้นฉบับหน้าฉลยพิมพ์ตัวเลือกผิดแถว (เฉลยข้อ 27 ของชุดที่ 1 หลุดมาอยู่บรรทัดข้อ 28)
# — ข้อ 28 ถามนโยบายสินเชื่อ ธ.ก.ส. ตัวเลือก "ถูกทุกข้อ" จึงเป็นคำตอบที่ถูก
ANSWER_TEXT_FIX = {
    'position2': {28: 'ถูกทุกข้อ'},
}


CONFUSED = []


def section_for(cfg, num):
    for lo, hi, key, label, color in cfg['sections']:
        if lo <= num <= hi:
            return key, label, color
    return None, None, None


def build_exam(cfg):
    pages = list(cfg['pages'])
    qs = reader.parse_exam(pages)
    # figures
    plans = figs4.plan(pages)
    for q in qs:
        q['stemFig'] = None
        q['optFigs'] = []
    by_q = {}
    for t in plans:
        by_q.setdefault(t['num'], []).append(t)
    os.makedirs(IMG_OUT, exist_ok=True)
    for num, tasks in by_q.items():
        q = next(x for x in qs if x['num'] == num)
        opt_figs = [None, None, None, None]
        # raster crops win over box (vector) crops; box crops only fill the gaps
        stem_done = False
        pict = any(t.get('pict') for t in tasks)
        for t in sorted(tasks, key=lambda t: 1 if t.get('box') else 0):
            fname = f"{cfg['key']}-q{num}-{t['label'] or 'stem'}.png"
            if t['kind'] == 'stem':
                if stem_done:
                    continue
                stem_done = True
                figs4.crop(t['page'], t['rect'], os.path.join(IMG_OUT, fname), dpi=150,
                           trim=bool(t.get('box') or t['kind'] == 'box'),
                           keep_top=bool(t.get('pict')))
                q['stemFig'] = f'special/{fname}'
            else:
                idx = 'ABCD'.find(t['label'])
                if idx < 0:
                    idx = 'กขคง'.find(t['label'])
                if not (0 <= idx < 4) or opt_figs[idx]:
                    continue
                figs4.crop(t['page'], t['rect'], os.path.join(IMG_OUT, fname), dpi=150,
                           trim=bool(t.get('box') or t['kind'] == 'box'),
                           keep_top=bool(t.get('pict')))
                opt_figs[idx] = f'special/{fname}'
        if all(opt_figs):
            q['optFigs'] = opt_figs
        if pict:
            q['pictOpts'] = True
    # answer key
    kind, apages = cfg['ans']
    if kind == 'table':
        table = A.table(list(apages)[0])
        ans = {n: {'letter': l, 'text': '', 'explain': ''} for n, l in table.items()}
    else:
        ans = A.detail(apages)
    out = []
    directive = ''   # last printed block instruction, e.g. "จงตอบคำถามข้อ 31-33 …"
    for q in qs:
        pre = [p.strip() for p in (q.get('preamble') or []) if p and p.strip()]
        if pre and len(pre[-1]) < 160:
            directive = pre[-1]
        # a shared instruction line belongs to every question of its block, so
        # a picture-only question still shows what it is asked to do
        if not q['stem'].strip() and not q['stemFig'] and directive:
            q['stem'] = directive
        a = dict(ans.get(q['num'], {}))
        fix = ANSWER_TEXT_FIX.get(cfg['key'], {}).get(q['num'])
        if fix:
            a['text'] = fix
        idx, how = answer_index(q, a.get('letter', ''), a.get('text', ''))
        # the answer text can contradict the printed key letter (source typo);
        # the text is the printed answer itself, so it wins — restate the letter
        corrected = False
        if how == 'text' and a.get('letter'):
            li = assemble.LETTER_IDX.get(a['letter'])
            if li is not None and li != idx:
                CONFUSED.append((cfg['key'], q['num'], a['letter'], idx))
                a['letter'] = 'กขคง'[idx]
                corrected = True
        # the key line and the chosen option are the same answer: keep the
        # explanation's opening line in sync when the letter was corrected
        if corrected and a.get('explain', '').startswith('เฉลยข้อ'):
            _, _, body = a['explain'].partition('\n')
            a['explain'] = ('เฉลยข้อ %s. %s' % ('กขคง'[idx], q['opts'][idx].strip())
                            + (('\n' + body) if body else '')).strip()
        elif a.get('explain', '').startswith('เฉลยข้อ'):
            first, _, rest = a['explain'].partition('\n')
            want = 'เฉลยข้อ %s.' % 'กขคง'[idx]
            if not first.startswith(want):
                a['explain'] = (want + ' ' + q['opts'][idx].strip()
                                + (('\n' + rest) if rest else '')).strip()
        ov = ANSWER_OVERRIDES.get(cfg['key'], {}).get(q['num'])
        if ov is not None:
            idx, how = ov[0], 'manual'
            a = dict(a, letter='กขคง'[idx], text=q['opts'][idx].strip(), explain=ov[1])
        key, label, color = section_for(cfg, q['num'])
        opts = [o.strip() for o in q['opts']]
        empty_opts = all(not o for o in opts)
        pict_opts = bool(empty_opts and q['stemFig'] and not q['optFigs'])
        out.append({
            'num': q['num'],
            'stem': q['stem'].strip(),
            'opts': opts,
            'answer': idx,
            'answerLetter': {'A': 'ก', 'B': 'ข', 'C': 'ค', 'D': 'ง',
                             'a': 'ก', 'b': 'ข', 'c': 'ค', 'd': 'ง'}.get(
                                 a.get('letter', ''), a.get('letter', '')),
            'answerText': a.get('text', ''),
            'explain': a.get('explain', ''),
            'sectionKey': key,
            'sectionLabel': label,
            'sectionColor': color,
            'stemFig': q['stemFig'],
            'optFigs': q['optFigs'] if q['optFigs'] else None,
            'answerHow': how,
            'pictOpts': pict_opts,
        })
    return out


def main():
    data = {}
    for cfg in EXAMS:
        data[cfg['key']] = build_exam(cfg)
        n = len(data[cfg['key']])
        noans = [q['num'] for q in data[cfg['key']] if q['answer'] is None]
        print(cfg['key'], n, 'no-answer', noans)
    # drop crops that ended up unused (e.g. a 1-of-4 option that became a strip)
    used = set()
    for arr in data.values():
        for q in arr:
            for u in [q['stemFig']] + list(q['optFigs'] or []):
                if u:
                    used.add(os.path.basename(u))
    removed = 0
    for f in os.listdir(IMG_OUT):
        if f not in used:
            os.remove(os.path.join(IMG_OUT, f))
            removed += 1
    if removed:
        print('ลบภาพที่ไม่ได้ใช้:', removed)
    os.makedirs(os.path.join(REPO, '.special-build'), exist_ok=True)
    json.dump(data, open(os.path.join(REPO, '.special-build', 'prod.json'), 'w'), ensure_ascii=False)
    if CONFUSED:
        print('ปรับอักษรเฉลยตามข้อความตอบ:', len(CONFUSED), CONFUSED)
    return data


if __name__ == '__main__':
    main()
