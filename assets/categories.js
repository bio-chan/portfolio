(() => {
 const buttons=[...document.querySelectorAll('[data-filter]')];
 const chapters=[...document.querySelectorAll('[data-category]')];
 const counts={'flagship':2,'artworks':4,'three-d':1,'vtuber':3,'photo':5,'magazine':1,'audio':1};
 function filter(category){
   const selected=buttons.find(b=>b.dataset.filter===category);if(!selected)return;
   buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===selected)));
   chapters.forEach(s=>s.hidden=category!=='all'&&s.dataset.category!==category);
   document.getElementById('workCount').textContent=category==='all'?'7 หมวดงาน / 17 ผลงาน':`${selected.textContent.replace(/\d+/g,'').trim()} / ${counts[category]} ผลงาน`;
 }
 buttons.forEach(b=>b.addEventListener('click',()=>filter(b.dataset.filter)));
 // A deep link must always reveal its destination, including after filtering.
 function revealHash(hash){const id=decodeURIComponent(hash.replace('#',''));const section=document.getElementById(id);if(section?.matches('[data-category]')&&section.hidden)filter('all');}
 document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a)revealHash(a.hash);});
 window.addEventListener('hashchange',()=>revealHash(location.hash));revealHash(location.hash);
 // Keep exhibition movement deliberate while people inspect the images.
 clearInterval(gamescomAutoTimer);clearInterval(magazineSpreadAutoTimer);
 window.restartGamescomAutoTimer=()=>clearInterval(gamescomAutoTimer);
})();

