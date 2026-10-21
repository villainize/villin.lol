(() => {
  let selectedMap=window.GRACE_MAPS[0];
  let storageKey=selectedMap.key;
  const mapSelect=document.querySelector('#dev-map-select');
  for(const map of window.GRACE_MAPS){const option=document.createElement('option');option.value=map.id;option.textContent=map.name;mapSelect.append(option);}
  const types={fact:{name:'Cute Fact',icon:'♡',className:'fact-icon'},surprise:{name:'Surprise',icon:'?',className:'surprise-icon'},event:{name:'Event',icon:'☆',className:'event-icon'}};
  const dateDefaults=window.GRACE_DATE_CARD;
  const deckContainer=document.querySelector('#deck-sections');
  let config=readConfig();

  function defaults(){return {...selectedMap.defaults(),name:selectedMap.name,reward:selectedMap.reward||'Every step was made with love for you, Grace.'};}
  function readConfig(){
    const fresh=defaults();
    try{
      const stored=JSON.parse(localStorage.getItem(storageKey));
      if(!stored||typeof stored!=='object')return fresh;
      if(typeof stored.name==='string')fresh.name=stored.name;
      if(typeof stored.reward==='string')fresh.reward=stored.reward;
      if(typeof stored.date?.title==='string'&&typeof stored.date?.text==='string')fresh.date={...fresh.date,...stored.date,hearts:2,secretLetter:true};
      for(const type of Object.keys(types))if(Array.isArray(stored.decks?.[type])&&stored.decks[type].length)fresh.decks[type]=stored.decks[type].map(card=>({...card}));
      // Older versions saved only each deck's message text.
      for(const type of Object.keys(types))if(Array.isArray(stored[type])&&stored[type].every(text=>typeof text==='string'))fresh.decks[type]=stored[type].map((text,i)=>({...fresh.decks[type][i%fresh.decks[type].length],text}));
      return fresh;
    }catch{return fresh;}
  }
  function makeSection(type,cards){
    const meta=types[type],section=document.createElement('section');
    section.className='dev-section';section.dataset.deckSection=type;
    section.innerHTML=`<div class="dev-section-heading"><span class="dev-deck-icon ${meta.className}">${meta.icon}</span><div><p class="eyebrow">${meta.name.toUpperCase()} DECK</p><h2>${meta.name} cards</h2><p>Edit every card. Bonus hearts and spaces are awarded when Grace keeps a card.</p></div></div><div class="dev-card-list"></div><button type="button" class="add-card">+ Add a ${meta.name.toLowerCase()} card</button>`;
    const list=section.querySelector('.dev-card-list');cards.forEach((card,index)=>list.append(makeCard(type,card,index)));
    section.querySelector('.add-card').addEventListener('click',()=>list.append(makeCard(type,{title:'A little birthday note',text:'Write a kind note for Grace here.',hearts:1,move:0},list.children.length)));
    return section;
  }
  function makeCard(type,card,index){
    const article=document.createElement('article');article.className='dev-card-editor';article.dataset.index=index;
    const title=document.createElement('h3');title.textContent=`${types[type].name} ${index+1}`;article.append(title);
    const remove=document.createElement('button');remove.type='button';remove.className='remove-card';remove.textContent='Remove card';remove.addEventListener('click',()=>article.remove());article.append(remove);
    const grid=document.createElement('div');grid.className='dev-card-grid';
    grid.innerHTML='<label class="title-field">Card title<input data-property="title" type="text" maxlength="120"></label><label>Hearts<input data-property="hearts" type="number" min="0" max="20" step="1"></label><label>Bonus spaces<input data-property="move" type="number" min="0" max="12" step="1"></label><label class="message-field">Card message<textarea data-property="text" rows="4" maxlength="4000"></textarea></label><label class="picture-field">Optional picture path<input data-property="image" type="text" placeholder="images/puzzles/birthday-cake.svg"></label>';
    grid.querySelector('[data-property=title]').value=card.title||'';
    grid.querySelector('[data-property=hearts]').value=Number(card.hearts)||0;
    grid.querySelector('[data-property=move]').value=Number(card.move)||0;
    grid.querySelector('[data-property=text]').value=card.text||'';
    grid.querySelector('[data-property=image]').value=card.image||'';
    article.append(grid);return article;
  }
  function render(){
    document.querySelector('#dev-map-name').value=config.name;
    document.querySelector('#dev-map-reward').value=config.reward;
    document.querySelector('#dev-date-section').hidden=selectedMap.id!=='blossom';
    deckContainer.replaceChildren();
    for(const [type,cards] of Object.entries(config.decks))deckContainer.append(makeSection(type,cards));
    document.querySelector('#date-title').value=config.date.title||'';
    document.querySelector('#date-text').value=config.date.text||'';
  }
  function readSection(type){
    const rows=[...deckContainer.querySelector(`[data-deck-section="${type}"] .dev-card-list`).children];
    return rows.map(row=>{
      const get=property=>row.querySelector(`[data-property="${property}"]`).value.trim();
      const hearts=Math.max(0,Math.min(20,Number(row.querySelector('[data-property=hearts]').value)||0));
      const move=Math.max(0,Math.min(12,Number(row.querySelector('[data-property=move]').value)||0));
      return {title:get('title')||`A little ${types[type].name.toLowerCase()} note`,text:get('text'),hearts,move,...(get('image')?{image:get('image')}:{})};
    });
  }
  function save(){
    let letterConfig;
    try{letterConfig=window.GraceLetterEditor.collect();}catch(error){showStatus(error.message);return;}
    const next={date:{title:document.querySelector('#date-title').value.trim()||'A little letter just for you',text:document.querySelector('#date-text').value.trim(),hearts:2,secretLetter:true},decks:{}};
    for(const type of Object.keys(types)){
      next.decks[type]=readSection(type);
      if(!next.decks[type].length){showStatus(`Keep at least one ${types[type].name} card in its deck.`);return;}
      if(next.decks[type].some(card=>!card.text)){showStatus(`Add a message to every ${types[type].name} card before saving.`);return;}
    }
    if(!next.date.text){showStatus('Write a few words in the Date space letter before saving.');return;}
    next.name=document.querySelector('#dev-map-name').value.trim()||selectedMap.name;
    next.reward=document.querySelector('#dev-map-reward').value.trim()||selectedMap.reward||'Happy birthday, Grace!';
    try{localStorage.setItem(storageKey,JSON.stringify(next));localStorage.setItem(window.GraceLetterSettings.key,JSON.stringify(letterConfig));config=next;showStatus(`Saved ${next.name}, letters, and quiz questions! Reopen the game to see your changes.`);return true;}
    catch{showStatus('This browser could not save changes. Try opening the site in Chrome or Edge.');}
  }
  function showStatus(text){for(const id of ['save-status','save-status-bottom'])document.querySelector(`#${id}`).textContent=text;}
  document.querySelector('#save-all').addEventListener('click',save);
  mapSelect.addEventListener('change',()=>{
    const nextId=mapSelect.value;
    if(!save()){mapSelect.value=selectedMap.id;return;}
    selectedMap=window.GRACE_MAPS.find(map=>map.id===nextId);storageKey=selectedMap.key;config=readConfig();render();
  });
  document.querySelector('#save-bottom').addEventListener('click',save);
  document.querySelector('#reset-all').addEventListener('click',()=>{
    for(const map of window.GRACE_MAPS)localStorage.removeItem(map.key);localStorage.removeItem(window.GraceLetterSettings.key);config=defaults();render();window.GraceLetterEditor.render();showStatus('All map samples, letters, and quiz questions restored.');
  });
  render();
})();
