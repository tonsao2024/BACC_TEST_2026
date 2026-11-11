"""ตรวจสอบชุดข้อสอบพิเศษ 10 รอบ (data-level checks)."""
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, 'src', 'data', 'special.js')
PUB = os.path.join(REPO, 'public')
PDF_TEXT = os.path.join(REPO, '.special-build', 'prod.json')

fails = []
notes = []


def check(cond, msg):
    if not cond:
        fails.append(msg)
    return cond


# ---- load data straight out of the generated JS -------------------------
import subprocess

DUMP = r"""
import { SPECIAL_SET_META, specialGeneral, specialPrecision1, specialPrecision2,
         specialPosition1, specialPosition2, specialReal68 } from 'REPOPATH/src/data/special.js'
const arrays = { general: specialGeneral, precision1: specialPrecision1,
                 precision2: specialPrecision2, position1: specialPosition1,
                 position2: specialPosition2, real68: specialReal68 }
console.log(JSON.stringify({ meta: SPECIAL_SET_META, arrays }))
""".replace('REPOPATH', REPO)
node = subprocess.run(['node', '--input-type=module', '-e', DUMP], cwd=REPO,
                      capture_output=True, text=True)
if node.returncode:
    print(node.stderr)
    sys.exit(1)
payload = json.loads(node.stdout)
meta = payload['meta']
arrays = payload['arrays']

print('sets:', [(x['id'], x['count'], len(x['sections'])) for x in meta])

# ---- R1: array <-> meta agreement --------------------------------------
r1 = 0
for s in meta:
    arr = arrays[s['key']]
    check(len(arr) == s['count'], 'R1 %s count %d != %d' % (s['id'], len(arr), s['count']))
    r1 += len(arr)
check(r1 == sum(x['count'] for x in meta), 'R1 total mismatch')
print('R1 count/meta:', r1, 'questions OK' if not fails else 'FAIL')

# ---- R2: contiguous numbering ------------------------------------------
for s in meta:
    arr = arrays[s['key']]
    check([q['n'] for q in arr] == list(range(1, len(arr) + 1)), 'R2 %s numbering' % s['id'])
print('R2 numbering done')

# ---- R3: four distinct non-empty options -------------------------------
pict_q = 0
for s in meta:
    for q in arrays[s['key']]:
        check(len(q['o']) == 4, 'R3 %s q%d has %d options' % (s['id'], q['n'], len(q['o'])))
        ofigs = [x for x in (q.get('ofigs') or []) if x]
        if ofigs:
            pict_q += 1
            check(len(ofigs) == 4, 'R3 %s q%d picture options %d/4' % (s['id'], q['n'], len(ofigs)))
        elif q.get('pictOpts'):
            check(bool(q.get('fig')), 'R3 %s q%d pictOpts without stem figure' % (s['id'], q['n']))
        else:
            check(all(str(o).strip() for o in q['o']),
                  'R3 %s q%d empty option' % (s['id'], q['n']))
        check(0 <= q['a'] <= 3, 'R3 %s q%d answer index %s' % (s['id'], q['n'], q['a']))
print('R3 options done (picture-option questions: %d)' % pict_q)

# ---- R4: answer letter consistency -------------------------------------
LETTER = 'กขคง'
mism = 0
for s in meta:
    for q in arrays[s['key']]:
        if q.get('answerLetter') and q['answerLetter'] != LETTER[q['a']]:
            mism += 1
            fails.append('R4 %s q%d letter %s vs a=%d' % (s['id'], q['n'], q['answerLetter'], q['a']))
        e = str(q.get('e') or '')
        # the key letter is authoritative; when the printed line carries an option
        # text it may disagree with the letter, so only flag an actual key clash
        if e.startswith('เฉลยข้อ') and ('เฉลยข้อ %s' % LETTER[q['a']]) not in e:
            txt_lines = [ln for ln in e.split('\n')[1:] if ln.strip()]
            if not txt_lines:
                fails.append('R5 %s q%d wrong answer letter: %r' % (s['id'], q['n'], e[:60]))
print('R4/R5 answer letter:', 'mismatch %d' % mism)

# ---- R5: explanations non-empty ----------------------------------------
for s in meta:
    for q in arrays[s['key']]:
        check(bool(str(q.get('e', '')).strip()), 'R6 %s q%d no explanation' % (s['id'], q['n']))
print('R6 explanations done')

# ---- R6: question stem non-empty (text or image) -----------------------
for s in meta:
    for q in arrays[s['key']]:
        has_text = bool(str(q.get('q', '')).strip())
        has_img = bool(q.get('fig')) or any(x for x in (q.get('ofigs') or []))
        check(has_text or has_img,
              'R7 %s q%d empty stem and no figure' % (s['id'], q['n']))
print('R7 stems done')

# ---- R7: section coverage (1..N, no gaps/overlap) ----------------------
for s in meta:
    arr = arrays[s['key']]
    secs = s['sections']
    covered = []
    for sec in secs:
        check(sec['from'] <= sec['to'], 'R8 %s section %s bad range' % (s['id'], sec['key']))
        check(sec['count'] == sec['to'] - sec['from'] + 1,
              'R8 %s section %s count %s vs %s-%s' % (s['id'], sec['key'], sec['count'], sec['from'], sec['to']))
        covered += list(range(sec['from'], sec['to'] + 1))
        hit = [q['n'] for q in arr if q.get('src') == sec['key']]
        check(hit and min(hit) == sec['from'] and max(hit) == sec['to'],
              'R8 %s section %s question keys %s vs %s-%s' % (s['id'], sec['key'], (min(hit), max(hit)) if hit else None, sec['from'], sec['to']))
    check(covered == list(range(1, len(arr) + 1)), 'R8 %s section coverage not contiguous' % s['id'])
print('R8 sections done')

# ---- R8: images referenced exist; html well formed ---------------------
IMG = re.compile(r'<img[^>]*src="([^"]+)"')
missing = 0
refs = set()
nfig = 0
nofig = 0
for s in meta:
    for q in arrays[s['key']]:
        for html in [q.get('fig')] + list(q.get('ofigs') or []):
            if not html:
                continue
            if 'fig' == 'fig':
                pass
            for src in IMG.findall(html):
                refs.add(src)
                if not os.path.exists(os.path.join(PUB, src)):
                    missing += 1
                    fails.append('R9 %s q%d missing image %s' % (s['id'], q['n'], src))
            check(html.count('<img') == html.count('>'), 'R9 %s q%d malformed html' % (s['id'], q['n']))
        if q.get('fig'):
            nfig += 1
        if q.get('ofigs'):
            nofig += 1
            check(len(q['ofigs']) == 4, 'R9 %s q%d ofigs %d' % (s['id'], q['n'], len(q['ofigs'])))
print('R9 images: %d unique, %d missing; stems-with-fig %d; option-fig questions %d' % (len(refs), missing, nfig, nofig))

# ---- R9: orphan files in public/special --------------------------------
on_disk = {'special/' + f for f in os.listdir(os.path.join(PUB, 'special'))}
orphans = sorted(on_disk - refs)
check(not orphans, 'R10 orphan images: %s' % orphans[:5])
print('R10 orphans:', len(orphans), 'files on disk:', len(on_disk))

# ---- R10: duplicate detection + crossword sanity -----------------------
for s in meta:
    seen = {}
    for q in arrays[s['key']]:
        key = re.sub(r'\s+', '', str(q.get('q', '')))
        if not key or q.get('fig'):
            continue
        if key in seen:
            notes.append('dup %s q%d == q%d: %.40s' % (s['id'], q['n'], seen[key], key))
        else:
            seen[key] = q['n']
# a == index of the option identical to the stem for compare-type questions
same_hits = 0
for s in meta:
    for q in arrays[s['key']]:
        if q.get('src') != 'compare' or not s['id'].endswith('precision-1'):
            continue
        stem = str(q.get('q', '')).strip()
        eq = [i for i, o in enumerate(q['o']) if str(o).strip() == stem]
        if eq:
            same_hits += 1
            check(q['a'] in eq, 'R10 %s q%d answer %d not the identical option %s' % (s['id'], q['n'], q['a'], eq))
print('R10 compare-identical options honoured:', same_hits, '| dups:', len(notes))
for n in notes[:10]:
    print('   ', n)

print()
if fails:
    print('FAILED %d checks' % len(fails))
    for f in fails[:40]:
        print(' -', f)
    sys.exit(1)
print('ALL CHECKS PASSED')
