/* ตัวละคร BACC SVG — ขยับได้ด้วย CSS
 * รองรับโหมด:
 * 1) idle (ตัวละครยืนปกติ variant 0..3)
 * 2) reading (ตัวละครอ่านหนังสือ เปิดหน้าไปมา และมีฟองความคิด)
 * 3) running (ตัวละครวิ่งเดี่ยว)
 * 4) RunningRacers (ตัวละครต่างกันหลายตัวกำลังวิ่งแข่งกันบนลู่)
 */

export function ReadingMascot({
  size = 240,
  className = '',
  color = '#1D4ED8',
  color2 = '#60A5FA',
}) {
  return (
    <svg
      className={`mascot mascot--reading ${className}`}
      width={size}
      height={size}
      viewBox="0 0 180 180"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="readGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
        <linearGradient id="bookCoverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0B2149" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="cloudGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FEF3C7" />
        </linearGradient>
        <linearGradient id="bulbGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
      </defs>

      {/* เงาบนพื้น */}
      <ellipse
        cx="90"
        cy="164"
        rx="52"
        ry="8"
        fill="rgba(11,31,58,.22)"
        className="mascot__shadow"
      />

      {/* ละอองความคิด / ประกายปัญญา (ลอยขึ้น) */}
      <g className="mascot__thoughts-wrap">
        {/* ฟองความคิดลูกเล็ก */}
        <circle cx="120" cy="52" r="3.8" fill="#FFFFFF" opacity="0.85" className="thought-bubble tb-1" />
        <circle cx="132" cy="40" r="6" fill="#FFFFFF" opacity="0.9" className="thought-bubble tb-2" />

        {/* ก้อนเมฆความคิด */}
        <g className="thought-cloud">
          <path
            d="M130 22 Q128 12 138 12 Q144 6 154 10 Q164 6 168 16 Q178 18 174 28 Q172 36 160 36 Q146 40 138 34 Q128 32 130 22 Z"
            fill="url(#cloudGrad)"
            stroke="#FDE68A"
            strokeWidth="1.2"
            filter="drop-shadow(0 4px 10px rgba(11,31,58,0.22))"
          />

          {/* หลอดไฟปิ๊งไอเดีย / กำลังคิดโจทย์ */}
          <g className="idea-bulb">
            <path
              d="M152 14 c-3 0 -5 2 -5 5 c0 2 1.2 3.5 2.5 4.3 v2 h5 v-2 c1.3 -0.8 2.5 -2.3 2.5 -4.3 c0 -3 -2 -5 -5 -5 Z"
              fill="url(#bulbGrad)"
            />
            <rect x="150" y="25" width="4" height="1.8" rx="0.8" fill="#D97706" />
            {/* ลำแสงไอเดีย */}
            <line x1="152" y1="10" x2="152" y2="7" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="145" y1="12" x2="143" y2="9.5" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="159" y1="12" x2="161" y2="9.5" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" />
          </g>

          {/* จุดคิด ... กำลังประมวลผลข้อสอบ */}
          <circle cx="145" cy="22" r="1.8" fill="#D97706" className="think-dot td-1" />
          <circle cx="152" cy="22" r="1.8" fill="#D97706" className="think-dot td-2" />
          <circle cx="159" cy="22" r="1.8" fill="#D97706" className="think-dot td-3" />
        </g>

        {/* ประกายวิบวับรอบศีรษะ */}
        <path
          d="M116 20 l1.5 3 l3 1.5 l-3 1.5 l-1.5 3 l-1.5 -3 l-3 -1.5 l3 -1.5 Z"
          fill="#FBBF24"
          className="read-sparkle read-sparkle--1"
        />
        <path
          d="M172 48 l1 2.2 l2.2 1 l-2.2 1 l-1 2.2 l-1 -2.2 l-2.2 -1 l2.2 -1 Z"
          fill="#60A5FA"
          className="read-sparkle read-sparkle--2"
        />
      </g>

      {/* ลำตัวและท่านั่ง */}
      <g className="mascot__reading-body">
        {/* ขาพับ/รองเท้าผ้าใบขาวแถบน้ำเงิน */}
        <path
          d="M52 144 Q62 154 74 150 Q82 148 88 142"
          stroke="#1E3A8A"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M128 144 Q118 154 106 150 Q98 148 92 142"
          stroke="#1E3A8A"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="56" cy="151" rx="12" ry="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
        <ellipse cx="124" cy="151" rx="12" ry="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
        <path d="M50 151 h12" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M118 151 h12" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" />

        {/* ตัวเสื้อ */}
        <path
          d="M58 96 c-14 0 -24 14 -24 32 v18 c0 5 4 9 9 9 h94 c5 0 9 -4 9 -9 v-18 c0 -18 -10 -32 -24 -32 Z"
          fill="url(#readGrad)"
        />
        {/* ปกคอเสื้อขาว + เนกไททอง */}
        <polygon points="90,96 82,114 98,114" fill="#FFFFFF" />
        <polygon points="90,112 86,130 90,134 94,130" fill="#F59E0B" />

        {/* แขนสองข้างยื่นออกมาจับหนังสือ */}
        <path
          d="M44 106 Q28 126 44 138"
          stroke="url(#readGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M136 106 Q152 126 136 138"
          stroke="url(#readGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />

        {/* หนังสือที่เปิดอยู่บนตัก */}
        <g className="mascot__book">
          {/* ปกหลังแข็งหนา */}
          <path
            d="M38 122 Q90 134 142 122 L138 144 Q90 154 42 144 Z"
            fill="url(#bookCoverGrad)"
          />

          {/* หน้าซ้ายของหนังสือ */}
          <path
            d="M40 120 Q66 126 88 129 L88 148 Q66 145 42 139 Z"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="0.8"
          />
          {/* เส้นข้อความจำลองในหน้าซ้าย */}
          <line x1="48" y1="127" x2="80" y2="131" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <line x1="48" y1="133" x2="78" y2="137" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <line x1="48" y1="139" x2="72" y2="142" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />

          {/* หน้าขวาของหนังสือ */}
          <path
            d="M92 129 Q114 126 140 120 L138 139 Q114 145 92 148 Z"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="0.8"
          />
          {/* เส้นข้อความจำลองในหน้าขวา */}
          <line x1="100" y1="131" x2="132" y2="127" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <line x1="102" y1="137" x2="132" y2="133" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <line x1="106" y1="142" x2="128" y2="139" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />

          {/* สันกลางหนังสือ */}
          <line x1="90" y1="128" x2="90" y2="150" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" />

          {/* แผ่นหน้าที่กำลังพลิกไปมา (Animated Page Flip) */}
          <g className="mascot__page-leaf">
            <path
              d="M90 128 Q110 122 126 117 L124 136 Q108 141 90 148 Z"
              fill="#FFFDF5"
              stroke="#FDE68A"
              strokeWidth="0.9"
            />
            <line x1="96" y1="130" x2="120" y2="125" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="98" y1="135" x2="118" y2="131" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" />
          </g>

          {/* แผ่นหน้าที่พลิกย้อนกลับ (Flutter layer) */}
          <g className="mascot__page-leaf-reverse">
            <path
              d="M90 128 Q70 122 54 117 L56 136 Q72 141 90 148 Z"
              fill="#FFFDF5"
              stroke="#FDE68A"
              strokeWidth="0.9"
            />
            <line x1="84" y1="130" x2="60" y2="125" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="82" y1="135" x2="62" y2="131" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" />
          </g>

          {/* ปลายนิ้วมือสองข้างเกาะขอบหนังสือ */}
          <circle cx="44" cy="136" r="5.5" fill="#FFE9D6" />
          <circle cx="136" cy="136" r="5.5" fill="#FFE9D6" />
        </g>

        {/* ศีรษะและใบหน้า (มีแอนิเมชันเอียงคิดและสายตากวาดอ่าน) */}
        <g className="mascot__head mascot__head--reading">
          <circle cx="90" cy="62" r="30" fill="#FFE9D6" />

          {/* หมวกบัณฑิต / หมวกเตรียมสอบ ธ.ก.ส. สีทอง */}
          <g className="mascot__hat">
            <polygon points="90,22 136,34 90,44 44,34" fill="#F5C46B" stroke="#D97706" strokeWidth="1.2" />
            <ellipse cx="90" cy="38" rx="18" ry="8" fill="#D97706" />
            <circle cx="90" cy="33" r="3" fill="#B45309" />
            <path
              d="M90 33 Q114 38 118 52"
              stroke="#B45309"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              className="mascot__tassel"
            />
            <circle cx="118" cy="54" r="3" fill="#F59E0B" />
          </g>

          {/* แก้มส้มใส */}
          <circle cx="70" cy="71" r="4.2" fill="#FFB4A2" opacity="0.8" />
          <circle cx="110" cy="71" r="4.2" fill="#FFB4A2" opacity="0.8" />

          {/* ดวงตาขยับอ่านและมองบนคิดโจทย์ */}
          <g className="mascot__eyes mascot__eyes--reading">
            <ellipse cx="78" cy="64" rx="3.8" ry="4.5" fill="#0B1F3A" className="eye-pupil eye-pupil--l" />
            <circle cx="79.5" cy="62.5" r="1.3" fill="#FFFFFF" />
            <ellipse cx="102" cy="64" rx="3.8" ry="4.5" fill="#0B1F3A" className="eye-pupil eye-pupil--r" />
            <circle cx="103.5" cy="62.5" r="1.3" fill="#FFFFFF" />
          </g>

          {/* รอยยิ้มมุ่งมั่น / อมยิ้มตอนกำลังคิดออก */}
          <path
            d="M84 74 Q90 79 96 74"
            stroke="#0B1F3A"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            className="mascot__mouth--reading"
          />
        </g>
      </g>
    </svg>
  )
}

/* ตัวละครที่แตกต่างกันกำลังวิ่งแข่งกันบนลู่ (สำหรับส่วน "แข่งขันกับเพื่อน") */
export function RunningRacers({ className = '', height = 136 }) {
  return (
    <svg
      className={`mascot-racers ${className}`}
      width="100%"
      height={height}
      viewBox="0 0 520 140"
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        {/* Gradients สำหรับตัวละครทั้ง 4 ตัวที่แตกต่างกัน */}
        {/* Racer 1: น้ำเงิน ธ.ก.ส. (ผู้นำสปรินต์) */}
        <linearGradient id="racer1Grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>

        {/* Racer 2: สีส้ม-คอรัล สดใส (ผู้ท้าชิงไฟแรง) */}
        <linearGradient id="racer2Grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>

        {/* Racer 3: สีเขียวมรกต ยอดใบไม้ (สายลุยพลังบวก) */}
        <linearGradient id="racer3Grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#4ADE80" />
        </linearGradient>

        {/* Racer 4: สีม่วงเทอร์โบ (จอมแซงทางโค้ง) */}
        <linearGradient id="racer4Grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7E22CE" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>

        {/* ลู่สนามแข่ง */}
        <linearGradient id="trackGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0B1F3A" stopOpacity="0.1" />
          <stop offset="30%" stopColor="#1E3A8A" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.32" />
        </linearGradient>
      </defs>

      {/* ลู่วิ่งแข่งขัน + เส้นประลู่ */}
      <g className="racers__track">
        <rect x="0" y="24" width="520" height="110" rx="16" fill="url(#trackGrad)" />
        {/* เส้นเลนวิ่งที่ 1 */}
        <line x1="0" y1="52" x2="480" y2="52" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeDasharray="14 10" className="track-dash" />
        {/* เส้นเลนวิ่งที่ 2 */}
        <line x1="0" y1="84" x2="480" y2="84" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeDasharray="14 10" className="track-dash track-dash--mid" />
        {/* เส้นเลนวิ่งที่ 3 */}
        <line x1="0" y1="116" x2="480" y2="116" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeDasharray="14 10" className="track-dash" />

        {/* เส้นชัยลายตารางหมากรุก (Finish Line) */}
        <g className="finish-line" transform="translate(470, 26)">
          <line x1="0" y1="0" x2="0" y2="106" stroke="#FFFFFF" strokeWidth="3" />
          {/* ธงชัยชนะ / แถบตาราง */}
          <rect x="2" y="2" width="6" height="6" fill="#FFFFFF" />
          <rect x="8" y="2" width="6" height="6" fill="#0B1F3A" />
          <rect x="2" y="8" width="6" height="6" fill="#0B1F3A" />
          <rect x="8" y="8" width="6" height="6" fill="#FFFFFF" />
          <rect x="2" y="14" width="6" height="6" fill="#FFFFFF" />
          <rect x="8" y="14" width="6" height="6" fill="#0B1F3A" />
          <rect x="2" y="20" width="6" height="6" fill="#0B1F3A" />
          <rect x="8" y="20" width="6" height="6" fill="#FFFFFF" />
          <rect x="2" y="26" width="6" height="6" fill="#FFFFFF" />
          <rect x="8" y="26" width="6" height="6" fill="#0B1F3A" />

          {/* ถ้วยรางวัลทองคำรออยู่หน้าเส้นชัย */}
          <g transform="translate(18, 28) scale(0.9)">
            <g className="finish-trophy">
              <path d="M4 12 Q4 24 14 24 Q24 24 24 12 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
              <path d="M4 14 Q0 14 0 18 Q0 22 4 22" stroke="#F59E0B" strokeWidth="2" fill="none" />
              <path d="M24 14 Q28 14 28 18 Q28 22 24 22" stroke="#F59E0B" strokeWidth="2" fill="none" />
              <rect x="12" y="24" width="4" height="6" fill="#D97706" />
              <rect x="8" y="30" width="12" height="4" rx="1.5" fill="#B45309" />
              <circle cx="14" cy="18" r="3" fill="#FEF08A" />
            </g>
          </g>
        </g>

        {/* เส้นความเร็วลมพัดผ่าน (Speed Lines) */}
        <line x1="80" y1="36" x2="140" y2="36" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" className="speed-line sl-1" />
        <line x1="210" y1="44" x2="280" y2="44" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" className="speed-line sl-2" />
        <line x1="330" y1="38" x2="410" y2="38" stroke="rgba(255,255,255,0.45)" strokeWidth="2.2" strokeLinecap="round" className="speed-line sl-3" />
        <line x1="160" y1="124" x2="230" y2="124" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" className="speed-line sl-4" />
      </g>

      {/* ========================================================
          ตัวละครที่ 4 (สีม่วง) - กำลังวิ่งสปีดไล่กวดมาจากด้านหลัง
          ======================================================== */}
      <g className="racer racer--4">
        <g transform="translate(68, 62)">
          {/* กลุ่มควันฝุ่นใต้ฝ่าเท้า */}
          <g className="racer-dust">
            <circle cx="-16" cy="48" r="4.5" fill="rgba(255,255,255,0.5)" />
            <circle cx="-24" cy="46" r="3.2" fill="rgba(255,255,255,0.35)" />
        </g>
        {/* เงา */}
        <ellipse cx="6" cy="50" rx="16" ry="3.5" fill="rgba(11,31,58,0.2)" />
        {/* ขาหลัง */}
        <path d="M4 32 Q-8 42 -14 38" stroke="#581C87" strokeWidth="6" strokeLinecap="round" className="leg-back" />
        {/* ลำตัว */}
        <path d="M0 16 c-8 0 -13 6 -13 14 v4 h26 v-4 c0 -8 -5 -14 -13 -14 Z" fill="url(#racer4Grad)" className="racer-body" />
        {/* แขนหลัง */}
        <path d="M-6 20 Q-16 26 -14 34" stroke="#7E22CE" strokeWidth="5" strokeLinecap="round" className="arm-back" />
        {/* ขาหน้า */}
        <path d="M8 32 Q18 42 14 50" stroke="#7E22CE" strokeWidth="6" strokeLinecap="round" className="leg-front" />
        {/* แขนหน้า */}
        <path d="M10 20 Q20 18 18 26" stroke="#7E22CE" strokeWidth="5" strokeLinecap="round" className="arm-front" />
        {/* ศีรษะและผ้าคาดหัวสีม่วง-เหลือง */}
        <g className="racer-head">
          <circle cx="4" cy="4" r="14" fill="#FFE9D6" />
          <rect x="-8" y="-4" width="24" height="4.5" rx="2" fill="#A855F7" />
          <ellipse cx="8" cy="4" rx="2" ry="2.4" fill="#0B1F3A" />
          <path d="M6 10 Q9 12 12 9" stroke="#0B1F3A" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <circle cx="2" cy="8" r="2" fill="#FFB4A2" opacity="0.7" />
        </g>
        </g>
      </g>

      {/* ========================================================
          ตัวละครที่ 3 (สีเขียว ยอดใบไม้) - วิ่งอย่างร่าเริง สปีดเต็มที่
          ======================================================== */}
      <g className="racer racer--3">
        <g transform="translate(180, 42)">
          {/* ควันฝุ่น */}
          <g className="racer-dust">
            <circle cx="-16" cy="48" r="4.8" fill="rgba(255,255,255,0.55)" />
            <circle cx="-25" cy="45" r="3.5" fill="rgba(255,255,255,0.38)" />
        </g>
        <ellipse cx="6" cy="50" rx="17" ry="3.8" fill="rgba(11,31,58,0.22)" />
        {/* ขาหลัง */}
        <path d="M2 32 Q-12 42 -18 36" stroke="#14532D" strokeWidth="6.5" strokeLinecap="round" className="leg-back" />
        {/* ตัว */}
        <path d="M0 16 c-8 0 -14 7 -14 15 v4 h28 v-4 c0 -8 -6 -15 -14 -15 Z" fill="url(#racer3Grad)" className="racer-body" />
        {/* แขนหลัง */}
        <path d="M-6 20 Q-18 24 -16 32" stroke="#15803D" strokeWidth="5.5" strokeLinecap="round" className="arm-back" />
        {/* ขาหน้า */}
        <path d="M8 32 Q20 40 18 50" stroke="#15803D" strokeWidth="6.5" strokeLinecap="round" className="leg-front" />
        {/* แขนหน้า */}
        <path d="M10 20 Q22 16 20 25" stroke="#15803D" strokeWidth="5.5" strokeLinecap="round" className="arm-front" />
        {/* หัว + ใบไม้งอกบนศีรษะ + แว่นตาสปอร์ต */}
        <g className="racer-head">
          <circle cx="4" cy="3" r="14.5" fill="#FFE9D6" />
          {/* ใบไม้นำโชค */}
          <path d="M4 -12 C10 -12 12 -7 12 -3 C12 1 8 3 4 3 C0 3 -4 1 -4 -3 C-4 -7 -2 -12 4 -12 Z" fill="#22C55E" />
          <path d="M4 -8 v10" stroke="#15803D" strokeWidth="1.6" strokeLinecap="round" />
          {/* แว่นตา */}
          <circle cx="2" cy="3" r="3.5" fill="none" stroke="#047857" strokeWidth="1.3" />
          <circle cx="10" cy="3" r="3.5" fill="none" stroke="#047857" strokeWidth="1.3" />
          <line x1="5.5" y1="3" x2="6.5" y2="3" stroke="#047857" strokeWidth="1.3" />
          <ellipse cx="2" cy="3" rx="1.6" ry="1.9" fill="#0B1F3A" />
          <ellipse cx="10" cy="3" rx="1.6" ry="1.9" fill="#0B1F3A" />
          <path d="M4 10 Q7 13 11 10" stroke="#0B1F3A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
        </g>
      </g>

      {/* ========================================================
          ตัวละครที่ 2 (สีส้ม-คอรัล) - ผู้ท้าชิง ใส่หมวกแก๊ป วิ่งไล่บี้เบอร์ 1
          ======================================================== */}
      <g className="racer racer--2">
        <g transform="translate(295, 70)">
          {/* ควันฝุ่น */}
          <g className="racer-dust">
            <circle cx="-18" cy="48" r="5" fill="rgba(255,255,255,0.6)" />
            <circle cx="-28" cy="45" r="3.8" fill="rgba(255,255,255,0.4)" />
        </g>
        <ellipse cx="8" cy="50" rx="18" ry="4" fill="rgba(11,31,58,0.24)" />
        {/* ขาหลัง */}
        <path d="M4 32 Q-10 44 -16 38" stroke="#9A3412" strokeWidth="7" strokeLinecap="round" className="leg-back" />
        {/* ตัว */}
        <path d="M0 16 c-9 0 -15 7 -15 16 v4 h30 v-4 c0 -9 -6 -16 -15 -16 Z" fill="url(#racer2Grad)" className="racer-body" />
        {/* ลายสายฟ้าบนเสื้อ */}
        <polygon points="-2,22 3,22 0,27 4,27 -1,33 0,29 -3,29" fill="#FEF08A" />
        {/* แขนหลัง */}
        <path d="M-8 20 Q-20 24 -18 34" stroke="#EA580C" strokeWidth="6" strokeLinecap="round" className="arm-back" />
        {/* ขาหน้า */}
        <path d="M10 32 Q22 42 18 52" stroke="#EA580C" strokeWidth="7" strokeLinecap="round" className="leg-front" />
        {/* แขนหน้า */}
        <path d="M12 20 Q24 16 22 26" stroke="#EA580C" strokeWidth="6" strokeLinecap="round" className="arm-front" />
        {/* หัว + หมวกแก๊ปสปอร์ตหันหลัง + หยดเหงื่อมุ่งมั่น */}
        <g className="racer-head">
          <circle cx="6" cy="3" r="15" fill="#FFE9D6" />
          {/* หมวกแก๊ปสีส้มเข้ม */}
          <path d="M-8 0 Q6 -14 20 0 Z" fill="#C2410C" />
          <path d="M-8 0 Q-16 -2 -14 4 Z" fill="#EA580C" />
          {/* ตาและรอยยิ้มฟันสู้ */}
          <ellipse cx="12" cy="4" rx="2.2" ry="2.6" fill="#0B1F3A" />
          <circle cx="13" cy="2.8" r="0.8" fill="#FFFFFF" />
          <path d="M8 10 Q12 13 16 9" stroke="#0B1F3A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <circle cx="6" cy="8" r="2.2" fill="#FFB4A2" opacity="0.8" />
          {/* หยดเหงื่อพุ่งไปข้างหลัง */}
          <path d="M-4 -2 Q-10 -4 -8 0 Q-4 0 -4 -2" fill="#38BDF8" className="sweat-drop" />
        </g>
        </g>
      </g>

      {/* ========================================================
          ตัวละครที่ 1 (สีน้ำเงิน ธ.ก.ส. เบอร์ 1) - ผู้นำสปรินต์พุ่งเข้าเส้นชัย
          ======================================================== */}
      <g className="racer racer--1 is-leader">
        <g transform="translate(410, 48)">
          {/* ควันฝุ่นความเร็วสูง */}
          <g className="racer-dust">
            <circle cx="-20" cy="48" r="5.5" fill="rgba(255,255,255,0.65)" />
            <circle cx="-32" cy="45" r="4.2" fill="rgba(255,255,255,0.45)" />
        </g>
        <ellipse cx="10" cy="50" rx="20" ry="4.5" fill="rgba(11,31,58,0.28)" />
        {/* ขาหลังก้าวสุดเหยียด */}
        <path d="M4 32 Q-14 44 -22 36" stroke="#1E3A8A" strokeWidth="7.5" strokeLinecap="round" className="leg-back" />
        {/* ตัวเสื้อน้ำเงิน ธ.ก.ส. */}
        <path d="M0 16 c-10 0 -16 8 -16 18 v4 h32 v-4 c0 -10 -6 -18 -16 -18 Z" fill="url(#racer1Grad)" className="racer-body" />
        {/* ป้ายเบอร์ 1 สีทองบนเสื้อ */}
        <circle cx="0" cy="28" r="5" fill="#FEF08A" />
        <text x="0" y="31.5" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#1E3A8A">1</text>
        {/* แขนหลัง */}
        <path d="M-10 20 Q-24 24 -22 36" stroke="#1D4ED8" strokeWidth="6.5" strokeLinecap="round" className="arm-back" />
        {/* ขาหน้ายกสูงนำโด่ง */}
        <path d="M12 32 Q26 40 22 52" stroke="#1D4ED8" strokeWidth="7.5" strokeLinecap="round" className="leg-front" />
        {/* แขนหน้ายกสูงสะใจ */}
        <path d="M14 20 Q26 14 24 24" stroke="#1D4ED8" strokeWidth="6.5" strokeLinecap="round" className="arm-front" />
        {/* หัว + มงกุฎ/หมวกเหรียญทอง + รอยยิ้มผู้นำ */}
        <g className="racer-head">
          <circle cx="8" cy="2" r="16" fill="#FFE9D6" />
          {/* สายคาดศีรษะดาวทอง */}
          <rect x="-8" y="-6" width="30" height="5.5" rx="2.5" fill="#F59E0B" />
          <polygon points="7,-11 9,-6 14,-6 10,-3 11,2 7,-1 3,2 4,-3 0,-6 5,-6" fill="#FEF08A" />
          {/* ตาโตเป็นประกาย */}
          <ellipse cx="15" cy="3" rx="2.5" ry="3" fill="#0B1F3A" />
          <circle cx="16.2" cy="1.8" r="1" fill="#FFFFFF" />
          {/* รอยยิ้มกว้างเข้าเส้นชัย */}
          <path d="M10 8 Q15 13 20 8" stroke="#0B1F3A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <circle cx="8" cy="7" r="2.5" fill="#FFB4A2" opacity="0.8" />
        </g>
        </g>
      </g>
    </svg>
  )
}

/* Banner สำหรับส่วน "แข่งขันกับเพื่อน"
   กรอบเดียวที่รวมลู่วิ่ง + ปุ่มท้าแข่ง + รายชื่อเพื่อนไว้ด้วยกัน (children) */
export function FriendRaceBanner({ onOpenArena, onCreateMatch, children }) {
  return (
    <div className="friend-race-banner">
      <div className="friend-race-banner__visual" aria-hidden="true">
        <RunningRacers />
      </div>
      <div className="friend-race-banner__bar">
        <div className="friend-race-banner__info">
          <strong className="friend-race-banner__title">
            วิ่งแข่งตอบข้อสอบชุดเดียวกันแบบเรียลไทม์
          </strong>
          <span className="friend-race-banner__desc">
            ท้าเพื่อนดวลข้อสอบ ใครแม่นยำและตอบเร็วกว่า เข้าเส้นชัยชิงอันดับ 1!
          </span>
        </div>
        <div className="friend-race-banner__actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => (onCreateMatch ? onCreateMatch() : onOpenArena?.())}
          >
            🔥 ท้าแข่งเลย
          </button>
          <button
            type="button"
            className="btn btn--soft btn--sm"
            onClick={onOpenArena}
          >
            ดูเพิ่มเติม
          </button>
        </div>
      </div>
      {children ? <div className="friend-race-banner__list">{children}</div> : null}
    </div>
  )
}

/* ตัวละคร Mascot หลัก (เข้ากันได้กับ Props เดิม) */
export default function Mascot({
  variant = 0,
  size = 96,
  className = '',
  color = '#2563EB',
  color2 = '#60A5FA',
  idle = true,
  activity = 'idle',
}) {
  if (activity === 'reading') {
    return (
      <ReadingMascot
        size={size}
        className={className}
        color={color}
        color2={color2}
      />
    )
  }

  const v = variant % 4
  return (
    <svg
      className={`mascot mascot--${v} ${idle ? 'is-idle' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`mg${v}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color2} />
        </linearGradient>
      </defs>

      {/* เงา */}
      <ellipse cx="60" cy="108" rx="26" ry="6" fill="rgba(11,31,58,.12)" className="mascot__shadow" />

      {/* ตัว */}
      <g className="mascot__body">
        <path
          d="M60 62c-16 0-27 11-27 25v6c0 5 4 9 9 9h36c5 0 9-4 9-9v-6c0-14-11-25-27-25Z"
          fill={`url(#mg${v})`}
        />
        <path d="M47 66c3-2 6-3 9-3v32h-6c-3 0-5-2-5-5V70c0-2 .8-3 2-4Z" fill="#fff" opacity=".18" />

        {/* แขน */}
        <g className="mascot__arm">
          <rect x="26" y="70" width="10" height="22" rx="5" fill={color} opacity=".85" />
        </g>
        <g className="mascot__arm mascot__arm--r">
          <rect x="84" y="70" width="10" height="22" rx="5" fill={color} opacity=".85" />
        </g>

        {/* หัว */}
        <g className="mascot__head">
          <circle cx="60" cy="40" r="26" fill="#FFE9D6" />
          <path d="M34 40a26 26 0 0 1 52 0Z" fill={`url(#mg${v})`} opacity=".22" />
          <g className="mascot__eyes">
            <ellipse cx="50" cy="40" rx="3.4" ry="4" fill="#0B1F3A" />
            <ellipse cx="70" cy="40" rx="3.4" ry="4" fill="#0B1F3A" />
          </g>
          <path d="M54 50c2 3 10 3 12 0" stroke="#0B1F3A" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="43" cy="48" r="3" fill="#FFB4A2" opacity=".6" />
          <circle cx="77" cy="48" r="3" fill="#FFB4A2" opacity=".6" />

          {/* หมวก/ใบไม้ ตาม variant */}
          {v === 0 && (
            <g className="mascot__hat">
              <ellipse cx="60" cy="22" rx="30" ry="7" fill="#F5C46B" />
              <path d="M42 22c0-10 8-16 18-16s18 6 18 16Z" fill="#FFD98A" />
              <rect x="40" y="19" width="40" height="5" rx="2.5" fill={color} opacity=".55" />
            </g>
          )}
          {v === 1 && (
            <g className="mascot__hat">
              <path d="M60 8c8 0 12 6 12 12 0 5-5 8-12 8s-12-3-12-8c0-6 4-12 12-12Z" fill="#22C55E" />
              <path d="M60 14v14" stroke="#0B7A3B" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}
          {v === 2 && (
            <g className="mascot__hat">
              <path d="M38 26c6-10 38-10 44 0" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
              <circle cx="60" cy="14" r="6" fill="#FBBF24" />
            </g>
          )}
          {v === 3 && (
            <g className="mascot__hat">
              <rect x="40" y="8" width="40" height="12" rx="6" fill={color} />
              <rect x="56" y="12" width="8" height="6" rx="2" fill="#fff" opacity=".7" />
            </g>
          )}
        </g>
      </g>
    </svg>
  )
}
