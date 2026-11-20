(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const mini = document.getElementById('minimap');
  const mctx = mini.getContext('2d');
  const W = 2600, H = 2400, ROAD = 110, STEP_X = 520, STEP_Y = 480;
  const roadXs = [260, 780, 1300, 1820, 2340], roadYs = [240, 720, 1200, 1680, 2160];
  const palette = ['#d58053','#d5bd79','#b9ce91','#d88970','#80a6a0','#d3c897','#b9a2c2','#c9a26c'];
  const destinations = [
    {name:'Frau Krüger',address:'Bäckerstraße 14 · Altstadt',quote:'“The doorbell only works if you press it three times.”',x:345,y:282,dir:'east'},
    {name:'Herr Özdemir',address:'Kanalweg 6 · Hafenkiez',quote:'“Could you leave it with the very loud parrot?”',x:820,y:650,dir:'south'},
    {name:'Mila & Nils',address:'Lindenhof 22 · Nordring',quote:'“We ordered one box. Why is it so box-shaped?”',x:1140,y:760,dir:'west'},
    {name:'Büro Wunderlich',address:'Marktplatz 3 · Altstadt',quote:'“The lift is broken. It’s only the fifth floor.”',x:1360,y:1080,dir:'south'},
    {name:'Frau Peters',address:'Gartenstraße 41 · Westend',quote:'“I’m not home. Please give it to me anyway.”',x:1755,y:1250,dir:'west'},
    {name:'Kiosk 24/7',address:'Ringallee 9 · Südstadt',quote:'“Can you take these empty bottles back too?”',x:2110,y:1740,dir:'east'},
    {name:'Herr Schmitz',address:'Schillerplatz 8 · Nordring',quote:'“The package is for my neighbour. Which one? Good question.”',x:1370,y:1905,dir:'south'},
    {name:'Tante Hilde',address:'Buntengasse 17 · Hafenkiez',quote:'“Stay for cake! It’s only a small, enormous cake.”',x:630,y:2220,dir:'west'}
  ];
  const deliveryStories = [
    {emoji:'🔔',title:'THREE RINGS, NO ANSWER',body:'You ring once. Nothing. Twice. A dog barks. On the third ring, Frau Krüger opens the door from the other side.',reward:'+ €28 delivery bonus'},
    {emoji:'🦜',title:'THE PARROT HAS OPINIONS',body:'Herr Özdemir is out. The parrot accepts the parcel, then loudly reports you to the entire building.',reward:'+ €32 delivery bonus'},
    {emoji:'📦',title:'IT WAS MOSTLY PACKING PEANUTS',body:'Mila and Nils open the box. Inside: one tiny ceramic frog, protected by enough bubble wrap for a small house.',reward:'+ €25 delivery bonus'},
    {emoji:'🪜',title:'FIFTH FLOOR. NO LIFT.',body:'The lift is still broken. The “lightweight” package contains what feels like a complete collection of encyclopedias.',reward:'+ €38 delivery bonus'},
    {emoji:'🚪',title:'SHE WAS HOME THE WHOLE TIME',body:'Frau Peters appears at the door wearing headphones. She says she never heard the bell. You both know.',reward:'+ €28 delivery bonus'},
    {emoji:'🍾',title:'A KIOSK-SIZED FAVOUR',body:'You drop off the parcel. The kiosk owner hands you a bag of return bottles “for the way back.” Absolutely not.',reward:'+ €30 delivery bonus'},
    {emoji:'🧭',title:'NEIGHBOURHOOD WATCH',body:'Herr Schmitz gives you a 12-minute description of his neighbour. You still have no idea which door is theirs.',reward:'+ €28 delivery bonus'},
    {emoji:'🍰',title:'CAKE. SO MUCH CAKE.',body:'Tante Hilde sends you off with a slice of cake wrapped in foil. It is the best moment of your shift.',reward:'+ €45 delivery bonus'}
  ];
  const rand = (() => { let s=93429; return () => {s=(s*1664525+1013904223)>>>0;return s/4294967296} })();
  const buildings=[], traffic=[], parked=[], people=[], decorations=[];
  const player={x:260,y:310,angle:-Math.PI/2,speed:0,damage:100,stress:18,fines:0,collisionCooldown:0};
  let running=false,paused=false,finished=false,packageIndex=0,gameMinutes=480,toastTimer=0,nearTarget=false,lastFine=0,parkedFor=0,overtimeAnnounced=false,hornCooldown=0,animation=0;
  const keys={};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const current=()=>destinations[packageIndex];

  function makeCity(){
    for(let gx=0;gx<5;gx++) for(let gy=0;gy<5;gy++){
      const left=roadXs[gx]+ROAD/2+12, top=roadYs[gy]+ROAD/2+12;
      const bw=STEP_X-ROAD-24, bh=STEP_Y-ROAD-24;
      const district=(gx<2&&gy>2)?'WESTEND':(gy>2?'SÜDSTADT':(gx>2?'HAFENKIEZ':'ALTSTADT'));
      // Quiet green courtyards and paved yards inside each street block.
      ctx.fillStyle=(gx+gy)%3===0?'#66885a':'#738f58';ctx.fillRect(left,top,bw,bh);
      ctx.fillStyle='#84946a';ctx.fillRect(left+7,top+7,bw-14,bh-14);
      ctx.fillStyle='#647d52';ctx.fillRect(left+12,top+12,bw-24,bh-24);
      const count=3+Math.floor(rand()*3);
      for(let i=0;i<count;i++){
        const cols=2, col=i%cols, row=Math.floor(i/cols);
        const cellW=(bw-42)/2, cellH=(bh-42)/3;
        let x=left+14+col*(cellW+12)+rand()*8,y=top+14+row*(cellH+8)+rand()*8;
        let w=cellW-(rand()*15),h=cellH-(rand()*12);
        if(i===count-1&&rand()>.42){ // little backyard / shop yard
          decorations.push({x:x-5,y:y-5,w:w+10,h:h+10,type:'yard'});continue;
        }
        buildings.push({x,y,w,h,color:palette[Math.floor(rand()*palette.length)],roof:['#b8a581','#65737b','#9c6254','#727e68'][Math.floor(rand()*4)],label:rand()>.55?['BÄCKEREI','SPÄTI','MARKT','BLUMEN'][Math.floor(rand()*4)]:district,shop:rand()>.55});
        if(rand()>.36){decorations.push({x:x+w+3,y:y+h+5,w:8+rand()*12,h:6+rand()*8,type:'tree'});}
      }
      if(rand()>.35){decorations.push({x:left+bw*.48,y:top+bh*.49,w:35+rand()*22,h:26+rand()*24,type:'yard'});}
    }
    // Parked cars tucked along every avenue, safely outside intersections.
    for(const x of roadXs) for(const y of roadYs){
      for(let n=0;n<3;n++){
        if(rand()>.48) parked.push({x:x-42+(n-1)*23,y:y-72+(rand()-.5)*18,angle:Math.PI/2,color:carColors[Math.floor(rand()*carColors.length)]});
        if(rand()>.42) parked.push({x:x+68+(rand()-.5)*18,y:y+39+(n-1)*24,angle:0,color:carColors[Math.floor(rand()*carColors.length)]});
      }
    }
    // Traffic circulates in simple, readable lanes with occasional very bad decisions.
    for(let i=0;i<26;i++){
      const horizontal=rand()>.48, row=Math.floor(rand()*(horizontal?roadYs.length:roadXs.length));
      traffic.push({horizontal,lane:horizontal?roadYs[row]+(rand()>.5?22:-22):roadXs[row]+(rand()>.5?22:-22),x:rand()*W,y:rand()*H,dir:rand()>.5?1:-1,speed:38+rand()*58,color:carColors[Math.floor(rand()*carColors.length)],horn:rand()>.67,swerve:rand()>.8?1:0});
    }
    for(let i=0;i<42;i++) people.push({x:rand()*W,y:rand()*H,phase:rand()*8,dir:rand()*Math.PI*2,walkSpeed:8+rand()*13,turnIn:1+rand()*5,color:['#e8c28e','#c87860','#5f7773','#e5d7b6'][Math.floor(rand()*4)]});
    for(let i=0;i<80;i++) decorations.push({x:rand()*W,y:rand()*H,type:'tree',w:8+rand()*12,h:9+rand()*12});
  }
  const carColors=['#cf5549','#e7c65a','#76a8a4','#ded7bc','#424c52','#8ea8c0','#d88d56','#f1e7d0'];
  // Generate the static environment into a crisp, reusable world map.
  const world=document.createElement('canvas');world.width=W;world.height=H;const wc=world.getContext('2d');
  function buildWorld(){
    wc.fillStyle='#718f5c';wc.fillRect(0,0,W,H);
    // District ground fields
    for(let x=0;x<W;x+=260)for(let y=0;y<H;y+=240){wc.fillStyle=(Math.floor(x/260)+Math.floor(y/240))%2?'#78965f':'#708b57';wc.fillRect(x,y,260,240)}
    // Roads and sidewalks
    wc.fillStyle='#b9b394';for(const x of roadXs)wc.fillRect(x-ROAD/2-13,0,ROAD+26,H);for(const y of roadYs)wc.fillRect(0,y-ROAD/2-13,W,ROAD+26);
    wc.fillStyle='#444b49';for(const x of roadXs)wc.fillRect(x-ROAD/2,0,ROAD,H);for(const y of roadYs)wc.fillRect(0,y-ROAD/2,W,ROAD);
    // Slight road texture, dashed center lines and curb details
    for(const x of roadXs){wc.fillStyle='#d2c96c';wc.fillRect(x-2,0,4,H);wc.fillStyle='#444b49';wc.fillRect(x-7,0,14,H);wc.fillStyle='#686d64';wc.fillRect(x-ROAD/2+4,0,2,H);wc.fillRect(x+ROAD/2-6,0,2,H)}
    for(const y of roadYs){wc.fillStyle='#d2c96c';wc.fillRect(0,y-2,W,4);wc.fillStyle='#444b49';wc.fillRect(0,y-7,W,14);wc.fillStyle='#686d64';wc.fillRect(0,y-ROAD/2+4,W,2);wc.fillRect(0,y+ROAD/2-6,W,2)}
    for(const x of roadXs)for(const y of roadYs){
      wc.fillStyle='#e2d9bb';for(let i=-3;i<=3;i++){wc.fillRect(x-52+i*14,y-58,7,24);wc.fillRect(x-52+i*14,y+34,7,24);wc.fillRect(x-58,y-52+i*14,24,7);wc.fillRect(x+34,y-52+i*14,24,7)}
      wc.fillStyle='#7d7e6d';wc.fillRect(x-5,y-5,10,10);
    }
    // Lane dashes between intersections
    wc.fillStyle='#c9c4a4';for(const x of roadXs)for(let y=0;y<H;y+=43)if(!roadYs.some(ry=>Math.abs(ry-y)<70))wc.fillRect(x-2,y,4,19);
    for(const y of roadYs)for(let x=0;x<W;x+=43)if(!roadXs.some(rx=>Math.abs(rx-x)<70))wc.fillRect(x,y-2,19,4);
    // A generous central park with a geometric pond
    wc.fillStyle='#527b53';wc.fillRect(1030,850,270,240);wc.fillStyle='#83a266';wc.fillRect(1040,860,250,220);
    wc.fillStyle='#78945d';for(let i=0;i<9;i++){wc.fillRect(1052+i*26,868,3,200)}for(let i=0;i<8;i++)wc.fillRect(1048,878+i*25,232,3);
    wc.fillStyle='#65aeb0';wc.fillRect(1115,925,84,48);wc.fillStyle='#d1c799';wc.fillRect(1151,950,12,76);
    wc.fillStyle='#eddfb3';wc.font='bold 11px monospace';wc.fillText('STADTPARK',1080,1070);
    // Broad district labels
    const labels=[['ALTSTADT',390,600],['NORDRING',1500,440],['HAFENKIEZ',2020,990],['WESTEND',390,1540],['SÜDSTADT',1930,1910]];
    for(const [text,x,y] of labels){wc.fillStyle='#d4e5be';wc.font='bold 12px monospace';wc.fillText(text,x,y);wc.fillStyle='#27372c';wc.fillRect(x-4,y+8,text.length*8+9,2)}
    // Building shadows, walls, roofs, windows and shop awnings
    for(const b of buildings){
      wc.fillStyle='#29352c';wc.fillRect(b.x+5,b.y+7,b.w,b.h);
      wc.fillStyle=b.color;wc.fillRect(b.x,b.y,b.w,b.h);
      wc.fillStyle=b.roof;wc.fillRect(b.x+5,b.y+5,b.w-10,b.h-10);
      wc.fillStyle='#d8caa0';wc.fillRect(b.x+2,b.y+2,b.w-4,3);wc.fillRect(b.x+2,b.y+2,3,b.h-4);
      wc.fillStyle='#5e5547';for(let wx=b.x+12;wx<b.x+b.w-8;wx+=21){wc.fillRect(wx,b.y+12,8,7);wc.fillRect(wx,b.y+30,8,7)}
      if(b.shop){wc.fillStyle='#f0d78e';wc.fillRect(b.x+7,b.y+b.h-15,b.w-14,10);wc.fillStyle='#39453d';wc.font='bold 7px monospace';wc.fillText(b.label,b.x+9,b.y+b.h-8)}
      else{wc.fillStyle='#dfd5ba';wc.fillRect(b.x+b.w/2-4,b.y+b.h-12,9,12)}
    }
    for(const d of decorations){if(d.type==='yard'){wc.fillStyle='#9b916e';wc.fillRect(d.x,d.y,d.w,d.h);wc.strokeStyle='#c1b892';wc.setLineDash([3,3]);wc.strokeRect(d.x,d.y,d.w,d.h);wc.setLineDash([]);wc.fillStyle='#638153';wc.fillRect(d.x+d.w*.4,d.y+d.h*.4,8,7)}else{wc.fillStyle='#526e46';wc.fillRect(d.x+2,d.y+4,d.w,d.h);wc.fillStyle='#678550';wc.fillRect(d.x,d.y,d.w,d.h);wc.fillStyle='#879860';wc.fillRect(d.x+2,d.y+1,Math.max(3,d.w-4),3)}}
    // Public benches, mailboxes and little delivery doors on sidewalks
    for(const x of roadXs)for(const y of roadYs){wc.fillStyle='#d97749';wc.fillRect(x-77,y+67,8,10);wc.fillStyle='#e2d4ae';wc.fillRect(x+69,y-81,12,6);wc.fillStyle='#d4c593';wc.fillRect(x-82,y-85,19,4)}
  }

  function resize(){const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false}
  window.addEventListener('resize',resize);resize();makeCity();buildWorld();
  function toast(text,duration=3300){document.getElementById('toastText').textContent=text;const el=document.getElementById('toast');el.classList.remove('fade');toastTimer=duration;}
  function targetDistance(){const d=current();return Math.hypot(d.x-player.x,d.y-player.y)}
  function onRoad(x,y){return roadXs.some(rx=>Math.abs(rx-x)<ROAD*.68)||roadYs.some(ry=>Math.abs(ry-y)<ROAD*.68)}
  function updateHud(){
    const d=current();document.getElementById('clock').innerHTML=`${String(Math.floor(gameMinutes/60)%24).padStart(2,'0')}:${String(Math.floor(gameMinutes%60)).padStart(2,'0')}<span>${gameMinutes<720?'AM':'PM'}</span>`;
    document.getElementById('shiftProgress').style.width=`${clamp((gameMinutes-480)/(1050-480)*100,0,100)}%`;
    document.getElementById('packageCount').textContent=`${String(8-packageIndex).padStart(2,'0')} / 08`;
    document.getElementById('packageCaption').textContent=packageIndex===8?'SHIFT COMPLETE':'PARCELS STILL ON BOARD';
    document.getElementById('packageIcons').innerHTML=destinations.map((_,i)=>`<span class="parcel-chip ${i<packageIndex?'done':''}">${i<packageIndex?'✓':'▧'}</span>`).join('');
    document.getElementById('stressValue').innerHTML=`${Math.round(player.stress)}<span>%</span>`;document.getElementById('stressBar').style.width=`${player.stress}%`;document.getElementById('stressBar').style.background=player.stress>75?'#ee6651':player.stress>48?'#eeb15a':'#d9b752';
    document.getElementById('damageValue').innerHTML=`${Math.round(player.damage)}<span>%</span>`;document.getElementById('damageBar').style.width=`${player.damage}%`;document.getElementById('damageBar').style.background=player.damage<30?'#e75b4b':player.damage<60?'#e3a650':'#9cd36a';document.getElementById('fines').textContent=`€${player.fines}`;
    if(d){document.getElementById('destinationName').textContent=d.name;document.getElementById('destinationAddress').textContent=d.address;document.getElementById('missionQuote').textContent=d.quote;document.getElementById('missionIndex').textContent=`${String(packageIndex+1).padStart(2,'0')} — 08`;document.getElementById('distance').textContent=`${(targetDistance()/1000).toFixed(1)} KM`;}
    const dist=d?targetDistance():9999;nearTarget=dist<78&&Math.abs(player.speed)<37;
    const button=document.getElementById('deliverBtn');button.disabled=!nearTarget;document.getElementById('deliverText').textContent=nearTarget?'DELIVER PACKAGE':dist<78?'STOP THE VAN TO DELIVER':'DELIVER PACKAGE';document.getElementById('deliveryHint').textContent=nearTarget?'PACKAGE READY — PRESS E':dist<78?'BRAKE TO A COMPLETE STOP':'PARK NEAR THE MARKER TO DELIVER';document.getElementById('interactionPrompt').classList.toggle('show',nearTarget);
    document.getElementById('districtLabel').textContent=player.x>1900?'HAFENKIEZ DISTRICT':player.x<650?'WESTEND DISTRICT':player.y>1800?'SÜDSTADT DISTRICT':'ALTSTADT DISTRICT';
  }
  function deliver(){if(!running||paused||finished)return;if(!nearTarget){toast(targetDistance()<100?'Stop the van first. Frau Krüger has all day.':'Dispatch: get closer to the yellow marker first.',2300);return}const story=deliveryStories[packageIndex];player.stress=clamp(player.stress+([12,8,9,17,5,11,13, -7][packageIndex]),0,100);gameMinutes+=7+Math.round(rand()*9);packageIndex++;updateHud();if(packageIndex>=8){finishShift();return}document.getElementById('eventEmoji').textContent=story.emoji;document.getElementById('eventTitle').textContent=story.title;document.getElementById('eventBody').textContent=story.body;document.getElementById('eventKicker').textContent=`PARCEL ${String(packageIndex).padStart(2,'0')} OF 08 · ${destinations[packageIndex-1].name.toUpperCase()}`;document.getElementById('eventReward').innerHTML=`${story.reward} <span>+ STRESS ${Math.round(player.stress)}%</span>`;document.getElementById('eventOverlay').classList.remove('hidden');running=false;}
  function finishShift(){finished=true;running=false;document.getElementById('endDelivered').textContent=String(packageIndex).padStart(2,'0');document.getElementById('endFines').textContent=`€${player.fines}`;document.getElementById('endDamage').textContent=`${Math.round(player.damage)}%`;document.getElementById('endTitle').textContent=player.stress>90?'YOU SURVIVED. BARELY.':player.fines>120?'YOU MADE IT HOME. THE CAR DIDN’T.':'YOU MADE IT HOME.';document.getElementById('endCopy').textContent=player.stress>90?'Eight parcels delivered. Your eye is still twitching.':player.damage<45?'Eight parcels delivered. Your van is now an abstract concept.':'Eight parcels delivered. Your van is mostly still a van.';document.getElementById('endRank').innerHTML=player.fines===0?'PARKING LEGEND <small>the wardens hate you</small>':player.stress<40?'EMPLOYEE OF THE MONTH* <small>*only employee</small>':'EMPLOYEE OF THE MINUTE <small>take a long lunch</small>';document.getElementById('endOverlay').classList.remove('hidden')}
  function togglePause(){if(!running&& !paused)return;paused=!paused;document.getElementById('pauseOverlay').classList.toggle('hidden',!paused);if(paused)running=false;else running=true}
  function start(){document.getElementById('startOverlay').classList.add('hidden');running=true;gameMinutes=480;lastFrame=performance.now();toast('Dispatch: your shift starts now. Try not to hit anything.',3500)}
  document.getElementById('startBtn').addEventListener('click',start);document.getElementById('deliverBtn').addEventListener('click',deliver);document.getElementById('mobileDeliver').addEventListener('click',deliver);document.getElementById('continueBtn').addEventListener('click',()=>{document.getElementById('eventOverlay').classList.add('hidden');running=true;toast(`Dispatch: ${8-packageIndex} parcels left. Traffic is “normal.”`,2400)});document.getElementById('pauseBtn').addEventListener('click',togglePause);document.getElementById('resumeBtn').addEventListener('click',togglePause);
  document.getElementById('restartBtn').addEventListener('click',()=>location.reload());document.getElementById('soundBtn').addEventListener('click',e=>{e.currentTarget.textContent=e.currentTarget.textContent==='♪'?'×':'♪';toast(e.currentTarget.textContent==='♪'?'Radio back on. Same terrible playlist.':'Radio off. The city is still loud.',1900)});
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='e')deliver();if(e.key==='Escape')togglePause()});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
  document.querySelectorAll('[data-control]').forEach(btn=>{const c=btn.dataset.control;const down=e=>{e.preventDefault();keys[`touch${c}`]=true};const up=e=>{e.preventDefault();keys[`touch${c}`]=false};btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up)});
  function drawCar(c,x,y,angle,isPlayer=false){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#1b2824';ctx.fillRect(-13,-8+3,28,18);ctx.fillStyle=isPlayer?'#e8d878':c.color;ctx.fillRect(-14,-10,28,18);ctx.fillStyle=isPlayer?'#d4c257':lighten(c.color);ctx.fillRect(-11,-9,21,3);ctx.fillStyle='#344542';ctx.fillRect(-7,-7,11,12);ctx.fillStyle='#aac1b2';ctx.fillRect(-6,-6,9,3);ctx.fillStyle='#e9e3cb';ctx.fillRect(10,-7,3,4);ctx.fillRect(10,2,3,4);ctx.fillStyle='#252b28';ctx.fillRect(-10,-12,7,3);ctx.fillRect(5,-12,7,3);ctx.fillRect(-10,9,7,3);ctx.fillRect(5,9,7,3);if(isPlayer){ctx.fillStyle='#d8f16b';ctx.fillRect(-2,-13,7,3);if(player.damage<60){ctx.fillStyle='#525650';ctx.fillRect(-4,3,4,3)}}ctx.restore()}
  function lighten(c){return c==='#cf5549'?'#eb8b68':c==='#e7c65a'?'#ffe694':c==='#76a8a4'?'#a1cfbf':'#f0e9ce'}
  function drawWorld(){const sw=innerWidth,sh=innerHeight;const camX=clamp(player.x-sw/2,0,W-sw),camY=clamp(player.y-sh/2,0,H-sh);ctx.drawImage(world,camX,camY,sw,sh,0,0,sw,sh);
    // Route line and marker
    const d=current();if(d){ctx.save();ctx.setLineDash([7,9]);ctx.strokeStyle='#ffe179b9';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(player.x-camX,player.y-camY);ctx.lineTo(d.x-camX,d.y-camY);ctx.stroke();ctx.setLineDash([]);const pulse=5+Math.sin(animation*4)*2;ctx.strokeStyle='#fff0a7';ctx.lineWidth=2;ctx.beginPath();ctx.arc(d.x-camX,d.y-camY,12+pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffd35b';ctx.fillRect(d.x-camX-6,d.y-camY-6,12,12);ctx.fillStyle='#fff4c6';ctx.fillRect(d.x-camX-2,d.y-camY-2,4,4);ctx.restore()}
    for(const c of parked){if(c.x-camX < -30||c.x-camX>sw+30||c.y-camY < -30||c.y-camY>sh+30)continue;drawCar(c,c.x-camX,c.y-camY,c.angle)}
    for(const p of people){if(p.x-camX < -20||p.x-camX>sw+20||p.y-camY < -20||p.y-camY>sh+20)continue;const bob=Math.sin(animation*4+p.phase)*1.5;ctx.fillStyle='#263129';ctx.fillRect(p.x-camX-3,p.y-camY+2+bob,7,7);ctx.fillStyle=p.color;ctx.fillRect(p.x-camX-3,p.y-camY-3+bob,6,6);ctx.fillStyle='#e6d2a7';ctx.fillRect(p.x-camX-2,p.y-camY-6+bob,4,3)}
    for(const c of traffic){if(c.x-camX < -35||c.x-camX>sw+35||c.y-camY < -35||c.y-camY>sh+35)continue;drawCar(c,c.x-camX,c.y-camY,c.horizontal?(c.dir>0?0:Math.PI):(c.dir>0?Math.PI/2:-Math.PI/2))}
    drawCar({color:'#e4d978'},player.x-camX,player.y-camY,player.angle,true);
    // Off-road marker rings subtly reveal current handling trouble.
    if(!onRoad(player.x,player.y)){ctx.fillStyle='#dbb559';ctx.font='9px monospace';ctx.fillText('OFF ROAD',player.x-camX-25,player.y-camY+24)}
    drawMiniMap();
  }
  function drawMiniMap(){const w=mini.width,h=mini.height;mctx.fillStyle='#6d8957';mctx.fillRect(0,0,w,h);for(const x of roadXs){mctx.fillStyle='#454c49';mctx.fillRect(x/W*w-2,0,4,h)}for(const y of roadYs){mctx.fillStyle='#454c49';mctx.fillRect(0,y/H*h-2,w,4)}mctx.fillStyle='#5b7952';mctx.fillRect(1030/W*w,850/H*h,270/W*w,240/H*h);for(const b of buildings){mctx.fillStyle=b.color;mctx.fillRect(b.x/W*w,b.y/H*h,Math.max(1,b.w/W*w),Math.max(1,b.h/H*h))}const d=current();if(d){mctx.fillStyle='#ffd35b';mctx.beginPath();mctx.arc(d.x/W*w,d.y/H*h,3.8,0,7);mctx.fill();mctx.strokeStyle='#fff1a1';mctx.lineWidth=1;mctx.beginPath();mctx.arc(d.x/W*w,d.y/H*h,6+Math.sin(animation*4),0,7);mctx.stroke()}mctx.fillStyle='#f7f4df';mctx.strokeStyle='#26392e';mctx.lineWidth=2;mctx.beginPath();mctx.arc(player.x/W*w,player.y/H*h,3.5,0,7);mctx.fill();mctx.stroke();mctx.beginPath();mctx.moveTo(player.x/W*w,player.y/H*h);mctx.lineTo((player.x+Math.cos(player.angle)*22)/W*w,(player.y+Math.sin(player.angle)*22)/H*h);mctx.strokeStyle='#f7f4df';mctx.lineWidth=1.5;mctx.stroke()}
  function collide(){const speed=Math.abs(player.speed);if(player.collisionCooldown>0)return;let hit=false;for(const c of traffic){if(Math.hypot(player.x-c.x,player.y-c.y)<25){const shove=Math.atan2(player.y-c.y,player.x-c.x);player.x+=Math.cos(shove)*11;player.y+=Math.sin(shove)*11;player.speed*=-.42;hit=true;break}}if(!hit){for(const c of parked)if(Math.hypot(player.x-c.x,player.y-c.y)<22){player.speed*=-.32;hit=true;break}}if(hit){player.damage=clamp(player.damage-Math.max(2,Math.round(speed/22)),0,100);player.stress=clamp(player.stress+Math.max(5,Math.round(speed/7)),0,100);player.collisionCooldown=.85;document.querySelector('.game-shell').classList.remove('shake');void document.querySelector('.game-shell').offsetWidth;document.querySelector('.game-shell').classList.add('shake');toast(['Dispatch: that was definitely not a loading bay.','Your bumper has filed a complaint.','HONK! Please stop using the road as a suggestion.'][Math.floor(rand()*3)],2200)} }
  function update(dt){if(!running||paused||finished)return;animation+=dt;gameMinutes+=dt*2.35;player.collisionCooldown=Math.max(0,player.collisionCooldown-dt);hornCooldown-=dt;
    const up=keys.w||keys.arrowup||keys.touchup,down=keys.s||keys.arrowdown||keys.touchdown,left=keys.a||keys.arrowleft||keys.touchleft,right=keys.d||keys.arrowright||keys.touchright,hand=keys[' '];
    const accel=player.damage<30?105:145, topSpeed=player.damage<20?115:177;
    if(up)player.speed+=accel*dt;else if(down)player.speed-=accel*.72*dt;else player.speed*=Math.pow(.985,dt*60);
    player.speed=clamp(player.speed,-74,topSpeed*(player.stress>85?.72:1));if(hand)player.speed*=Math.pow(.91,dt*60);
    const steering=(left?-1:0)+(right?1:0);if(steering)player.angle+=steering*dt*(1.9+Math.min(Math.abs(player.speed)/90,1.5))*(player.speed<0?-1:1);
    const prevX=player.x,prevY=player.y;player.x=clamp(player.x+Math.cos(player.angle)*player.speed*dt,12,W-12);player.y=clamp(player.y+Math.sin(player.angle)*player.speed*dt,12,H-12);
    const road=onRoad(player.x,player.y);if(!road){player.speed*=Math.pow(.93,dt*60);player.stress=clamp(player.stress+dt*.2,0,100)}
    // Pedestrians wander the pavements and occasionally dart across the lane.
    for(const p of people){p.turnIn-=dt;if(p.turnIn<=0){p.dir+=(rand()-.5)*1.8;p.turnIn=1.5+rand()*5}p.x=clamp(p.x+Math.cos(p.dir)*p.walkSpeed*dt,8,W-8);p.y=clamp(p.y+Math.sin(p.dir)*p.walkSpeed*dt,8,H-8);if(Math.hypot(player.x-p.x,player.y-p.y)<17&&Math.abs(player.speed)>28){player.stress=clamp(player.stress+dt*1.6,0,100);if(Math.hypot(prevX-p.x,prevY-p.y)>18)toast('Pedestrian: I have right of way! (probably.)',1300)}}
    for(const c of traffic){if(c.horizontal){c.x+=c.dir*c.speed*dt;c.y=c.lane+Math.sin(animation*1.8+c.x*.008)*c.swerve*11;if(c.x>W+50)c.x=-50;if(c.x<-50)c.x=W+50}else{c.y+=c.dir*c.speed*dt;c.x=c.lane+Math.sin(animation*1.8+c.y*.008)*c.swerve*11;if(c.y>H+50)c.y=-50;if(c.y<-50)c.y=H+50}}
    lastFine=Math.max(0,lastFine-dt);const deliveryZone=current()&&targetDistance()<105;if(Math.abs(player.speed)<3&&onRoad(player.x,player.y)&&!deliveryZone){parkedFor+=dt;if(parkedFor>=5&&lastFine===0){player.fines+=35;lastFine=18;parkedFor=0;toast('Parking warden: €35. “Just unloading” is not a legal category.',2600)}}else parkedFor=0;
    if(Math.abs(player.speed)>90&&traffic.some(c=>Math.hypot(player.x-c.x,player.y-c.y)<120)&&hornCooldown<0){if(rand()>.82){toast('BEEP BEEP! Someone is in a hurry. Everyone is in a hurry.',1500);hornCooldown=7}}
    collide();if(player.stress>=100){player.stress=97;player.speed*=.65;toast('Deep breaths. The parcel is not worth a stress leave.',2400)}
    if(gameMinutes>=1050&&packageIndex<8){gameMinutes=1050;if(!overtimeAnnounced){overtimeAnnounced=true;toast('Shift is over. Dispatch says: just one more stop.',3000)}}
    if(toastTimer>0){toastTimer-=dt*1000;if(toastTimer<=0)document.getElementById('toast').classList.add('fade')}
    updateHud();
  }
  let lastFrame=performance.now();function frame(now){const dt=Math.min(.04,(now-lastFrame)/1000);lastFrame=now;ctx.clearRect(0,0,innerWidth,innerHeight);drawWorld();update(dt);requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();
