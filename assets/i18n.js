/* Thai / English language switch.
 * The pages are written in Thai. In English mode every Thai text node and
 * attribute (alt, title, aria-label, placeholder, meta content) is swapped for
 * its entry in EN below; switching back restores the original Thai.
 * A MutationObserver also covers text that other scripts insert later.
 * Load this in <head> (not deferred) so text is swapped before it is painted.
 * To translate a new Thai string, add "Thai text": "English text" to EN. */
(function () {
  'use strict';

  var EN = {
    /* ---------- page meta ---------- */
    'Portfolio ของ กิตติศักดิ์ คนเกณฑ์ (Kittisak Khonken) - Game Designer, Systems Designer, ผู้สร้างสรรค์เกม MUEA คืนกลับ แดนสาป': 'Portfolio of Kittisak Khonken – Game Designer, Systems Designer, creator of MUEA: Return to the Cursed Land',
    'เรซูเม่ | กิตติศักดิ์ คนเกณฑ์ (Game Designer & Developer)': 'Resume | Kittisak Khonken (Game Designer & Developer)',

    /* ---------- navigation ---------- */
    'แนะนำตัว': 'Intro',
    'ผลงาน': 'Work',
    'เกี่ยวกับ / ติดต่อ': 'Contact',
    'สิ่งที่ผมทำ': 'What I do',
    'ข้ามไปดูผลงาน': 'Skip to work',

    /* ---------- hero ---------- */
    'สวัสดีครับ ผมกอล์ฟ': 'Hi, I’m Golf',
    'กิตติศักดิ์ คนเกณฑ์': 'Kittisak Khonken',
    'ผมชอบสร้างโลกที่มีเรื่องราว — ทั้งในเกมและในภาพวาด': 'I love building worlds with stories — in games and in paintings.',
    'ออกแบบระบบเกม วาดตัวละคร สร้างงาน 3D': 'I design game systems, draw characters and build 3D work,',
    'และต่อยอดไอเดียสู่งานกราฟิก วิดีโอ และเสียง': 'then carry ideas into graphics, video and sound.',
    'นักศึกษานิเทศศาสตร์ดิจิทัล': 'Digital Communication Arts student',
    'มหาวิทยาลัยเทคโนโลยีสุรนารี · นครราชสีมา': 'Suranaree University of Technology · Nakhon Ratchasima',
    'รู้จักงานที่ผมทำ': 'See what I do',
    'ดูผลงานทั้งหมด ↗': 'View all work ↗',
    'อ่านประวัติและเรซูเม่ ↗': 'Read my resume ↗',
    'กอล์ฟ กิตติศักดิ์ คนเกณฑ์': 'Golf – Kittisak Khonken',
    'ผลงานวาดตัวละครสไตล์อนิเมะ Perspective Study ของกอล์ฟ': 'Golf’s anime-style character artwork, Perspective Study',
    'ดูผลงาน Concept Art': 'View concept art',

    /* ---------- expertise ---------- */
    'แล้วผมทำอะไรบ้าง?': 'So what do I do?',
    'หลายทักษะ เชื่อมกันด้วยการเล่าเรื่อง': 'Many skills, tied together by storytelling',
    'ผมทำงานข้ามทั้งภาพ ระบบ และเสียง เลือกสำรวจสายงานที่สนใจ หรือเลื่อนลงไปดูผลงานจริงในแต่ละหมวดได้เลยครับ': 'I work across visuals, systems and sound. Pick a field that interests you, or scroll down to see real work in each category.',
    'กลไกเกม · การจัดการทรัพยากร · การเล่าเรื่อง · Playtesting': 'Game mechanics · Resource management · Storytelling · Playtesting',
    'Key Visual · VTuber Merchandise · นิตยสาร · Layout Design': 'Key Visual · VTuber Merchandise · Magazine · Layout Design',

    /* ---------- work index ---------- */
    'ผลงานของผม': 'My work',
    'จากไอเดีย สู่สิ่งที่ได้ลงมือทำ': 'From ideas to things I actually made',
    '7 หมวดงาน / 17 ผลงาน': '7 categories / 17 works',
    'ทั้งหมด': 'All',
    'เลือกหมวดผลงาน': 'Choose a category',

    /* ---------- game design: MUEA ---------- */
    'สร้างโลกที่ผู้เล่นมีส่วนร่วม': 'Building worlds players take part in',
    'ออกแบบประสบการณ์ผ่านระบบ การตัดสินใจ และเรื่องเล่า — จากแนวคิดสู่เกมที่ทดลองเล่นได้จริง': 'Designing experiences through systems, decisions and narrative — from concept to a playable game.',
    'คืนกลับ แดนสาป': 'Return to the Cursed Land',
    'MUEA คืนกลับ แดนสาป': 'MUEA: Return to the Cursed Land',
    '"MUEA คืนกลับ แดนสาป"': '"MUEA: Return to the Cursed Land"',
    'สวมบทผู้ใหญ่บ้านในชนบทอีสานยุค 90s บริหารทรัพยากร สืบหาผีที่แฝงตัว และพาหมู่บ้านเอาชีวิตรอดตลอด 14 วัน': 'Play as a village headman in 1990s rural Isan: manage resources, hunt down the ghosts hiding among villagers, and keep the village alive for 14 days.',
    'ทดลองเล่นเดโม ↗': 'Play the demo ↗',
    'ดูการจัดแสดงและ Playtest ↓': 'See exhibitions & playtests ↓',
    'จัดสรรเสบียง ยา และความเชื่อมั่นของชาวบ้าน': 'Allocate supplies, medicine and villagers’ trust',
    'สังเกตพฤติกรรมและหลักฐานเพื่อค้นหาผู้แฝงตัว': 'Read behaviour and evidence to find the impostors',
    'ตีความความเชื่ออีสานให้เป็นประสบการณ์ Folk Horror': 'Reinterpret Isan folk beliefs as a folk horror experience',
    'ชมตัวอย่างเกม MUEA': 'Watch the MUEA trailer',
    'ภาพจากเกม MUEA': 'Screenshots from MUEA',
    'ประตูหมู่บ้านยามค่ำคืน — ซักถามผู้มาเยือน': 'The village gate at night — questioning a visitor',
    'บทสนทนากับชาวบ้านที่มาขอเข้าหมู่บ้าน': 'Talking with a villager asking to come in',
    'ประทับตรา “ผ่าน” ให้เข้าหมู่บ้าน': 'Stamping “Pass” to let them in',
    'ปฏิเสธผู้ที่ดูน่าสงสัย': 'Turning away someone suspicious',
    'ตรวจดวงตาเพื่อหาสิ่งผิดปกติ': 'Examining the eyes for anything unnatural',
    'เมื่อผีเผยร่างจริง': 'When the ghost shows its true form',
    'รายชื่อลูกบ้านยามเช้า': 'The morning roster of villagers',
    'ร้านค้า — ซื้อเสบียงและเครื่องป้องกัน': 'The shop — buying supplies and protection',

    /* ---------- game design: Kira Kira Workout ---------- */
    'ออกกำลังจริง เต้นจริง เพื่อเดบิวต์เป็นไอดอล': 'Real workouts, real dancing — all for an idol debut',
    'ชายหนุ่มตื่นมาพบว่ากลายเป็นสาวน้อยสุดน่ารัก แต่แทนที่จะเสียใจกลับดีใจ เพราะอยากเป็นไอดอลมานาน แฟนสาวจึงแต่งตั้งตัวเองเป็นเทรนเนอร์ส่วนตัว จับเข้าคอร์สฟิตเนสและซ้อมเต้นอย่างหนัก เพื่อไปออดิชั่นไอดอลระดับประเทศ — ผู้เล่นต้องขยับร่างกายจริงหน้าเว็บแคมเพื่อพาตัวละครไปให้ถึงฝัน': 'A young man wakes up as an adorable girl — and instead of despairing, he’s thrilled, because he’s always wanted to be an idol. His girlfriend appoints herself his personal trainer and puts him through intense fitness and dance practice for a national idol audition. Players must actually move in front of a webcam to carry the character to their dream.',
    'เล่นบน itch.io ↗': 'Play on itch.io ↗',
    'สควอตและรัวหมัดจริงหน้ากล้อง เพื่อเพิ่มค่า Stamina และ Vocal ของตัวละคร': 'Do real squats and punches in front of the camera to raise the character’s Stamina and Vocal stats.',
    'โพสท่าตามแฟนสาวให้ตรงจังหวะเพลง กล้องจับโครงร่างร่างกายเพื่อวัดความแม่นยำ': 'Copy your girlfriend’s poses on the beat while the camera tracks your skeleton to score accuracy.',
    'รวมความฟิตและสเต็ปเต้นในเพลงยาวต่อเนื่อง รักษาคอมโบเพื่อชนะใจกรรมการและปลดล็อกฉากจบ': 'Combine fitness and dance steps in one long song — keep the combo going to win over the judges and unlock the ending.',
    'หน้า Setup เก็บอายุ น้ำหนัก ส่วนสูง และประสบการณ์เพื่อคำนวณ BMI แล้วแบ่งความหนักเป็น 3 ระดับ — มือใหม่ (2–2.5 นาที พัก 45–60 วิ) · ทั่วไป (3–4 นาที พัก 30–45 วิ) · สายฟิต (4–5 นาที พัก 15–20 วิ) พร้อม Interactive Rest ที่แฟนสาวมาทักทายและปุ่มเช็กความเหนื่อยเพื่อปรับความยากอัตโนมัติ': 'The Setup screen collects age, weight, height and experience to calculate BMI, then sets one of 3 intensity levels — Beginner (2–2.5 min, 45–60 s rest) · Regular (3–4 min, 30–45 s rest) · Fit (4–5 min, 15–20 s rest) — plus an Interactive Rest where the girlfriend checks in, and a fatigue button that adjusts difficulty automatically.',
    'Webcam → Python MediaPipe Pose จับข้อต่อท่อนบน (หัว ไหล่ ศอก ข้อมือ) แบบเรียลไทม์ → ส่งพิกัดผ่าน UDP → Godot ควบคุมกระดูกตัวละครแบบ Mirror Avatar / IK ให้ขยับตามผู้เล่นทันที': 'Webcam → Python MediaPipe Pose tracks upper-body joints (head, shoulders, elbows, wrists) in real time → coordinates sent over UDP → Godot drives the character’s bones as a Mirror Avatar / IK so it moves with the player instantly.',
    'เพลงธีม “Kira Kira Workout!” แนว Upbeat J-Pop / Anime OP 140–160 BPM พร้อมเสียงพากย์แฟนสาวคอยเชียร์ ดุ และให้กำลังใจตลอดการเล่น': 'Theme song “Kira Kira Workout!” — upbeat J-Pop / anime-OP style at 140–160 BPM, with the girlfriend’s voice cheering, scolding and encouraging you throughout.',
    'ภาพจากเกม Kira Kira Workout!': 'Screenshot from Kira Kira Workout!',
    'หน้าเมนูหลัก': 'Main menu',
    'บทสนทนาและตัวเลือกกับ Kira': 'Dialogue and choices with Kira',
    'Hana แฟนสาวผู้เป็นเทรนเนอร์': 'Hana, the girlfriend-turned-trainer',
    'ออกกำลังในยิม — PERFECT!': 'Gym workout — PERFECT!',
    'HUD วัดท่าทางและจังหวะเท้า': 'HUD tracking pose and footwork timing',
    'เมื่อท่าไม่ตรง — MISS': 'When the pose is off — MISS',
    'วิ่งในสวนสาธารณะ': 'Running in the park',
    'สรุปผลประจำวัน': 'Daily summary',
    'เวทีเดบิวต์': 'Debut stage',
    'ฉากจบและแรงก์': 'Ending and rank',

    /* ---------- concept art ---------- */
    'ภาพวาดและการออกแบบตัวละคร': 'Illustration and character design',
    'สำรวจบุคลิกผ่านรูปร่าง แสงเงา และท่าทาง โดยให้ภาพต้นฉบับเป็นหัวใจของพื้นที่จัดแสดง': 'Exploring personality through shape, light and pose — with the original artwork at the heart of the display.',
    'ดูภาพเต็ม ↗': 'View full image ↗',
    'ขยายภาพ Shadow Elf': 'Enlarge Shadow Elf',
    'ขยายภาพ Perspective Study': 'Enlarge Perspective Study',
    'ขยายภาพ Character Identity': 'Enlarge Character Identity',
    'ขยายภาพ Winged Seraph': 'Enlarge Winged Seraph',
    'เลือกภาพตัวละคร': 'Choose a character image',

    /* ---------- 3D ---------- */
    '3D และงานภาพผลิตภัณฑ์': '3D and product visuals',
    'จากรูปทรง วัสดุ และแสง สู่ภาพผลิตภัณฑ์ที่สื่ออารมณ์ได้ตั้งแต่แรกเห็น': 'From form, material and light to product images that convey mood at first glance.',
    'ปั้นโมเดลกระป๋องด้วย Blender สร้างผิวสัมผัสและละอองน้ำ จัดแสงสตูดิโอ แล้วคอมโพสิตภาพโฆษณาด้วย Photoshop': 'Modelled the can in Blender, built the surface texture and condensation droplets, lit it studio-style, then composited the ad in Photoshop.',
    'ขยายภาพ DIGIBLINK SODA — 3D Product Visualization': 'Enlarge DIGIBLINK SODA — 3D Product Visualization',

    /* ---------- VTuber ---------- */
    'กราฟิกและสินค้า VTuber': 'VTuber graphics and merchandise',
    'ออกแบบภาพลักษณ์ให้เป็นหนึ่งเดียว ตั้งแต่ Key Visual ของแคมเปญ ไปจนถึงสินค้าที่จับต้องได้': 'A unified visual identity — from the campaign key visual to physical merchandise.',
    'Key Visual แคมเปญฤดูร้อนสำหรับ ViVii Melanie และ Zoey เชื่อมบุคลิกตัวละครกับสี ตัวอักษร และองค์ประกอบกราฟิก': 'Summer campaign key visual for ViVii Melanie and Zoey, linking each character’s personality to colour, type and graphic elements.',
    'ขยายภาพ VTuber Summer Campaign — ViVii Melanie & Zoey': 'Enlarge VTuber Summer Campaign — ViVii Melanie & Zoey',
    'ขยายภาพ ViVii Melanie — Summer Standee': 'Enlarge ViVii Melanie — Summer Standee',
    'ขยายภาพ Zoey — Summer Standee': 'Enlarge Zoey — Summer Standee',

    /* ---------- photography ---------- */
    'ถ่ายภาพคอสเพลย์ ตัดต่อ และกราฟิกโปสเตอร์': 'Cosplay photography, retouching and poster graphics',
    'กำกับมุมกล้องและแสงธรรมชาติในการถ่ายคอสเพลย์ ก่อนต่อยอดเป็นภาพรีทัช คอมโพสิต และโปสเตอร์ตัวอักษรที่สื่อบุคลิกตัวละคร': 'Directing camera angles and natural light for cosplay shoots, then developing them into retouched images, composites and typographic posters that express each character.',
    'ถ่ายภาพคอสเพลย์ในโลเคชันจริง ใช้แสงแดดที่ลอดผ่านหน้าต่างสร้างมิติและอารมณ์ จัดท่าทางให้เข้ากับคาแรกเตอร์': 'Shot cosplay on location, using sunlight through windows for depth and mood, and posing to fit each character.',
    'ปรับโทนสี แสงเงา และผิว ให้ภาพดูนุ่มนวลแต่ยังคงรายละเอียดของชุดและวิก': 'Graded colour, light and skin for a soft look while keeping the detail of costumes and wigs.',
    'ไดคัทตัวละครวางบนฉากใหม่ เพิ่มควัน แสงแฟลร์ และตัวอักษรขนาดใหญ่ซ้อนชั้นแบบโปสเตอร์': 'Cut out characters onto new backgrounds, adding smoke, flares and large layered poster typography.',
    'Poster composite — ไดคัทและตัวอักษรซ้อนชั้น': 'Poster composite — cut-out and layered type',
    'Window light portrait — แสงธรรมชาติ': 'Window light portrait — natural light',
    'Retouch & smoke — ฉากหลังสีม่วงและแสงแฟลร์': 'Retouch & smoke — purple backdrop and flares',
    'Close-up portrait — แสงเงาบนใบหน้า': 'Close-up portrait — light and shadow on the face',
    'Duo pose — จัดองค์ประกอบสองตัวละคร': 'Duo pose — composing two characters',

    /* ---------- magazine ---------- */
    'นิตยสารและงานออกแบบสิ่งพิมพ์': 'Magazine and editorial design',
    'เล่าเรื่องผ่านจังหวะของภาพ ตัวอักษร และพื้นที่ว่าง พร้อมเปิดอ่านผลงานจริงได้ทั้งเล่ม': 'Storytelling through the rhythm of images, type and white space — and you can read the whole issue.',
    'ฟิล์มยังมีชีวิต — เรื่องราวของภาพถ่ายแอนะล็อกในโลกดิจิทัล ถ่ายทอดผ่าน Grid Layout, Typography และการจัดจังหวะภาพตลอดทั้งเล่ม': 'Film is alive — the story of analogue photography in a digital world, told through grid layout, typography and image pacing across the whole issue.',
    '34 ชุดหน้าและปก': '34 spreads and covers',
    'เปิดอ่านหนังสือ': 'Read the magazine',
    'ดาวน์โหลดฉบับ PDF ↓': 'Download PDF ↓',
    'เปิดอ่าน FILM IS ALIVE': 'Read FILM IS ALIVE',
    'ปกนิตยสาร FILM IS ALIVE': 'FILM IS ALIVE magazine cover',
    'อ่านชุดหน้า 2': 'Read spread 2',
    'อ่านชุดหน้า 8': 'Read spread 8',
    'อ่านชุดหน้า 14': 'Read spread 14',
    'ตัวอย่างหน้าคู่นิตยสาร ชุดที่ 2': 'Magazine spread sample 2',
    'ตัวอย่างหน้าคู่นิตยสาร ชุดที่ 8': 'Magazine spread sample 8',
    'ตัวอย่างหน้าคู่นิตยสาร ชุดที่ 14': 'Magazine spread sample 14',
    'หน้า 02 - 03: การวางโครงสร้างสารบัญ การจัดระบบ Grid และลำดับชั้นตัวพิมพ์ (Hierarchy)': 'Pages 02–03: Table of contents structure, grid system and type hierarchy',
    'หน้า 04 - 05: แนะนำเทคนิคและพื้นฐานการถ่ายภาพฟิล์ม การจัดคอลัมน์ให้อ่านง่ายและน่าติดตาม': 'Pages 04–05: Film photography basics and techniques, with columns laid out to be easy and engaging to read',
    'หน้า 08 - 09: โทนสีและมู้ดอารมณ์ของม้วนฟิล์มแต่ละประเภท การวางภาพคู่บทความ': 'Pages 08–09: The colour and mood of each film stock, pairing images with articles',
    'หน้า 14 - 15: คอลัมน์บทสัมภาษณ์ช่างภาพฟิล์มและเบื้องหลังการถ่ายทอดอารมณ์ผ่านภาพนิ่ง': 'Pages 14–15: Interview with a film photographer on conveying emotion through still images',
    'หน้า 20 - 21: แคตตาล็อกกล้องคลาสสิก การเลือกคู่ฟอนต์และการจัดการช่องไฟ White Space': 'Pages 20–21: Classic camera catalogue, font pairing and white space',

    /* ---------- audio ---------- */
    'วิดีโอ แอนิเมชัน และงานเสียง': 'Video, animation and audio',
    'ผสานภาพเคลื่อนไหวกับการมิกซ์เสียง เพื่อให้ทั้งสองส่วนเล่าเรื่องไปในทิศทางเดียวกัน': 'Combining motion and audio mixing so both tell the story in the same direction.',
    'มิกซ์และมาสเตอริงเสียงร้อง ปรับ EQ, Reverb และ Dynamic Compression พร้อม Motion Graphics และแอนิเมชันประกอบเพลง': 'Vocal mixing and mastering with EQ, reverb and dynamic compression, plus motion graphics and animation for the song.',
    'ชมบน YouTube ↗': 'Watch on YouTube ↗',
    'เล่น Cupid Cover MV': 'Play the Cupid cover MV',
    'Cupid Cover MV โดย ViViiMLN': 'Cupid cover MV by ViViiMLN',

    /* ---------- showcase / experience ---------- */
    'ผลงานที่ได้พบผู้เล่นจริง': 'Work that met real players',
    'การนำเสนอ การจัดแสดง และการทดสอบเกม — อีกด้านของกระบวนการออกแบบ': 'Pitching, exhibiting and playtesting — the other side of the design process.',
    'Thai Next Thainess: Pitching เวทีใหญ่ & ออกบูธจัดแสดง ณ QSNCC': 'Thai Next Thainess: Main-stage pitch & exhibition booth at QSNCC',
    'จัดโดย กรมส่งเสริมวัฒนธรรม กระทรวงวัฒนธรรม • ศูนย์การประชุมแห่งชาติสิริกิติ์ กรุงเทพฯ': 'Organised by the Department of Cultural Promotion, Ministry of Culture • Queen Sirikit National Convention Center, Bangkok',
    'AUTO-SLIDE 3.5s (คลิกดูภาพเต็ม)': 'AUTO-SLIDE 3.5s (click for full image)',
    'เลือกดูภาพสไลด์และบรรยากาศ (คลิกเพื่อแสดงสไลด์ที่เลือก):': 'Browse slides and moments (click to show a slide):',
    'การขึ้นบรรยายนำเสนอบนเวทีใหญ่ (Stage Pitching)': 'Main-stage pitch presentation',
    'ได้รับคัดเลือกเป็นตัวแทนขึ้น Pitching นำเสนอเกม': 'Selected to pitch the game',
    'บนเวทีใหญ่ของโครงการ Thai Next Thainess จัดโดย กรมส่งเสริมวัฒนธรรม กระทรวงวัฒนธรรม ภายในงานมหกรรมเกมระดับนานาชาติ ณ ศูนย์การประชุมแห่งชาติสิริกิติ์ (QSNCC) บรรยาย Core Gameplay Loop (ตรวจ -> สำรวจ -> เอาชีวิตรอด) และการนำอัตลักษณ์ความเชื่ออีสานมาประยุกต์สู่เกมสากล': 'on the main stage of the Thai Next Thainess programme, organised by the Department of Cultural Promotion, Ministry of Culture, at an international games expo at the Queen Sirikit National Convention Center (QSNCC). I presented the core gameplay loop (Check -> Explore -> Survive) and how Isan beliefs can be adapted into a game for a global audience.',
    'การออกบูธจัดแสดงและทดสอบระบบกับผู้เล่นจริง': 'Exhibition booth and live playtesting',
    'ร่วมออกบูธในฐานะ': 'Exhibited as an',
    'Exhibitor กรมส่งเสริมวัฒนธรรม': 'Exhibitor for the Department of Cultural Promotion',
    'ติดตั้งเครื่องทดสอบเกม PC พร้อมหูฟัง สำหรับเปิดให้ผู้เข้าร่วมงานทั้งชาวไทยและชาวต่างชาติได้ทดลองเล่นตัวเกมจริง (Playable Demo) เพื่อสังเกตพฤติกรรมผู้เล่น (Player Behavior) บันทึกสถิติการเล่น และรับฟังฟีดแบ็กเชิงลึกมาปรับบาลานซ์ความยากง่าย': '— set up PC test stations with headphones so Thai and international visitors could play the demo, while I observed player behaviour, recorded play stats and gathered in-depth feedback to rebalance difficulty.',
    'สไลด์ก่อนหน้า': 'Previous slide',
    'สไลด์ถัดไป': 'Next slide',
    'คลิกเพื่อดูภาพขยาย HD เต็มจอ': 'Click to view full-screen HD image',
    'การขึ้น Pitching เกม MUEA บนเวทีใหญ่ Thai Next Thainess': 'Pitching MUEA on the Thai Next Thainess main stage',
    'นำเสนอผลงานต่อหน้าคณะกรรมการและผู้ร่วมงาน gamescom asia ณ ศูนย์การประชุมแห่งชาติสิริกิติ์ (QSNCC)': 'Presenting to the judges and gamescom asia attendees at the Queen Sirikit National Convention Center (QSNCC)',
    'การขึ้น Pitching เกม MUEA บนเวทีใหญ่โครงการ Thai Next Thainess ในงาน gamescom asia × Thailand Game Show 2026 ณ ศูนย์การประชุมแห่งชาติสิริกิติ์ (QSNCC)': 'Pitching MUEA on the Thai Next Thainess main stage at gamescom asia × Thailand Game Show 2026, Queen Sirikit National Convention Center (QSNCC)',
    'สไลด์นำเสนอ: Core Gameplay Loop ของเกม MUEA': 'Slide: the core gameplay loop of MUEA',
    'บรรยายโครงสร้างระบบการเล่นหลัก 3 ขั้นตอน: ตรวจสอบเบาะแส (Check) -> สำรวจหมู่บ้าน (Explore) -> เอาชีวิตรอด 14 วัน (Survive)': 'Explaining the 3-step core loop: check clues (Check) -> explore the village (Explore) -> survive 14 days (Survive)',
    'สไลด์การบรรยาย Core Gameplay Loop (ตรวจ -> สำรวจ -> เอาชีวิตรอด) บนเวทีใหญ่ gamescom asia 2026': 'Core gameplay loop slide (Check -> Explore -> Survive) on the gamescom asia 2026 main stage',
    'สไลด์นำเสนอ: สถานะการพัฒนาตัวเกมปัจจุบัน & QR Code ติดตาม': 'Slide: current development status & follow QR code',
    'รายงานความคืบหน้าของตัวเกม ระบบทดสอบ Playable Demo และการเปิดช่องทางรับฟีดแบ็กจากผู้เล่น': 'Progress report on the game, the playable demo and channels for player feedback',
    'สไลด์แสดงสถานะการพัฒนาตัวเกม MUEA และช่องทางติดตามข่าวสาร บนเวทีใหญ่ gamescom asia 2026': 'Slide showing MUEA’s development status and news channels on the gamescom asia 2026 main stage',
    'คุณกิตติศักดิ์ คนเกณฑ์ นำเสนอผลงานบนเวทีใหญ่': 'Kittisak Khonken presenting on the main stage',
    'Lead Game Designer ถ่ายทอดวิสัยทัศน์และการนำความเชื่ออีสานโบราณมาตีความสู่เกมจิตวิทยาสากล': 'The lead game designer sharing the vision of reinterpreting ancient Isan beliefs as a psychological game for a global audience',
    'คุณกิตติศักดิ์ คนเกณฑ์ (กอล์ฟ / Shiro) ขณะบรรยายนำเสนอเกม MUEA บนเวทีโครงการ Thai Next Thainess': 'Kittisak Khonken (Golf / Shiro) presenting MUEA on the Thai Next Thainess stage',
    'ผู้ร่วมงานและเกมเมอร์ทดลองเล่นจริงประจำบูธ': 'Visitors and gamers playtesting at the booth',
    'เปิดให้ผู้ร่วมงาน gamescom asia ทดสอบ Playable Demo พร้อมหูฟัง เพื่อเก็บข้อมูลพฤติกรรมผู้เล่น': 'gamescom asia visitors tried the playable demo with headphones while we collected player behaviour data',
    'บรรยากาศผู้ร่วมงานและเกมเมอร์กำลังทดสอบเล่น (Playtest) เกม MUEA ประจำบูธ Thai Next Thainess ในงาน gamescom asia × Thailand Game Show 2026': 'Visitors and gamers playtesting MUEA at the Thai Next Thainess booth, gamescom asia × Thailand Game Show 2026',
    'ทีมงานผู้พัฒนาประจำบูธในฐานะ Exhibitor กระทรวงวัฒนธรรม': 'The dev team at the booth as Ministry of Culture exhibitors',
    'ร่วมปฏิบัติหน้าที่ดูแลบูธ ให้คำแนะนำ และบันทึกคำติชมจากผู้เล่นตลอดทั้งงานมหกรรมเกม': 'Running the booth, guiding players and recording feedback throughout the expo',
    'ทีมงานผู้พัฒนาเกม MUEA พร้อมป้าย Staff / Exhibitor กรมส่งเสริมวัฒนธรรม กระทรวงวัฒนธรรม ประจำบูธ Thai Next Thainess': 'The MUEA dev team with Staff / Exhibitor badges from the Department of Cultural Promotion, Ministry of Culture, at the Thai Next Thainess booth',
    'หน้าจอเกมเพลย์ระบบบริหารจัดการและตัดสินใจ': 'Gameplay screen: management and decision system',
    'หน้าต่างจำลองการตัดสินใจของผู้ใหญ่บ้านในการเลือกสืบสวนและจัดการทรัพยากรประจำวัน': 'The headman’s daily decisions on whom to investigate and how to manage resources',
    'หน้าจอการเล่นจริงของเกม MUEA ที่ผู้เล่นกำลังทดสอบตัดสินใจในระบบคำสั่ง': 'Live MUEA gameplay as a player makes decisions in the command system',
    'ผ่านการคัดเลือกหมวด Playable Demo รับทุนสนับสนุน 25,000 บาท และเปิดให้ทดสอบเล่นจริง': 'Selected in the Playable Demo category with a 25,000 THB grant, and opened to live playtesting',
    'ทุนพัฒนา 25,000 บาท': '25,000 THB dev grant',
    'ได้รับรางวัลชมเชย เงินรางวัล 10,000 บาท พร้อมจัดแสดงผลงาน ณ Korat Hall 2 เซ็นทรัล โคราช': 'Honourable mention with a 10,000 THB prize, exhibited at Korat Hall 2, Central Korat',
    'รางวัล 10,000 บาท': '10,000 THB prize',
    'ร่วมจัดแสดงในโซน Game Showcase “บ้านร้าง-เกม-หลอน” 1 ใน 7 Showcases ณ ศูนย์สร้างสรรค์งานออกแบบ (TCDC) นครราชสีมา 26–27 ก.ย. 69': 'Exhibited in the “Haunted House – Haunted Games” game showcase, 1 of 7 showcases at TCDC Nakhon Ratchasima, 26–27 Sep 2026',
    'TCDC โคราช': 'TCDC Korat',
    'Playtest MUEA ที่ Terminal 21 Korat': 'MUEA playtest at Terminal 21 Korat',
    'รับรางวัลชมเชย ISAN Game Craft 2026': 'Receiving an honourable mention at ISAN Game Craft 2026',
    'สแตนดี้ MUEA ในห้องจัดแสดง TCDC โคราช': 'MUEA standee in the TCDC Korat exhibition room',

    /* ---------- event photo log ---------- */
    'บันทึกภาพจากหน้างานจริง': 'Photos from the events',
    'เลือกงานอีเวนต์': 'Choose an event',
    'เปิดบูธ Playable Demo ให้ผู้เล่นทดสอบเกม MUEA จริง ณ Terminal 21 โคราช และเก็บฟีดแบ็กจากผู้เล่นหน้างาน': 'Ran a playable demo booth where players tried MUEA at Terminal 21 Korat, collecting feedback on the spot.',
    'ผู้เล่นรุมทดสอบ MUEA ที่บูธ Terminal 21 Korat': 'Players crowding the MUEA booth at Terminal 21 Korat',
    'ผู้เล่นคอสเพลย์แวะมาทดลองเล่น': 'A cosplayer stopping by to play',
    'ผู้เล่นสวมหูฟังดำดิ่งสู่บรรยากาศสยองขวัญ': 'A player with headphones, immersed in the horror',
    'หน้าเริ่มเกม MUEA คืนกลับ แดนสาป บนบูธ': 'The MUEA: Return to the Cursed Land title screen at the booth',
    'ทีมงานกับแบนเนอร์ MUEA ในงาน': 'The team with the MUEA banner',
    'ISAN Game Craft 2026 — รางวัลชมเชย': 'ISAN Game Craft 2026 — Honourable mention',
    'ได้รับรางวัลชมเชย ระดับอุดมศึกษาและบุคคลทั่วไป พร้อมจัดแสดง MUEA ในโซน Showcase ณ เซ็นทรัล โคราช': 'Honourable mention in the university & general category, with MUEA shown in the showcase zone at Central Korat.',
    'รับรางวัลชมเชย ISAN Game Craft 2026 เงินรางวัล 10,000 บาท': 'Receiving the ISAN Game Craft 2026 honourable mention, 10,000 THB prize',
    'บูธ Showcase ของ MUEA โดย Cosmologie Lab': 'MUEA showcase booth by Cosmologie Lab',
    'ป้ายรางวัลชมเชยบนโต๊ะจัดแสดง': 'The honourable mention plaque on the display table',
    'KREATOR SPACE 2026 — Game Showcase “บ้านร้าง-เกม-หลอน”': 'KREATOR SPACE 2026 — “Haunted House – Haunted Games” showcase',
    'ร่วมจัดแสดง MUEA ในโซน Game Showcase “บ้านร้าง-เกม-หลอน” ของงาน KREATOR SPACE (7 Showcases ปลุกพื้นที่ตึกเก่าด้วยความคิดสร้างสรรค์) ณ TCDC นครราชสีมา 26–27 ก.ย. 69 ห้องจัดแสดงแสงสีแดงเปิดให้ผู้ชมทดลองเล่นจริง': 'Exhibited MUEA in the “Haunted House – Haunted Games” showcase at KREATOR SPACE (7 showcases bringing an old building back to life with creativity), TCDC Nakhon Ratchasima, 26–27 Sep 2026. Visitors played the game in a red-lit exhibition room.',
    'แผ่นพับและสแตนดี้ MUEA ในห้องจัดแสดง': 'MUEA leaflets and standee in the exhibition room',
    'ผู้ชมทดลองเล่นเกมในห้องจัดแสดง': 'Visitors playing the game in the exhibition room',
    'ผู้เล่นเริ่มต้นคืนแรกของเกม': 'A player starting the game’s first night',
    'ห้องจัดแสดง “บ้านร้าง เกมส์หลอน”': 'The “Haunted House, Haunted Games” room',
    'ผู้ชมกำลังทดสอบเกม': 'Visitors testing the game',
    'ป้าย “เมืองมีโอกาส” Market ภายในงาน': 'The “City of Opportunity” market sign at the event',
    'Thai Next รอบแรก': 'Thai Next first round',
    'Thai Next Thainess — รอบแรก': 'Thai Next Thainess — First round',
    'ทีม Cosmologie Lab ร่วมนำเสนอผลงานในรอบแรกของโครงการ Thai Next Thainess ก่อนผ่านเข้าสู่เวทีใหญ่ที่ QSNCC': 'Team Cosmologie Lab pitched in the first round of Thai Next Thainess before advancing to the main stage at QSNCC.',
    'ทีมงานหลังนำเสนอผลงานรอบแรก': 'The team after the first-round pitch',
    'ถ่ายภาพร่วมกันหลังการ Pitching': 'Group photo after the pitch',
    'ทีม Cosmologie Lab ในวันนำเสนอ': 'Team Cosmologie Lab on pitch day',

    /* ---------- about / contact ---------- */
    'เปิดเรซูเม่ ↗': 'Open resume ↗',
    'กิตติศักดิ์ คนเกณฑ์ (กอล์ฟ)': 'Kittisak Khonken (Golf)',
    '— กอล์ฟ': '— Golf',
    'นักศึกษานิเทศศาสตร์ดิจิทัล มหาวิทยาลัยเทคโนโลยีสุรนารี สนใจการออกแบบเกม ภาพ และเรื่องเล่า โดยเฉพาะการนำวัฒนธรรมท้องถิ่นมาสร้างประสบการณ์ใหม่ผ่านสื่อดิจิทัล': 'Digital Communication Arts student at Suranaree University of Technology, interested in game design, visuals and storytelling — especially turning local culture into new experiences through digital media.',
    'กลับด้านบน ↑': 'Back to top ↑',

    /* ---------- ebook reader ---------- */
    'อ่านนิตยสาร FILM IS ALIVE': 'Read FILM IS ALIVE magazine',
    'ชุดหน้า': 'Spread',
    'เสียงกระดาษ:': 'Page sound:',
    'เปิด': 'On',
    'ปิด': 'Off',
    'เปิด/ปิด เสียงพลิกกระดาษ': 'Toggle page-flip sound',
    'ดาวน์โหลด PDF': 'Download PDF',
    'คลิกตัวเล่ม หรือปุ่ม ‹ › หรือกดลูกศร ← → บนคีย์บอร์ดเพื่อพลิกหน้ากระดาษ': 'Click the book, the ‹ › buttons, or the ← → arrow keys to turn pages',
    'เปลี่ยนหน้า:': 'Go to page:',
    'คลิกเพื่อย้อนกลับไปหน้าก่อน': 'Click to go back a page',
    'คลิกเพื่อเปิดหน้าถัดไป': 'Click to turn to the next page',
    'คลิกเพื่อเปิดหน้ากระดาษ': 'Click to open the book',
    'เลือกชุดหน้า': 'Choose a spread',
    'ปกหน้า': 'Front cover',
    'ปกหลัง': 'Back cover',
    'ภาพย่อ': 'Thumbnails',
    'ไปที่': 'Go to',
    'ซูม +': 'Zoom +',
    'ย่อ −': 'Zoom −',
    'เต็มจอ ↗': 'Full screen ↗',
    'ออกจากเต็มจอ ↙': 'Exit full screen ↙',
    'เลื่อนภาพเพื่ออ่านรายละเอียด · กด “ย่อ” เพื่อดูทั้งเล่ม': 'Drag to read the details · press “Zoom −” to see the whole spread',
    'เบราว์เซอร์นี้ไม่รองรับโหมดเต็มจอ': 'This browser does not support full screen',
    'โหลดภาพไม่สำเร็จ กรุณาเปิดอีกครั้ง หรือดาวน์โหลด PDF ด้านบน': 'The image failed to load. Please reopen it, or download the PDF above.',
    'คั่นหน้านี้': 'Bookmark this page',

    /* ---------- play dock / search / tour / gallery (play.js) ---------- */
    'ค้นหาหรือไปยังผลงาน': 'Search or jump to work',
    'สำรวจ': 'Explore',
    'เปลี่ยนสีธีม': 'Change theme colour',
    'ธีม': 'Theme',
    'เสียง: ปิด': 'Sound: off',
    'เสียง: เปิด': 'Sound: on',
    'เสียง:': 'Sound:',
    'เอฟเฟกต์': 'Effects',
    'นิ่ง': 'Still',
    'กลับด้านบน': 'Back to top',
    'เครื่องมือสำรวจพอร์ต': 'Portfolio tools',
    'ลดการเคลื่อนไหวแล้ว': 'Motion reduced',
    'เปิดเอฟเฟกต์แล้ว': 'Effects on',
    'ติดต่อ / Contact': 'Contact',
    'อยากสำรวจอะไร?': 'What would you like to explore?',
    'ลองค้นหา เกม, 3D, นิตยสาร…': 'Try “game”, “3D”, “magazine”…',
    'พิมพ์เพื่อค้นหา · Enter ไปผลลัพธ์แรก · Esc ปิด': 'Type to search · Enter opens the first result · Esc closes',
    'ปิดการค้นหา': 'Close search',
    'ค้นหาผลงาน': 'Search work',
    'ยังไม่พบผลงาน ลองใช้คำว่า เกม, art หรือหนังสือ': 'Nothing found yet — try “game”, “art” or “book”',
    'กอล์ฟ Shiro Profile': 'Golf Shiro Profile',
    'ทักษะ Skills': 'Skills',
    'เกม horror systems': 'game horror systems',
    'ภาพวาด anime art': 'illustration anime art',
    'graphic กราฟิก': 'graphic',
    'หนังสือ ebook นิตยสาร': 'book ebook magazine',
    'วิดีโอ เสียง': 'video audio',
    'เวที รางวัล': 'stage awards',
    'Facebook Instagram โทร': 'Facebook Instagram phone',
    '▷ พาชมพอร์ต': '▷ Take the tour',
    'ทัวร์พอร์ต': 'Portfolio tour',
    '01 / สวัสดีครับ ผมกอล์ฟ': '01 / Hi, I’m Golf',
    'ลองเปลี่ยนภาพตัวละครทางขวา แล้วรู้จักผมผ่านงานที่ทำ': 'Try switching the character art on the right, and get to know me through my work.',
    '02 / สิ่งที่ผมทำ': '02 / What I do',
    'เกม ภาพวาด 3D กราฟิก และงานเสียง': 'Games, illustration, 3D, graphics and audio.',
    '03 / เลือกเส้นทางของคุณ': '03 / Choose your path',
    'กดหมวดงานเพื่อกรองเฉพาะสิ่งที่สนใจ': 'Tap a category to show only what interests you.',
    '04 / โลกของ MUEA': '04 / The world of MUEA',
    'สำรวจระบบเกม และเปิดดูตัวอย่าง': 'Explore the game systems and watch the trailer.',
    '05 / เข้าแกลเลอรี': '05 / Enter the gallery',
    'คลิกภาพเพื่อขยาย ใช้ลูกศรเลื่อนดูผลงาน': 'Click an image to enlarge it; use the arrows to browse.',
    '06 / เปิดหนังสือสักเล่ม': '06 / Open a book',
    'พลิกหน้า ซูม และคั่นหน้าที่อยากกลับมาอ่าน': 'Turn pages, zoom in, and bookmark where you want to come back.',
    '07 / มาสร้างงานด้วยกัน': '07 / Let’s create together',
    'ดูเรซูเม่ หรือเลือกช่องทางติดต่อได้ที่นี่': 'See my resume or pick a way to get in touch here.',
    '← ก่อนหน้า': '← Previous',
    'ถัดไป →': 'Next →',
    'จบทัวร์': 'End tour',
    'จบทัวร์ ✓': 'Finish tour ✓',
    'ขอบคุณที่แวะมาสำรวจพอร์ตครับ': 'Thanks for exploring my portfolio!',
    'ครบทุกสายงานแล้ว — ขอบคุณที่สำรวจครับ ✦': 'You’ve seen every field — thanks for exploring ✦',
    'แกลเลอรีผลงาน': 'Work gallery',
    'ปิดภาพ': 'Close image',
    'ภาพผลงาน': 'Artwork',
    'ภาพก่อนหน้า': 'Previous image',
    'ภาพถัดไป': 'Next image',

    /* ---------- resume.html ---------- */
    '← กลับหน้า Showcase เว็บไซต์': '← Back to the portfolio site',
    'กดปุ่มพิมพ์ หรือใช้คำสั่ง Ctrl + P (บันทึกเป็น PDF ได้)': 'Press Print or Ctrl + P (you can save as PDF)',
    'พิมพ์ / บันทึก PDF (Print to PDF)': 'Print / Save as PDF',
    '(กอล์ฟ)': '(Golf)',
    'Kittisak Khonken (Golf) • นามปากกา: Shiro | Game Designer & 3D Artist': 'Kittisak Khonken (Golf) • Pen name: Shiro | Game Designer & 3D Artist',
    'นักศึกษาชั้นปีที่ 3 สาขาวิชานิเทศศาสตร์ดิจิทัล สำนักวิชาศาสตร์และศิลป์ดิจิทัล มหาวิทยาลัยเทคโนโลยีสุรนารี': '3rd-year student, Digital Communication Arts, School of Digital Arts and Sciences, Suranaree University of Technology',
    'โทร:': 'Phone:',
    'ที่อยู่:': 'Address:',
    '105/365 ม.6 ต.สุรนารี อ.เมือง จ.นครราชสีมา (มทส.)': '105/365 Moo 6, Suranaree, Mueang, Nakhon Ratchasima (SUT)',
    'บทสรุปประวัติและเป้าหมายวิชาชีพ (Professional Summary)': 'Professional Summary',
    'นักออกแบบเกม (Game Designer) และผู้พัฒนาเกมรุ่นใหม่ มีความเชี่ยวชาญด้านการออกแบบกลไกเกมหลัก (Core Gameplay Loops), ระบบการเล่นเชิงกลยุทธ์และการเอาชีวิตรอด (Survival & Systems Design), การผสมผสานมิติด้านวัฒนธรรมและจิตวิทยาเข้ากับการเล่าเรื่องในเกม (Narrative & Atmosphere) มีผลงานโดดเด่นจากการพัฒนาเกม': 'Emerging game designer and developer specialising in core gameplay loops, strategic survival and systems design, and blending cultural and psychological depth into game narrative and atmosphere. Best known for developing the game',
    'จนได้รับทุนสนับสนุนการพัฒนาเกม 25,000 บาท และรางวัลชมเชยระดับภูมิภาค 10,000 บาท รวมถึงได้รับคัดเลือกขึ้น Pitching บนเวทีใหญ่และออกบูธจัดแสดงระดับนานาชาติในงาน': ', which earned a 25,000 THB development grant and a 10,000 THB regional honourable mention, and was selected for a main-stage pitch and an international exhibition booth at',
    'ในโครงการ': 'under the',
    '(จัดโดย กรมส่งเสริมวัฒนธรรม กระทรวงวัฒนธรรม ณ ศูนย์การประชุมแห่งชาติสิริกิติ์ QSNCC) มีพื้นฐานแน่นทั้งด้านการสื่อสารดิจิทัล การมิกซ์เสียง/ออกแบบเสียง (Sound Engineering) และการสร้างสรรค์สื่อมัลติมีเดีย': 'programme (organised by the Department of Cultural Promotion, Ministry of Culture, at the Queen Sirikit National Convention Center, QSNCC). Strong foundation in digital communication, sound engineering and multimedia production.',
    'ผลงานเกมและการพัฒนา (Featured Game Project)': 'Featured Game Project',
    'MUEA คืนกลับ แดนสาป (MUEA: Return to the Cursed Land)': 'MUEA: Return to the Cursed Land',
    'บทบาท:': 'Role:',
    'เล่น Playable Demo บน itch.io ↗': 'Play the demo on itch.io ↗',
    'ชมตัวอย่าง Trailer บน YouTube ↗': 'Watch the trailer on YouTube ↗',
    'เกมจำลองการบริหารจัดการหมู่บ้านชนบทอีสานยุค 90s ในมุมมองผู้ใหญ่บ้าน ที่ต้องนำพาลูกบ้านเอาชีวิตรอดให้ครบ 14 วัน ท่ามกลาง 2 ภัยร้ายที่ซ้อนทับกัน คือ โรคระบาดประหลาด และผีร้ายที่ปลอมตัวเป็นคน': 'A management sim set in a 1990s rural Isan village. As the headman, you must keep villagers alive for 14 days against two overlapping threats: a strange epidemic and malevolent ghosts disguised as people.',
    'ออกแบบ Core Loop:': 'Core loop design:',
    'วงจรการเล่น 4 ช่วงเวลา (รายงานเช้า, สำรวจกลางวัน, เฝ้าระวังค่ำคืน, ประเมินผล) พร้อมเงื่อนไขการรอดชีวิต 14 วัน': 'a 4-phase daily cycle (morning report, daytime exploration, night watch, evaluation) with a 14-day survival condition',
    'ระบบสืบสวน (Social Deduction):': 'Social deduction system:',
    'ออกแบบพฤติกรรมผิดสังเกตของผีแฝงตัว เบาะแส และพิธีกรรมทดสอบด้วยสิ่งศักดิ์สิทธิ์/สมุนไพร': 'designed the suspicious behaviours of hidden ghosts, clues, and test rituals using sacred objects and herbs',
    'ระบบบริหารทรัพยากร (Survival Resource Management):': 'Survival resource management:',
    'บาลานซ์ค่าความเชื่อมั่น (Trust), อัตราการติดเชื้อ (Infection), และความหวาดระแวง (Paranoia)': 'balanced Trust, Infection rate and Paranoia',
    'การทดสอบกับผู้เล่นจริง:': 'Live playtesting:',
    'เปิดให้ทดลองเล่น Playable Demo ในงาน Terminal21 Games Festival ผู้ร่วมทดสอบมากกว่า 100+ คน': 'ran the playable demo at Terminal21 Games Festival with 100+ playtesters',
    'ได้รับคัดเลือกขึ้น Pitching บนเวทีใหญ่ (หมวด NEXT-SHAPE) นำเสนอเกม MUEA คืนกลับ แดนสาป และร่วมออกบูธจัดแสดง Playable Demo ในฐานะ Exhibitor ประจำบูธกรมส่งเสริมวัฒนธรรม กระทรวงวัฒนธรรม ณ ศูนย์การประชุมแห่งชาติสิริกิติ์': 'Selected for a main-stage pitch (NEXT-SHAPE category) presenting MUEA: Return to the Cursed Land, and exhibited the playable demo as an exhibitor at the Department of Cultural Promotion, Ministry of Culture booth, Queen Sirikit National Convention Center',
    'รางวัลชมเชย พร้อมเงินรางวัล 10,000 บาท ณ เซ็นทรัล โคราช': 'Honourable mention with a 10,000 THB prize, Central Korat',
    'ผ่านคัดเลือกหมวด Playable Demo รับทุนพัฒนา 25,000 บาท ณ เทอร์มินอล 21 โคราช': 'Selected in the Playable Demo category with a 25,000 THB development grant, Terminal 21 Korat',
    'จัดแสดงเกมในโซน Game Showcase “บ้านร้าง-เกม-หลอน” ณ ศูนย์สร้างสรรค์งานออกแบบ (TCDC) นครราชสีมา': 'Exhibited in the “Haunted House – Haunted Games” game showcase at TCDC Nakhon Ratchasima',
    'ผลงานด้านเสียงและมัลติมีเดีย (Audio & Multimedia Production)': 'Audio & Multimedia Production',
    'มิวสิกวิดีโอ & เสียง: Cupid (Twin Version) - ViViiMLN Cover': 'Music video & audio: Cupid (Twin Version) – ViViiMLN Cover',
    'ชม MV บน YouTube ↗': 'Watch the MV on YouTube ↗',
    'มิกซ์เสียงร้องและมาสเตอริง (Vocal Tuning, EQ, Dynamic Compression) ให้เข้ากับดนตรีอย่างกลมกลืน': 'Vocal mixing and mastering (vocal tuning, EQ, dynamic compression) to blend seamlessly with the music',
    'จัดทำอนิเมชั่น 2D และตัดต่อจัดเรียงลำดับภาพโมชั่นกราฟิก เผยแพร่ทางช่อง YouTube ViVii MLN CH. 【HZ】': '2D animation and motion-graphics editing, published on the ViVii MLN CH. 【HZ】 YouTube channel',
    'ประยุกต์ทักษะเสียงในการสร้าง Sound Effects และ Soundscape สำหรับเกม': 'Applying audio skills to create sound effects and soundscapes for games',
    'งานออกแบบรูปเล่มและสื่อสิ่งพิมพ์ (Editorial & Publication Design)': 'Editorial & Publication Design',
    'นิตยสารภาพยนตร์และภาพถ่ายฟิล์ม: FILM IS ALIVE': 'Film & film-photography magazine: FILM IS ALIVE',
    '34 หน้า (Complete Edition)': '34 pages (Complete Edition)',
    'ออกแบบโครงสร้างกริดเลย์เอาต์ (Grid System) และจัดวางระบบตัวพิมพ์ (Typography Hierarchy) ทั้งเล่ม 34 หน้า': 'Designed the grid system and typography hierarchy across all 34 pages',
    'ปรับแต่งรูปภาพฟิล์ม จัดเรียงคอลัมน์บทความ และสร้างสรรค์หน้าปก (Cover Design) พร้อมจัดทำรูปแบบสิ่งพิมพ์และ Digital E-Book': 'Edited film photos, arranged article columns and designed the cover, producing both print and digital e-book editions',
    'ทักษะความเชี่ยวชาญ (Key Skills)': 'Key Skills',
    'ประวัติการศึกษา (Education)': 'Education',
    'มหาวิทยาลัยเทคโนโลยีสุรนารี': 'Suranaree University of Technology',
    'ปริญญาตรี ชั้นปีที่ 3 (ปัจจุบัน)': 'Bachelor’s degree, 3rd year (current)',
    'สำนักวิชาศาสตร์และศิลป์ดิจิทัล': 'School of Digital Arts and Sciences',
    'สาขาวิชานิเทศศาสตร์ดิจิทัล': 'Digital Communication Arts',
    'โรงเรียนสังคมวิทยา': 'Sangkhomwitthaya School',
    'มัธยมศึกษาตอนปลาย': 'Upper secondary',
    'โรงเรียนสวนป่าเขาชะอางค์': 'Suan Pa Khao Cha-ang School',
    'มัธยมศึกษาตอนต้น': 'Lower secondary',
    'จุดเด่นในการทำงานร่วมกับทีม': 'Teamwork strengths',
    '• สื่อสารแนวคิดเกมได้ชัดเจน ออกแบบระบบที่ทีมพัฒนาต่อได้ทันที': '• Communicates game concepts clearly and designs systems the team can build on right away',
    '• พร้อมรับฟังฟีดแบ็กจากผู้เล่นจริงและปรับปรุงอย่างรวดเร็ว (Iterative Mindset)': '• Listens to real player feedback and iterates quickly',
    '• ประสานงานข้ามสายงานได้ดี ทั้งงานดีไซน์ งานภาพ และงานเสียง': '• Works well across design, visual and audio disciplines',
    'OFFICIAL RESUME // GAME DESIGN & DEVELOPMENT • KITTISAK KHONKEN (กิตติศักดิ์ คนเกณฑ์ "กอล์ฟ" / SHIRO)': 'OFFICIAL RESUME // GAME DESIGN & DEVELOPMENT • KITTISAK KHONKEN ("GOLF" / SHIRO)'
  };

  /* Strings built at runtime with numbers or names in them. */
  var RULES = [
    [/^(\d+) หมวดงาน \/ (\d+) ผลงาน$/, function (m) { return m[1] + ' categories / ' + m[2] + ' works'; }],
    [/^(.+) \/ (\d+) ผลงาน$/, function (m) { return tr(m[1]) + ' / ' + m[2] + ' works'; }],
    [/^กลับชุดหน้า (\d+)$/, function (m) { return 'Back to spread ' + m[1]; }],
    [/^ชุดหน้าคู่ (\d+)$/, function (m) { return 'Spread ' + m[1]; }],
    [/^(.+) · (\d+) \/ (\d+) ชุดหน้า$/, function (m) { return tr(m[1]) + ' · ' + m[2] + ' / ' + m[3] + ' spreads'; }],
    [/^บันทึกชุดหน้า (\d+) ไว้ในเบราว์เซอร์นี้แล้ว$/, function (m) { return 'Saved spread ' + m[1] + ' in this browser'; }],
    [/^ผลงาน (.+) โดย Shiro$/, function (m) { return m[1] + ' by Shiro'; }],
    [/^เปิด (.+)$/, function (m) { return 'Open ' + tr(m[1]); }],
    // "01 · ชุดหน้าคู่ 1" (reader thumbnails)
    [/^(\d+) · (.+)$/, function (m) { var b = tr(m[2]); return b == null ? null : m[1] + ' · ' + b; }],
    // "Kira Kira Workout! — หน้าเมนูหลัก" (gallery captions with a prefix)
    [/^(.+?) — (.+)$/, function (m) { var a = tr(m[1]), b = tr(m[2]); return a == null || b == null ? null : a + ' — ' + b; }]
  ];

  var THAI = /[฀-๿]/;
  var ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
  var KEY = 'portfolio-lang';
  var missing = window.__i18nMissing = new Set();

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

  /* Returns the English for a Thai string, or null if there is none. */
  function tr(text) {
    var key = norm(text);
    if (!THAI.test(key)) return key;
    if (Object.prototype.hasOwnProperty.call(EN, key)) return EN[key];
    for (var i = 0; i < RULES.length; i++) {
      var m = key.match(RULES[i][0]);
      if (m) { var out = RULES[i][1](m); if (out && !THAI.test(out)) return out; }
    }
    missing.add(key);
    return null;
  }

  /* Keep the source text's leading/trailing spacing around the translation. */
  function wrap(src, en) {
    var lead = src.match(/^\s*/)[0], trail = src.match(/\s*$/)[0];
    return (lead && !/^[,.;:)]/.test(en) ? ' ' : '') + en + (trail ? ' ' : '');
  }

  var lang = 'th';
  var textRec = new WeakMap();   // text node -> {th, en}
  var attrRec = new WeakMap();   // element   -> {attr: {th, en}}
  var tracked = new Set();       // nodes/elements we changed, for switching back

  function skip(node) {
    var p = node.nodeType === 3 ? node.parentNode : node;
    return !p || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(p.nodeName) || (p.closest && p.closest('[data-no-i18n]'));
  }

  function doText(node) {
    var cur = node.data;
    var rec = textRec.get(node);
    if (rec && cur === rec.en) return;
    if (!THAI.test(cur) || skip(node)) return;
    var en = tr(cur);
    if (en == null) return;
    var out = wrap(cur, en);
    textRec.set(node, { th: cur, en: out });
    tracked.add(node);
    node.data = out;
  }

  function doAttrs(el) {
    if (skip(el)) return;
    var names = ATTRS;
    if (el.nodeName === 'META' && /description|og:|twitter:/.test(el.getAttribute('name') || el.getAttribute('property') || '')) names = ATTRS.concat('content');
    for (var i = 0; i < names.length; i++) {
      var a = names[i], cur = el.getAttribute(a);
      if (!cur || !THAI.test(cur)) continue;
      var recs = attrRec.get(el) || {};
      if (recs[a] && cur === recs[a].en) continue;
      var en = tr(cur);
      if (en == null) continue;
      recs[a] = { th: cur, en: en };
      attrRec.set(el, recs);
      tracked.add(el);
      el.setAttribute(a, en);
    }
  }

  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1) doAttrs(root);
    var it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var n;
    while ((n = it.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }

  function restore() {
    tracked.forEach(function (n) {
      if (!n.isConnected) { tracked.delete(n); return; }
      if (n.nodeType === 3) {
        var r = textRec.get(n);
        if (r && n.data === r.en) n.data = r.th;
        textRec.delete(n);
      } else {
        var recs = attrRec.get(n) || {};
        Object.keys(recs).forEach(function (a) { if (n.getAttribute(a) === recs[a].en) n.setAttribute(a, recs[a].th); });
        attrRec.delete(n);
      }
    });
    tracked.clear();
  }

  var observer = new MutationObserver(function (list) {
    if (lang !== 'en') return;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
    }
  });

  function syncButtons() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', lang === 'en' ? 'เปลี่ยนเป็นภาษาไทย' : 'Switch to English');
      b.querySelectorAll('[data-lang]').forEach(function (s) { s.classList.toggle('lang-on', s.dataset.lang === lang); });
    });
  }

  function setLang(next, save) {
    lang = next === 'en' ? 'en' : 'th';
    if (save) { try { localStorage.setItem(KEY, lang); } catch (e) {} }
    if (lang === 'en') walk(document.documentElement); else restore();
    syncButtons();
  }

  /* Initial language: ?lang= in the URL, then the saved choice, then the browser. */
  var initial = 'th';
  try {
    var q = new URLSearchParams(location.search).get('lang');
    var saved = localStorage.getItem(KEY);
    if (q === 'en' || q === 'th') initial = q;
    else if (saved === 'en' || saved === 'th') initial = saved;
    else if (!/^th\b/i.test(navigator.language || 'th')) initial = 'en';
  } catch (e) {}
  lang = initial;
  document.documentElement.lang = lang;

  // Watch from the start so text is swapped as the parser inserts it.
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat('content') });
  if (lang === 'en') walk(document.documentElement);

  var style = document.createElement('style');
  style.textContent = '[data-lang-toggle] [data-lang]{opacity:.45;transition:opacity .2s}[data-lang-toggle] [data-lang].lang-on{opacity:1;font-weight:700}header a,header button{white-space:nowrap}';
  document.head.appendChild(style);

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lang-toggle]');
    if (b) { e.preventDefault(); setLang(lang === 'en' ? 'th' : 'en', true); }
  });
  document.addEventListener('DOMContentLoaded', function () { setLang(lang, false); });

  window.setLanguage = function (l) { setLang(l, true); };
})();
