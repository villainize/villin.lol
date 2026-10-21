// Free-moving, 150-piece jigsaws. Each group shares an offset from the solved image.
function puzzleGame() {
  const photos = puzzleScenes;
  const COLS=15, ROWS=10, SIZE=40, TOTAL=150;
  const WORLD={w:1600,h:900}, BOARD={x:500,y:250,w:600,h:400};
  let disposePlayer=()=>{};
  activeCleanup=()=>disposePlayer();
  function choosePicture() {
    disposePlayer();disposePlayer=()=>{};
    panel('GAME 01 · JIGSAW COLLECTION','All Our Pictures',`${photos.length} pictures. 150 pieces each. Pick a puzzle to start or continue.`,
      '<div class="jig-choices"></div><p class="jig-choice-note">Connect pieces anywhere on the table. Joined pieces move together, and each picture saves its own progress.</p>');
    photos.forEach((photo,index)=>{
      const button=document.createElement('button');button.className='jig-choice';button.type='button';
      const img=document.createElement('img');img.src=photo.src;img.alt=photo.name;
      const heading=document.createElement('strong');heading.textContent=photo.name;
      const meta=document.createElement('span');
      let saved=false,completed=false;
      try{const state=JSON.parse(localStorage.getItem(`grace-jigsaw-v2-${photo.src}`));saved=!!state;completed=!!state?.completed||!!state?.groups?.length&&state.groups.every(group=>group.locked);}catch{}
      button.classList.toggle('jig-choice-completed',completed);
      meta.textContent=completed?'Picture revealed \u00b7 Play again':`150 pieces \u00b7 ${saved?'Continue puzzle':'Start puzzle'}`;
      button.append(img,heading,meta);button.addEventListener('click',()=>play(index));
      content.querySelector('.jig-choices').append(button);
    });
  }
  function play(photoIndex) {
    disposePlayer();
    const photo=photos[photoIndex],saveKey=`grace-jigsaw-v2-${photo.src}`;
    panel('150-PIECE JIGSAW',photo.name,'Drag pieces together to connect them. Drag empty space to pan; scroll or pinch to zoom.',`
      <div class="jig-player">
        <div class="jig-toolbar">
          <button type="button" data-action="pictures">← Pictures</button>
          <button type="button" data-action="preview">Picture preview</button>
          <button type="button" data-action="edges" aria-pressed="false">Edges only</button>
          <button type="button" data-action="arrange">Arrange loose pieces</button>
          <button type="button" data-action="ghost" aria-pressed="false">Image guide</button>
          <span class="jig-toolbar-spacer"></span>
          <button type="button" data-action="minus" aria-label="Zoom out">−</button>
          <button type="button" data-action="fit">Fit</button>
          <button type="button" data-action="plus" aria-label="Zoom in">+</button>
          <button type="button" data-action="fullscreen">Full screen</button>
          <button type="button" data-action="pause" aria-label="Pause puzzle"><span class="jig-timer">0:00</span> · Pause</button>
        </div>
        <div class="jig-table"><canvas tabindex="0" aria-label="Jigsaw table. Drag pieces to connect. N selects a loose group, arrow keys move it, Enter snaps it, Escape deselects it. Scroll to zoom."></canvas><div class="jig-overlay" hidden><strong>Taking a little break</strong><button type="button" data-action="resume">Resume puzzle</button></div></div>
        <div class="jig-bottom"><span class="jig-progress">0 / 150 pieces placed</span><span class="jig-feedback" role="status">Loading your picture…</span><span class="jig-save">Progress saves on this browser</span></div>
        <details class="jig-options"><summary>More options</summary><button type="button" data-action="restart">Restart this puzzle</button><button type="button" data-action="complete">Auto-complete puzzle</button><p>Keyboard: N selects a loose group, arrows move it, Enter connects nearby pieces, Escape clears selection.</p></details>
        <div class="jig-complete" hidden><strong>Every piece belongs together.</strong><p>All 150 pieces connected. Happy birthday, Grace!</p><button type="button" data-action="credits">Read your birthday credits</button><button type="button" data-action="pictures">Choose another picture</button></div>
        <dialog class="jig-preview"><button type="button" data-action="close-preview">Close preview</button><img alt="Completed puzzle reference"></dialog>
      </div>`);
    const player=content.querySelector('.jig-player'),canvas=player.querySelector('canvas'),ctx=canvas.getContext('2d');
    const puzzleLetter=window.GraceLetterSettings.read().puzzleLetter;
    player.querySelector('.jig-complete strong').textContent=puzzleLetter.title;
    player.querySelector('.jig-complete p').textContent=puzzleLetter.text;
    player.querySelector('.jig-complete p').style.whiteSpace='pre-wrap';
    const wrap=player.querySelector('.jig-table'),feedback=player.querySelector('.jig-feedback');
    const preview=player.querySelector('.jig-preview'),overlay=player.querySelector('.jig-overlay');
    preview.querySelector('img').src=photo.src;
    const abort=new AbortController(),events={signal:abort.signal};
    const img=new Image(),pieces=[],groups=[];
    let alive=true,loaded=false,elapsed=0,paused=false,done=false,edgesOnly=false,ghost=false,selected=null;
    let view={scale:1,x:0,y:0},cw=1,ch=1,fitMode=true,drag=null,pinch=null,frame=0;
    const pointers=new Map();
    let seed=7919+photoIndex*313;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const vertical=Array.from({length:ROWS},()=>Array.from({length:COLS-1},()=>random()>.5?1:-1));
    const horizontal=Array.from({length:ROWS-1},()=>Array.from({length:COLS},()=>random()>.5?1:-1));
    function shape(edges) {
      const path=new Path2D();path.moveTo(0,0);
      const corners=[[0,0],[SIZE,0],[SIZE,SIZE],[0,SIZE],[0,0]];
      edges.forEach((sign,i)=>{
        const [ax,ay]=corners[i],[bx,by]=corners[i+1],dx=bx-ax,dy=by-ay;
        const p=(t,n)=>[ax+dx*t+dy*n*sign,ay+dy*t-dx*n*sign];
        if(sign){path.lineTo(...p(.35,0));path.bezierCurveTo(...p(.43,0),...p(.43,.06),...p(.39,.10));path.bezierCurveTo(...p(.30,.25),...p(.70,.25),...p(.61,.10));path.bezierCurveTo(...p(.57,.06),...p(.57,0),...p(.65,0));}
        path.lineTo(bx,by);
      });path.closePath();return path;
    }
    for(let id=0;id<TOTAL;id++){
      const r=Math.floor(id/COLS),c=id%COLS;
      pieces.push({id,r,c,edge:r===0||r===ROWS-1||c===0||c===COLS-1,path:shape([r?-horizontal[r-1][c]:0,c<COLS-1?vertical[r][c]:0,r<ROWS-1?horizontal[r][c]:0,c?-vertical[r][c-1]:0])});
    }
    function fresh(){groups.length=0;pieces.forEach(p=>groups.push({ids:[p.id],dx:0,dy:0,locked:false}));elapsed=0;done=false;selected=null;arrange(false);}
    function restore(){
      try{
        const state=JSON.parse(localStorage.getItem(saveKey));
        if(!state||!Array.isArray(state.groups))return false;
        const ids=state.groups.flatMap(g=>g.ids);
        if(ids.length!==TOTAL||new Set(ids).size!==TOTAL||ids.some(id=>!Number.isInteger(id)||id<0||id>=TOTAL)||state.groups.some(g=>!g.ids.length||!Number.isFinite(g.dx)||!Number.isFinite(g.dy)))return false;
        groups.push(...state.groups.map(g=>({ids:g.ids,dx:g.locked?0:g.dx,dy:g.locked?0:g.dy,locked:!!g.locked})));
        elapsed=Math.max(0,Number(state.elapsed)||0);done=groups.every(g=>g.locked);return true;
      }catch{return false;}
    }
    function save(){if(!loaded)return;try{localStorage.setItem(saveKey,JSON.stringify({groups,elapsed,completed:done||groups.every(g=>g.locked)}));player.querySelector('.jig-save').textContent='Saved on this browser';}catch{player.querySelector('.jig-save').textContent='Browser storage unavailable';}}
    function arrange(persist=true){
      const loose=groups.filter(g=>!g.locked&&g.ids.length===1);
      for(let i=loose.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[loose[i],loose[j]]=[loose[j],loose[i]];}
      loose.forEach((g,i)=>{const p=pieces[g.ids[0]],side=i%2,n=Math.floor(i/2),x=(side?1160:70)+(n%7)*54,y=150+Math.floor(n/7)*54;g.dx=x-BOARD.x-p.c*SIZE;g.dy=y-BOARD.y-p.r*SIZE;});
      if(persist){save();feedback.textContent='Loose pieces arranged on both sides. Connected groups stayed together.';}requestDraw();
    }
    const world=(x,y)=>({x:(x-view.x)/view.scale,y:(y-view.y)/view.scale});
    const local=e=>{const b=canvas.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top};};
    function requestDraw(){if(!frame&&alive)frame=requestAnimationFrame(()=>{frame=0;draw();});}
    function fit(){fitMode=true;view.scale=Math.min(cw/WORLD.w,ch/WORLD.h);view.x=(cw-WORLD.w*view.scale)/2;view.y=(ch-WORLD.h*view.scale)/2;requestDraw();}
    function zoom(factor,x=cw/2,y=ch/2){const p=world(x,y);view.scale=Math.max(Math.min(cw/WORLD.w,ch/WORLD.h)*.6,Math.min(3,view.scale*factor));view.x=x-p.x*view.scale;view.y=y-p.y*view.scale;fitMode=false;requestDraw();}
    function resize(){const dpr=Math.min(devicePixelRatio||1,2);cw=wrap.clientWidth;ch=wrap.clientHeight;canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);canvas.style.width=`${cw}px`;canvas.style.height=`${ch}px`;if(fitMode)fit();else requestDraw();}
    function visible(g){return !edgesOnly||g.locked||g.ids.some(id=>pieces[id].edge);}
    function draw(){
      const dpr=Math.min(devicePixelRatio||1,2);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);
      ctx.fillStyle='#f6f0ea';ctx.fillRect(0,0,cw,ch);ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);
      ctx.fillStyle='#fffdf9';ctx.fillRect(BOARD.x,BOARD.y,BOARD.w,BOARD.h);
      ctx.strokeStyle='#d8c8bb';ctx.lineWidth=1.5;ctx.strokeRect(BOARD.x,BOARD.y,BOARD.w,BOARD.h);
      if(!loaded)return;
      if(ghost){ctx.globalAlpha=.17;ctx.drawImage(img,BOARD.x,BOARD.y,BOARD.w,BOARD.h);ctx.globalAlpha=1;}
      for(const g of groups){if(!visible(g))continue;for(const id of g.ids){
        const p=pieces[id];ctx.save();ctx.translate(BOARD.x+p.c*SIZE+g.dx,BOARD.y+p.r*SIZE+g.dy);
        if(g.ids.length===1&&!g.locked){ctx.shadowColor='#45342b40';ctx.shadowBlur=3;ctx.shadowOffsetY=2;}
        ctx.fillStyle='#fffdf9';ctx.fill(p.path);ctx.shadowColor='transparent';ctx.shadowOffsetY=0;
        ctx.save();ctx.clip(p.path);ctx.drawImage(img,-p.c*SIZE,-p.r*SIZE,BOARD.w,BOARD.h);ctx.restore();
        ctx.strokeStyle=g===selected?'#b63768':(g.locked?'#ffffff30':'#ffffffb0');ctx.lineWidth=g===selected?1.7:.65;ctx.stroke(p.path);ctx.restore();
      }}
    }
    function hit(pos){for(let i=groups.length-1;i>=0;i--){const g=groups[i];if(g.locked||!visible(g))continue;for(const id of g.ids){const p=pieces[id],x=pos.x-BOARD.x-p.c*SIZE-g.dx,y=pos.y-BOARD.y-p.r*SIZE-g.dy;if(x>-12&&x<52&&y>-12&&y<52&&ctx.isPointInPath(p.path,x,y))return g;}}return null;}
    function adjacent(a,b){return a.ids.some(id=>b.ids.some(other=>Math.abs(pieces[id].c-pieces[other].c)+Math.abs(pieces[id].r-pieces[other].r)===1));}
    function snap(group){
      let connected=false;const tolerance=Math.min(24,Math.max(10,11/view.scale));
      if(Math.hypot(group.dx,group.dy)<tolerance){group.dx=0;group.dy=0;group.locked=true;connected=true;}
      let changed=true;
      while(changed){changed=false;for(const other of [...groups]){
        if(other===group||!adjacent(group,other)||Math.hypot(group.dx-other.dx,group.dy-other.dy)>tolerance)continue;
        if(!group.locked){group.dx=other.dx;group.dy=other.dy;}
        group.locked=group.locked||other.locked;if(group.locked){group.dx=0;group.dy=0;}
        group.ids.push(...other.ids);groups.splice(groups.indexOf(other),1);changed=true;connected=true;
      }}
      if(group.ids.length===TOTAL){group.dx=0;group.dy=0;group.locked=true;}
      if(connected)feedback.textContent=group.locked?'Connected to the picture!':`${group.ids.length} pieces connected. Drag them together as one group.`;
      else feedback.textContent='Move matching edges close together to connect them.';
      update();save();requestDraw();
    }
    function update(){
      const placed=groups.filter(g=>g.locked).reduce((n,g)=>n+g.ids.length,0);
      const joined=groups.filter(g=>g.ids.length>1).reduce((n,g)=>n+g.ids.length,0);
      player.querySelector('.jig-progress').textContent=`${placed} / 150 placed · ${joined} joined`;
      if(placed===TOTAL){done=true;edgesOnly=false;player.querySelector('.jig-complete').hidden=false;feedback.textContent='All 150 pieces connected!';}
      const timer=player.querySelector('[data-action="pause"]');timer.textContent=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')} · ${paused?'Resume':'Pause'}`;
    }
    function clampGroup(g){
      const xs=g.ids.map(id=>pieces[id].c*SIZE),ys=g.ids.map(id=>pieces[id].r*SIZE);
      g.dx=Math.max(-BOARD.x-Math.min(...xs),Math.min(WORLD.w-BOARD.x-Math.max(...xs)-SIZE,g.dx));
      g.dy=Math.max(-BOARD.y-Math.min(...ys),Math.min(WORLD.h-BOARD.y-Math.max(...ys)-SIZE,g.dy));
    }
    function endDrag(cancel=false){
      if(drag?.group){if(cancel){drag.group.dx=drag.dx;drag.group.dy=drag.dy;}else{clampGroup(drag.group);snap(drag.group);}}
      drag=null;canvas.classList.remove('dragging');requestDraw();
    }
    canvas.addEventListener('pointerdown',e=>{
      if(paused||!loaded||e.button>0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
      const p=local(e);pointers.set(e.pointerId,p);
      if(pointers.size===2){endDrag(true);const [a,b]=[...pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),scale:view.scale,anchor:world(mid.x,mid.y)};return;}
      const pos=world(p.x,p.y);ctx.save();ctx.resetTransform();selected=hit(pos);ctx.restore();
      if(selected){groups.splice(groups.indexOf(selected),1);groups.push(selected);drag={group:selected,dx:selected.dx,dy:selected.dy,start:pos};}
      else drag={pan:true,start:p,x:view.x,y:view.y};
      canvas.classList.add('dragging');requestDraw();
    },events);
    canvas.addEventListener('pointermove',e=>{
      if(!pointers.has(e.pointerId))return;const p=local(e);pointers.set(e.pointerId,p);
      if(pinch&&pointers.size===2){const[a,b]=[...pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};view.scale=Math.max(.15,Math.min(3,pinch.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance)));view.x=mid.x-pinch.anchor.x*view.scale;view.y=mid.y-pinch.anchor.y*view.scale;fitMode=false;requestDraw();return;}
      if(!drag)return;
      if(drag.pan){view.x=drag.x+p.x-drag.start.x;view.y=drag.y+p.y-drag.start.y;fitMode=false;}
      else{const pos=world(p.x,p.y);drag.group.dx=drag.dx+pos.x-drag.start.x;drag.group.dy=drag.dy+pos.y-drag.start.y;}
      requestDraw();
    },events);
    const release=e=>{pointers.delete(e.pointerId);if(pinch){pinch=null;drag=null;}else endDrag(e.type==='pointercancel');};
    canvas.addEventListener('pointerup',release,events);canvas.addEventListener('pointercancel',release,events);
    canvas.addEventListener('wheel',e=>{e.preventDefault();const p=local(e);zoom(Math.exp(-e.deltaY*.0015),p.x,p.y);},{...events,passive:false});
    canvas.addEventListener('keydown',e=>{
      if(e.key==='Escape'){selected=null;requestDraw();return;}
      if(paused||!loaded)return;
      if(e.key.toLowerCase()==='n'){const available=groups.filter(g=>!g.locked&&visible(g));selected=available[(available.indexOf(selected)+1)%available.length]||null;requestDraw();e.preventDefault();}
      if(selected&&!selected.locked){const step=e.shiftKey?30:6;if(e.key.startsWith('Arrow')){e.preventDefault();selected.dx+=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0;selected.dy+=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;clampGroup(selected);save();requestDraw();}if(e.key==='Enter'){e.preventDefault();snap(selected);}}
    },events);
    async function action(name){
      if(name==='pictures'){save();if(document.fullscreenElement===player)await document.exitFullscreen();choosePicture();return;}
      if(name==='preview'){preview.showModal();return;}if(name==='close-preview'){preview.close();return;}
      if(name==='plus')zoom(1.25);if(name==='minus')zoom(.8);if(name==='fit')fit();
      if(name==='edges'){edgesOnly=!edgesOnly;selected=null;player.querySelector('[data-action="edges"]').setAttribute('aria-pressed',edgesOnly);requestDraw();}
      if(name==='ghost'){ghost=!ghost;player.querySelector('[data-action="ghost"]').setAttribute('aria-pressed',ghost);requestDraw();}
      if(name==='arrange'&&loaded)arrange();
      if(name==='pause'||name==='resume'){paused=name==='resume'?false:!paused;overlay.hidden=!paused;update();save();}
      if(name==='fullscreen'){try{if(document.fullscreenElement===player)await document.exitFullscreen();else await player.requestFullscreen();}catch{feedback.textContent='Full screen is unavailable in this browser.';}}
      if(name==='restart'&&loaded&&confirm('Start this picture again? This resets its saved progress.')){fresh();paused=false;overlay.hidden=true;player.querySelector('.jig-complete').hidden=true;update();save();fit();}
      if(name==='complete'&&loaded){groups.length=0;groups.push({ids:pieces.map(p=>p.id),dx:0,dy:0,locked:true});selected=null;update();save();fit();}
      if(name==='credits'){save();if(document.fullscreenElement===player)await document.exitFullscreen();finishGame(puzzleLetter.title,puzzleLetter.text);}
    }
    player.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action),events));
    const observer=new ResizeObserver(resize);observer.observe(wrap);
    const timer=setInterval(()=>{if(loaded&&!paused&&!done&&!document.hidden&&!preview.open){elapsed++;update();if(elapsed%10===0)save();}},1000);
    window.addEventListener('pagehide',save,events);
    disposePlayer=()=>{if(!alive)return;endDrag(true);save();alive=false;clearInterval(timer);abort.abort();observer.disconnect();cancelAnimationFrame(frame);if(preview.open)preview.close();};
    img.onload=()=>{if(!alive)return;loaded=true;if(!restore())fresh();update();fit();feedback.textContent=done?'You have completed this picture.':'Drag matching pieces together, anywhere on the table.';};
    img.onerror=()=>{if(alive)feedback.textContent='This picture could not load. Choose another picture and try again.';};
    img.src=photo.src;
  }
  choosePicture();
}

if(location.hash==='#puzzle')startGame('puzzle');
