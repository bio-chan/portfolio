/* Portfolio enhancements. Magazine assets are cover / spreads / back cover. */
(() => {
  const modal=document.getElementById('ebookModal');
  const book=document.getElementById('ebookBook');
  const viewer=document.getElementById('ebookViewerContainer');
  const closeButton=modal.querySelector('[aria-label="Close Reader"]');
  const label=n=>n===1?'ปกหน้า':n===34?'ปกหลัง':`ชุดหน้าคู่ ${n-1}`;
  let opener=null;
  const tools=document.createElement('div');tools.className='reader-tools';
  tools.innerHTML='<button type="button" id="readerThumbToggle" aria-expanded="false" aria-controls="readerThumbnails">ภาพย่อ</button><label for="readerJump">ไปที่</label><select id="readerJump"></select><button type="button" id="readerZoom" aria-pressed="false">ซูม +</button><button type="button" id="readerFullscreen">เต็มจอ ↗</button>';
  const thumbs=document.createElement('div');thumbs.id='readerThumbnails';thumbs.className='reader-thumbs';thumbs.hidden=true;
  const status=document.createElement('p');status.className='reader-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  viewer.after(tools,thumbs,status);
  const jump=tools.querySelector('select');
  for(let i=1;i<=totalEbookPages;i++){
    const option=document.createElement('option');option.value=i;option.textContent=`${String(i).padStart(2,'0')} · ${label(i)}`;jump.append(option);
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`เปิด ${label(i)}`);
    button.innerHTML=`<img src="${getPageUrl(i)}" loading="lazy" alt="">${label(i)}`;
    button.addEventListener('click',()=>goToEbookPage(i));thumbs.append(button);
  }
  const zoom=tools.querySelector('#readerZoom');
  function resetZoom(){book.classList.remove('is-zoomed');zoom.textContent='ซูม +';zoom.setAttribute('aria-pressed','false');viewer.scrollTo(0,0);}
  function stopFlip(){modal.getAnimations({subtree:true}).forEach(a=>{a.onfinish=null;a.cancel();});isPageFlipping=false;ebookFlipLeaf.classList.add('hidden');}
  const originalIndicator=window.updateIndicatorUI;
  window.updateIndicatorUI=function(n){originalIndicator(n);jump.value=n;thumbs.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i+1===n)));modal.querySelector('[aria-label="Previous Page"]').disabled=n<=1;modal.querySelector('[aria-label="Next Page"]').disabled=n>=34;status.textContent=`${label(n)} · ${n} / 34 ชุดหน้า`;preloadAdjacentPages(n);};
  const originalOpen=window.openEbookModal;
  window.openEbookModal=function(n=1){opener=document.activeElement;stopFlip();resetZoom();originalOpen(Math.max(1,Math.min(34,Number(n)||1)));closeButton.focus();};
  const originalClose=window.closeEbookModal;
  window.closeEbookModal=function(){const wasOpen=!modal.classList.contains('hidden');stopFlip();originalClose();if(document.fullscreenElement===modal)document.exitFullscreen().catch(()=>{});if(wasOpen&&opener?.isConnected)opener.focus();};
  window.goToEbookPage=function(n){n=Math.max(1,Math.min(34,Math.round(Number(n)||1)));stopFlip();resetZoom();currentEbookPage=n;renderPageInstantly(n);};
  const next=window.nextEbookPage,prev=window.prevEbookPage;
  const reduced={get matches(){return document.body.classList.contains('quiet-motion')}};
  window.nextEbookPage=function(){if(currentEbookPage>=34)return;if(reduced.matches){goToEbookPage(currentEbookPage+1);return;}resetZoom();next();};
  window.prevEbookPage=function(){if(currentEbookPage<=1)return;if(reduced.matches){goToEbookPage(currentEbookPage-1);return;}resetZoom();prev();};
  jump.addEventListener('change',()=>goToEbookPage(jump.value));
  tools.querySelector('#readerThumbToggle').addEventListener('click',e=>{thumbs.hidden=!thumbs.hidden;e.currentTarget.setAttribute('aria-expanded',String(!thumbs.hidden));if(!thumbs.hidden)thumbs.querySelector('[aria-current=true]')?.scrollIntoView({block:'nearest',inline:'center'});});
  zoom.addEventListener('click',()=>{const on=book.classList.toggle('is-zoomed');zoom.textContent=on?'ย่อ −':'ซูม +';zoom.setAttribute('aria-pressed',String(on));status.textContent=on?'เลื่อนภาพเพื่ออ่านรายละเอียด · กด “ย่อ” เพื่อดูทั้งเล่ม':label(currentEbookPage);});
  const full=tools.querySelector('#readerFullscreen');if(!modal.requestFullscreen)full.hidden=true;
  full.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await modal.requestFullscreen();}catch{status.textContent='เบราว์เซอร์นี้ไม่รองรับโหมดเต็มจอ';}});
  document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'ออกจากเต็มจอ ↙':'เต็มจอ ↗';});
  modal.addEventListener('keydown',e=>{
    if(e.key==='Tab'){const focusable=[...modal.querySelectorAll('button,a,input,select')].filter(x=>!x.disabled&&x.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    if(['INPUT','SELECT'].includes(e.target.tagName) && e.key !== 'Escape'){e.stopPropagation();return;}
    if(e.key==='ArrowLeft'||e.key==='ArrowRight')e.preventDefault();
    if(e.key==='Home'){e.preventDefault();goToEbookPage(1);}if(e.key==='End'){e.preventDefault();goToEbookPage(34);}
  });
  // While zoomed, touch gestures pan the page instead of changing it.
  viewer.addEventListener('touchend',e=>{if(book.classList.contains('is-zoomed'))e.stopImmediatePropagation();},true);
  modal.querySelectorAll('#ebookBook img').forEach(img=>img.addEventListener('error',()=>{status.textContent='โหลดภาพไม่สำเร็จ กรุณาเปิดอีกครั้ง หรือดาวน์โหลด PDF ด้านบน';status.classList.add('reader-error');}));
  document.querySelectorAll('section:not(#hero) img').forEach(img=>{img.loading='lazy';img.decoding='async';});
  document.querySelectorAll('div[onclick]').forEach(el=>{el.setAttribute('tabindex','0');el.setAttribute('role','button');el.addEventListener('keydown',e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();el.click();}});});
  const navButton=document.getElementById('mobileNavBtn');navButton.setAttribute('aria-controls','mobileDrawer');navButton.setAttribute('aria-expanded','false');new MutationObserver(()=>navButton.setAttribute('aria-expanded',String(!document.getElementById('mobileDrawer').classList.contains('hidden')))).observe(document.getElementById('mobileDrawer'),{attributes:true,attributeFilter:['class']});
})();

