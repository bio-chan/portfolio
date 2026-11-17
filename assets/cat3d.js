/* cat3d.js — neon crystal cat mascot (three.js). Follows cursor, blinks, wags tail, bursts on click. */
(function(){
  if(typeof THREE==='undefined')return;
  var quiet=function(){return document.body.classList.contains('quiet-motion')};
  var C={cyan:0x00f0ff,mag:0xff2bd6,lime:0xb6ff3c,vio:0x8a5cff};

  function crystal(geo,color,edge){
    var m=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({color:color,metalness:.25,roughness:.08,transparent:true,opacity:.86,flatShading:true,emissive:color,emissiveIntensity:.22,clearcoat:1,clearcoatRoughness:.1}));
    var l=new THREE.LineSegments(new THREE.EdgesGeometry(geo,1),new THREE.LineBasicMaterial({color:edge||0xffffff,transparent:true,opacity:.9}));
    m.add(l);return m;
  }

  function build(host,variant){
    var W=host.clientWidth||300,H=host.clientHeight||300;
    var r=new THREE.WebGLRenderer({alpha:true,antialias:true});
    r.setPixelRatio(Math.min(devicePixelRatio||1,2));r.setSize(W,H,false);host.appendChild(r.domElement);
    var scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(36,W/H,.1,50);cam.position.set(0,.6,8.2);
    scene.add(new THREE.AmbientLight(0x8888ff,.55));
    var p1=new THREE.PointLight(C.mag,2.2,30);p1.position.set(4,3,5);scene.add(p1);
    var p2=new THREE.PointLight(C.cyan,2.2,30);p2.position.set(-4,1,4);scene.add(p2);
    var p3=new THREE.PointLight(C.lime,1.6,30);p3.position.set(0,-3,-4);scene.add(p3);

    var main=variant==='about'?C.mag:C.cyan, edge=variant==='about'?0xffc2f5:0xc2fcff;
    var cat=new THREE.Group();scene.add(cat);
    var body=crystal(new THREE.IcosahedronGeometry(.95,1),main,edge);body.scale.set(1,.85,1.4);body.position.set(0,-.55,-.2);cat.add(body);
    var head=new THREE.Group();head.position.set(0,.55,.95);cat.add(head);
    head.add(crystal(new THREE.IcosahedronGeometry(.7,1),main,edge));
    var earL=new THREE.Group(),earR=new THREE.Group();
    [[earL,-1],[earR,1]].forEach(function(p){
      var e=crystal(new THREE.ConeGeometry(.3,.7,4),C.vio,0xe0d0ff);e.position.y=.32;p[0].add(e);
      p[0].position.set(p[1]*.4,.55,0);p[0].rotation.z=-p[1]*.3;head.add(p[0]);
    });
    var eyeM=new THREE.MeshBasicMaterial({color:C.lime}),eyes=[];
    [-1,1].forEach(function(s){var e=new THREE.Mesh(new THREE.SphereGeometry(.11,10,10),eyeM);e.scale.set(1,1.3,.6);e.position.set(s*.27,.1,.62);head.add(e);eyes.push(e)});
    var nose=new THREE.Mesh(new THREE.OctahedronGeometry(.07),new THREE.MeshBasicMaterial({color:C.mag}));nose.position.set(0,-.08,.7);head.add(nose);
    var wm=new THREE.LineBasicMaterial({color:C.lime,transparent:true,opacity:.9});
    [-1,1].forEach(function(s){for(var i=0;i<3;i++){
      var g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(s*.2,-.1-i*.05,.66),new THREE.Vector3(s*(.95+i*.05),-.05-i*.17+(.1),.5)]);head.add(new THREE.Line(g,wm));}});
    var legs=[];
    [[-.45,.55],[.45,.55],[-.45,-.8],[.45,-.8]].forEach(function(p){var l=crystal(new THREE.OctahedronGeometry(.3),C.cyan===main?C.vio:C.cyan,edge);l.scale.set(.8,1.5,.8);l.position.set(p[0],-1.35,p[1]);cat.add(l);legs.push(l)});
    var tail=[];
    for(var i=0;i<8;i++){var s=crystal(new THREE.OctahedronGeometry(.2-i*.012),i%2?C.mag:C.lime,0xffffff);cat.add(s);tail.push(s)}

    var orbs=[];
    for(var k=0;k<9;k++){
      var o=crystal(new THREE.OctahedronGeometry(.13+Math.random()*.1),[C.cyan,C.mag,C.lime,C.vio][k%4],0xffffff);
      o.userData={a:Math.random()*6.28,s:.5+Math.random()*.9,rad:2+Math.random()*.7,y:(Math.random()-.5)*2.4};scene.add(o);orbs.push(o);
    }

    var mx=0,my=0,spin=0,burst=0,blink=0,nextBlink=2,t0=performance.now(),visible=true;
    addEventListener('pointermove',function(e){var b=host.getBoundingClientRect();mx=Math.max(-1.4,Math.min(1.4,(e.clientX-(b.left+b.width/2))/(innerWidth*.45)));my=Math.max(-1,Math.min(1,(e.clientY-(b.top+b.height/2))/(innerHeight*.45)))},{passive:true});
    var words=['MEOW!','GG!','LEVEL UP!','+1 CRIT','NYA~','PLAYER 2?','LOOT!'],bub=host.querySelector('.nz-bubble'),bi=0;
    host.addEventListener('click',function(){spin=14;burst=1;bi=(bi+1)%words.length;if(bub){bub.textContent=words[bi];bub.classList.add('pop');setTimeout(function(){bub.classList.remove('pop')},260)}});
    new IntersectionObserver(function(es){visible=es[0].isIntersecting}).observe(host);

    function frame(t){
      var tt=t/1000;
      var q=quiet();
      var sway=q?0:Math.sin(tt*.8)*.25;
      cat.rotation.y+=((mx*.9+sway+.35)-(cat.rotation.y%(Math.PI*2)))*.06;
      if(spin>0){cat.rotation.y+=spin*.016;spin*=.94;if(spin<.05)spin=0}
      cat.rotation.x+=((my*.2)-cat.rotation.x)*.06;
      cat.position.y=q?0:Math.sin(tt*1.6)*.18;
      var br=1+(q?0:Math.sin(tt*2.4)*.025+burst*.18);cat.scale.setScalar(br);burst*=.9;
      head.rotation.y=mx*.35;head.rotation.x=-my*.2;
      earL.rotation.z=.3+(q?0:Math.max(0,Math.sin(tt*5.1))*Math.max(0,Math.sin(tt*.9))*.35);
      earR.rotation.z=-.3-(q?0:Math.max(0,Math.sin(tt*4.3+1))*Math.max(0,Math.sin(tt*.7))*.3);
      nextBlink-=.016;if(nextBlink<0){blink=.14;nextBlink=2+Math.random()*3}
      if(blink>0)blink-=.016;var ey=blink>0?.08:1.3;eyes.forEach(function(e){e.scale.y=ey});
      for(var i=0;i<tail.length;i++){var f=i/(tail.length-1);
        tail[i].position.set(Math.sin(tt*2.6-i*.5)*.55*f*(q?0:1),-.3+i*.3-f*.1*i,-1.35-i*.12);tail[i].rotation.y=tt+i}
      legs.forEach(function(l,i){l.rotation.y=tt*.5+i});
      orbs.forEach(function(o){var d=o.userData;d.a+=q?0:d.s*.012;o.position.set(Math.cos(d.a)*d.rad,d.y+Math.sin(d.a*2)*.3,Math.sin(d.a)*d.rad);o.rotation.x+=.02;o.rotation.y+=.03});
      p1.position.x=4*Math.cos(tt*.7);p2.position.x=-4*Math.cos(tt*.9);
      r.render(scene,cam);
    }
    (function tick(){if(visible)frame(performance.now());if(quiet())setTimeout(tick,250);else requestAnimationFrame(tick)})();
    return r;
  }

  function mount(parent,cls,variant){
    if(!parent)return;
    var h=document.createElement('div');h.className='nz-cat '+cls;h.setAttribute('role','img');h.setAttribute('aria-label','Crystal cat mascot — click me');
    h.innerHTML='<span class="nz-bubble">MEOW!</span>';parent.appendChild(h);
    try{build(h,variant)}catch(e){h.remove()}
  }
  mount(document.querySelector('#hero'),'hero','hero');
  mount(document.querySelector('#about'),'about','about');
})();

