// Local rounds snapshot the saved list. Only the final item is added to history.
(() => {
  const stage = $('resultStage');
  let token = 0, active = false, pool = [], contestants = [], queue = [], pair = [];
  const random = n => Math.floor(Math.random() * n);
  const player = n => `Player ${n}`;
  const esc = s => escapeHtml(String(s));
  function lock(value) {
    active = value;
    document.querySelectorAll('.setup-panel input,.setup-panel select,.setup-panel button').forEach(e => e.disabled = value);
    const invite=document.querySelector('.invite-btn');
    invite.disabled = false;
    invite.textContent = 'Invite friends · Online room';
  }
  function screen(title, description = '') {
    stage.innerHTML = `<div class="stage-top"><span>${esc(modeNames[mode])}</span><span>ROUND ${round}</span></div><div class="game-area"><h3>${esc(title)}</h3><p>${esc(description)}</p><div id="gameBody"></div><p class="game-status" id="gameStatus" role="status" aria-live="polite"></p><div class="game-controls" id="gameActions"></div></div>`;
    if (active) button('Cancel round', reset, 'cancel-game');
  }
  function button(label, action, className = '', parent = $('gameActions')) {
    const b = document.createElement('button'); b.textContent = label; b.className = className; b.onclick = action; parent.append(b); return b;
  }
  function reset() { token++; lock(false); screen('Choose together', 'Random modes pick an item. Competitive games let the winner choose from your list.'); button('Start ' + modeNames[mode], start); }
  function finish(item, detail) {
    token++; lock(false); screen(item, detail); $('gameBody').className = 'celebrate'; $('gameBody').textContent = 'Selected from your saved list';
    addHistory(item, `${modeNames[mode]} · ${detail}`); button('Play again', start);
  }
  function winner(n) {
    screen(`${player(n)} wins!`, 'Choose what the group will do.');
    pool.forEach(item => button(item, () => finish(item, `${player(n)} chose`), '', $('gameBody')));
    $('gameBody').className = 'game-controls';
  }
  async function animate(element, className, milliseconds = 1300) {
    const current = token; element.classList.add(className);
    await new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : milliseconds));
    element.classList.remove(className); return current === token;
  }
  function start() {
    if (window.pickplayRoom?.connected()) { window.pickplayRoom.select(mode); return; }
    if (items.length < 2) { $('gameStatus').textContent = 'Add at least two items to the saved list first.'; return; }
    token++; round++; pool = [...items]; contestants = Array.from({length:players}, (_,i) => i+1); lock(true);
    if (mode === 'jar' || mode === 'wheel') draw();
    else if (mode === 'coin') coin();
    else if (mode === 'dice') dice(contestants);
    else if (mode === 'number') guesses(contestants);
    else { queue = [...contestants]; nextMatch(); }
  }
  async function draw() {
    const index = random(pool.length);
    screen(mode === 'jar' ? 'Shuffling the jar…' : 'Spinning…', 'Every item has an equal chance.');
    if (mode === 'jar') {
      $('gameBody').innerHTML = '<div class="game-visual jar">▱ ▱ ▱</div>';
      if (await animate($('gameBody').firstChild, 'shake')) finish(pool[index], 'Drawn from the jar');
    } else {
      const colors = ['#ccefe5','#ffdfbf','#c8b5ff','#ffe99c','#f4c9d9'];
      const segments = pool.map((_,i) => `${colors[i%colors.length]} ${i*360/pool.length}deg ${(i+1)*360/pool.length}deg`).join(',');
      $('gameBody').innerHTML = `<div class="wheel-wrap"><div class="wheel" style="background:conic-gradient(${segments})">${pool.length <= 30 ? pool.map((_,i)=>`<span style="transform:rotate(${(i+.5)*360/pool.length}deg)">${i+1}</span>`).join('') : ''}</div></div><div class="wheel-key">${pool.map((x,i)=>`${i+1}. ${esc(x)}`).join(' · ')}</div>`;
      const wheel = stage.querySelector('.wheel'); wheel.getBoundingClientRect();
      wheel.style.transform = `rotate(${1800 - (index+.5)*360/pool.length}deg)`;
      if(await animate(wheel,'rolling',2700)) finish(pool[index], 'Selected by the wheel');
    }
  }
  function coin() {
    screen('Player 1 vs Player 2', 'Heads: Player 1 · Tails: Player 2. The winner chooses from your list.');
    $('gameBody').innerHTML = '<div class="game-visual coin">H / T</div>';
    const flip = button('Flip coin', async () => {
      flip.disabled=true;
      const heads=random(2)===0;
      if(await animate(stage.querySelector('.coin'),'flip')) {
        stage.querySelector('.coin').textContent=heads?'H':'T';
        $('gameStatus').textContent=`${heads?'Heads':'Tails'} — ${player(heads?1:2)} wins!`;
        button('Choose an item',()=>winner(heads?1:2));
      }
    });
  }
  function dice(group, message='Roll two dice each. Highest total wins. Tied leaders roll both dice again.') {
    screen('Roll for the choice', message);
    const results=[];
    const rollNext=()=> {
      const p=group[results.length]; $('gameStatus').textContent=`${player(p)}: your turn`;
      const b=button(`Roll for ${player(p)}`, async()=> {
        b.disabled=true;
        const first=random(6)+1, second=random(6)+1, value=first+second;
        const die=document.createElement('div'); die.className='dice'; die.textContent='⚄ ⚄'; $('gameBody').append(die);
        if(!await animate(die,'shake',800))return;
        die.innerHTML=`<div aria-hidden="true">${'⚀⚁⚂⚃⚄⚅'[first-1]} ${'⚀⚁⚂⚃⚄⚅'[second-1]}</div><p style="font-size:16px">${player(p)}: ${first} + ${second} = ${value}</p>`;
        results.push(value); b.remove();
        if(results.length<group.length) rollNext();
        else { const high=Math.max(...results), leaders=group.filter((_,i)=>results[i]===high);
          if(leaders.length===1) button('Choose an item',()=>winner(leaders[0]));
          else button('Reroll tied players',()=>dice(leaders,'Tie! Highest rollers roll both dice again.'));
          $('gameStatus').textContent=leaders.map(player).join(', ')+(leaders.length===1?' wins!':' tied.');
        }
      });
    }; rollNext();
  }
  function guesses(group, message='Pass the device for private guesses. Closest to the hidden number wins.') {
    const target=random(100)+1, values=[];
    function entry() {
      const p=group[values.length]; screen(`${player(p)}: guess 1–100`,message);
      $('gameBody').innerHTML='<form id="guessForm"><label>Your guess <input id="guess" type="number" min="1" max="100" step="1" required autocomplete="off"></label><button>Lock guess</button></form>';
      $('guessForm').onsubmit=e=>{e.preventDefault(); const n=Number($('guess').value); if(!Number.isInteger(n)||n<1||n>100)return; values.push(n);
        if(values.length<group.length) { screen('Guess hidden',`Pass the device to ${player(group[values.length])}.`); button('Ready',entry); }
        else { const distance=Math.min(...values.map(x=>Math.abs(x-target))), winners=group.filter((_,i)=>Math.abs(values[i]-target)===distance);
          screen(`The number was ${target}`,group.map((p,i)=>`${player(p)}: ${values[i]}`).join(' · '));
          button(winners.length===1?'Choose an item':'Play tiebreaker',()=>winners.length===1?winner(winners[0]):guesses(winners,'Tiebreaker: a new hidden number.'));
        }
      };
    } entry();
  }
  function nextMatch() {
    if(queue.length===1) {winner(queue[0]);return;}
    pair=queue.splice(0,2);
    screen(`${player(pair[0])} vs ${player(pair[1])}`,queue.length?`Waiting: ${queue.map(player).join(', ')}. Winners advance.`:'Winner chooses from the list.');
    button('Start match',()=> mode==='rps'?rps():mode==='tictactoe'?ttt():checkers());
  }
  function matchWon(side) {
    const p=pair[side]; queue.push(p); screen(`${player(p)} wins the match`,queue.length>1?'Next match awaits.':'Time to choose an item.'); button('Continue',nextMatch);
  }
  function rps() {
    const moves=[]; const names=['Rock','Paper','Scissors'];
    function input() {
      screen(`${player(pair[moves.length])}: choose your move`, 'Other players: look away until the move is hidden.');
      names.forEach((name,i)=>button(name,()=>{moves.push(i);
        if(moves.length===1){screen('Move hidden',`Pass to ${player(pair[1])}.`);button('Ready',input);}
        else { screen('Reveal!',`${player(pair[0])}: ${names[moves[0]]} · ${player(pair[1])}: ${names[moves[1]]}`);
          button(moves[0]===moves[1]?'Tie — replay':'Continue',()=>moves[0]===moves[1]?rps():matchWon((moves[0]-moves[1]+3)%3===1?0:1));
        }
      }));
    } input();
  }
  function ttt() {
    const board=Array(9).fill(''); let turn=0, ended=false;
    screen('Tic-Tac-Toe',`${player(pair[0])} is X · ${player(pair[1])} is O`);
    $('gameBody').innerHTML='<div class="game-board ttt" role="group" aria-label="Tic tac toe board"></div>';
    const grid=stage.querySelector('.game-board');
    const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const cells=board.map((_,i)=>button('',()=>{
      if(ended||board[i])return; board[i]=turn?'O':'X'; cells[i].textContent=board[i];cells[i].disabled=true;
      if(lines.some(line=>line.every(j=>board[j]===board[i]))) {ended=true; cells.forEach(c=>c.disabled=true);$('gameStatus').textContent=`${player(pair[turn])} wins!`;button('Continue',()=>matchWon(turn));}
      else if(board.every(Boolean)){ended=true;$('gameStatus').textContent='Draw! Replay this match.';button('Replay match',ttt);}
      else {turn=1-turn;$('gameStatus').textContent=`${player(pair[turn])}'s turn`;}
    },'',grid)); cells.forEach((c,i)=>c.setAttribute('aria-label',`Row ${Math.floor(i/3)+1}, column ${i%3+1}`));
    $('gameStatus').textContent=`${player(pair[turn])}'s turn`;
  }
  // English draughts: forward men, short kings, forced captures, chained jumps.
  function checkers() {
    let board=Array(64).fill(null), turn=0, selected=null, forced=null, ended=false, quiet=0;
    const positions=new Map();
    for(let i=0;i<64;i++){const row=Math.floor(i/8);if((row+i%8)%2 && (row<3||row>4))board[i]={side:row<3?1:0,king:false};}
    function movesFrom(i,capturesOnly=false) {
      const piece=board[i];if(!piece)return[]; const row=Math.floor(i/8), col=i%8, result=[];
      for(const dr of piece.king?[-1,1]:[piece.side===0?-1:1])for(const dc of [-1,1]) {
        const r=row+dr,c=col+dc;if(r<0||r>7||c<0||c>7)continue;const j=r*8+c;
        if(!board[j]&&!capturesOnly)result.push({from:i,to:j});
        else if(board[j]&&board[j].side!==piece.side){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<8&&cc>=0&&cc<8&&!board[rr*8+cc])result.push({from:i,to:rr*8+cc,capture:j});}
      }return result;
    }
    function legal() {if(forced!==null)return movesFrom(forced,true); const all=board.flatMap((p,i)=>p?.side===turn?movesFrom(i):[]);const jumps=all.filter(m=>m.capture!==undefined);return jumps.length?jumps:all;}
    function drawBoard() {
      const moves=legal();if(!$('gameBody').querySelector('.game-board'))$('gameBody').innerHTML='<div class="game-board checkers" role="group" aria-label="Checkers board"></div>';
      const grid=stage.querySelector('.game-board');
      board.forEach((p,i)=>{const b=grid.children[i]||button('',()=>click(i),'',grid);b.className=(Math.floor(i/8)+i%8)%2?'dark':'';
        const key=p?`${p.side}:${p.king}`:'empty';
        if(b.dataset.piece!==key){b.replaceChildren();b.dataset.piece=key;if(p){const piece=document.createElement('span');piece.className='piece'+(p.side?' blue':'');piece.textContent=p.king?'K':'';b.append(piece);}}
        if(i===selected)b.classList.add('selected');if(moves.some(m=>m.from===selected&&m.to===i))b.classList.add('legal');
        b.setAttribute('aria-label',`Row ${Math.floor(i/8)+1}, column ${i%8+1}${p?`, ${player(pair[p.side])} ${p.king?'king':'piece'}`:''}`);b.disabled=ended;
      });
      $('gameStatus').textContent=ended?'Match ended':`${player(pair[turn])}'s turn${forced!==null?' — continue jumping':moves.some(m=>m.capture!==undefined)?' — capture required':''}`;
    }
    function click(i) {
      if(ended)return;const moves=legal(),move=moves.find(m=>m.from===selected&&m.to===i);
      if(!move){if(moves.some(m=>m.from===i))selected=i;drawBoard();return;}
      const p=board[move.from];board[move.from]=null;board[i]=p;
      if(move.capture!==undefined)board[move.capture]=null;
      const crowned=!p.king&&(Math.floor(i/8)===(p.side===0?0:7));if(crowned)p.king=true;
      quiet=move.capture!==undefined||crowned?0:quiet+1;
      if(move.capture!==undefined&&!crowned&&movesFrom(i,true).length){forced=i;selected=i;drawBoard();return;}
      forced=null;selected=null;turn=1-turn;
      if(!legal().length){ended=true;drawBoard();$('gameStatus').textContent=`${player(pair[1-turn])} wins!`;button('Continue',()=>matchWon(1-turn));return;}
      const key=JSON.stringify(board)+turn;positions.set(key,(positions.get(key)||0)+1);
      if(quiet>=80||positions.get(key)>=3){ended=true;drawBoard();$('gameStatus').textContent='Draw by repetition or 40 moves without progress.';button('Replay match',checkers);return;}
      drawBoard();
    }
    screen('Checkers',`${player(pair[0])}: coral · ${player(pair[1])}: blue. Select a piece, then a highlighted square. Captures are required. Reach the far edge to become a king.`);
    button('Resign current player',()=>{if(confirm(`${player(pair[turn])}: resign this match?`))matchWon(1-turn);});drawBoard();
  }
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(window.pickplayRoom?.connected()){window.pickplayRoom.select(b.dataset.mode);return;}if(active&&!confirm('Cancel the current round and change games?'))return;mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));$('turnLabel').textContent=modeNames[mode];reset();});
  window.pickplayLocal={suspend(){token++;lock(false);},reset};
  reset();
})();
