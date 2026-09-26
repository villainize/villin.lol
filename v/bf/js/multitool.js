(() => {
  const labels = {bursts:'Bursts', 'leader-skills':'Leader Skills', missions:'Missions', dictionary:'Dictionary', squads:'Squads', compare:'Compare', 'spark-simulator':'Spark Simulator'};
  const panel = document.querySelector('#multitool-view');
  const cache = new Map();
  let revision = 0;
  const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
  const button = (text, action) => { const node=el('button',text,'mini-action'); node.type='button'; node.addEventListener('click',action); return node; };
  const select = (label, options) => { const wrap=el('label',undefined,'select-field wide-field'); wrap.append(el('span',label)); const input=el('select'); options.forEach(([value,text])=>input.append(new Option(text,value))); wrap.append(input); return [wrap,input]; };
  async function json(url) { if (!cache.has(url)) { const pending=fetch(url).then(r=>{if(!r.ok) throw new Error('Unable to load '+url); return r.json();}).catch(e=>{cache.delete(url);throw e;}); cache.set(url,pending); } return cache.get(url); }
  function error(message) { panel.append(el('p',message,'result-note')); }
  function rawDetails(raw) { const details=el('details',undefined,'raw-details'); details.append(el('summary','Source data'),el('pre',JSON.stringify(raw,null,2),'raw-json')); return details; }
  function listBlock(title, values) {
    const section=el('section',undefined,'item-detail-section'); section.append(el('h4',title));
    const list=el('ul'); (values || []).forEach(value=>list.append(el('li',value))); section.append(list); return section;
  }
  function missionSummary(record) {
    const raw=record.raw || record;
    const grid=el('div',undefined,'detail-card-grid');
    [['Area',record.area || raw.area],['Dungeon',record.dungeon || raw.dungeon],['Energy',raw.energy_use],['Battles',raw.battle_count],['EXP',raw.xp],['Zel',raw.zel],['Karma',raw.karma],['Difficulty',raw.difficulty],['Requires',raw.requires]].forEach(([label,value])=>{if(value!==undefined&&value!==''){const card=el('article',undefined,'info-card');card.append(el('h4',label),el('p',String(value)));grid.append(card);}});
    return grid;
  }
  function showMissionRecord(record, host, wiki) {
    const raw=record.raw || record; const zone=wiki[(record.dungeon || raw.dungeon || '').trim().toLowerCase()];
    const quest=zone?.quests?.find(entry=>entry.name.toLowerCase()===String(record.name || raw.name).toLowerCase());
    host.replaceChildren(el('h3',record.name || raw.name),el('p',record.desc || raw.desc,'pre-line'),missionSummary(record));
    if (quest) {
      const section=el('section',undefined,'item-detail-section'); section.append(el('h4','Wiki quest details'));
      const stats=el('div',undefined,'detail-card-grid'); [['Energy',quest.energy],['Battles',quest.battles],['EXP',quest.exp],['EXP / Energy',quest.expPerEnergy]].forEach(([label,value])=>{const card=el('article',undefined,'info-card');card.append(el('h4',label),el('p',value || 'Not listed'));stats.append(card);}); section.append(stats);
      quest.bosses.forEach(boss=>{const unit=window.BFDB_DATA.units.find(entry=>String(entry.id)===String(boss.id)&&entry.server==='GL'); const bossName=unit?.name || boss.name || `Unit ${boss.id}`; section.append(el('p',`${bossName}${boss.hp ? ` / HP ${boss.hp}` : ''}`));});
      section.append(listBlock('Quest notes',quest.notes),listBlock('Quest drops',quest.drops),listBlock('Rare captures',quest.captures)); host.append(section);
    }
    if(zone) {
      const section=el('section',undefined,'item-detail-section'); section.append(el('h4',`Wiki zone details: ${zone.title}`),listBlock('Zone notes',zone.notes),listBlock('Monsters',zone.monsters),listBlock('Zone drops',zone.drops));
      const source=document.createElement('a'); source.href=zone.source;source.target='_blank';source.rel='noreferrer';source.textContent='Open source wiki page';section.append(source);host.append(section);
    }
    host.append(rawDetails(raw));
  }
  function showRecord(record, host) {
    host.replaceChildren(el('h3',record.name),el('p',record.desc,'pre-line'));
    const grid=el('div',undefined,'detail-card-grid');
    for(const [key,value] of Object.entries(record.raw)) {
      if (['name','desc'].includes(key)) continue;
      const card=el('article',undefined,'info-card'); card.append(el('h4',key));
      if(value && typeof value==='object') card.append(el('pre',JSON.stringify(value,null,2),'raw-json'));
      else card.append(el('p',String(value)));
      grid.append(card);
    }
    host.append(grid);
  }
  function sparkWorkspace(token) {
    const units=window.BFDB_DATA.units, limit=6, positions=['top-left','top-right','middle-left','middle-right','bottom-left','bottom-right'];
    const storageKey='bf-db-spark-simulator'; let saved; try { saved=JSON.parse(localStorage.getItem(storageKey)); } catch {}
    let slots=Array.isArray(saved?.slots)?saved.slots.slice(0,limit):[]; if (saved?.version !== 2) slots=slots.map(slot=>slot ? {...slot,bbOrder:null} : slot); while(slots.length<limit) slots.push(null);
    const lookup=new Map(units.map(u=>[u.key,u])), detailCache=new Map(); let detailsReady=0;
    const shell=el('div',undefined,'spark-shell'), intro=el('div',undefined,'spark-intro');
    intro.append(el('p','AUTOMATIC SPARKING SIMULATOR','eyebrow'),el('h2','Find your best spark order.'),el('p','Arrange a six-unit squad, choose each unit’s burst, and let Project Sparkle find the strongest timing and position combination.'));
    const clear=button('Clear simulator',()=>{slots=Array(limit).fill(null);save();render();}); clear.classList.add('quiet-action'); intro.append(clear);
    const layout=el('div',undefined,'spark-layout'), setup=el('section',undefined,'spark-setup'), setupHead=el('div',undefined,'workspace-section-head');
    const setupCopy=el('div',undefined,'section-head-copy'); setupCopy.append(el('p','1 / BUILD YOUR SQUAD','eyebrow'),el('h3','Choose units'),el('p','At least two actual units are required to simulate.')); setupHead.append(setupCopy);
    const controls=el('div',undefined,'workspace-controls'); const searchWrap=el('label',undefined,'search-field'); searchWrap.append(el('span','Find units')); const search=el('input'); search.type='search'; search.placeholder='Name or ID'; searchWrap.append(search); const [serverWrap,server]=select('Server',[...new Set(units.map(u=>u.server))].sort().map(v=>[v,v])); controls.append(searchWrap,serverWrap); setupHead.append(controls);
    const results=el('div',undefined,'unit-picker'), resultCount=el('p','Search the archive to add units.','picker-status'); setup.append(setupHead,resultCount,results);
    const board=el('section',undefined,'spark-board'), boardHead=el('div',undefined,'workspace-section-head'), boardCopy=el('div',undefined,'section-head-copy'); boardCopy.append(el('p','2 / SET THE TIMING','eyebrow'),el('h3','Spark sequence'),el('p','Choose BB type, order, and starting position for every slot.')); const simControls=el('div',undefined,'spark-controls'); const thresholdField=el('label',undefined,'select-field'); thresholdField.append(el('span','Result threshold %')); const threshold=el('input'); threshold.type='number'; threshold.min='0'; threshold.max='100'; threshold.step='1'; threshold.value='0'; thresholdField.append(threshold); simControls.append(thresholdField,el('p','0% shows the full top 10 BB-order tests. Raise the threshold to hide weaker results.','settings-note')); boardHead.append(boardCopy,simControls); const slotsGrid=el('div',undefined,'spark-slots'); const status=el('p',undefined,'workspace-status'); const run=button('Run spark simulation',()=>runSimulation()); run.classList.add('spark-run'); const output=el('div',undefined,'spark-output'); board.append(boardHead,status,slotsGrid,run,output); layout.append(setup,board); shell.append(intro,layout); panel.replaceChildren(shell);
    function save(){try{localStorage.setItem(storageKey,JSON.stringify({version:2,slots}));}catch{status.textContent='Storage is unavailable; changes last for this session only.';}}
    function find(){results.replaceChildren();const q=search.value.toLowerCase().trim();const matches=units.filter(u=>u.server===server.value&&`${u.name} ${u.id} ${u.element}`.toLowerCase().includes(q));resultCount.textContent=`${matches.length.toLocaleString()} units found`;matches.slice(0,18).forEach(unit=>{const add=button('',()=>{const open=slots.findIndex(slot=>!slot);if(open<0){status.textContent='All six simulator slots are filled.';return;}slots[open]={key:unit.key,type:'sbb',bbOrder:null,position:positions[open]};save();render();});add.className='unit-search-result';const img=el('img');img.src=`assets/images/${unit.images.thumb}`;img.alt='';img.loading='lazy';img.addEventListener('error',()=>{img.hidden=true;});const copy=el('span',undefined,'unit-search-copy');copy.append(el('strong',unit.name),el('small',`${unit.element||'Unknown'} · ${unit.server} · #${unit.id}`));add.append(img,copy,el('span','+','add-mark'));results.append(add);});if(!matches.length)results.append(el('p','No matching units in this server archive.','result-note'));}
    function render(){slotsGrid.replaceChildren();const filled=slots.filter(Boolean).length;status.textContent=`${filled} / 6 slots configured · ${slots.filter(slot=>slot&&lookup.has(slot.key)).length} units ready`;slots.forEach((slot,index)=>{const card=el('article',undefined,'spark-slot');card.append(el('span',`${index+1}`,'slot-number'));if(!slot||!lookup.has(slot.key)){card.append(el('strong','Open slot'),el('p','Add a unit from the archive.'));slotsGrid.append(card);return;}const unit=lookup.get(slot.key);const top=el('div',undefined,'spark-slot-top');const remove=button('×',()=>{slots[index]=null;save();render();});remove.classList.add('slot-remove');top.append(el('span',index===0?'LEADER':`SLOT ${index+1}`,'role-chip'),remove);const identity=el('div',undefined,'unit-identity');const img=el('img');img.src=`assets/images/${unit.images.thumb}`;img.alt=unit.name;img.loading='lazy';identity.append(img,el('div',undefined,'unit-identity-copy'));identity.lastChild.append(el('h4',unit.name),el('p',`${unit.element||'Unknown'} · #${unit.id}`));const fields=el('div',undefined,'spark-fields');const typeField=select('Burst',[['bb','BB'],['sbb','SBB'],['ubb','UBB']]);typeField[1].value=slot.type||'sbb';typeField[1].addEventListener('change',()=>{slot.type=typeField[1].value;save();});const orderField=select('Order',[['','Any'],...Array.from({length:6},(_,n)=>[String(n+1),String(n+1)])]);orderField[1].value=slot.bbOrder ? String(slot.bbOrder) : '';orderField[1].addEventListener('change',()=>{slot.bbOrder=orderField[1].value ? +orderField[1].value : null;save();});const positionField=select('Position',positions.map(value=>[value,value.replace('-', ' ').replace('-', ' ')]));positionField[1].value=slot.position||positions[index];positionField[1].addEventListener('change',()=>{slot.position=positionField[1].value;save();});fields.append(typeField[0],orderField[0],positionField[0]);card.append(top,identity,fields);slotsGrid.append(card);});}
    async function loadDetails(){const chosen=slots.filter(Boolean);await Promise.all(chosen.map(async slot=>{const unit=lookup.get(slot.key);if(!unit||detailCache.has(unit.key))return;const detail=await json(`data/unit-details/${unit.server.toLowerCase()}/${unit.id}.json`);detailCache.set(unit.key,detail.raw);}));}
    async function runSimulation(){const chosen=slots.filter(Boolean);if(chosen.length<2){output.replaceChildren(el('p','Add at least two units before running the simulator.','result-note'));return;}run.disabled=true;run.textContent='Simulating…';output.replaceChildren(el('p','Project Sparkle is checking up to 10 BB-order tests…','loading-note'));try{await loadDetails();const entries=slots.map((slot,index)=>{if(!slot)return{id:'E',position:positions[index]};const unit=lookup.get(slot.key);return{id:unit.id,type:slot.type||'sbb',bbOrder:slot.bbOrder ? +slot.bbOrder : undefined,position:slot.position||positions[index]};});const sim=new window.SparkSimulator({getUnit:id=>{const entry=entries.find(item=>String(item.id)===String(id));const unit=entry&&lookup.get(slots[entries.indexOf(entry)]?.key);return unit?detailCache.get(unit.key):null;}});const thresholdPercent=Math.max(0,Math.min(100,Number(threshold.value)||0));const results=await sim.run(entries,{sortResults:true,threshold:thresholdPercent/100,maxResults:10});output.replaceChildren(el('p',`${results.length} BB-order test${results.length===1?'':'s'} met the ${thresholdPercent}% threshold. Showing up to 10.`,'result-note'));results.slice(0,10).forEach((result,index)=>{const card=el('article',undefined,'spark-result');card.append(el('span',index===0?'BEST ORDER':`TEST ${index+1}`,'role-chip'),el('h4',`${(result.weightedPercentage*100).toFixed(1)}% weighted spark`));const stats=el('div',undefined,'spark-result-stats');[['Actual sparks',result.actualSparks],['Possible sparks',result.possibleSparks]].forEach(([label,value])=>{const stat=el('div',undefined,'spark-result-stat');stat.append(el('small',label),el('strong',String(value)));stats.append(stat);});card.append(stats);const unitStats=el('div',undefined,'spark-unit-stats');result.squad.filter(item=>item.id!=='E').sort((a,b)=>a.bbOrder-b.bbOrder).forEach(item=>{const unit=units.find(u=>String(u.id)===String(item.id)&&u.server===server.value)||units.find(u=>String(u.id)===String(item.id));const unitStat=el('div',undefined,'spark-unit-stat');const img=el('img');if(unit){img.src=`assets/images/${unit.images.thumb}`;img.alt=unit.name;img.loading='lazy';}unitStat.append(img,el('strong',unit?.name||item.id),el('span',`${item.position.replace('-', ' ').replace('-', ' ')} · ${item.bbOrder}. ${(item.type||'').toUpperCase()} · ${item.actualSparks} / ${item.possibleSparks} sparks`));unitStats.append(unitStat);});card.append(unitStats);output.append(card);});}catch(error){output.replaceChildren(el('p',error.message||'The simulator could not process this squad.','result-note'));}finally{run.disabled=false;run.textContent='Run spark simulation';}}
    search.addEventListener('input',find);server.addEventListener('change',find);find();render();
  }
  async function archive(kind, token) {
    panel.append(el('p','Loading archive...','result-note'));
    const manifest=await json('data/archives/manifest.json');
    const wiki=kind==='missions' ? await json('data/archives/missions/wiki.json') : null;
    if(token!==revision) return;
    panel.replaceChildren();
    const controls=el('div',undefined,'archive-controls');
    const [serverWrap,server]=select('Server',Object.entries(manifest[kind]).map(([s,n])=>[s,`${s.toUpperCase()} (${n.toLocaleString()})`]));
    const searchWrap=el('label',undefined,'search-field'); searchWrap.append(el('span','Search '+labels[kind])); const search=el('input'); search.type='search'; search.placeholder='Name, ID, description'; searchWrap.append(search);
    controls.append(searchWrap,serverWrap);
    const note=el('p','Available servers reflect the bundled source data.','settings-note');
    const summary=el('p'); const list=el('div',undefined,'archive-list'); const pager=el('div',undefined,'pager'); const status=el('span'); const detail=el('section',undefined,'archive-detail'); detail.hidden=true;
    let rows=[], page=0, loadId=0, detailId=0;
    const previous=button('Previous',()=>{page--;render();}); const next=button('Next',()=>{page++;render();}); pager.append(previous,status,next);
    panel.append(controls,note,summary,pager,list,detail);
    function render() {
      const query=search.value.trim().toLowerCase();
      const filtered=rows.filter(r=>[r.id,r.name,r.desc,r.area,r.dungeon].join(' ').toLowerCase().includes(query));
      const pages=Math.max(1,Math.ceil(filtered.length/40)); page=Math.max(0,Math.min(page,pages-1));
      summary.textContent=`${filtered.length.toLocaleString()} records`; status.textContent=`Page ${page+1} of ${pages}`; previous.disabled=page===0; next.disabled=page>=pages-1;
      list.replaceChildren();
      for(const row of filtered.slice(page*40,page*40+40)) {
        const card=button('',async()=>{
          const request=++detailId; const selectedServer=server.value;
          detail.hidden=false; detail.replaceChildren(el('p','Loading details...'));
          try { const records=await json(`data/archives/${kind}/${selectedServer}/${row.chunk}.json`); if(token!==revision || request!==detailId) return; const record=records.find(r=>r.key===row.key); if(kind==='missions') showMissionRecord(record,detail,wiki); else showRecord(record,detail); detail.scrollIntoView({behavior:'smooth',block:'start'}); } catch(e){ if(request===detailId) detail.replaceChildren(el('p',e.message)); }
        }); card.className='archive-card'; card.append(el('small',`${server.value.toUpperCase()} / ${row.id}`),el('strong',row.name),el('p',row.desc || [row.area,row.dungeon].filter(Boolean).join(' / ') || 'Open record')); list.append(card);
      }
      if(!filtered.length) list.append(el('p','No records match your search.','result-note'));
    }
    async function load() { const request=++loadId; detailId++; detail.hidden=true; rows=[]; render(); summary.textContent='Loading records...'; try { const result=await json(`data/archives/${kind}/${server.value}/index.json`); if(token!==revision || request!==loadId) return; rows=result;page=0;render(); } catch(e){if(request===loadId) summary.textContent=e.message;} }
    search.addEventListener('input',()=>{page=0;render();});server.addEventListener('change',load);await load();
  }
  function workspace(kind,token) {
    const isSquad=kind==='squads';
    const storageKey='bf-db-'+kind, limit=isSquad?6:4, units=window.BFDB_DATA.units;
    const lookup=new Map(units.map(u=>[u.key,u]));
    let saved; try { saved=JSON.parse(localStorage.getItem(storageKey)); } catch {}
    let picks=(Array.isArray(saved?.units)?saved.units:[]).filter(key=>lookup.has(key)).slice(0,limit);
    let renderId=0;
    const shell=el('div',undefined,'workspace-shell');
    const intro=el('div',undefined,'workspace-intro');
    const eyebrow=el('p',isSquad?'SQUAD BUILDER':'UNIT COMPARISON','eyebrow');
    const title=el('h2',isSquad?'Build a squad that makes sense.':'Put units side by side.');
    const description=el('p',isSquad?'Arrange six units, mark the leader and friend slot, then review the team totals.':'Compare up to four units with their base stats, identity, and skill kit in one view.');
    const introActions=el('div',undefined,'workspace-actions');
    const clearButton=button('Clear lineup',()=>{picks=[];save();render();}); clearButton.classList.add('quiet-action'); introActions.append(clearButton);
    intro.append(eyebrow,title,description,introActions);
    const workspaceGrid=el('div',undefined,'workspace-grid');
    const picker=el('section',undefined,'picker-panel');
    const pickerHead=el('div',undefined,'workspace-section-head'); pickerHead.append(el('div',undefined,'section-head-copy'));
    pickerHead.firstChild.append(el('p','1 / SELECT','eyebrow'),el('h3','Find a unit'),el('p','Search the local archive and add it to an open slot.'));
    const controls=el('div',undefined,'workspace-controls');
    const searchWrap=el('label',undefined,'search-field'); searchWrap.append(el('span','Search units')); const search=el('input'); search.type='search'; search.placeholder='Name or ID'; searchWrap.append(search);
    const serverValues=[...new Set(units.map(u=>u.server))].sort(); const [serverWrap,server]=select('Server',serverValues.map(value=>[value,value])); controls.append(searchWrap,serverWrap); pickerHead.append(controls);
    const resultCount=el('p','Search the archive to see matching units.','picker-status'); const results=el('div',undefined,'unit-picker'); picker.append(pickerHead,resultCount,results);
    const lineup=el('section',undefined,'lineup-panel');
    const lineupHead=el('div',undefined,'workspace-section-head'); const lineupCopy=el('div',undefined,'section-head-copy'); lineupCopy.append(el('p','2 / REVIEW','eyebrow'),el('h3',isSquad?'Your active squad':'Comparison board')); lineupHead.append(lineupCopy);
    if(isSquad){ const name=el('input'); name.className='lineup-name'; name.setAttribute('aria-label','Squad name'); name.placeholder='Squad name'; name.value=typeof saved?.name==='string'?saved.name:'My squad'; lineupHead.append(name); name.addEventListener('input',save); }
    const message=el('p',undefined,'workspace-status'); message.setAttribute('role','status'); const selected=el('div',undefined,'tool-selection'); lineup.append(lineupHead,message,selected);
    workspaceGrid.append(picker,lineup); shell.append(intro,workspaceGrid); panel.replaceChildren(shell);
    function save(){try {localStorage.setItem(storageKey,JSON.stringify({name:document.querySelector('.lineup-name')?.value || saved?.name || 'My squad',units:picks}));} catch {message.textContent='Storage is unavailable; changes last for this session only.';}}
    function find(){
      results.replaceChildren(); const q=search.value.toLowerCase().trim();
      const matches=units.filter(u=>u.server===server.value&&`${u.name} ${u.id} ${u.element}`.toLowerCase().includes(q));
      resultCount.textContent=`${matches.length.toLocaleString()} units found${q?` for “${search.value}”`:''}`;
      matches.slice(0,18).forEach(unit=>{
        const add=button('',()=>{if(picks.length>=limit){message.textContent=`Your ${isSquad?'squad':'comparison'} is full. Remove a unit first.`;return;} picks.push(unit.key);save();render();}); add.className='unit-search-result';
        const img=el('img'); img.src=`assets/images/${unit.images.thumb}`; img.alt=''; img.loading='lazy'; img.addEventListener('error',()=>{img.hidden=true;});
        const copy=el('span',undefined,'unit-search-copy'); copy.append(el('strong',unit.name),el('small',`${unit.element || 'Unknown'} · ${unit.server} · #${unit.id}`)); add.append(img,copy,el('span','+','add-mark')); results.append(add);
      });
      if(!matches.length) results.append(el('p','No matching units in this server archive.','result-note'));
    }
    function statRow(label,value,max){
      const row=el('div',undefined,'metric-row'); const valueNumber=Number(value)||0; const fill=el('span',undefined,'stat-fill'); fill.style.width=`${Math.max(4,Math.min(100,(valueNumber/max)*100))}%`; row.append(el('span',label),el('strong',value===undefined?'—':Number(value).toLocaleString()),el('i',undefined,'stat-track')); row.lastChild.append(fill); return row;
    }
    async function render(){
      const current=++renderId; selected.replaceChildren(); message.textContent=`${picks.length} / ${limit} ${isSquad?'slots':'units'} selected`;
      const chosen=picks.map(key=>lookup.get(key));
      if(isSquad){
        const totals=el('div',undefined,'totals-strip'); ['hp','atk','def','rec'].forEach(stat=>{const total=chosen.reduce((sum,u)=>sum+(Number(u.stats?.[stat])||0),0); const cell=el('div');cell.append(el('small',stat.toUpperCase()),el('strong',total.toLocaleString()));totalsStripFix(cell,stat); totals.append(cell);}); selected.append(totals);
      }
      const grid=el('div',undefined,isSquad?'slot-grid':'compare-grid'); selected.append(grid);
      for(let index=0;index<limit;index++){
        const unit=chosen[index];
        if(!unit){ const empty=el('article',undefined,'empty-slot'); empty.append(el('span',isSquad?String(index+1):String(index+1),'slot-number'),el('strong',isSquad?'Open squad slot':'Open comparison slot'),el('p',isSquad?(index===0?'Add a leader to start building.':'Choose another unit from the archive.'):'Add any unit to compare it.')); grid.append(empty); continue; }
        const card=el('article',undefined,isSquad?'slot-card':'compare-card');
        const role=isSquad?(index===0?'LEADER':index===5?'FRIEND':`SLOT ${index+1}`):`${unit.server} · #${unit.id}`;
        const cardTop=el('div',undefined,'card-top'); cardTop.append(el('span',role,'role-chip'),button('×',()=>{picks.splice(index,1);save();render();})); card.append(cardTop);
        const identity=el('div',undefined,'unit-identity'); const img=el('img'); img.src=`assets/images/${unit.images.thumb}`;img.alt=unit.name;img.loading='lazy';img.addEventListener('error',()=>{img.hidden=true;}); identity.append(img,el('div',undefined,'unit-identity-copy')); identity.lastChild.append(el('h4',unit.name),el('p',`${unit.element || 'Unknown'} · ${unit.rarity || '—'} star · Cost ${unit.cost || '—'}`)); card.append(identity);
        const maxStats={hp:Math.max(1,...chosen.map(u=>Number(u?.stats?.hp)||0)),atk:Math.max(1,...chosen.map(u=>Number(u?.stats?.atk)||0)),def:Math.max(1,...chosen.map(u=>Number(u?.stats?.def)||0)),rec:Math.max(1,...chosen.map(u=>Number(u?.stats?.rec)||0))}; const stats=el('div',undefined,'stat-list'); ['hp','atk','def','rec'].forEach(stat=>stats.append(statRow(stat.toUpperCase(),unit.stats?.[stat],maxStats[stat]))); card.append(stats);
        if(isSquad && index>0) card.append(button('Make leader',()=>{const [key]=picks.splice(index,1);picks.unshift(key);save();render();}));
        const skills=el('div',undefined,'skill-preview'); skills.append(el('p','Loading skill kit…','loading-note')); card.append(skills); grid.append(card);
        json(`data/unit-details/${unit.server.toLowerCase()}/${unit.id}.json`).then(detail=>{if(token!==revision||current!==renderId)return;skills.replaceChildren(el('p','SKILL KIT','eyebrow'));for(const key of ['leader skill','extra skill','bb','sbb','ubb']){const skill=detail.raw?.[key];if(skill)skills.append(el('strong',key.toUpperCase()),el('p',skill.desc||skill.name||'Available'));}if(!skills.children.length)skills.append(el('p','No skill details available.','loading-note'));}).catch(()=>{skills.replaceChildren(el('p','Skill details unavailable.','loading-note'));});
      }
    }
    function totalsStripFix(cell,stat){cell.classList.add(`total-${stat}`);}
    search.addEventListener('input',find);server.addEventListener('change',find);find();render();
  }
  window.BFDB_MULTITOOL={open(kind){const token=++revision;panel.replaceChildren();if(kind==='spark-simulator')sparkWorkspace(token);else if(kind==='squads'||kind==='compare')workspace(kind,token);else archive(kind,token).catch(e=>{if(token===revision)error(e.message);});},labels};
})();
