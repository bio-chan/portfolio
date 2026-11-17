/* Interactive portfolio: progressive enhancements; all primary links stay usable. */
(() => {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const storage={get(k){try{return localStorage.getItem('shiro:'+k)}catch{return null}},set(k,v){try{localStorage.setItem('shiro:'+k,v)}catch{}}};
  const mount=(tag,cls,html,parent=document.body)=>{const el=document.createElement(tag);el.className=cls;el.innerHTML=html;parent.append(el);return el;};
  const toast=mount('div','play-toast','');toast.setAttribute('role','status');let toastTimer;
  function announce(text){toast.textContent=text;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);}
  let quiet=storage.get('quiet')==='true';
  function applyMotion(){document.body.classList.toggle('quiet-motion',quiet);document.documentElement.style.scrollBehavior=quiet?'auto':'';}
  applyMotion();
  let sound=false, audio;
  function blip(){if(!sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.type='sine';osc.frequency.setValueAtTime(700,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(1100,audio.currentTime+.07);gain.gain.setValueAtTime(.018,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.09);osc.start();osc.stop(audio.currentTime+.1);}catch{sound=false;syncControls();}}
  const dock=mount('aside','play-dock',`<button id="quickOpen" aria-label="ค้นหาหรือไปยังผลงาน"><span>⌘</span><small>สำรวจ</small></button><button id="themeSwitch" aria-label="เปลี่ยนสีธีม"><span>◐</span><small>ธีม</small></button><button id="soundSwitch" aria-pressed="false"><span>♪</span><small>เสียง: ปิด</small></button><button id="motionSwitch" aria-pressed="false"><span>≈</span><small>เอฟเฟกต์</small></button><button id="scrollTop" aria-label="กลับด้านบน"><span>↑</span><small id="readPercent">0%</small></button>`);
  dock.setAttribute('aria-label','เครื่องมือสำรวจพอร์ต');
  function syncControls(){ ebookSoundEnabled=sound;const status=$('#ebookSoundStatus');status.textContent=sound?'เปิด':'ปิด';status.className=sound?'text-emerald-400 font-bold':'text-slate-400 font-bold';$('#soundSwitch').setAttribute('aria-pressed',String(sound));$('#soundSwitch small').textContent='เสียง: '+(sound?'เปิด':'ปิด');$('#motionSwitch').setAttribute('aria-pressed',String(quiet));$('#motionSwitch small').textContent=quiet?'นิ่ง':'เอฟเฟกต์';}
  window.toggleEbookSound=()=>{sound=!sound;syncControls();blip();};
  syncControls();$('#soundSwitch').onclick=()=>{sound=!sound;syncControls();blip();};
  $('#motionSwitch').onclick=()=>{quiet=!quiet;storage.set('quiet',quiet);applyMotion();syncControls();announce(quiet?'ลดการเคลื่อนไหวแล้ว':'เปิดเอฟเฟกต์แล้ว');};
  const themes=['violet','mint','rose'];let theme=Math.max(0,themes.indexOf(storage.get('theme')));
  document.body.dataset.palette=themes[theme];$('#themeSwitch').onclick=()=>{theme=(theme+1)%themes.length;document.body.dataset.palette=themes[theme];storage.set('theme',themes[theme]);announce('COLOR MODE / '+themes[theme].toUpperCase());};
  $('#scrollTop').onclick=()=>window.scrollTo({top:0,behavior:quiet?'instant':'smooth'});
  const progress=mount('div','play-progress','<span></span>');progress.setAttribute('aria-hidden','true');
  let scrollPending=false;
  function updateProgress(){const max=document.documentElement.scrollHeight-innerHeight;const pct=Math.round(max>0?100*scrollY/max:0);$('.play-progress span').style.width=pct+'%';$('#readPercent').textContent=pct+'%';scrollPending=false;}
  addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(updateProgress);}},{passive:true});addEventListener('resize',updateProgress);updateProgress();
  // Choose one of the artist's own character studies.
  const characters=[['art_02.jpg','Perspective','02'],['art_03.jpg','Identity','03'],['art_04.jpg','Seraph','04']];
  const chooser=mount('div','character-chooser',`<span>SELECT ARTWORK</span><div>${characters.map((c,i)=>`<button type="button" data-character="${i}" aria-pressed="${i===0}"><img src="assets/images/${c[0]}" alt=""><span>${c[1]}</span></button>`).join('')}</div>`,$('.character-stage'));
  chooser.setAttribute('role','group');chooser.setAttribute('aria-label','เลือกภาพตัวละคร');
  $$('[data-character]').forEach(button=>button.onclick=()=>{const c=characters[Number(button.dataset.character)];$$('[data-character]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));const img=$('.character-art img');img.src='assets/images/'+c[0];img.alt='ผลงาน '+c[1]+' โดย Shiro';$('.character-topline span:last-child').textContent='CHARACTER STUDY / '+c[2];if(!quiet)img.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:360});});
  // Pointer lighting and restrained perspective; touch keeps ordinary scrolling.
  const tiltCards=$$('.character-stage,.object-case>.art-view,.campaign-feature .art-view');
  tiltCards.forEach(card=>{card.classList.add('pointer-card');card.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||quiet)return;const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;card.style.setProperty('--rx',(0.5-y)*5+'deg');card.style.setProperty('--ry',(x-.5)*7+'deg');card.style.setProperty('--mx',x*100+'%');card.style.setProperty('--my',y*100+'%');});card.addEventListener('pointerleave',()=>{card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg');});});
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');revealObserver.unobserve(e.target)}}),{threshold:.06});
  $$('.chapter-head,.art-piece,.design-pillars>div,.merch-grid article,.contact-story').forEach(el=>{el.classList.add('play-reveal');revealObserver.observe(el)});
  document.addEventListener('click',e=>{const el=e.target.closest('button,a');if(!el)return;blip();if(quiet||!e.clientX&&!e.clientY)return;const spark=mount('span','click-spark','');spark.style.left=e.clientX+'px';spark.style.top=e.clientY+'px';setTimeout(()=>spark.remove(),500);});
  // Quick navigation and keyboard search. Native dialog supplies a focus trap.
  const destinations=[['hero','แนะนำตัว','กอล์ฟ Shiro Profile'],['expertise','สิ่งที่ผมทำ','ทักษะ Skills'],['flagship','MUEA — Game Design','เกม horror systems'],['artworks','Concept & Character','ภาพวาด anime art'],['three-d','DIGIBLINK — 3D','Blender product'],['vtuber','VTuber & Merchandise','graphic กราฟิก'],['magazine','FILM IS ALIVE','หนังสือ ebook นิตยสาร'],['audio','Cupid — Motion & Audio','วิดีโอ เสียง'],['showcase','Experience','เวที รางวัล'],['about','ติดต่อ / Contact','Facebook Instagram โทร']];
  function visit(id){const link=document.createElement('a');link.href='#'+id;document.body.append(link);link.click();link.remove();}
  const search=mount('dialog','quick-dialog',`<div class="quick-heading"><span>PORTFOLIO / QUICK TRAVEL</span><button type="button" aria-label="ปิดการค้นหา">✕</button></div><label for="quickSearch">อยากสำรวจอะไร?</label><input id="quickSearch" type="search" placeholder="ลองค้นหา เกม, 3D, นิตยสาร…" autocomplete="off"><div class="quick-results"></div><p>พิมพ์เพื่อค้นหา · Enter ไปผลลัพธ์แรก · Esc ปิด</p>`);search.setAttribute('aria-label','ค้นหาผลงาน');
  function renderSearch(){const term=$('#quickSearch').value.toLocaleLowerCase().trim();const found=destinations.filter(x=>x.join(' ').toLocaleLowerCase().includes(term));$('.quick-results').replaceChildren();if(!found.length){$('.quick-results').textContent='ยังไม่พบผลงาน ลองใช้คำว่า เกม, art หรือหนังสือ';return;}found.forEach(x=>{const b=mount('button','quick-result',`<span>${x[1]}<small>${x[2]}</small></span><b>↗</b>`,$('.quick-results'));b.onclick=()=>{search.close();visit(x[0]);};});}
  function openSearch(){if($('#ebookModal:not(.hidden),#photoModal:not(.hidden),#videoModal:not(.hidden)'))return;renderSearch();search.showModal();$('#quickSearch').focus();}
  $('#quickOpen').onclick=openSearch;$('.quick-heading button').onclick=()=>search.close();$('#quickSearch').oninput=renderSearch;$('#quickSearch').onkeydown=e=>{if(e.key==='Enter'){$('.quick-result')?.click();e.preventDefault();}};
  search.addEventListener('click',e=>{if(e.target===search)search.close();});
  search.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();search.close();}});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}});
  // Optional guided tour follows the same introduction-first narrative.
  const tourStops=[['hero','01 / สวัสดีครับ ผมกอล์ฟ','ลองเปลี่ยนภาพตัวละครทางขวา แล้วรู้จักผมผ่านงานที่ทำ'],['expertise','02 / สิ่งที่ผมทำ','เกม ภาพวาด 3D กราฟิก และงานเสียง'],['work-index','03 / เลือกเส้นทางของคุณ','กดหมวดงานเพื่อกรองเฉพาะสิ่งที่สนใจ'],['flagship','04 / โลกของ MUEA','สำรวจระบบเกม และเปิดดูตัวอย่าง'],['artworks','05 / เข้าแกลเลอรี','คลิกภาพเพื่อขยาย ใช้ลูกศรเลื่อนดูผลงาน'],['magazine','06 / เปิดหนังสือสักเล่ม','พลิกหน้า ซูม และคั่นหน้าที่อยากกลับมาอ่าน'],['about','07 / มาสร้างงานด้วยกัน','ดูเรซูเม่ หรือเลือกช่องทางติดต่อได้ที่นี่']];let tourIndex=-1;
  const start=mount('button','intro-tour','▷ พาชมพอร์ต',$('.hero-actions'));start.id='startTour';start.type='button';
  const tour=mount('aside','tour-card','<button class="tour-close" aria-label="จบทัวร์">✕</button><strong></strong><p></p><div><button id="tourPrev">← ก่อนหน้า</button><span></span><button id="tourNext">ถัดไป →</button></div>');tour.hidden=true;tour.setAttribute('aria-label','ทัวร์พอร์ต');
  function showStop(){const stop=tourStops[tourIndex];tour.hidden=false;tour.querySelector('strong').textContent=stop[1];tour.querySelector('p').textContent=stop[2];tour.querySelector('div>span').textContent=(tourIndex+1)+' / '+tourStops.length;$('#tourPrev').disabled=tourIndex===0;$('#tourNext').textContent=tourIndex===tourStops.length-1?'จบทัวร์ ✓':'ถัดไป →';visit(stop[0]);}
  start.onclick=()=>{tourIndex=0;showStop();};$('#tourPrev').onclick=()=>{if(tourIndex>0){tourIndex--;showStop();}};$('#tourNext').onclick=()=>{if(tourIndex===tourStops.length-1){tour.hidden=true;announce('ขอบคุณที่แวะมาสำรวจพอร์ตครับ');}else{tourIndex++;showStop();}};$('.tour-close').onclick=()=>tour.hidden=true;
  // A tiny journey counter rewards exploration without blocking content.
  const visited=new Set();const journey=mount('span','explore-count','EXPLORED 0 / 6',$('#work-index .work-index-title'));journey.id='exploreCount';
  const explore=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){visited.add(e.target.id);journey.textContent=`EXPLORED ${visited.size} / 6`;if(visited.size===6&&!journey.dataset.done){journey.dataset.done='true';announce('ครบทุกสายงานแล้ว — ขอบคุณที่สำรวจครับ ✦');}}}),{threshold:.12});$$('[data-category]').forEach(el=>explore.observe(el));
  $$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{updateProgress();if(quiet)return;$$('[data-category]:not([hidden])').forEach(s=>s.animate([{opacity:.3,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:330}));}));
  // Gallery adds actual browsing, zooming, keyboard controls and focus restoration.
  const artPhotos=$$('.art-view').map(b=>({src:b.querySelector('img').getAttribute('src'),caption:b.querySelector('img').alt}));let photos=artPhotos;
  const modal=$('#photoModal'), image=$('#modalImg'), imageBox=image.parentElement;imageBox.classList.add('gallery-viewport');
  const galleryTools=mount('div','gallery-controls','<button id="galleryPrev" aria-label="ภาพก่อนหน้า">←</button><span id="galleryCount"></span><button id="galleryNext" aria-label="ภาพถัดไป">→</button><button id="galleryZoom" aria-pressed="false">ซูม +</button>',modal.firstElementChild);
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','แกลเลอรีผลงาน');modal.querySelector('button').setAttribute('aria-label','ปิดภาพ');let photoIndex=-1,photoOpener;
  const originalOpen=window.openPhotoModal,originalClose=window.closePhotoModal;
  function resetGallery(){imageBox.classList.remove('gallery-zoomed');$('#galleryZoom').textContent='ซูม +';$('#galleryZoom').setAttribute('aria-pressed','false');imageBox.scrollTo(0,0);}
  function galleryState(){const inGallery=photoIndex>=0;$('#galleryCount').textContent=inGallery?`${photoIndex+1} / ${photos.length}`:'ภาพผลงาน';$('#galleryPrev').disabled=!inGallery||photoIndex===0;$('#galleryNext').disabled=!inGallery||photoIndex===photos.length-1;}
  window.openPhotoModal=(src,caption,list,idx)=>{photoOpener=document.activeElement;photos=Array.isArray(list)&&list.length?list:artPhotos;photoIndex=list?(idx||0):photos.findIndex(p=>p.src===src);resetGallery();originalOpen(src,caption);image.alt=caption||'ภาพผลงาน';galleryState();document.body.classList.add('gallery-open');modal.querySelector('button').focus();};
  window.closePhotoModal=()=>{const wasOpen=!modal.classList.contains('hidden');originalClose();document.body.classList.remove('gallery-open');resetGallery();if(wasOpen&&photoOpener?.isConnected)photoOpener.focus();};
  function stepPhoto(delta){const next=photoIndex+delta;if(photoIndex<0||next<0||next>=photos.length)return;photoIndex=next;resetGallery();originalOpen(photos[next].src,photos[next].caption);image.alt=photos[next].caption;galleryState();}
  $('#galleryPrev').onclick=()=>stepPhoto(-1);$('#galleryNext').onclick=()=>stepPhoto(1);$('#galleryZoom').onclick=()=>{const on=imageBox.classList.toggle('gallery-zoomed');$('#galleryZoom').textContent=on?'ย่อ −':'ซูม +';$('#galleryZoom').setAttribute('aria-pressed',String(on));};
  modal.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();stepPhoto(-1);}if(e.key==='ArrowRight'){e.preventDefault();stepPhoto(1);}if(e.key==='Tab'){const items=[...modal.querySelectorAll('button')].filter(b=>!b.disabled);if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}}});
  // Ebook bookmark is local to this browser; explicit save and restore.
  const bookmark=mount('button','','คั่นหน้านี้',$('.reader-tools'));bookmark.id='readerBookmark';bookmark.type='button';const restore=mount('button','','',$('.reader-tools'));restore.id='readerRestore';restore.type='button';
  function syncBookmark(){const page=Number(storage.get('bookmark'));restore.hidden=!(page>=1&&page<=34);restore.textContent=`กลับชุดหน้า ${page}`;}
  syncBookmark();bookmark.onclick=()=>{storage.set('bookmark',currentEbookPage);syncBookmark();announce('บันทึกชุดหน้า '+currentEbookPage+' ไว้ในเบราว์เซอร์นี้แล้ว');};restore.onclick=()=>goToEbookPage(Number(storage.get('bookmark')));
  // Match the global quiet switch with the reader's existing reduced-motion path.
  const next=window.nextEbookPage,prev=window.prevEbookPage;
  window.nextEbookPage=()=>quiet?goToEbookPage(currentEbookPage+1):next();window.prevEbookPage=()=>quiet?goToEbookPage(currentEbookPage-1):prev();
})();



