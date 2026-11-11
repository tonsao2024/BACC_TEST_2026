"""Assemble final dataset: questions + options + figures + answers + subjects."""
import json, os, re, unicodedata
import reader
import answers as A

EXAMS = {
    'general': dict(pages=range(2, 16), ans='detail', ans_pages=range(16, 20),
                    title='แนวข้อสอบความรู้ความสามารถทั่วไป'),
    'precision1': dict(pages=range(20, 35), ans='table', ans_pages=[34],
                       title='แนวข้อสอบความละเอียดแม่นยำ ชุดที่ 1'),
    'precision2': dict(pages=range(35, 46), ans='table', ans_pages=[46],
                       title='แนวข้อสอบความละเอียดแม่นยำ ชุดที่ 2'),
    'position1': dict(pages=range(139, 152), ans='detail', ans_pages=range(152, 162),
                      title='แนวข้อสอบความรู้เฉพาะตำแหน่ง ชุดที่ 1'),
    'position2': dict(pages=range(162, 173), ans='detail', ans_pages=range(173, 181),
                      title='แนวข้อสอบความรู้เฉพาะตำแหน่ง ชุดที่ 2'),
    'real68': dict(pages=range(181, 183), ans='detail', ans_pages=range(183, 184),
                   title='ข้อสอบจริงรอบวันที่ 14 ธ.ค.68 รอบเฉพาะพื้นที่บุคคลภายนอก'),
}

LETTER_IDX = {'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3, 'จ': 4,
              'A': 0, 'B': 1, 'C': 2, 'D': 3,
              'a': 0, 'b': 1, 'c': 2, 'd': 3}

# subject label normalisation for the positioned exams
SUBJ_MAP = [
    ('หลักการบัญชี', 'หลักการบัญชี'),
    ('การเงินการธนาคาร', 'การเงิน การธนาคาร และสินเชื่อ'),
    ('วิสัยทัศน์', 'วิสัยทัศน์ พันธกิจ และยุทธศาสตร์ ธ.ก.ส.'),
    ('เศรษฐกิจ สังคม', 'เศรษฐกิจ สังคม การเมือง และ Fintech'),
    ('เศรษฐศาสตร์', 'เศรษฐศาสตร์เบื้องต้น'),
    ('พัฒนาชนบท', 'การพัฒนาชนบทและชุมชน'),
    ('การตลาด', 'การตลาด'),
    ('ขีดความสามารถหลัก', 'ขีดความสามารถหลัก (Competency)'),
    ('จริยธรรม', 'จริยธรรม จรรยาบรรณ ธรรมาภิบาล และกฎหมายฟอกเงิน'),
]


def subject_of(heading, fallback):
    if not heading:
        return fallback
    for key, label in SUBJ_MAP:
        if key in heading:
            return label
    return fallback


def norm(s):
    s = unicodedata.normalize('NFC', s or '')
    return re.sub(r'\s+', '', s).lower()


def match_index(q, letter, atext):
    """Resolve answer index using the letter and the answer text."""
    idx = LETTER_IDX.get(letter)
    at = norm(atext)
    if at:
        scored = []
        for i, opt in enumerate(q['opts']):
            o = norm(opt)
            if not o:
                continue
            if o == at:
                scored.append((1000, i))
            elif o.startswith(at) or at.startswith(o):
                scored.append((500 + min(len(o), len(at)), i))
            elif at in o or o in at:
                scored.append((200 + min(len(o), len(at)), i))
        if scored:
            scored.sort(reverse=True)
            best = scored[0]
            if best[0] >= 200:
                if idx is not None and best[1] != idx:
                    return best[1], 'text-override'
                return best[1], 'text'
    return idx, 'letter' if idx is not None else 'none'


def build():
    out = {}
    for key, cfg in EXAMS.items():
        qs = reader.parse_exam(list(cfg['pages']))
        if cfg['ans'] == 'table':
            ans = A.table(cfg['ans_pages'][0])
            ansmap = {n: {'letter': l, 'text': '', 'explain': ''} for n, l in ans.items()}
        else:
            ansmap = A.detail(cfg['ans_pages'])
        for q in qs:
            a = ansmap.get(q['num'], {})
            idx, how = match_index(q, a.get('letter', ''), a.get('text', ''))
            q['answerIndex'] = idx
            q['answerLetter'] = a.get('letter', '')
            q['answerText'] = a.get('text', '')
            q['explain'] = a.get('explain', '')
            q['answerHow'] = how
            q['subject'] = subject_of(q.get('head'), cfg['title'])
        out[key] = qs
    return out


if __name__ == '__main__':
    data = build()
    os.makedirs('build', exist_ok=True)
    json.dump(data, open('build/final.json', 'w'), ensure_ascii=False, indent=1)
    for k, qs in data.items():
        missing = [q['num'] for q in qs if q['answerIndex'] is None]
        bad = [q['num'] for q in qs if len(q['opts']) != 4]
        over = [q['num'] for q in qs if q['answerHow'] == 'text-override']
        print(f'{k}: {len(qs)} q | no answer {missing} | opts!=4 {bad} | text-override {over}')
        print('   subjects:', sorted({q['subject'] for q in qs}))
