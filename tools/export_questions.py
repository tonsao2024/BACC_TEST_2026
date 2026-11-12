"""ส่งออกข้อสอบทั้งหมดในคลัง (src/data/*.js) เป็นไฟล์ Excel (.xlsx) + CSV

ชีตหลัก "ข้อสอบทั้งหมด" มี 10 คอลัมน์ตามโครงสร้างที่กำหนดเท่านั้น:
    question | option1 | option2 | option3 | option4 | correct | time_limit | points | หมวด | วิชาย่อย

- correct    = หมายเลขตัวเลือกที่ถูก เป็นตัวเลข 1-4
- time_limit = 10 (วินาทีต่อข้อ)
- points     = คะแนนต่อข้อ (พาร์ทหลัก 1 คะแนน/ข้อ, ข้อสอบพิเศษ = คะแนนทั้งชุด ÷ จำนวนข้อ)
- ข้อที่โจทย์/ตัวเลือกเป็นภาพ จะใส่ "[ภาพ]" ไว้ในช่องนั้น แล้วดูภาพจริงได้ในชีต "ข้อที่เป็นภาพ"

ชีตอื่น: สรุปจำนวนข้อ · คำอธิบายเฉลย · ข้อที่เป็นภาพ (ฝังภาพจริง) · ข้อที่ต้องตรวจ · อ่านก่อนใช้งาน

การทำงาน: เรียก Node อ่านคลังข้อสอบจริงจาก src/data/index.js (ข้อมูลตรงกับตัวเว็บ 100%)
รันซ้ำได้ทุกครั้งที่คลังอัปเดต:  python3 tools/export_questions.py
"""
import csv
import json
import os
import re
import subprocess
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PUBLIC = os.path.join(REPO, 'public')
OUT_DIR = os.path.join(REPO, 'exports')
WORK = os.path.join(REPO, '.special-build')
THUMBS = os.path.join(WORK, 'thumbs')
TIME_LIMIT = 10
IMG_MAX_W = 240   # px กว้างสุดของภาพที่ฝังใน Excel
IMG_MAX_H = 130   # px สูงสุด
IMG_MARK = '[ภาพ]'
IN_STEM = '[ดูตัวเลือกในภาพโจทย์]'

READER = r'''
import { PARTS, SPECIAL_PARTS } from '../src/data/index.js'

const GROUP_LABEL = {
  aptitude: '1 ความรู้ความสามารถทั่วไป',
  detail: '2 ความละเอียดแม่นยำ',
  knowledge: '3 ความรู้ความสามารถเฉพาะตำแหน่ง',
}

const payload = { parts: [] }

const pushPart = (part, kind) => {
  payload.parts.push({
    id: part.id,
    kind,
    label: part.label,
    title: part.title,
    minutes: part.minutes,
    officialCount: part.officialCount,
    officialMinutes: part.officialMinutes ?? null,
    officialPoints: part.officialPoints ?? null,
    groupLabel: kind === 'special' ? 'ข้อสอบพิเศษ' : (GROUP_LABEL[part.group] || part.group),
    questions: part.questions.map((q) => ({
      t: q.t || '',
      q: q.q || '',
      o: Array.isArray(q.o) ? q.o.map((x) => String(x ?? '')) : [],
      a: typeof q.a === 'number' ? q.a : null,
      e: q.e || '',
      fig: q.fig || '',
      ofigs: Array.isArray(q.ofigs) ? q.ofigs : [],
    })),
  })
}

PARTS.forEach((p) => pushPart(p, 'main'))
SPECIAL_PARTS.forEach((p) => pushPart(p, 'special'))

process.stdout.write(JSON.stringify(payload))
'''


def load_questions():
    os.makedirs(WORK, exist_ok=True)
    reader_path = os.path.join(WORK, '_read-questions.mjs')
    with open(reader_path, 'w', encoding='utf-8') as fh:
        fh.write(READER)
    out = subprocess.run(['node', reader_path], cwd=REPO, check=True,
                         capture_output=True, text=True, encoding='utf-8')
    return json.loads(out.stdout)


IMG_RE = re.compile(r'<img[^>]*src="([^"]+)"', re.I)
HIDDEN_RE = re.compile(r'[\u200b\u200c\u200d\u200e\u200f\u202a-\u202e\ufeff]')


def clean(text):
    """ล้างอักขระควบคุมที่มองไม่เห็น (ไม่แตะ < > ซึ่งเป็นข้อมูลจริงของข้อสอบเปรียบเทียบอักขระ)"""
    return HIDDEN_RE.sub('', str(text)).replace('\r\n', '\n').strip()


def img_path(html):
    m = IMG_RE.search(html or '')
    return m.group(1) if m else ''


def part_points(part, count):
    if part['kind'] == 'special':
        return round((part['officialPoints'] or count) / (count or 1), 4)
    return 1


def opt_mark(opt_imgs, idx):
    """ข้อความแทนตัวเลือกที่เป็นภาพ — [ภาพ] เมื่อมีภาพเดียว, [ภาพ 1].. เมื่อมีหลายภาพ"""
    if idx >= len(opt_imgs) or not opt_imgs[idx]:
        return ''
    positions = [i for i, p in enumerate(opt_imgs) if p]
    if len(positions) == 1:
        return IMG_MARK
    return f'[ภาพ {positions.index(idx) + 1}]'


def build_rows(payload):
    rows = []
    for part in payload['parts']:
        qs = part['questions']
        points = part_points(part, len(qs))
        subject = f"{part['label']} {part['title']}"
        category = part['groupLabel'] if part['kind'] == 'main' else f'ข้อสอบพิเศษ · {part["title"]}'
        for idx, q in enumerate(qs, start=1):
            opts = [clean(o) for o in q['o']]
            while len(opts) < 4:
                opts.append('')
            opt_imgs = [img_path(x) for x in q['ofigs']]
            while len(opt_imgs) < 4:
                opt_imgs.append('')
            stem_img = img_path(q['fig'])
            a = q['a']
            correct = a + 1 if isinstance(a, int) and 0 <= a <= 3 else ''
            rows.append({
                'question': clean(q['q']) or (IMG_MARK if stem_img else ''),
                # ตัวเลือกที่ไม่มีข้อความ: ใช้ [ภาพ] / [ภาพ 1].. หรือ [ดูตัวเลือกในภาพโจทย์] เพื่อคงจำนวนตัวเลือกให้ครบ 4
                'option1': opts[0] or opt_mark(opt_imgs, 0) or (IN_STEM if stem_img else ''),
                'option2': opts[1] or opt_mark(opt_imgs, 1) or (IN_STEM if stem_img else ''),
                'option3': opts[2] or opt_mark(opt_imgs, 2) or (IN_STEM if stem_img else ''),
                'option4': opts[3] or opt_mark(opt_imgs, 3) or (IN_STEM if stem_img else ''),
                'correct': correct,
                'time_limit': TIME_LIMIT,
                'points': points,
                'หมวด': category,
                'วิชาย่อย': clean(q['t']) or subject,
                'part_id': part['id'],
                'part_title': subject,
                'no': idx,
                'explain': clean(q['e']),
                'stem_text': clean(q['q']),
                'opt_text': opts,
                'stem_img': stem_img,
                'opt_imgs': opt_imgs,
            })
    return rows


def build_issues(rows):
    issues = []
    for r in rows:
        opts = [r['option1'], r['option2'], r['option3'], r['option4']]
        empty = [i + 1 for i, v in enumerate(opts) if not v]
        if empty:
            issues.append((r, 'ตัวเลือกว่าง', 'ไม่มีทั้งข้อความและภาพของตัวเลือก ' + ', '.join(map(str, empty))))
        filled = [o for o in opts if o and o != IMG_MARK and o != IN_STEM]
        dup = sorted({o for o in filled if filled.count(o) > 1})
        if dup:
            issues.append((r, 'ตัวเลือกซ้ำกัน', 'ตัวเลือกซ้ำ: ' + ' / '.join(d[:48] for d in dup)))
        if not r['correct']:
            issues.append((r, 'เฉลยผิดรูป', 'ไม่พบหมายเลขเฉลย'))
        if IN_STEM in opts:
            issues.append((r, 'ตัวเลือกอยู่ในภาพโจทย์',
                           'ตัวเลือก ก.-ง. อยู่ในภาพเดียวกัน ต้นฉบับไม่มีข้อความให้ดึง'))
        if r['stem_img'] or any(r['opt_imgs']):
            where = []
            if r['stem_img']:
                where.append('โจทย์')
            imgs = [f'ตัวเลือก {i + 1}' for i, p in enumerate(r['opt_imgs']) if p]
            if imgs:
                where.append(', '.join(imgs))
            note = 'ต้องดูภาพ: ' + ' + '.join(where)
            if not r['stem_text']:
                note += ' (โจทย์เป็นภาพล้วน)'
            issues.append((r, 'ข้อที่ต้องใช้ภาพ', note))

    seen = {}
    for r in rows:
        key = (r['question'], r['option1'], r['option2'], r['option3'], r['option4'],
               r['correct'], r['stem_img'], tuple(r['opt_imgs']))
        seen.setdefault(key, []).append(r)
    for group in seen.values():
        if len(group) > 1:
            where = ', '.join(f"{g['part_title']} ข้อ {g['no']}" for g in group)
            issues.append((group[0], 'ข้อซ้ำกันทุกประการ', where))
    order = {'ตัวเลือกว่าง': 0, 'ตัวเลือกอยู่ในภาพโจทย์': 1, 'ตัวเลือกซ้ำกัน': 2, 'เฉลยผิดรูป': 3,
             'ข้อซ้ำกันทุกประการ': 4, 'ข้อที่ต้องใช้ภาพ': 5}
    issues.sort(key=lambda it: (order.get(it[1], 9), it[0]['part_id'], it[0]['no']))
    return issues


HEADERS = ['question', 'option1', 'option2', 'option3', 'option4',
           'correct', 'time_limit', 'points', 'หมวด', 'วิชาย่อย']
KEYS = HEADERS


def write_csv(rows, path):
    with open(path, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh, quoting=csv.QUOTE_MINIMAL)
        w.writerow(HEADERS)
        for r in rows:
            w.writerow([r[k] for k in KEYS])


def thumb(path):
    """ย่อภาพสำหรับฝังใน Excel (คืน path ของภาพย่อ)"""
    from PIL import Image
    os.makedirs(THUMBS, exist_ok=True)
    dst = os.path.join(THUMBS, path.replace('/', '__').rsplit('.', 1)[0] + '.jpg')
    if os.path.exists(dst):
        return dst
    im = Image.open(os.path.join(PUBLIC, path)).convert('RGB')
    scale = min(IMG_MAX_W / im.width, IMG_MAX_H / im.height, 1.0)
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    im.resize(size, Image.LANCZOS).save(dst, 'JPEG', quality=78, optimize=True)
    return dst


def write_xlsx(payload, rows, issues, path):
    from openpyxl import Workbook
    from openpyxl.drawing.image import Image as XLImage
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.datavalidation import DataValidation

    wb = Workbook()
    head_fill = PatternFill('solid', fgColor='1D4ED8')
    head_font = Font(color='FFFFFF', bold=True, size=11)
    thin = Side(style='thin', color='D5DBE3')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    def style_header(ws, ncol):
        for c in range(1, ncol + 1):
            cell = ws.cell(row=1, column=c)
            cell.fill = head_fill
            cell.font = head_font
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        ws.row_dimensions[1].height = 26

    def grid(ws, widths, wrap_cols=(), center_cols=()):
        for i, w in enumerate(widths, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w
        for row in ws.iter_rows(min_row=2, max_row=ws.max_row, max_col=len(widths)):
            for cell in row:
                cell.alignment = Alignment(vertical='top', wrap_text=cell.column in wrap_cols,
                                           horizontal='center' if cell.column in center_cols else None)
                cell.border = border

    # ---------------- 1) ข้อสอบทั้งหมด : 10 คอลัมน์ตามโครงสร้าง ----------------
    ws = wb.active
    ws.title = 'ข้อสอบทั้งหมด'
    ws.append(HEADERS)
    for r in rows:
        ws.append([r[k] for k in KEYS])
    grid(ws, [68, 30, 30, 30, 30, 9, 11, 11, 44, 30], wrap_cols={1, 2, 3, 4, 5, 9, 10},
         center_cols={6, 7, 8})
    style_header(ws, 10)
    ws.freeze_panes = 'B2'
    ws.auto_filter.ref = f'A1:J{ws.max_row}'
    dv = DataValidation(type='whole', operator='between', formula1=1, formula2=4,
                        allow_blank=True, showErrorMessage=True,
                        errorTitle='correct ต้องเป็น 1-4',
                        error='ใส่หมายเลขตัวเลือกที่ถูก 1 ถึง 4')
    ws.add_data_validation(dv)
    dv.add(f'F2:F{ws.max_row}')

    # ---------------- 2) สรุปจำนวนข้อ ----------------
    ws2 = wb.create_sheet('สรุปจำนวนข้อ')
    ws2.append(['หมวด', 'พาร์ท/ชุด', 'จำนวนข้อในไฟล์', 'จำนวนข้อตามประกาศ',
                'เวลาสอบ (นาที)', 'คะแนนต่อข้อ', 'คะแนนรวม', 'ข้อที่ใช้ภาพ'])
    for part in payload['parts']:
        qs = part['questions']
        count = len(qs)
        pts = part_points(part, count)
        total = part['officialPoints'] if part['kind'] == 'special' else count
        cat = part['groupLabel'] if part['kind'] == 'main' else 'ข้อสอบพิเศษ'
        n_img = sum(1 for r in rows if r['part_id'] == part['id'] and (r['stem_img'] or any(r['opt_imgs'])))
        ws2.append([cat, f"{part['label']} {part['title']}", count, part['officialCount'],
                    part['minutes'], pts, total, n_img])
    ws2.append([])
    ws2.append(['รวม', '', len(rows), '', '', '', '',
                sum(1 for r in rows if r['stem_img'] or any(r['opt_imgs']))])
    grid(ws2, [32, 52, 16, 18, 16, 14, 12, 14], wrap_cols={1, 2}, center_cols={3, 4, 5, 6, 7, 8})
    style_header(ws2, 8)
    for c in (1, 3):
        ws2.cell(row=ws2.max_row, column=c).font = Font(bold=True)

    # ---------------- 3) คำอธิบายเฉลย ----------------
    ws3 = wb.create_sheet('คำอธิบายเฉลย')
    ws3.append(['หมวด', 'พาร์ท/ชุด', 'ข้อที่', 'question', 'correct', 'คำอธิบาย'])
    for r in rows:
        ws3.append([r['หมวด'], r['part_title'], r['no'], r['question'], r['correct'], r['explain']])
    grid(ws3, [28, 36, 8, 56, 9, 96], wrap_cols={1, 2, 4, 6}, center_cols={3, 5})
    style_header(ws3, 6)
    ws3.freeze_panes = 'A2'

    # ---------------- 4) ข้อที่เป็นภาพ (ฝังภาพจริง) ----------------
    ws4 = wb.create_sheet('ข้อที่เป็นภาพ')
    ws4.append(['หมวด', 'พาร์ท/ชุด', 'ข้อที่', 'question', 'correct',
                'ภาพโจทย์', 'ภาพ option1', 'ภาพ option2', 'ภาพ option3', 'ภาพ option4', 'ไฟล์ภาพ'])
    col_w = {'A': 26, 'B': 32, 'C': 8, 'D': 46, 'E': 9, 'F': 36, 'G': 36, 'H': 36, 'I': 36, 'J': 36, 'K': 46}
    for k, v in col_w.items():
        ws4.column_dimensions[k].width = v
    for c, h in zip('ABCDEFGHIJK', ('center',) + ('left',) * 2 + ('center', 'left') + ('center',) * 6):
        cell = ws4.cell(row=1, column=ord(c) - 64)
        cell.fill = head_fill
        cell.font = head_font
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    ws4.row_dimensions[1].height = 26
    ws4.freeze_panes = 'A2'

    row_no = 2
    img_count = 0
    for r in rows:
        if not (r['stem_img'] or any(r['opt_imgs'])):
            continue
        ws4.cell(row=row_no, column=1, value=r['หมวด'])
        ws4.cell(row=row_no, column=2, value=r['part_title'])
        ws4.cell(row=row_no, column=3, value=r['no'])
        ws4.cell(row=row_no, column=4, value=r['stem_text'] or '(โจทย์เป็นภาพล้วน)')
        ws4.cell(row=row_no, column=5, value=r['correct'] or '')
        files = []
        if r['stem_img']:
            files.append(r['stem_img'])
        files += [p for p in r['opt_imgs'] if p]
        for slot, p in enumerate([r['stem_img']] + r['opt_imgs']):
            col = 6 + slot
            ws4.cell(row=row_no, column=col, value=p or '')
            if p and os.path.exists(os.path.join(PUBLIC, p)):
                try:
                    ws4.add_image(XLImage(thumb(p)), f'{get_column_letter(col)}{row_no}')
                    img_count += 1
                except Exception:  # noqa: BLE001 - ภาพเสียไม่ควรทำให้ทั้งไฟล์ล้ม
                    ws4.cell(row=row_no, column=col, value=f'{p} (เปิดไม่ได้)')
            elif p:
                ws4.cell(row=row_no, column=col, value=f'{p} (ไม่พบไฟล์)')
        ws4.cell(row=row_no, column=11, value=', '.join(files))
        for c in range(1, 12):
            cell = ws4.cell(row=row_no, column=c)
            cell.alignment = Alignment(vertical='center', wrap_text=c in (1, 2, 4, 11),
                                       horizontal='center' if c in (3, 5) else None)
            cell.border = border
        ws4.row_dimensions[row_no].height = IMG_MAX_H * 0.76
        row_no += 1
    ws4.auto_filter.ref = f'A1:K{row_no - 1}'

    # ---------------- 5) ข้อที่ต้องตรวจ ----------------
    ws5 = wb.create_sheet('ข้อที่ต้องตรวจ')
    ws5.append(['ประเภท', 'หมวด', 'พาร์ท/ชุด', 'ข้อที่', 'question', 'รายละเอียด'])
    for r, kind, detail in issues:
        ws5.append([kind, r['หมวด'], r['part_title'], r['no'], r['question'], detail])
    grid(ws5, [22, 26, 32, 8, 54, 50], wrap_cols={2, 3, 5, 6}, center_cols={4})
    style_header(ws5, 6)
    ws5.freeze_panes = 'A2'
    ws5.auto_filter.ref = f'A1:F{ws5.max_row}'

    # ---------------- 6) อ่านก่อนใช้งาน ----------------
    ws6 = wb.create_sheet('อ่านก่อนใช้งาน')
    notes = [
        ('ไฟล์นี้คืออะไร', 'ข้อสอบทั้งหมดจากคลังใน repository (src/data/*.js) ดึงออกมาตรงกับข้อมูลที่เว็บใช้อยู่'),
        ('จำนวนข้อ', f'{len(rows):,} ข้อ = พาร์ทหลัก 11 พาร์ท (1,100 ข้อ) + ข้อสอบพิเศษ 6 ชุด (390 ข้อ)'),
        ('ชีต "ข้อสอบทั้งหมด"', '10 คอลัมน์ตามโครงสร้างที่กำหนดเท่านั้น — นำเข้า (import) ได้ทันที'),
        ('question', 'โจทย์ เก็บข้อความตามต้นฉบับจริง ไม่เติมอะไรเพิ่ม'),
        ('option1-4', 'ตัวเลือกที่ 1-4 ตามลำดับจริง (ไม่สลับ)'),
        ('correct', 'หมายเลขตัวเลือกที่ถูก เป็นตัวเลข 1-4 (1 = option1) ใส่ data validation 1-4 ไว้แล้ว'),
        ('time_limit', '10 = 10 วินาทีต่อข้อ ทุกแถว ตามที่กำหนด'),
        ('points', 'คะแนนต่อข้อ — พาร์ทหลัก 1 คะแนน/ข้อ, ข้อสอบพิเศษ = คะแนนทั้งชุด ÷ จำนวนข้อ '
                   '(เช่น พ.1 100 คะแนน/80 ข้อ = 1.25)'),
        ('หมวด', '"1 ความรู้ความสามารถทั่วไป" / "2 ความละเอียดแม่นยำ" / '
                 '"3 ความรู้ความสามารถเฉพาะตำแหน่ง" / "ข้อสอบพิเศษ · <ชื่อชุด>"'),
        ('วิชาย่อย', 'หัวข้อย่อยของข้อนั้น เช่น "อนุกรมและลำดับ", "เปรียบเทียบอักขระและตัวเลข", "หลักการบัญชี"'),
        ('ตัวเลือกที่ไม่มีข้อความ', f'{sum(1 for r in rows if IN_STEM in (r["option1"], r["option2"], r["option3"], r["option4"]))} '
                                  'ข้อ (พ.2/พ.3) มีตัวเลือก ก.-ง. อยู่ในภาพเดียวกับโจทย์ ต้นฉบับไม่มีข้อความให้ดึง '
                                  f'— จึงใส่ "{IN_STEM}" ไว้ ดูภาพจริงได้ในชีต "ข้อที่เป็นภาพ"'),
        ('ข้อที่ใช้ภาพ', f'{sum(1 for r in rows if r["stem_img"] or any(r["opt_imgs"]))} ข้อ — '
                        f'ในชีต "ข้อสอบทั้งหมด" ช่องนั้นจะขึ้นว่า [ภาพ] และดูภาพจริงได้ในชีต "ข้อที่เป็นภาพ" '
                        f'(ฝังภาพไว้ {img_count} ภาพ)'),
        ('ไฟล์ภาพต้นฉบับ', 'อยู่ในโฟลเดอร์ public/ ของ repo เช่น public/bank/p14/image2.png'),
        ('ชีตอื่น', '"สรุปจำนวนข้อ" = ภาพรวม · "คำอธิบายเฉลย" = เฉลยพร้อมคำอธิบาย · '
                   '"ข้อที่ต้องตรวจ" = จุดที่ควรตรวจด้วยมือ (ตัวเลือกว่าง/ซ้ำ, ข้อซ้ำ, ข้อที่ใช้ภาพ)'),
        ('ข้อที่ซ้ำกัน', 'คลังต้นฉบับมีข้อที่ซ้ำกันจริงหลายคู่ (ส่วนใหญ่เป็นพาร์ท 1.4 ที่ใช้ภาพต่างกัน) '
                        '— ดูรายละเอียดในชีต "ข้อที่ต้องตรวจ"'),
        ('ไม่รวม Mock Exam', 'ชุด Mock 30 ข้อ เป็นเพียงการหยิบข้อจากพาร์ทหลักมาซ้ำ จึงไม่นับรวม'),
        ('ไฟล์ CSV', 'exports/BACC2569_ข้อสอบทั้งหมด.csv (10 คอลัมน์เดียวกัน) และ '
                    'exports/แยกตามพาร์ท/*.csv สำหรับนำเข้าทีละวิชา'),
        ('สร้างใหม่อย่างไร', 'รัน python3 tools/export_questions.py (อ่านคลังล่าสุดแล้วสร้างไฟล์ทับให้อัตโนมัติ)'),
    ]
    ws6.append(['หัวข้อ', 'รายละเอียด'])
    for n in notes:
        ws6.append(list(n))
    ws6.column_dimensions['A'].width = 24
    ws6.column_dimensions['B'].width = 116
    for row in ws6.iter_rows(min_row=2, max_row=ws6.max_row, max_col=2):
        row[0].font = Font(bold=True)
        for cell in row:
            cell.alignment = Alignment(vertical='top', wrap_text=True)
    style_header(ws6, 2)

    wb.save(path)
    return img_count


def safe_name(part):
    name = f"{part['label']}_{part['title']}".replace('/', '-').replace('\\', '-')
    return re.sub(r'\s+', '_', name)[:80]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    payload = load_questions()
    rows = build_rows(payload)
    issues = build_issues(rows)

    xlsx = os.path.join(OUT_DIR, 'BACC2569_ข้อสอบทั้งหมด.xlsx')
    csv_path = os.path.join(OUT_DIR, 'BACC2569_ข้อสอบทั้งหมด.csv')
    img_count = write_xlsx(payload, rows, issues, xlsx)
    write_csv(rows, csv_path)

    parts_dir = os.path.join(OUT_DIR, 'แยกตามพาร์ท')
    os.makedirs(parts_dir, exist_ok=True)
    for old in os.listdir(parts_dir):
        if old.endswith('.csv'):
            os.remove(os.path.join(parts_dir, old))
    for part in payload['parts']:
        sub = [r for r in rows if r['part_id'] == part['id']]
        if sub:
            write_csv(sub, os.path.join(parts_dir, f'{safe_name(part)}.csv'))

    print(f'เขียนแล้ว: {xlsx}  (ฝังภาพ {img_count} ภาพ)')
    print(f'เขียนแล้ว: {csv_path}')
    print(f'เขียนแล้ว: {parts_dir}/ ({len(payload["parts"])} ไฟล์)')
    print(f'จำนวนข้อทั้งหมด: {len(rows):,}')
    for part in payload['parts']:
        n = sum(1 for r in rows if r['part_id'] == part['id'])
        print(f"  - {part['label']} {part['title']}: {n}")
    kinds = {}
    for _, kind, _ in issues:
        kinds[kind] = kinds.get(kind, 0) + 1
    print('สรุปข้อที่ต้องตรวจ:', kinds)
    return 0


if __name__ == '__main__':
    sys.exit(main())
