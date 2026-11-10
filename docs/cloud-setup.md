# ตั้งค่า “ซิงก์อัตโนมัติ” ครั้งเดียว (~10 นาที) — ผู้ใช้ทุกคนไม่ต้องตั้งค่าอะไรเลย

แอปเก็บข้อมูลประวัติสอบ/เกียรติบัตร/ชุดข้อสอบขึ้น **Firebase Realtime Database (พลan Spark ฟรีของ Google)**
เมื่อตั้งค่าเสร็จ ทุกเครื่องที่เปิดแอปจะซิงก์เองอัตโนมัติ — **ไม่มี token ไม่มีลิงก์ให้กรอก**

ใช้บัญชี Google ของเจ้าของระบบเท่านั้น ผู้ใช้ปกติไม่ต้องมีบัญชีอะไรเลย

---

## ขั้นที่ 1 — สร้างโปรเจกต์ Firebase (2 นาที)

1. เปิด <https://console.firebase.google.com> แล้วล็อกอินด้วย Google
2. กด **“Add project / เพิ่มโปรเจกต์”** → ตั้งชื่อ `bacc-exam` (ชื่ออะไรก็ได้)
3. ปิด Google Analytics (ไม่จำเป็น) → **Create project** → รอจนเสร็จ กด Continue

## ขั้นที่ 2 — เปิด Realtime Database (2 นาที)

1. เมนูซ้าย **Build → Realtime Database** → กด **Create Database**
2. เลือก location **Singapore (asia-southeast1)** → Next
3. เลือก **“Start in locked mode”** → Enable (เดี๋ยวเราจะใส่ rules เองในขั้นที่ 4)
4. **คัดลอก URL ที่โชว์ด้านบนแท็บ Data** — หน้าตาแบบนี้
   `https://bacc-exam-default-rtdb.asia-southeast1.firebasedatabase.app`
   → นี่คือ **`databaseURL`** เก็บไว้

## ขั้นที่ 3 — เปิด Anonymous Sign-in (1 นาที)

1. เมนูซ้าย **Build → Authentication** → กด **Get started**
2. แท็บ **Sign-in method** → เลือก **Anonymous** → เปิด **Enable** → Save

## ขั้นที่ 4 — ตั้ง Security Rules (1 นาที)

1. กลับไป **Realtime Database → แท็บ Rules**
2. แปะกฎนี้แทนของเดิม แล้วกด **Publish**

```json
{
  "rules": {
    "bacc2569": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## ขั้นที่ 5 — เอา Web API Key (2 นาที)

1. เมนูซ้ายบน กด ⚙️ **Project settings → แท็บ General**
2. เลื่อนลงส่วน **Your apps** → กดไอคอนเว็บ **`</>`** ลงทะเบียนเว็บแอป (ตั้งชื่อ `bacc-web`, ไม่ต้องติ๊ก Hosting) → **Register app**
3. ใน config ที่โชว์ ให้คัดลอกค่า **`apiKey`** (ขึ้นต้นด้วย `AIza...`)
4. _(กด Continue to console ได้เลย ไม่ต้องทำขั้น npm ต่อ)_

## ขั้นที่ 6 — ใส่ค่า 2 ช่องลงในไฟล์บน GitHub (2 นาที) — เสร็จสิ้น

1. เปิดไฟล์นี้ใน repo: **`src/data/sync-target.js`** → กด ✏️ (Edit)
2. แก้ 3 บรรทัด:

```js
export const SYNC_TARGET = {
  mode: 'cloud', // ← เปลี่ยนจาก 'gist' เป็น 'cloud'
  ...
  firebase: {
    apiKey: 'AIzaSy..........',        // ← วาง apiKey จากขั้นที่ 5
    databaseURL: 'https://....app',    // ← วาง URL จากขั้นที่ 2
  },
}
```

3. กด **Commit changes** → รอ deploy ~1 นาที

## ✅ ตรวจว่าสำเร็จ

- เปิดแอป → มุมบนจะมี pill “ซิงก์อัตโนมัติพร้อมแล้ว”
- แตะ avatar ขวาบน → การ์ดสีเขียว **“ซิงก์อัตโนมัติเปิดอยู่ — ไม่ต้องตั้งค่าอะไรเลย”**
- ลองเปิดอีกเครื่อง → ประวัติ/เกียรติบัตรตามมาครบ

> 🔐 ความปลอดภัย: `apiKey` ไม่ใช่รหัสลับ (ออกแบบมาให้ฝังหน้าเว็บได้) — การเข้าถึงถูกกันไว้ด้วย
> Security Rules ขั้นที่ 4 และ Anonymous Auth ขั้นที่ 3 ข้อมูลจะไม่ถูกใครแก้โดยไม่ผ่านแอป
>
> 💰 ค่าใช้จ่าย: แผน Spark **ฟรีถาวร** (เก็บได้ 1 GB · ดาวน์โหลด 10 GB/เดือน) — ข้อมูลแอปนี้
> ระดับแสนไบต์ ใช้ฟรีได้อีกหลายปี
>
> 🆓 ไม่พร้อมใช้ Firebase? โหมดเดิม (GitHub gist/repo) ยังใช้ได้ — ปุ่ม **“ใช้ GitHub แทน (ขั้นสูง)”**
> อยู่ในแผงเดิม และลิงก์เชื่อมอัตโนมัติแบบเก่าก็ยังรองรับ
