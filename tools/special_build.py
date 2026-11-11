#!/usr/bin/env python3
"""สร้างพาร์ท "ข้อสอบพิเศษ" จากไฟล์ PDF ต้นฉบับ

    pip install pymupdf pillow
    python tools/special_build.py "/path/to/Baac69 พนักงานการเงินระดับ4 ....pdf"

ผลลัพธ์
  src/data/special.js     โจทย์ + ตัวเลือก + เฉลย + คำอธิบาย (6 ชุด / 390 ข้อ)
  public/special/*.png    ภาพประกอบโจทย์และตัวเลือกที่ครอปจาก PDF
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

if len(sys.argv) > 1:
    os.environ['SPECIAL_PDF'] = sys.argv[1]

import gen    # noqa: E402
import emit   # noqa: E402

if __name__ == '__main__':
    gen.main()
    emit.emit()
    print('เสร็จแล้ว: src/data/special.js + public/special/*.png')
