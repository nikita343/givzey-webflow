// Phone screen UI drawn to a canvas texture (placeholder copy: Maya / Lauren / Northbridge)
export function ScreenUI(THREE, inkUrl){
  const W=600, H=1236; const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
  const inkImg = new Image(); inkImg.crossOrigin = 'anonymous'; inkImg.src = inkUrl; inkImg.onload = ()=>{ last=''; };
  let last='';
  const F = (w,s)=>`${w} ${s}px Geist, ui-sans-serif, system-ui, sans-serif`;
  const rr=(x,y,w,h,r)=>{ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); };
  function wrap(text, maxW){ const words=text.split(' '); const lines=[]; let cur=''; for(const w of words){ const t=cur?cur+' '+w:w; if(g.measureText(t).width>maxW && cur){ lines.push(cur); cur=w; } else cur=t; } if(cur) lines.push(cur); return lines; }
  function status(dark){ g.fillStyle=dark?'#fff':'#030B2C'; g.font=F(600,28); g.fillText('9:41',52,62); g.fillRect(W-110,44,34,18); g.fillRect(W-70,44,22,18); rr(W-200+0,40,0,0,0); }
  function header(acc,title,sub){ g.fillStyle='#fff'; g.fillRect(0,0,W,190); g.fillStyle='rgba(3,11,44,.08)'; g.fillRect(0,190,W,2); status(false);
    g.fillStyle=acc; g.beginPath(); g.arc(88,136,30,0,7); g.fill(); g.fillStyle='#fff'; g.font=F(600,28); g.textAlign='center'; g.fillText(title[0],88,146); g.textAlign='left';
    g.fillStyle='#030B2C'; g.font=F(600,30); g.fillText(title,136,128); g.fillStyle='rgba(3,11,44,.55)'; g.font=F(400,23); g.fillText(sub,136,160); }
  function bubbles(list, n, acc, y0, typing){
    let y=y0; g.font=F(400,29);
    list.forEach((m,i)=>{ if(i>=n) return;
      if(m.chip){ g.font=F(500,24); const tw=g.measureText(m.text).width+40; g.fillStyle=acc+'22'; rr(40,y,tw,52,26); g.fill(); g.fillStyle=acc; g.fillText(m.text,60,y+35); y+=72; g.font=F(400,29); return; }
      const lines=wrap(m.text, 380); const bw=Math.max(...lines.map(l=>g.measureText(l).width))+44, bh=lines.length*38+30;
      const x = m.out? W-40-bw : 40;
      g.fillStyle = m.out? '#030B2C' : '#fff'; rr(x,y,bw,bh,28); g.fill();
      if(!m.out){ g.strokeStyle='rgba(3,11,44,.1)'; g.lineWidth=2; g.stroke(); }
      g.fillStyle = m.out? '#fff' : '#030B2C'; lines.forEach((l,k)=>g.fillText(l, x+22, y+44+k*38)); y+=bh+18; });
    if (typing) { g.fillStyle='#fff'; rr(40,y,120,64,30); g.fill(); g.strokeStyle='rgba(3,11,44,.1)'; g.lineWidth=2; g.stroke(); g.fillStyle='rgba(3,11,44,.45)'; for(let i=0;i<3;i++){ g.beginPath(); g.arc(72+i*28, y+32, 7, 0, 7); g.fill(); } }
  }
  const SMS1=[{text:"Hi Maya! I'm Lauren from Northbridge. Thank you for supporting our students. What inspired your first gift?"},{out:1,text:"I was a scholarship student myself."},{text:"That's wonderful. Would you like an update on what scholarship support makes possible today?"},{out:1,text:"Yes, I'd love that."},{chip:1,text:"✓ Interest found: student scholarships"}];
  const SMS4=[{text:"Hi Maya, it's almost a year since your first scholarship gift. Would you like to give again?"},{out:1,text:"Absolutely. Same as last year."},{text:"Thank you! Here's your secure link: northbridge.edu/give"},{chip:1,text:"✓ Gift renewed · $500"}];
  const T1=[.12,.30,.52,.68,.82], T4=[.12,.32,.54,.72];
  function draw(scene, sp, s){
    const acc = `rgb(${s.acc[0]},${s.acc[1]},${s.acc[2]})`;
    const count = th => th.filter(x=>sp>=x).length;
    const typ = (L,T)=>{ const n=count(T); const m=L[n]; return !!(m && !m.out && !m.chip && sp >= T[n]-0.1); };
    const typing = scene===1? typ(SMS1,T1) : scene===4? typ(SMS4,T4) : false;
    const key = [scene, scene===1?count(T1):scene===4?count(T4):scene===2?count([.06,.16,.3,.42,.66]):scene===3?count([.06,.14,.2,.26,.72]):0, typing, s.name].join('|');
    if (key===last) return false; last=key;
    g.clearRect(0,0,W,H);
    if (scene===0 || scene===5){
      const gr=g.createLinearGradient(0,0,0,H); gr.addColorStop(0, `rgb(${s.acc.join(',')})`); gr.addColorStop(1,'#030B2C'); g.fillStyle=gr; g.fillRect(0,0,W,H);
      if (inkImg.complete) { g.globalAlpha=.35; g.drawImage(inkImg, -300, 260, 1200, 610); g.globalAlpha=1; }
      status(true); g.fillStyle='#fff'; g.textAlign='center'; g.font=F(400,30); g.fillText(scene===0?'Monday, January 12':'Friday, December 18', W/2, 200);
      g.font=`500 150px "Plus Jakarta Sans", Geist, sans-serif`; g.fillText('9:41', W/2, 350); g.textAlign='left';
      const msg = scene===0? ['Lauren · Northbridge','Hi Maya! Thank you for supporting our students.'] : ['Northbridge','Your gift receipt for 2027 is ready. Thank you, Maya.'];
      g.fillStyle='rgba(255,255,255,.82)'; rr(34,850,W-68,150,34); g.fill();
      g.fillStyle=acc; g.beginPath(); g.arc(94,900,24,0,7); g.fill(); g.fillStyle='#030B2C'; g.font=F(600,25); g.fillText(msg[0],134,908);
      g.fillStyle='rgba(3,11,44,.7)'; g.font=F(400,25); wrap(msg[1],480).slice(0,2).forEach((l,k)=>g.fillText(l,64,954+k*32));
    } else if (scene===1 || scene===4){
      g.fillStyle='#F4F5F8'; g.fillRect(0,0,W,H); header(acc,'Lauren','Northbridge · Virtual Engagement Officer');
      bubbles(scene===1?SMS1:SMS4, scene===1?count(T1):count(T4), acc, 236, typing);
    } else if (scene===2){
      const n=count([.06,.16,.3,.42,.66]);
      g.fillStyle='#fff'; g.fillRect(0,0,W,H); header(acc,'Lauren at Northbridge','to Maya · April 14');
      let y=250;
      if(n>0){ g.fillStyle='#030B2C'; g.font=`500 40px "Plus Jakarta Sans", Geist, sans-serif`; wrap('What your scholarship support did this spring',520).forEach((l,k)=>g.fillText(l,40,y+40+k*48)); }
      y=370;
      if(n>1){ g.save(); rr(40,y,W-80,300,28); g.clip(); g.fillStyle=acc+'22'; g.fillRect(40,y,W-80,300); if(inkImg.complete) g.drawImage(inkImg,-260,y-120,1100,560); g.restore();
        g.fillStyle='rgba(255,255,255,.9)'; rr(60,y+236,300,44,22); g.fill(); g.fillStyle='#030B2C'; g.font=F(500,22); g.fillText('Priya, nursing, class of 2027',78,y+266); }
      y=710;
      if(n>2){ g.fillStyle='rgba(3,11,44,.65)'; g.font=F(400,28); wrap('You told us you were a scholarship student. This spring, scholarship support helped Priya finish her nursing degree.',520).forEach((l,k)=>g.fillText(l,40,y+k*40)); }
      if(n>3){ g.fillStyle=acc; rr(40,900,300,70,35); g.fill(); g.fillStyle='#fff'; g.font=F(500,27); g.fillText("Read Priya's story",78,944); }
      if(n>4){ g.fillStyle=acc; g.beginPath(); g.arc(50,1030,8,0,7); g.fill(); g.fillStyle='rgba(3,11,44,.6)'; g.font=F(400,24); g.fillText('Maya replied: "This made my day"',70,1038); }
    } else if (scene===3){
      const n=count([.06,.14,.2,.26,.72]);
      const gr=g.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#F6EFE3'); gr.addColorStop(1,'#EFE6D6'); g.fillStyle=gr; g.fillRect(0,0,W,H); status(false);
      if(n>0){ g.fillStyle='#fff'; rr(34,120,W-68,150,32); g.fill(); g.fillStyle='#030B2C'; rr(60,150,70,70,18); g.fill(); g.fillStyle='#fff'; g.font=F(500,34); g.fillText('✉',78,198);
        g.fillStyle='#030B2C'; g.font=F(600,27); g.fillText('Informed Delivery',150,178); g.fillStyle='rgba(3,11,44,.6)'; g.font=F(400,24); g.fillText('A card from Northbridge arrives today',150,214); }
      const rows=[['Written with a real pen','Jun 3'],['Mailed first class','Jun 4'],['Delivered to Maya','Jun 6'],['Maya: "I\'m keeping this one"','Jun 6']];
      rows.forEach((r,i)=>{ if(n<=i+1) return; const y=330+i*96; g.fillStyle=acc; g.beginPath(); g.arc(70,y,20,0,7); g.fill(); g.fillStyle='#fff'; g.font=F(600,22); g.fillText('✓',61,y+8);
        g.fillStyle='#030B2C'; g.font=F(400,27); g.fillText(r[0],110,y+9); g.fillStyle='rgba(3,11,44,.45)'; g.font=F(400,22); g.fillText(r[1],W-110,y+8); });
    }
    tex.needsUpdate = true; return true;
  }
  return {tex, draw, canvas:c};
}
