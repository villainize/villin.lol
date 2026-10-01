(() => {
  const panel=document.createElement('section');panel.className='room-panel';panel.hidden=true;
  panel.innerHTML=`<h2>Play with friends</h2><p>Share one list and play from separate devices. Each person signs in with their own account. Rooms hold 2–4 players and expire after 24 hours.</p>
    <div class="room-bar"><label>Your display name<input id="roomName" maxlength="24" placeholder="Your name"></label><button id="roomCreate" class="room-primary">Create room from current list</button></div>
    <div class="room-bar"><label>Invite link or room code<input id="roomCode" placeholder="Paste an invite"></label><button id="roomJoin">Join room</button><button id="roomLogin">Sign in</button></div>
    <p id="roomNotice"></p><p id="roomStatus" class="room-status" role="status" aria-live="polite"></p><div id="roomContent"></div>`;
  document.querySelector('.workspace').before(panel);
  const el=id=>document.getElementById(id),esc=s=>escapeHtml(String(s));
  let client,room=null,me=null,timer=null,polling=false,busy=false,selected=null,lastRevision=-1,epoch=0;
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  function open(){panel.hidden=false;panel.scrollIntoView({behavior:'smooth'});}
  document.querySelector('.invite-btn').onclick=open;
  el('roomLogin').onclick=()=>window.pickplayCloud.open();
  function message(text){el('roomStatus').textContent=text;}
  function fail(e){const text=e.message||String(e);message(/PGRST202|function.*not|schema cache/i.test(`${e.code} ${text}`)?'Rooms need database setup. Run supabase/pickplay-rooms.sql in Supabase SQL Editor, then retry.':text);}
  async function connect(){
    client=await window.pickplayCloud.client();const {data,error}=await client.auth.getSession();if(error)throw error;
    if(!data.session){window.pickplayCloud.open();throw new Error('Sign in first, then create or join the room.');}me=data.session.user.id;
    return client;
  }
  async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
  async function run(fn){if(busy)return;busy=true;try{await fn();}catch(e){fail(e);}finally{busy=false;}}
  function name(){const n=el('roomName').value.trim();if(!n)throw new Error('Enter your display name first.');return n;}
  function code(value){let id=value.trim();try{if(id.includes('://'))id=new URL(id).hash.replace(/^#room=/,'');else id=id.replace(/^#room=/,'');}catch{}if(!uuid.test(id))throw new Error('Paste a valid room invite link or code.');return id;}
  function link(){const url=new URL(location.href);url.hash='room='+room.id;return url.href;}
  function accept(data){room=data;selected=null;render();}
  function watch(){clearInterval(timer);timer=setInterval(poll,1800);}
  async function poll(){
    if(!room||polling||busy)return;polling=true;const current=epoch,id=room.id;
    try{
      const {data}=await client.auth.getSession();if(data.session?.user.id!==me){disconnect();message('Account changed. Sign in and rejoin your room.');return;}
      const next=await rpc('pickplay_room_get',{p_room:id});if(current!==epoch)return;
      if(next.revision!==room.revision)accept(next);message('Connected · Room updates automatically.');
    }catch(e){if(current===epoch)fail(e);}finally{polling=false;}
  }
  function disconnect(){epoch++;room=null;lastRevision=-1;clearInterval(timer);el('roomContent').replaceChildren();el('roomCreate').disabled=el('roomJoin').disabled=false;}
  function enter(data){epoch++;lastRevision=-1;accept(data);el('roomCode').value=data.id;el('roomCreate').disabled=el('roomJoin').disabled=true;location.hash='room='+data.id;watch();message('Connected · Room updates automatically.');}
  el('roomCreate').onclick=()=>run(async()=>{const n=name();if(items.length<2)throw new Error('Add at least two list items first.');await connect();enter(await rpc('pickplay_room_create',{p_name:n,p_items:[...items]}));});
  el('roomJoin').onclick=()=>run(async()=>{const n=name(),id=code(el('roomCode').value);await connect();enter(await rpc('pickplay_room_join',{p_room:id,p_name:n}));});
  async function action(type,value={}){
    await run(async()=>{if(!room)return;const current=epoch;const data=await rpc('pickplay_room_act',{p_room:room.id,p_revision:room.revision,p_action:type,p_value:value});if(current===epoch){accept(data);message('Move saved.');}});
    await poll();
  }
  function button(label,fn,parent,disabled=false){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.onclick=fn;parent.append(b);return b;}
  function render(){
    const s=room.state,host=room.host_id===me,playing=s.phase==='playing';
    const player=id=>s.players.find(p=>p.id===id)?.name||'Player';
    const self=s.players.some(p=>p.id===me);if(!self){disconnect();message('You left the room.');return;}
    const content=el('roomContent');content.innerHTML=`<ul class="room-members">${s.players.map((p,i)=>`<li>${i+1}. ${esc(p.name)}${p.id===me?' (you)':''}${p.id===room.host_id?' · host':''}</li>`).join('')}</ul><label>Invite link<input id="roomInviteLink" class="room-link" readonly value="${esc(link())}"></label><div id="roomTools" class="room-bar"></div><details><summary>Shared list (${s.items.length})</summary><ol class="room-list">${s.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details><div id="roomLobby"></div><div class="room-stage" id="roomStage"><h3>${esc(s.phase==='lobby'?'Waiting for friends':modeNames[s.mode]||'Room closed')}</h3><div id="roomGame"></div><div id="roomActions" class="room-bar"></div></div>`;
    const tools=el('roomTools'),body=el('roomGame'),actions=el('roomActions');
    button('Copy invite',async()=>{try{await navigator.clipboard.writeText(link());message('Invite copied.');}catch{el('roomInviteLink').select();message('Select and copy the invite above.');}},tools);
    button('Save shared list locally',()=>{
      if(el('newListBtn').disabled){message('Finish or cancel your local game before saving this list.');return;}
      persistLists();savedLists.push({name:'Friends room list',items:[...s.items]});currentListIndex=savedLists.length-1;items=[...s.items];persistLists();renderItems();renderSavedLists();message('Saved a new local list. Existing lists were kept.');
    },tools);
    if(host&&s.phase!=='closed'){
      if(s.phase!=='lobby')button('Back to lobby',()=>{if(confirm('End this round and return everyone to the lobby?'))action('lobby');},tools);
      button('Close room',()=>{if(confirm('Close this room for everyone?'))action('close');},tools);
    }else if(s.phase==='lobby')button('Leave room',()=>action('leave'),tools);
    button('Disconnect this device',()=>{disconnect();message('Disconnected. Keep the invite to rejoin. Your seat remains until you leave the lobby or the room expires.');},tools);
    if(['127.0.0.1','localhost','::1','[::1]'].includes(location.hostname))el('roomNotice').textContent='This is a local preview. Test with two browser profiles on this computer. For friends on other devices, publish the site first; localhost links only work on your own computer.';
    else el('roomNotice').textContent='Anyone with the invite can join while the lobby is open (up to four people).';
    if(s.phase==='closed'){body.textContent='The host closed this room.';clearInterval(timer);return;}
    if(s.phase==='lobby'){
      body.innerHTML='<p>Everyone can add ideas. The host chooses a game and starts when everyone is here.</p>';
      const form=document.createElement('form');form.className='room-bar';form.innerHTML='<label>Add to shared list<input id="roomItem" maxlength="48" required></label><button>Add idea</button>';form.onsubmit=e=>{e.preventDefault();action('add',{item:el('roomItem').value.trim()});};el('roomLobby').append(form);
      if(host){const select=document.createElement('select');select.id='roomMode';select.setAttribute('aria-label','Online game');Object.entries(modeNames).forEach(([id,label])=>{const option=document.createElement('option');option.value=id;option.textContent=label;option.disabled=id==='coin'&&s.players.length!==2;select.append(option);});actions.append(select);button('Start online game',()=>action('start',{mode:select.value}),actions,s.players.length<2);}
      return;
    }
    const note=text=>{const p=document.createElement('p');p.textContent=text;body.append(p);};
    if(s.rolls&&Object.keys(s.rolls).length)Object.entries(s.rolls).forEach(([id,d])=>note(`${player(id)}: ${d[0]} + ${d[1]} = ${d[0]+d[1]}`));
    if(s.mode==='number'&&!playing&&s.guesses){note(`The number was ${s.target}.`);Object.entries(s.guesses).forEach(([id,n])=>note(`${player(id)} guessed ${n}`));}
    if(s.mode==='rps'&&!playing&&s.hands)Object.entries(s.hands).forEach(([id,n])=>note(`${player(id)}: ${['Rock','Paper','Scissors'][n]}`));
    if(s.face){const coin=document.createElement('div');coin.className='game-visual coin';coin.textContent=s.face==='Heads'?'H':'T';body.append(coin);note(`${s.face}: ${player(s.winner)} wins.`);}
    if(s.phase==='result'){
      if(['jar','wheel'].includes(s.mode)){const visual=document.createElement('div');visual.className='game-visual '+s.mode;visual.textContent=s.mode==='jar'?'▱ ▱':'';body.append(visual);}
      const h=document.createElement('h3');h.className='reveal';h.textContent=s.selected;body.append(h);note(s.winner?`${player(s.winner)} chose this item.`:'Selected randomly from the shared list.');
    }else if(s.phase==='choose'){
      note(`${player(s.winner)} wins! ${s.winner===me?'Choose an item below.':'Waiting for their choice.'}`);
      if(s.winner===me)s.items.forEach((x,i)=>button(x,()=>action('choose',{index:i}),actions));
    }else if(['match_win','match_tie','dice_tie','number_tie'].includes(s.phase)){
      note(s.phase==='match_win'?`${player(s.match_winner)} wins this match!`:'Tie! Play another round.');button('Continue',()=>action('continue'),actions);
    }else if(playing){
      if(s.pair)note(`Match: ${player(s.pair[0])} vs ${player(s.pair[1])}${s.queue?.length?' · Waiting: '+s.queue.map(player).join(', '):''}`);
      const eligible=(s.group||[]).includes(me)&&!(s.submitted||[]).includes(me);
      if(s.mode==='dice'){note('Roll two dice. Highest total wins; tied leaders roll again.');button('Roll both dice',()=>action('roll'),actions,!eligible);}
      else if(s.mode==='number'){
        note('Guess 1–100. Guesses stay hidden until everyone submits.');
        if(eligible){const form=document.createElement('form');form.innerHTML='<label>Your guess<input type="number" min="1" max="100" step="1" required id="onlineGuess"></label><button>Lock guess</button>';form.onsubmit=e=>{e.preventDefault();action('guess',{number:Number(el('onlineGuess').value)});};body.append(form);}
      }else if(s.mode==='rps'){
        note('Choose privately on your own device. Both moves reveal together.');['Rock','Paper','Scissors'].forEach((hand,i)=>button(hand,()=>action('hand',{hand:i}),actions,!s.pair.includes(me)||s.submitted.includes(me)));
      }else if(['tictactoe','checkers'].includes(s.mode)){
        const myTurn=s.pair[s.turn]===me;note(`${player(s.pair[s.turn])}'s turn. ${s.mode==='checkers'?'First player: coral; second: blue. Captures are required.':'First player: X; second: O.'}`);
        const grid=document.createElement('div');grid.className='game-board '+(s.mode==='checkers'?'checkers':'ttt');body.append(grid);
        s.board.forEach((piece,i)=>{
          const b=button(s.mode==='tictactoe'?(piece===1?'X':piece===2?'O':''):'',()=>{
            if(s.mode==='tictactoe')action('move',{to:i});
            else if((s.legal||[]).some(m=>m.from===selected&&m.to===i))action('move',{from:selected,to:i});
            else {selected=i;grid.querySelectorAll('button').forEach((cell,j)=>{cell.classList.toggle('selected',j===i);cell.classList.toggle('legal',(s.legal||[]).some(m=>m.from===i&&m.to===j));});}
          },grid,!myTurn||(s.mode==='tictactoe'&&piece!==0));
          b.setAttribute('aria-label',`Square ${i+1}${piece?' occupied':''}`);
          if(s.mode==='checkers'){b.className=(Math.floor(i/8)+i%8)%2?'dark':'';if(piece){const disc=document.createElement('span');disc.className='piece'+(piece<0?' blue':'');disc.textContent=Math.abs(piece)===2?'K':'';b.append(disc);}}
        });
        if(s.pair.includes(me))button('Resign match',()=>{if(confirm('Resign this match?'))action('resign');},actions);
      }
      if(s.submitted?.length)note('Submitted: '+s.submitted.map(player).join(', '));
    }
    if(lastRevision!==room.revision){el('roomStage').classList.remove('celebrate');void el('roomStage').offsetWidth;el('roomStage').classList.add('celebrate');lastRevision=room.revision;}
  }
  function readInvite(){const invite=location.hash.match(/^#room=([a-f0-9-]+)$/i);if(invite){el('roomCode').value=invite[1];panel.hidden=false;if(!room)message('Enter a display name, sign in, then join your friend.');}}
  window.addEventListener('hashchange',readInvite);readInvite();
})();
