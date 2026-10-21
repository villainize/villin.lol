(() => {
  const unlockAt=Date.parse('2026-10-25T00:00:00-04:00');
  const preview=new URLSearchParams(location.search).get('preview')==='birthday';
  window.birthdayLocked=()=>!preview&&Date.now()<unlockAt;
  if(preview){
    const banner=document.createElement('div');banner.className='birthday-preview-banner';
    banner.append('Birthday preview ');
    const exit=document.createElement('a');exit.href='index.html';exit.textContent='Return to countdown';banner.append(exit);document.body.prepend(banner);
    document.addEventListener('DOMContentLoaded',()=>document.querySelector('#open-letter').click(),{once:true});
  }
  const ocean=document.querySelector('.countdown-ocean');
  const shark=`<svg viewBox="0 0 240 130" aria-hidden="true"><path d="M178 65L228 27L213 73L230 108L180 90" fill="#588ba6"/><path d="M90 43L119 6L137 47" fill="#639bb7"/><ellipse cx="110" cy="74" rx="86" ry="43" fill="#86b8d0"/><path d="M29 88Q105 59 186 91Q150 126 85 115Q43 110 29 88" fill="#e8f5f7"/><path d="M107 90L144 119L135 81" fill="#639bb7"/><circle cx="57" cy="65" r="7" fill="#203a50"/><circle cx="55" cy="63" r="2.5" fill="white"/><path d="M36 81Q53 100 74 80" fill="#ae587b" stroke="#35556a" stroke-width="2"/><path d="M42 84L48 91L52 84M58 84L63 91L68 83" fill="white"/><ellipse cx="77" cy="77" rx="9" ry="5" fill="#f5a9bd"/><path d="M160 58L158 75M167 60L165 76" stroke="#56849c" stroke-width="3" stroke-linecap="round"/></svg>`;
  for(let i=0;i<5;i++){const swimmer=document.createElement('div');swimmer.className=`countdown-shark shark-${i}`;swimmer.innerHTML=shark;ocean.append(swimmer);}
  for(let i=0;i<16;i++){const bubble=document.createElement('i');bubble.className='countdown-bubble';bubble.style.cssText=`left:${(i*37)%100}%;--duration:${9+i%7}s;--delay:-${i*1.7}s;--size:${8+i%4*6}px`;ocean.append(bubble);}
  for(const id of ['welcome','letter']){
    const screen=document.getElementById(id);
    screen.classList.add('birthday-ocean-screen');
    const decoration=ocean.cloneNode(true);decoration.classList.add('birthday-letter-ocean');
    const foreground=document.createElement('div');foreground.className='birthday-ocean-content';
    while(screen.firstChild)foreground.append(screen.firstChild);
    screen.append(decoration,foreground);
  }
  let timer;
  function update(){
    const remaining=Math.max(0,Math.ceil((unlockAt-Date.now())/1000));
    const values={days:Math.floor(remaining/86400),hours:Math.floor(remaining%86400/3600),minutes:Math.floor(remaining%3600/60),seconds:remaining%60};
    for(const [key,value] of Object.entries(values))document.querySelector(`[data-countdown="${key}"]`).textContent=String(value).padStart(2,'0');
    const locked=window.birthdayLocked();document.body.classList.toggle('birthday-locked',locked);
    document.querySelector('#countdown').hidden=!locked;
    if(!locked){clearInterval(timer);if(typeof window.showScreen==='function')window.showScreen('welcome');else{document.querySelector('#welcome').hidden=false;document.querySelector('#welcome').classList.add('active');}}
  }
  timer=setInterval(update,1000);update();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.body.classList.contains('birthday-locked'))update();});
})();
