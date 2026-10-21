/* The supplied illustration is the board. Positions below are measured in
   its original 1312 x 1199 coordinates, so the artwork and controls scale together. */
const GRACE_ART = 'images/board/birthday-table.png';
const GRACE_NODES = {
  start: { x:240,y:80,w:155,h:110,type:'start',next:['topPaw','leftHeart'],routes:['Lantern trail','Blossom trail'] },
  topPaw: { x:380,y:60,w:88,h:76,type:'paw',next:['topFlower'] },
  topFlower: { x:478,y:60,w:88,h:76,type:'flower',next:['topEvent','gardenFlower'],routes:['Stay by the lanterns','Take the garden path'] },
  topEvent: { x:576,y:60,w:92,h:76,type:'event',next:['topHeart'] },
  topHeart: { x:675,y:60,w:92,h:76,type:'heart',next:['topFact'] },
  topFact: { x:774,y:60,w:92,h:76,type:'fact',next:['topPawTwo'] },
  topPawTwo: { x:870,y:60,w:88,h:76,type:'paw',next:['topFlowerTwo','innerSurprise'],routes:['Visit the date space','Take the inner shortcut'] },
  topFlowerTwo: { x:963,y:60,w:88,h:76,type:'flower',next:['date'] },
  date: { x:1095,y:80,w:152,h:112,type:'date',next:['rightPaw'] },
  rightPaw: { x:1132,y:180,w:104,h:78,type:'paw',next:['rightEvent'] },
  rightEvent: { x:1154,y:275,w:110,h:94,type:'event',next:['rightHeart'] },
  rightHeart: { x:1174,y:365,w:110,h:80,type:'heart',next:['rightPawTwo'] },
  rightPawTwo: { x:1195,y:465,w:110,h:90,type:'paw',next:['rightFlower'] },
  rightFlower: { x:1217,y:555,w:115,h:70,type:'flower',next:['goal'] },
  goal: { x:1190,y:650,w:190,h:130,type:'goal',next:[] },
  bottomFlower: { x:1015,y:640,w:115,h:108,type:'flower',next:['goal'] },
  bottomHeart: { x:890,y:640,w:115,h:108,type:'heart',next:['bottomFlower'] },
  bottomPaw: { x:764,y:640,w:115,h:108,type:'paw',next:['bottomHeart'] },
  bottomFact: { x:638,y:640,w:115,h:108,type:'fact',next:['bottomPaw'] },
  bottomFlowerTwo: { x:511,y:640,w:110,h:108,type:'flower',next:['bottomFact'] },
  bottomSurprise: { x:370,y:620,w:140,h:138,type:'surprise',next:['bottomFlowerTwo'] },
  bottomPawTwo: { x:237,y:630,w:115,h:100,type:'paw',next:['bottomSurprise'] },
  leftBottomHeart: { x:88,y:670,w:128,h:85,type:'heart',next:['bottomPawTwo'] },
  leftEvent: { x:117,y:565,w:125,h:100,type:'event',next:['leftBottomHeart'] },
  leftFlower: { x:139,y:461,w:115,h:95,type:'flower',next:['leftEvent'] },
  leftPaw: { x:160,y:365,w:105,h:80,type:'paw',next:['leftFlower'] },
  leftTopEvent: { x:180,y:270,w:105,h:90,type:'event',next:['leftPaw','bridgeFlower'],routes:['Stay on the blossom trail','Take the garden shortcut'] },
  leftHeart: { x:198,y:180,w:110,h:75,type:'heart',next:['leftTopEvent'] },
  gardenFlower: { x:512,y:135,w:90,h:65,type:'flower',next:['gardenFact'] },
  gardenFact: { x:412,y:135,w:90,h:65,type:'fact',next:['gardenHeart'] },
  gardenHeart: { x:400,y:215,w:95,h:75,type:'heart',next:['gardenFlowerTwo'] },
  gardenFlowerTwo: { x:390,y:298,w:100,h:70,type:'flower',next:['gardenSurprise'] },
  gardenSurprise: { x:380,y:385,w:108,h:85,type:'surprise',next:['gardenHeartTwo'] },
  gardenHeartTwo: { x:370,y:485,w:110,h:100,type:'heart',next:['bottomSurprise'] },
  bridgeFlower: { x:280,y:328,w:105,h:85,type:'flower',next:['gardenFlowerTwo'] },
  innerSurprise: { x:875,y:140,w:98,h:70,type:'surprise',next:['innerHeart'] },
  innerHeart: { x:935,y:220,w:105,h:78,type:'heart',next:['innerFact'] },
  innerFact: { x:945,y:312,w:105,h:85,type:'fact',next:['innerFlower'] },
  innerFlower: { x:955,y:415,w:108,h:90,type:'flower',next:['innerEvent'] },
  innerEvent: { x:973,y:523,w:108,h:95,type:'event',next:['bottomFlower'] }
};
const GRACE_CROPS = {
  fact: [354,765,260,260], surprise: [634,765,254,260], event: [898,765,274,260],
  dieOne: [350,1022,139,145], dieTwo: [491,1031,132,136], date: [1005,8,191,140]
};

function graceArtCrop(kind, className = '') {
  const box = GRACE_CROPS[kind];
  return `<svg class="${className}" viewBox="${box.join(' ')}" aria-hidden="true" focusable="false"><image href="${GRACE_ART}" width="1312" height="1199" /></svg>`;
}

function pathGame(mapId) {
  if(!mapId){
    panel('GAME 02', 'Choose your birthday adventure', 'Three worlds, each with its own sweet messages and rewards.', '<div class="board-map-picker"></div>');
    for(const map of window.GRACE_MAPS){
      let title=map.name;try{title=JSON.parse(localStorage.getItem(map.key))?.name||title;}catch{}
      const button=document.createElement('button');button.className='board-map-choice';button.type='button';
      const image=document.createElement('img');image.src=map.art;image.alt=title;
      const label=document.createElement('strong');label.textContent=title;
      button.append(image,label);button.addEventListener('click',()=>pathGame(map.id));content.querySelector('.board-map-picker').append(button);
    }
    return;
  }
  const map=window.GRACE_MAPS.find(m=>m.id===mapId)||window.GRACE_MAPS[0];
  const boardWidth=map.width,boardHeight=map.height;
  const nodes=map.nodes||GRACE_NODES,crops=map.crops||GRACE_CROPS,art=map.art;
  let mapName=map.name,finishMessage=map.reward||'Every step was made with love for you, Grace.';
  function graceArtCrop(kind,className=''){
    const box=crops[kind];
    return `<svg class="${className}" viewBox="${box.join(' ')}" aria-hidden="true"><image href="${art}" width="${boardWidth}" height="${boardHeight}" /></svg>`;
  }
  const labels = { fact:'Cute Fact', surprise:'Surprise', event:'Event', paw:'Memory', flower:'Cherry blossom', heart:'Heart', date:'Date', start:'Start', goal:'Goal' };
  if(map.id!=='blossom')labels.flower=map.id==='concert'?'Music':'Ocean breeze';
  const storageKey = map.key;
  let decks = map.defaults().decks;
  let dateCard = {...window.GRACE_DATE_CARD};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if(typeof saved?.name==='string')mapName=saved.name;
    if(typeof saved?.reward==='string')finishMessage=saved.reward;
    if (Array.isArray(saved?.decks?.fact) && Array.isArray(saved?.decks?.surprise) && Array.isArray(saved?.decks?.event)) decks = {...decks,...saved.decks};
    if (typeof saved?.date?.title === 'string' && typeof saved?.date?.text === 'string') dateCard = {...dateCard,...saved.date,hearts:2,secretLetter:true};
    for (const kind of ['fact','surprise','event']) {
      if (Array.isArray(saved?.[kind]) && saved[kind].length && saved[kind].every(text => typeof text === 'string' && text.trim())) {
        decks[kind] = saved[kind].map((text,i) => ({ ...decks[kind][i % decks[kind].length], text }));
      }
    }
  } catch { /* File mode or private browsing may not allow saved settings. */ }

  panel('GAME 02 · YOUR BIRTHDAY BOARD', 'Grace’s Birthday Adventure',
    'Roll a die, explore your chosen map, and collect its special birthday messages.', `
    <div class="art-game">
      <div class="art-status"><span id="art-location">START</span><span><b id="art-hearts">0</b> hearts · <b id="art-cards">0</b> cards</span><span id="art-roll">Your adventure starts here</span></div>
      <div class="art-table" aria-label="Birthday board game" style="aspect-ratio:${boardWidth}/${boardHeight};--board-ratio:${boardWidth/boardHeight}">
        <img class="art-table-image" src="${art}" width="${boardWidth}" height="${boardHeight}" alt="Birthday adventure map with card decks and dice." draggable="false">
        <svg class="art-route-overlay" viewBox="0 0 ${boardWidth} ${boardHeight}" preserveAspectRatio="none" aria-hidden="true"></svg>
        <div class="art-tile-targets"></div>
        <div class="art-pawn" aria-label="Grace's current position"><img src="${map.pawn||'images/board/grace-pawn.png'}" alt="${map.pawnAlt||'Grace\'s illustrated game piece'}" draggable="false"><span>GRACE</span></div>
        ${['fact','surprise','event'].map(kind => `<button type="button" class="art-deck art-hit" data-deck="${kind}" disabled aria-label="Draw a ${labels[kind]} card"><span>Draw ${labels[kind]}</span></button>`).join('')}
        <button type="button" class="art-die art-hit" data-die="dieOne" aria-label="Roll the first die">${graceArtCrop('dieOne')}<span class="art-die-result" hidden></span></button>
        <button type="button" class="art-die art-hit" data-die="dieTwo" aria-label="Roll the second die">${graceArtCrop('dieTwo')}<span class="art-die-result" hidden></span></button>
        <div class="art-gems ${map.tokens?'art-map-tokens':''}" aria-hidden="true">${Array.from({length:map.tokens?.length||5},()=>'<span></span>').join('')}</div>
      </div>
      <div class="art-turn-panel"><p id="art-message" role="status">Click either die below the card decks, or use the roll button.</p><div id="art-actions"></div></div>
      <details class="art-collection"><summary>Your collected cards <span id="art-collection-count">(0)</span></summary><div id="art-keepsakes">Your notes and pictures will appear here.</div></details>
      <details class="art-editor"><summary>Write your messages</summary><p>Replace the sample messages with your own. Separate cards with a blank line.</p>
        ${['fact','surprise','event'].map(kind=>`<label>${labels[kind]} cards<textarea data-edit-deck="${kind}" rows="6"></textarea></label>`).join('')}
        <button type="button" class="button soft-button" id="art-save-messages">Save messages</button><p id="art-save-status" role="status"></p>
      </details>
      <dialog class="art-card-dialog" aria-labelledby="art-card-title"><div class="art-card-layout"><div id="art-card-art"></div><div class="art-card-copy"><p id="art-card-kind"></p><h3 id="art-card-title"></h3><p id="art-card-text"></p><img id="art-card-picture" alt="A picture collected on the birthday trail" hidden><p id="art-card-reward"></p><button type="button" class="button primary" id="art-card-continue">Keep this card</button></div></div></dialog>
    </div>`);

  content.querySelector('.game-panel h2').textContent=mapName;
  const game = content.querySelector('.art-game');
  const switchMap=document.createElement('button');switchMap.type='button';switchMap.className='button soft-button';switchMap.textContent='Choose another map';
  switchMap.addEventListener('click',()=>{activeCleanup();pathGame();});game.querySelector('.art-status').append(switchMap);
  const $ = selector => game.querySelector(selector);
  const table = $('.art-table');
  const pawn = $('.art-pawn');
  const actions = $('#art-actions');
  const message = $('#art-message');
  const dialog = $('.art-card-dialog');
  const tiles = new Map();
  const timers = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const counts = {fact:0,surprise:0,event:0};
  const history = [];
  let alive = true, phase = 'ready', position = 'start', hearts = 0, pendingDeck = null;
  let chooseRoute = null, acknowledgeCard = null;

  function delay(ms) {
    return new Promise(resolve => {
      if (!alive) return resolve(false);
      const timer = setTimeout(() => { timers.delete(timer); resolve(alive); }, reducedMotion ? Math.min(ms,50) : ms);
      timers.set(timer,resolve);
    });
  }
  activeCleanup = () => {
    alive = false;
    for (const [timer,resolve] of timers) { clearTimeout(timer); resolve(false); }
    timers.clear();
    chooseRoute?.(null); chooseRoute = null;
    acknowledgeCard?.(false); acknowledgeCard = null;
    if (dialog.open) dialog.close();
  };

  function setBox(el,x,y,w,h) {
    Object.assign(el.style,{left:`${x/boardWidth*100}%`,top:`${y/boardHeight*100}%`,width:`${w/boardWidth*100}%`,height:`${h/boardHeight*100}%`});
  }
  if(map.tokens)game.querySelectorAll('.art-gems span').forEach((token,i)=>setBox(token,...map.tokens[i]));
  for (const [id,node] of Object.entries(nodes)) {
    const button = document.createElement('button');
    button.type='button'; button.className='art-tile'; button.disabled=true;
    button.dataset.space=id; button.setAttribute('aria-label',labels[node.type]);
    setBox(button,node.x-node.w/2,node.y-node.h/2,node.w,node.h);
    button.addEventListener('click',()=> {
      if (phase==='choice' && nodes[position].next.includes(id)) selectRoute(id);
    });
    $('.art-tile-targets').append(button); tiles.set(id,button);
  }
  for (const kind of ['fact','surprise','event']) {
    setBox($(`[data-deck="${kind}"]`),...crops[kind]);
    $(`[data-deck="${kind}"]`).addEventListener('click',()=>drawDeck(kind));
  }
  for (const kind of ['dieOne','dieTwo']) {
    setBox($(`[data-die="${kind}"]`),...crops[kind]);
    $(`[data-die="${kind}"]`).addEventListener('click',()=>roll(kind));
  }

  function setPhase(next) {
    phase=next;
    game.dataset.phase=next;
    game.querySelectorAll('[data-die]').forEach(el=>el.disabled=next!=='ready');
    game.querySelectorAll('[data-deck]').forEach(el=>{
      const waiting=next==='card' && el.dataset.deck===pendingDeck;
      el.disabled=!waiting; el.classList.toggle('waiting',waiting);
    });
  }
  function button(label,callback,primary=true) {
    const el=document.createElement('button'); el.type='button';
    el.className=`button ${primary?'primary':'soft-button'}`; el.textContent=label;
    el.addEventListener('click',callback); actions.append(el); return el;
  }
  function updatePosition() {
    const node=nodes[position];
    pawn.style.width=map.pawnWidth?`${map.pawnWidth}%`:(node.y<120?'4.8%':'5.8%');
    pawn.style.left=`${node.x/boardWidth*100}%`;
    pawn.style.top=`${Math.max(45,node.y+node.h*.32)/boardHeight*100}%`;
    pawn.setAttribute('aria-label',`Grace is on ${labels[node.type]}`);
    tiles.forEach((el,id)=>el.classList.toggle('current',id===position));
    $('#art-location').textContent=labels[node.type].toUpperCase();
  }
  function gainHearts(amount) {
    hearts+=amount || 0;
    $('#art-hearts').textContent=hearts;
    game.querySelectorAll('.art-gems span').forEach((el,i)=>el.classList.toggle('earned',i<hearts));
  }
  function ready(text) {
    if (!alive) return;
    setPhase('ready'); actions.replaceChildren();
    if (text) message.textContent=text;
    button('Roll a die',()=>roll('dieOne'));
  }
  function selectRoute(id) {
    if (phase!=='choice' || !chooseRoute) return;
    const resolve=chooseRoute; chooseRoute=null;
    tiles.forEach(el=>{el.classList.remove('route-choice');el.disabled=true;});
    $('.art-route-overlay').replaceChildren();
    setPhase('moving'); actions.replaceChildren(); resolve(id);
  }
  async function walk(steps) {
    setPhase('moving'); actions.replaceChildren();
    while (alive && steps>0 && position!=='goal') {
      const node=nodes[position];
      let next=node.next[0];
      if (node.next.length>1) {
        pawn.classList.remove('walking'); setPhase('choice');
        message.textContent=`Choose your path. ${steps} ${steps===1?'step':'steps'} left on this roll.`;
        actions.replaceChildren();
        const routePromise=new Promise(resolve=>chooseRoute=resolve);
        node.next.forEach((id,i)=>{
          const target=nodes[id];
          const el=tiles.get(id); el.disabled=false;el.classList.add('route-choice');
          el.setAttribute('aria-label',node.routes[i]);
          button(node.routes[i],()=>selectRoute(id),i===0);
          const path=document.createElementNS('http://www.w3.org/2000/svg','path');
          path.setAttribute('d',`M ${node.x} ${node.y} L ${target.x} ${target.y}`);
          $('.art-route-overlay').append(path);
        });
        next=await routePromise;
        if (!alive || !next) return false;
      }
      pawn.classList.add('walking');
      position=next;steps--; updatePosition();
      message.textContent=`Grace is moving to ${labels[nodes[position].type]}...`;
      if (!await delay(440)) return false;
    }
    pawn.classList.remove('walking'); return alive;
  }
  async function roll(dieName) {
    if (!alive || phase!=='ready') return;
    setPhase('rolling'); actions.replaceChildren();
    game.querySelectorAll('.art-die-result').forEach(el=>el.hidden=true);
    const die=$(`[data-die="${dieName}"]`);die.classList.add('rolling');
    message.textContent='Rolling the die...';
    if (!await delay(650)) return;
    die.classList.remove('rolling');
    const value=1+Math.floor(Math.random()*6);
    const result=die.querySelector('.art-die-result');result.textContent=value;result.hidden=false;
    $('#art-roll').textContent=`Rolled ${value}`;
    if (await walk(value)) await land();
  }
  async function land() {
    if (!alive) return;
    const type=nodes[position].type;
    if (type==='goal') {
      setPhase('finished');actions.replaceChildren();
      message.textContent=`${finishMessage} You collected ${hearts} hearts and ${history.length} cards.`;
      button('Explore another map',()=>{activeCleanup();pathGame();},false);
      button('Read your birthday credits',()=>finishGame('Birthday adventure complete!',`You reached the goal with ${hearts} hearts and ${history.length} cards. ${finishMessage}`));
      return;
    }
    if (['fact','surprise','event'].includes(type)) {
      pendingDeck=type;setPhase('card');actions.replaceChildren();
      message.textContent=`You landed on ${labels[type]}. Tap the glowing ${labels[type]} deck to draw your card.`;
      button(`Draw ${labels[type]} card`,()=>drawDeck(type)); return;
    }
    if (type==='heart') { gainHearts(1); ready('A little love along the way. You collected a heart!'); return; }
    if (type==='date') {
      await showCard(dateCard,'date');
      if (alive) ready('Two hearts collected on the date space. Ready for the next step?');return;
    }
    if (type==='paw') {
      const images=['images/puzzles/garden-flowers.svg','images/puzzles/birthday-cake.svg','images/puzzles/party-balloons.svg'];
      await showCard({title:'A little memory to keep',text:map.id==='blossom'?'A picture for your birthday collection. I hope we make so many more happy memories together.':decks.fact[counts.fact++ % decks.fact.length].text,hearts:1,image:images[history.length%images.length]},'memory');
      if (alive) ready('A picture and a heart added to your collection. Roll when you are ready.');return;
    }
    ready(map.rest||'A peaceful stop under the cherry blossoms. Roll again when you are ready.');
  }
  async function drawDeck(kind) {
    if (!alive || phase!=='card' || pendingDeck!==kind) return;
    pendingDeck=null;setPhase('reading');actions.replaceChildren();
    const card=decks[kind][counts[kind]++ % decks[kind].length];
    if (!await showCard(card,kind)) return;
    if (card.move) { if (await walk(card.move)) await land(); }
    else ready('Your card is saved in your collection. Ready for another roll?');
  }
  async function showCard(card,kind) {
    setPhase('reading');actions.replaceChildren();
    $('#art-card-art').innerHTML=graceArtCrop(crops[kind]?kind:'fact',kind==='date'?'art-date-card':'');
    $('#art-card-kind').textContent=labels[kind] || 'A BIRTHDAY MEMORY';
    $('#art-card-title').textContent=card.title;
    $('#art-card-text').textContent=card.text;
    const picture=$('#art-card-picture');picture.hidden=!card.image;
    if (card.image) picture.src=card.image; else picture.removeAttribute('src');
    $('#art-card-reward').textContent=[card.hearts?`+${card.hearts} ${card.hearts===1?'heart':'hearts'}`:'',card.move?`Move ahead ${card.move} spaces`:''].filter(Boolean).join(' · ');
    dialog.dataset.kind=kind;
    const promise=new Promise(resolve=>acknowledgeCard=resolve);
    dialog.showModal();$('#art-card-continue').focus();
    if (!await promise || !alive) return false;
    gainHearts(card.hearts);history.push({...card,kind});
    $('#art-cards').textContent=history.length;$('#art-collection-count').textContent=`(${history.length})`;
    const list=$('#art-keepsakes');if (history.length===1) list.replaceChildren();
    const item=document.createElement('article');const heading=document.createElement('strong');const text=document.createElement('p');
    heading.textContent=card.title;text.textContent=card.text;item.append(heading,text);
    if(card.image){const img=document.createElement('img');img.src=card.image;img.alt=card.title;item.append(img);}
    list.append(item);return true;
  }
  function closeCard() {
    if (!acknowledgeCard) return;
    const resolve=acknowledgeCard;acknowledgeCard=null;dialog.close();resolve(true);
  }
  $('#art-card-continue').addEventListener('click',closeCard);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeCard();});
  for(const kind of ['fact','surprise','event']) $(`[data-edit-deck="${kind}"]`).value=decks[kind].map(card=>card.text).join('\n\n');
  $('#art-save-messages').addEventListener('click',()=>{
    const saved={};
    for(const kind of ['fact','surprise','event']) {
      const texts=$(`[data-edit-deck="${kind}"]`).value.split(/\n\s*\n/).map(text=>text.trim()).filter(Boolean);
      if (!texts.length) {$('#art-save-status').textContent=`Please add at least one ${labels[kind]} message.`;return;}
      saved[kind]=texts;
    }
    for(const kind of ['fact','surprise','event']) decks[kind]=saved[kind].map((text,i)=>({...decks[kind][i%decks[kind].length],text}));
    const completeSettings={name:mapName,reward:finishMessage,date:{...dateCard,hearts:2,secretLetter:true},decks:{}};
    for(const kind of ['fact','surprise','event']) completeSettings.decks[kind]=saved[kind].map((text,i)=>({...decks[kind][i%decks[kind].length],text}));
    try{localStorage.setItem(storageKey,JSON.stringify(completeSettings));$('#art-save-status').textContent='Saved on this browser. Your next card will use these messages.';}
    catch{$('#art-save-status').textContent='Messages updated for this game. This browser could not save them for next time.';}
  });
  updatePosition();gainHearts(0);ready();
}

// Convenient local link for opening this game directly.
if (location.hash === '#board') startGame('path');
