(() => {
  const labels = {bursts:'Bursts', 'leader-skills':'Leader Skills', missions:'Missions', dictionary:'Dictionary', squads:'Squads', compare:'Compare'};
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
    const squad=kind==='squads', storageKey='bf-db-'+kind, limit=squad?6:4;
    const units=window.BFDB_DATA.units; const lookup=new Map(units.map(u=>[u.key,u]));
    let saved;try {saved=JSON.parse(localStorage.getItem(storageKey));}catch{}
    let picks=(Array.isArray(saved?.units)?saved.units:[]).filter(key=>lookup.has(key)).slice(0,limit);
    panel.replaceChildren(el('p',squad?'Build a six-unit squad. Slot 1 is your leader; slot 6 is your friend. Saved on this browser.':'Compare up to four units, including their stats and skills. Saved on this browser.','settings-note'));
    const name=el('input');name.setAttribute('aria-label','Squad name'); name.placeholder='Squad name';name.value=typeof saved?.name==='string'?saved.name:'My squad'; if(squad) panel.append(name);
    const controls=el('div',undefined,'archive-controls'); const wrap=el('label',undefined,'search-field');wrap.append(el('span','Find units'));const search=el('input');search.type='search';search.placeholder='Unit name or ID';wrap.append(search);
    const [serverWrap,server]=select('Server',[['GL','GL'],['EU','EU'],['JP','JP'],['KR','KR']]);controls.append(wrap,serverWrap);panel.append(controls);
    const message=el('p',undefined,'settings-note');message.setAttribute('role','status');const results=el('div',undefined,'unit-picker');const selected=el('div',undefined,'tool-selection');panel.append(message,results,selected);
    function save(){try{localStorage.setItem(storageKey,JSON.stringify({name:name.value,units:picks}));}catch{message.textContent='Storage is unavailable; changes last for this session only.';}}
    name.addEventListener('input',save);
    function find(){results.replaceChildren();const q=search.value.toLowerCase().trim();const matches=units.filter(u=>u.server===server.value&&`${u.name} ${u.id}`.toLowerCase().includes(q));for(const unit of matches.slice(0,12)){const b=button(`${unit.name} / ${unit.id}`,()=>{if(picks.length>=limit){message.textContent=`Remove a unit before adding more (maximum ${limit}).`;return;} picks.push(unit.key);save();render();});results.append(b);} if(!matches.length) results.append(el('p','No matching units.'));}
    async function render(){
      const current=++renderId; selected.replaceChildren();message.textContent=`${picks.length} / ${limit} slots filled`;
      if(!picks.length){selected.append(el('p','Choose a unit above to get started.','result-note'));return;}
      const chosen=picks.map(key=>lookup.get(key));
      if(squad) selected.append(el('p',`Base totals: ${['hp','atk','def','rec'].map(stat=>`${stat.toUpperCase()} ${chosen.reduce((n,u)=>n+(Number(u.stats?.[stat])||0),0).toLocaleString()}`).join(' / ')}. No leader, sphere, or skill bonuses applied.`,'settings-note'));
      const grid=el('div',undefined,'comparison-grid');selected.append(grid);
      chosen.forEach((unit,index)=>{
        const card=el('article',undefined,'info-card');card.append(el('small',squad?(index===0?'Leader':index===5?'Friend':`Member ${index+1}`):`${unit.server} / ${unit.id}`),el('h3',unit.name));
        const img=el('img');img.src=`assets/images/${unit.images.thumb}`;img.alt=unit.name;img.width=80;img.height=80;img.addEventListener('error',()=>{img.hidden=true;});card.append(img);
        card.append(el('p',`${unit.element} / ${unit.rarity} / Cost ${unit.cost}`));
        for(const stat of ['hp','atk','def','rec']) card.append(el('p',`${stat.toUpperCase()}: ${unit.stats?.[stat]??'Unavailable'}`));
        card.append(button('Remove',()=>{picks.splice(index,1);save();render();}));
        if(squad&&index>0)card.append(button('Make leader',()=>{const [key]=picks.splice(index,1);picks.unshift(key);save();render();}));
        const skills=el('div');skills.append(el('p','Loading skills...'));card.append(skills);grid.append(card);
        json(`data/unit-details/${unit.server.toLowerCase()}/${unit.id}.json`).then(detail=>{if(token!==revision||current!==renderId)return;skills.replaceChildren();for(const key of ['leader skill','extra skill','bb','sbb','ubb']){const skill=detail.raw?.[key];skills.append(el('h4',key.toUpperCase()),el('p',skill?`${skill.name}: ${skill.desc||'No description'}`:'None'));} if(!squad)skills.append(rawDetails(detail.raw?.stats||unit.stats));}).catch(()=>{skills.textContent='Skill details unavailable.';});
      });
    }
    let renderId=0;search.addEventListener('input',find);server.addEventListener('change',find);find();render();
  }
  window.BFDB_MULTITOOL={open(kind){const token=++revision;panel.replaceChildren();if(kind==='squads'||kind==='compare')workspace(kind,token);else archive(kind,token).catch(e=>{if(token===revision)error(e.message);});},labels};
})();
