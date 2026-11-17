/* polish.js — staggered reveals, cursor tilt, scroll parallax */
(function(){
  var quiet=function(){return document.body.classList.contains('quiet-motion')};
  var sel='.art-view,.game-trailer,.motion-screen,.portrait-frame,.exhibition-archive>div,.spread-preview button';
  var items=[].slice.call(document.querySelectorAll(sel)).filter(function(e){return !e.closest('.modal,#modal')});
  items.forEach(function(el,i){
    el.classList.add('pz-item');
    if(el.matches('.art-view,.exhibition-archive>div,.game-trailer,.motion-screen'))el.classList.add('pz-tilt');
    var sib=[].indexOf.call(el.parentNode.children,el);
    el.style.setProperty('--pz-d',(sib%4)*110+'ms');
  });
  /* Reveal with fail-safes: an image must never stay hidden.
     1) IntersectionObserver (threshold 0)  2) scroll/resize/hash sweep for fast jumps
     3) anything above the fold or already scrolled past is shown immediately  4) hard timeout */
  function show(el){if(!el.classList.contains('pz-in')){el.classList.add('pz-in');setTimeout(function(){el.classList.add('pz-done')},1400)}}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){show(e.target);io.unobserve(e.target)}})},{threshold:0,rootMargin:'0px 0px -4% 0px'});
  items.forEach(function(el){io.observe(el)});
  function sweep(){var vh=innerHeight;items.forEach(function(el){if(el.classList.contains('pz-in'))return;var r=el.getBoundingClientRect();if((r.width||r.height)&&r.top<vh)show(el)})}
  var sw=false;addEventListener('scroll',function(){if(!sw){sw=true;setTimeout(function(){sw=false;sweep()},120)}},{passive:true});
  addEventListener('resize',sweep);addEventListener('hashchange',function(){setTimeout(sweep,350)});
  document.addEventListener('click',function(){setTimeout(sweep,400)});
  sweep();setTimeout(sweep,800);
  setTimeout(function(){items.forEach(show)},6000);

  document.addEventListener('pointermove',function(ev){
    if(quiet())return;
    var el=ev.target.closest&&ev.target.closest('.pz-tilt');if(!el)return;
    var r=el.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;
    el.style.setProperty('--ry',(x*10).toFixed(2)+'deg');el.style.setProperty('--rx',(-y*10).toFixed(2)+'deg');
  },{passive:true});
  document.addEventListener('pointerout',function(ev){
    var el=ev.target.closest&&ev.target.closest('.pz-tilt');
    if(el&&!el.contains(ev.relatedTarget)){el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg')}
  });

  var imgs=[].slice.call(document.querySelectorAll('.art-piece .art-view img,.merch-grid .art-view img')),tick=false;
  function par(){
    tick=false;var vh=innerHeight;
    imgs.forEach(function(im){
      if(quiet()){im.style.removeProperty('--py');return}
      var r=im.parentNode.getBoundingClientRect();if(r.bottom<0||r.top>vh)return;
      var p=(r.top+r.height/2-vh/2)/vh;im.style.setProperty('--py',(p*-18).toFixed(1)+'px');
    });
  }
  addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(par)}},{passive:true});par();
})();

/* ---- Persona-style additions: bands, lane, shards, scroll cue ---- */
(function(){
  function mk(h){var d=document.createElement('div');d.innerHTML=h;return d.firstElementChild}
  /* Clean marquee: one straight row, alternating solid/outline words, star separators */
  function band(words,dir){
    var unit=words.map(function(w,i){return '<span class="mq-w'+(i%2?' o':'')+'">'+w+'</span><i class="mq-star"></i>'}).join('');
    var row='<div class="mq-track">'+unit+unit+unit+unit+'</div>';
    return mk('<div class="mq" data-dir="'+dir+'" aria-hidden="true">'+row+'</div>');
  }
  var map=[['#flagship',['Game Design','Visual Art','3D','VTuber','Editorial','Motion'],-1],
           ['#artworks',['MUEA','Kira Kira Workout!','Game Jam','Gymbro','Godot','MediaPipe'],1],
           ['#vtuber',['Selected Work','Kittisak','Portfolio','2026'],1],
           ['#showcase',['gamescom asia','Thai Next Thainess','MUEA','Playtest'],-1]];
  map.forEach(function(m){var s=document.querySelector(m[0]);if(s)s.parentNode.insertBefore(band(m[1],m[2]),s)});

  var imgs=['art_01','events/thumb/t21_01','art_02','art_03','events/thumb/isan_01','art_04','3d_digiblink','events/thumb/tcdc_01','kirakira/thumb/still-04-gym-perfect','vtuber_summer_kv','kirakira/thumb/still-09-debut-stage','vtuber_vivii_standee','events/thumb/t21_04','vtuber_zoey_standee','muea_trailer_thumb','cupid_mv_thumb'];
  var fig=imgs.map(function(n){return '<figure><img src="assets/images/'+n+'.jpg" alt="" decoding="async"></figure>'}).join('');
  var lane=mk('<div class="pz-lane" data-dir="1" aria-hidden="true"><div class="mq-track">'+fig+fig+'</div></div>');
  var wi=document.querySelector('#work-index');if(wi)wi.parentNode.insertBefore(lane,wi.nextSibling);

  function shards(host,n){
    if(!host)return;var cols=['#ff2bd6','#00f0ff','#8a5cff','#ff2bd6','#b6ff3c'];
    for(var i=0;i<n;i++){
      var s=document.createElement('i');s.className='pz-shard s'+(1+i%3);
      var sz=14+Math.random()*38;
      s.style.cssText='left:'+(Math.random()*96)+'%;top:'+(Math.random()*92)+'%;width:'+sz+'px;height:'+sz*(.8+Math.random()*.8)+'px;background:'+cols[i%cols.length]+';--r:'+(Math.random()*360|0)+'deg;--dx:'+((Math.random()-.5)*120|0)+'px;--dy:'+((Math.random()-.5)*120|0)+'px;--t:'+(9+Math.random()*10).toFixed(1)+'s;--dl:-'+(Math.random()*10).toFixed(1)+'s';
      host.insertBefore(s,host.firstChild);
    }
  }
  shards(document.querySelector('#hero'),16);shards(document.querySelector('#about'),9);
  var hero=document.querySelector('#hero');
  if(hero)hero.appendChild(mk('<div class="pz-scroll" aria-hidden="true">SCROLL<i></i></div>'));

  document.addEventListener('transitionend',function(e){var t=e.target;if(t.classList&&t.classList.contains('pz-in')&&e.propertyName==='clip-path')t.classList.add('pz-done')});
  addEventListener('scroll',function(){
    var y=scrollY;document.querySelectorAll('.pz-shard').forEach(function(s,i){var r=s.parentNode.getBoundingClientRect();if(r.bottom<-100||r.top>innerHeight+100)return;s.style.setProperty('--sy',(-r.top*.08*(1+i%4*.4)).toFixed(0)+'px')});
  },{passive:true});
})();



/* ---- Neon layer: grid floor, orbs, scanlines ---- */
(function(){
  function add(host,html){if(host){var d=document.createElement('div');d.innerHTML=html;host.insertBefore(d.firstElementChild,host.firstChild)}}
  var hero=document.querySelector('#hero'),about=document.querySelector('#about');
  [hero,about].forEach(function(h){if(!h)return;h.style.overflow='hidden';
    add(h,'<div class="nz-grid" aria-hidden="true"></div>');
    add(h,'<div class="nz-orb" style="width:380px;height:380px;left:-90px;top:10%;background:#ff2bd6" aria-hidden="true"></div>');
    add(h,'<div class="nz-orb" style="width:340px;height:340px;right:-60px;bottom:5%;background:#00f0ff;animation-delay:-6s" aria-hidden="true"></div>');
  });
  add(hero,'<div class="nz-scan" aria-hidden="true"></div>');
})();

/* ---- Velocity marquee engine: speed + skew react to scroll, direction follows scroll ---- */
(function(){
  var quiet=function(){return document.body.classList.contains('quiet-motion')};
  var rows=[].slice.call(document.querySelectorAll('.mq,.pz-lane')).map(function(el){
    var tr=el.querySelector('.mq-track');
    var r={el:el,tr:tr,x:0,dir:+el.dataset.dir||-1,copies:el.classList.contains('mq')?4:2,vis:false,hover:0,hov:false,base:el.classList.contains('mq')?.9:.55};
    el.addEventListener('pointerenter',function(){r.hov=true});el.addEventListener('pointerleave',function(){r.hov=false});
    new IntersectionObserver(function(es){r.vis=es[0].isIntersecting}).observe(el);
    return r;
  });
  if(!rows.length)return;
  var lastY=scrollY,v=0,sdir=1,skew=0;
  function tick(){
    var y=scrollY,d=y-lastY;lastY=y;
    if(d!==0)sdir=d>0?1:-1;
    v+=(d-v)*.12;
    skew+=((Math.max(-7,Math.min(7,v*.35)))-skew)*.1;
    var q=quiet();
    rows.forEach(function(r){
      if(!r.vis||!r.tr)return;
      var loop=r.tr.scrollWidth/r.copies;if(!loop)return;
      r.hover+=((r.hov&&r.el.classList.contains('pz-lane')?1:0)-r.hover)*.08;
      var sp=q?0:(r.base+Math.abs(v)*.28)*(1-r.hover*.92);
      r.x+=sp*r.dir*sdir;
      if(r.x<=-loop)r.x+=loop;if(r.x>0)r.x-=loop;
      r.tr.style.transform='translate3d('+r.x.toFixed(2)+'px,0,0) skewX('+(q?0:-skew*r.dir).toFixed(2)+'deg)';
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
