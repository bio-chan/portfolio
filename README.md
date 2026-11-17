# Kittisak / Shiro — Game Design & Visual Art Portfolio

เว็บไซต์พอร์ตแบบ static เปิดจาก `index.html` หรือเสิร์ฟผ่าน HTTP server ได้

## ดีไซน์และเนื้อหา
- หน้าเปิด Game Designer × Visual Artist ใช้ผลงาน MUEA เป็นภาพหลัก
- ลำดับผลงาน: Game Design, Concept Art & 3D, VTuber, Editorial, Showcase, Motion & Audio
- Creative Toolkit เชื่อมทักษะแต่ละด้านเข้ากับผลงานจริง
- ภาพผลงานกดขยายได้ และการ์ดรองรับ Enter / Space
- Responsive สำหรับเดสก์ท็อป แท็บเล็ต และมือถือ

## ตัวอ่าน FILM IS ALIVE
ใช้ภาพต้นฉบับ 34 ไฟล์ใน `assets/magazine`: ปกหน้า ภาพหน้าคู่ และปกหลัง ตัวเลขในตัวอ่านจึงเป็น “ชุดหน้า” ไม่ใช่เลขหน้าที่พิมพ์ในนิตยสาร

- คลิกขอบซ้าย/ขวา ปุ่มลูกศร หรือปัดเพื่อพลิกหน้าพร้อมเอฟเฟกต์ 3D
- เลือกชุดหน้าจากรายการ แถบเลื่อน หรือภาพย่อ
- ซูมแล้วเลื่อนภาพเพื่ออ่านข้อความ; ปัดขณะซูมจะไม่พลิกหน้า
- รองรับเต็มจอเมื่อเบราว์เซอร์อนุญาต และดาวน์โหลด PDF ต้นฉบับ
- Escape ปิด, Home / End ไปปกหน้า / หลัง, Tab อยู่ภายในตัวอ่าน
- รองรับ prefers-reduced-motion และป้องกันสถานะค้างเมื่อปิดระหว่างพลิกหน้า

## ไฟล์
- `index.html`: เนื้อหาและระบบเดิมของพอร์ต
- `assets/portfolio.css`: visual design และ responsive reader
- `assets/portfolio.js`: reader controls และ accessibility
- `resume.html`: เรซูเม่เดิม
- `tests/portfolio.cjs`: regression tests ด้วย Playwright
- `tests/*.png`: ภาพหน้าจอที่บันทึกจากการทดสอบ

## การทดสอบ
ทดสอบด้วย Chrome headless ที่ viewport 1440×1000, 768×844 และ 390×844 ผ่านทั้งหมด:
layout ไม่ล้นแนวนอน, เมนูมือถือ, ปก/หน้าคู่, พลิกไปกลับ, ขอบเขตหน้าแรก/สุดท้าย, เลือกหน้า, ภาพย่อ, ซูม, Escape, เปิดซ้ำระหว่าง animation, reduced motion, local assets และไม่มี JavaScript runtime error

รัน server ที่ `http://127.0.0.1:4173` แล้วรัน `node tests/portfolio.cjs` โดยติดตั้ง Playwright ในสภาพแวดล้อมทดสอบก่อน สามารถกำหนด `PLAYWRIGHT_MODULE` เป็น path ของ Playwright และ `CHROME_PATH` เป็น path ของ Chrome ได้

ฟอนต์ Kanit และ Tailwind CDN ต้องใช้อินเทอร์เน็ต วิดีโอ YouTube และการดาวน์โหลดเกมจาก itch.io เป็นบริการภายนอก การทดสอบนี้ไม่ได้ยืนยันการเล่นวิดีโอหรือดาวน์โหลดเกมจากบริการเหล่านั้น

## การจัดหมวดและดีไซน์ฉบับปรับใหม่
- 6 หมวด / 11 ผลงาน: Game Design, Concept Art, 3D & Product, Graphic & Merch, Editorial, Motion & Audio
- แถบเลือกหมวดแสดงเฉพาะงานที่เลือก พร้อมจำนวนผลงาน และเปิดหมวดที่ถูกซ่อนให้อัตโนมัติเมื่อกดเมนูลัด
- แต่ละหมวดใช้รูปแบบที่เหมาะกับงาน: game case study, art gallery, product render, campaign collection, editorial bookshelf และ motion showcase
- แยก Experience, Toolkit และ Contact ออกจากหมวดผลงาน
- `assets/chapters.css` ดูแลดีไซน์แต่ละหมวด; `assets/categories.js` ดูแลการกรองหมวด
- รัน preview ด้วย `node tests/serve.cjs` แล้วเปิด `http://127.0.0.1:4173`
- รัน `node tests/categories.cjs` เพื่อตรวจหมวดงาน ลิงก์กลับไปหมวดที่ถูกซ่อน การเปิดภาพ และ 10 ส่วนของเว็บที่ความกว้าง 360, 390, 768 และ 1440 พิกเซล
- ผลทดสอบ categories และ regression ตัวอ่าน eBook ผ่านทั้งหมด ภาพแต่ละส่วนอยู่ใน `tests/chapter-*.png`

## หน้าแนะนำตัวสไตล์เกม–อนิเมะ
- หน้าเปิดแนะนำชื่อ กอล์ฟ / กิตติศักดิ์ / SHIRO พร้อมสาขาการศึกษาและสิ่งที่ทำ ใช้ภาพวาดต้นฉบับเป็น character profile
- ลำดับหน้า: แนะนำตัว → Creative Toolkit → เลือกหมวด → ผลงาน → Experience → Contact
- `assets/anime.css` ดูแลธีม character profile, กริด, มุมตัด และสีม่วง–mint
- `tests/pages.cjs` ตรวจหน้าแรกและหน้าเรซูเม่ที่ 360 / 390 / 768 / 1440 พิกเซล รวมการเรียงส่วนและการกลับหน้าพอร์ต
- `tests/reader-pages.cjs` ตรวจการแสดงภาพ eBook ครบ 34 ชุด, Escape จากตัวเลือกหน้า, เปิด/ปิดหน้าต่าง Trailer และการซ่อนแถบเครื่องมือเมื่อพิมพ์เรซูเม่
- ทั้ง 4 test scripts ผ่าน; ไม่พบ JavaScript runtime error ในหน้าที่ตรวจ ไม่ได้ยืนยันการเล่นวิดีโอหรือดาวน์โหลดเกมบนบริการภายนอก

## Interactive exploration
ลูกเล่นใน `assets/play.js` และ `assets/play.css`:
- เปลี่ยนภาพตัวละครต้นฉบับ 3 ภาพ พร้อม transition
- การ์ดเอียงตามตำแหน่งเมาส์และแสง hover; touch ยังเลื่อนหน้าได้ตามปกติ
- ธีม Violet / Mint / Rose พร้อมจำสีที่เลือกในเบราว์เซอร์
- เมนูค้นหา Quick Travel เปิดได้ด้วยปุ่ม “สำรวจ” หรือ Ctrl+K
- ปุ่ม “พาชมพอร์ต” สำหรับทัวร์ 7 จุด เริ่มจากแนะนำตัว
- Scroll progress, ปุ่มกลับด้านบน และตัวนับหมวดที่สำรวจ
- เอฟเฟกต์ปรากฏเมื่อเลื่อนถึง และ click feedback
- เสียง UI เลือกเปิดเอง (เริ่มแบบปิด) และสวิตช์ลดการเคลื่อนไหว
- แกลเลอรี: ก่อนหน้า/ถัดไป ลูกศรคีย์บอร์ด ซูม เลื่อนภาพ และคืน focus เมื่อปิด
- eBook: คั่นหน้าที่ต้องการและเปิดกลับมาอ่านต่อ บันทึกเฉพาะเบราว์เซอร์นี้

รัน `node tests/play.cjs` เพื่อตรวจทุกปุ่มใหม่ พร้อมการจำค่าและขนาดมือถือ หากตั้ง `VISIBLE_DEMO=1` จะเปิด Chrome แบบเห็นหน้าต่างและบันทึกคลิป `tests/portfolio-interactions.webm` (ต้องมี Playwright FFmpeg runtime)
สวิตช์เสียงควบคุมทั้งเสียง UI และเสียงพลิกหน้า eBook โดยเริ่มปิดเสมอ ตรวจผ่านทั้ง HTTP preview และการเปิด index.html จากไฟล์โดยตรงด้วย tests/sound.cjs
