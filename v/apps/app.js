(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const natural = (a, b) => a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'});
  let toastTimer;
  function notify(message) { $('toast').textContent=message; $('toast').hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').hidden=true,5000); }
  function applyTheme(theme) {
    const dark=theme==='dark';
    document.documentElement.dataset.theme=dark?'dark':'light';
    $('theme-toggle').setAttribute('aria-pressed',String(dark));
    $('theme-toggle').setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');
    $('theme-toggle').querySelector('span').textContent=dark?'☀':'☾';
    $('theme-toggle').querySelector('b').textContent=dark?'Light mode':'Dark mode';
  }
  applyTheme(document.documentElement.dataset.theme||'light');
  $('theme-toggle').onclick=()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    applyTheme(next);
    try{localStorage.setItem('haven.theme',next);}catch{}
  };
  function route() {
    const name=['home','manga','anime','books'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
    document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==name);
    document.querySelectorAll('nav a').forEach(el=>el.classList.toggle('active',el.hash==='#'+name));
    $('breadcrumb').textContent='Workspace / '+({home:'All apps',manga:'Manga reader',anime:'Anime player',books:'My bookshelf'})[name];
    if(name!=='manga')stopScroll();
    if(name!=='anime')$('video').pause();
    window.scrollTo(0,0);
  }
  window.addEventListener('hashchange',route);
  let folderMode='',folderPath='',folderParent='';
  async function loadFolder(path=''){
    $('folder-list').innerHTML='<p class="muted">Loading folders…</p>';
    try{
      const params=new URLSearchParams();if(path)params.set('path',path);if(folderMode==='anime')params.set('videos','1');
      const response=await fetch(`/api/folders?${params}`),data=await response.json();
      if(!response.ok)throw new Error(data.error||'Folder could not be opened');
      folderPath=data.path;folderParent=data.parent;$('folder-path-input').value=data.path;$('folder-up').disabled=!data.parent;
      $('folder-roots').replaceChildren(...data.roots.map(root=>{const button=document.createElement('button');button.textContent=root.name;button.onclick=()=>loadFolder(root.path);return button;}));
      $('folder-list').replaceChildren();
      if(!data.directories.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='No folders inside this location.';$('folder-list').append(empty);}
      for(const directory of data.directories){const button=document.createElement('button');button.innerHTML='<span aria-hidden="true">▰</span>';const name=document.createElement('span');name.textContent=directory.name;button.append(name);button.onclick=()=>loadFolder(directory.path);$('folder-list').append(button);}
      if(folderMode==='anime'){
        const videos=data.videos||[];
        if(videos.length){const heading=document.createElement('p');heading.className='folder-files-heading';heading.textContent=`${videos.length} video${videos.length===1?'':'s'} found in this folder and subfolders`;$('folder-list').append(heading);for(const item of videos){const row=document.createElement('div');row.className='folder-video-row';const icon=document.createElement('span');icon.textContent='▷';const label=document.createElement('span');label.textContent=item.name;row.append(icon,label);$('folder-list').append(row);}}
      }
    }catch(error){$('folder-list').innerHTML='';notify(error.message);}
  }
  function openFolderBrowser(mode){folderMode=mode;$('folder-title').textContent=mode==='anime'?'Choose your anime folder':'Choose a folder containing CBZ books';$('folder-help').textContent=mode==='anime'?'The videos shown for this folder and its subfolders will load into the browser playlist.':'All CBZ books in this folder and its subfolders will be imported.';$('folder-select').textContent=mode==='anime'?'Play in browser':'Import this folder';$('folder-modal').hidden=false;loadFolder();}
  function closeFolderBrowser(){$('folder-modal').hidden=true;}
  $('folder-close').onclick=closeFolderBrowser;$('folder-up').onclick=()=>folderParent&&loadFolder(folderParent);$('folder-go').onclick=()=>loadFolder($('folder-path-input').value);$('folder-path-input').onkeydown=event=>{if(event.key==='Enter')loadFolder($('folder-path-input').value);};$('folder-modal').addEventListener('click',event=>{if(event.target===$('folder-modal'))closeFolderBrowser();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('folder-modal').hidden)closeFolderBrowser();});
  let manga=[], bookIndex=0, pageIndex=0, mangaUrls=[], scrolling=false, lastFrame=0, carry=0, pageElapsed=0;
  const stage=$('manga-stage');
  function setReaderSize(width,height,save=true){width=Math.max(500,Math.min(1400,Math.round(width/25)*25));height=Math.max(450,Math.min(1200,Math.round(height/25)*25));stage.style.width=`${width}px`;stage.style.height=`${height}px`;$('reader-width').value=width;$('reader-height').value=height;$('reader-width-value').textContent=`${width} px`;$('reader-height-value').textContent=`${height} px`;if(save)try{localStorage.setItem('haven.reader.size',JSON.stringify({width,height}));}catch{}}
  let readerSize={width:1100,height:800};try{readerSize={...readerSize,...JSON.parse(localStorage.getItem('haven.reader.size')||'{}')};}catch{}setReaderSize(readerSize.width,readerSize.height,false);
  $('reader-width').oninput=()=>setReaderSize(Number($('reader-width').value),Number($('reader-height').value));$('reader-height').oninput=()=>setReaderSize(Number($('reader-width').value),Number($('reader-height').value));
  $('reader-fit').onclick=()=>setReaderSize(Math.min(1100,stage.parentElement.clientWidth),Math.max(450,Math.min(900,innerHeight-220)));
  let resizeTimer;new ResizeObserver(()=>{if(innerWidth<=760)return;const current=stage.getBoundingClientRect();if(current.width<500||current.height<450)return;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{const box=stage.getBoundingClientRect();if(box.width<500||box.height<450)return;const width=Math.round(box.width/25)*25,height=Math.round(box.height/25)*25;$('reader-width').value=width;$('reader-height').value=height;$('reader-width-value').textContent=`${width} px`;$('reader-height-value').textContent=`${height} px`;try{localStorage.setItem('haven.reader.size',JSON.stringify({width,height}));}catch{}},150);}).observe(stage);
  function stopScroll(){scrolling=false;$('auto-scroll').textContent='Start auto-scroll';lastFrame=0;carry=0;pageElapsed=0;}
  function release(urls){urls.forEach(url=>URL.revokeObjectURL(url));}
  function pageInfo(){
    $('page-info').textContent=manga.length ? `${manga[bookIndex].name} · Page ${pageIndex+1} of ${manga[bookIndex].files.length}` : 'No book open';
    $('prev-page').disabled=!manga.length || (bookIndex===0 && pageIndex===0);
    $('next-page').disabled=!manga.length || (bookIndex===manga.length-1 && pageIndex===manga[bookIndex].files.length-1);
  }
  function renderPages(){
    stage.replaceChildren();stage.classList.toggle('swipe',$('reading-mode').value==='swipe');
    const indices=$('reading-mode').value==='swipe' ? [pageIndex] : manga[bookIndex].files.map((_,i)=>i);
    for(const i of indices){const img=document.createElement('img');img.src=mangaUrls[i];img.alt=`${manga[bookIndex].name}, page ${i+1}`;img.dataset.page=i;img.onerror=()=>{img.alt+=' — image could not be decoded';};stage.append(img);}
    stage.scrollTop=0;pageElapsed=0;pageInfo();
  }
  function openManga(index, page=0){
    if(index<0 || index>=manga.length)return false;
    release(mangaUrls);bookIndex=index;pageIndex=page;
    mangaUrls=manga[index].files.map(f=>URL.createObjectURL(f));$('manga-book').value=String(index);renderPages();return true;
  }
  function loadMangaBooks(books){
    const ready=books.filter(book=>book.files.length).sort((a,b)=>natural(a.name,b.name));
    if(!ready.length){notify('No supported image pages were found.');return;}
    stopScroll();manga=ready;
    $('manga-book').replaceChildren(...manga.map((book,i)=>new Option(book.name,String(i))));
    openManga(0);notify(`${manga.length} book${manga.length===1?'':'s'} ready to read.`);
  }
  $('manga-files').addEventListener('change',event=>{
    const groups=new Map();
    for(const file of event.target.files){
      if(!/\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name))continue;
      const path=file.webkitRelativePath || file.name, folder=path.includes('/')?path.slice(0,path.lastIndexOf('/')):'Selected pages';
      if(!groups.has(folder))groups.set(folder,[]);groups.get(folder).push(file);
    }
    loadMangaBooks(Array.from(groups,([name,files])=>({name,files:files.sort((a,b)=>natural(a.name,b.name))})));
    event.target.value='';
  });
  const imageMime=name=>({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',bmp:'image/bmp'})[name.split('.').pop().toLowerCase()]||'application/octet-stream';
  async function unzipCbz(file){
    const buffer=await file.arrayBuffer(), view=new DataView(buffer), bytes=new Uint8Array(buffer);
    let eocd=-1;
    for(let i=Math.max(0,view.byteLength-65557);i<=view.byteLength-22;i++)if(view.getUint32(i,true)===0x06054b50)eocd=i;
    if(eocd<0)throw new Error('ZIP directory not found');
    const total=view.getUint16(eocd+10,true), centralOffset=view.getUint32(eocd+16,true), pages=[];
    if(total===0xffff||centralOffset===0xffffffff)throw new Error('ZIP64 CBZ files are not supported');
    let cursor=centralOffset;
    for(let entry=0;entry<total;entry++){
      if(cursor+46>view.byteLength||view.getUint32(cursor,true)!==0x02014b50)throw new Error('Invalid ZIP directory');
      const flags=view.getUint16(cursor+8,true), method=view.getUint16(cursor+10,true), size=view.getUint32(cursor+20,true);
      const nameLength=view.getUint16(cursor+28,true),extraLength=view.getUint16(cursor+30,true),commentLength=view.getUint16(cursor+32,true),localOffset=view.getUint32(cursor+42,true);
      const name=new TextDecoder('utf-8').decode(bytes.subarray(cursor+46,cursor+46+nameLength)).replaceAll('\\','/');
      cursor+=46+nameLength+extraLength+commentLength;
      if(!/\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(name)||name.startsWith('__MACOSX/'))continue;
      if(flags&1)throw new Error('Password-protected CBZ files are not supported');
      if(localOffset+30>view.byteLength||view.getUint32(localOffset,true)!==0x04034b50)throw new Error('Invalid page entry');
      const localName=view.getUint16(localOffset+26,true),localExtra=view.getUint16(localOffset+28,true),start=localOffset+30+localName+localExtra,end=start+size;
      if(end>view.byteLength)throw new Error('Incomplete page data');
      let pageBytes;
      if(method===0)pageBytes=bytes.slice(start,end);
      else if(method===8){
        if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot decompress CBZ files');
        const stream=new Blob([bytes.slice(start,end)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        pageBytes=new Uint8Array(await new Response(stream).arrayBuffer());
      }else throw new Error(`Unsupported ZIP compression method ${method}`);
      const shortName=name.split('/').pop();pages.push(new File([pageBytes],shortName,{type:imageMime(shortName)}));
    }
    return pages.sort((a,b)=>natural(a.name,b.name));
  }
  $('manga-cbz').addEventListener('change',async event=>{
    const archives=Array.from(event.target.files).sort((a,b)=>natural(a.name,b.name));
    if(!archives.length)return;
    $('manga-cbz').disabled=true;notify(`Opening ${archives.length} CBZ book${archives.length===1?'':'s'}…`);
    const books=[],failures=[];
    for(const file of archives){try{const files=await unzipCbz(file);if(files.length)books.push({name:file.name.replace(/\.cbz$/i,''),files});else failures.push(`${file.name}: no image pages`);}catch(error){failures.push(`${file.name}: ${error.message}`);}}
    $('manga-cbz').disabled=false;event.target.value='';
    if(books.length)loadMangaBooks(books);
    if(failures.length)notify(`Could not open ${failures.length} CBZ: ${failures[0]}`);
  });
  async function importCbzFolder(path){
    const response=await fetch('/api/manga/cbz-folder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path})}),data=await response.json();
    if(!response.ok)throw new Error(data.error||'CBZ folder could not be opened');
    if(!data.books.length){notify('No CBZ books were found in that folder.');return;}
    const books=[],failures=[];
    for(let i=0;i<data.books.length;i++){const item=data.books[i];notify(`Importing CBZ book ${i+1} of ${data.books.length}…`);try{const fileResponse=await fetch(`/api/cbz-file?path=${encodeURIComponent(item.path)}`);if(!fileResponse.ok)throw new Error('file could not be read');const blob=await fileResponse.blob(),files=await unzipCbz(new File([blob],item.name,{type:blob.type}));if(files.length)books.push({name:item.name.replace(/\.cbz$/i,''),files});else failures.push(item.name);}catch{failures.push(item.name);}}
    if(books.length)loadMangaBooks(books);if(failures.length)notify(`${failures.length} CBZ book${failures.length===1?'':'s'} could not be imported.`);
  }
  $('manga-cbz-folder').onclick=()=>openFolderBrowser('manga');
  $('manga-book').onchange=()=>{stopScroll();openManga(Number($('manga-book').value));};
  $('reading-mode').onchange=()=>{stopScroll();if(manga.length){renderPages();if($('reading-mode').value==='scroll')stage.children[pageIndex]?.scrollIntoView({block:'start'});}};
  function turnPage(delta){
    if(!manga.length)return;
    const next=pageIndex+delta;
    if(next>=manga[bookIndex].files.length){if($('next-book').checked && openManga(bookIndex+1))return;stopScroll();notify('You’ve reached the end of this book.');return;}
    if(next<0){if(bookIndex>0)openManga(bookIndex-1,manga[bookIndex-1].files.length-1);return;}
    pageIndex=next;pageElapsed=0;
    if($('reading-mode').value==='swipe')renderPages();else stage.scrollTo({top:stage.children[next].offsetTop-stage.children[0].offsetTop,behavior:'auto'});
    pageInfo();
  }
  $('prev-page').onclick=()=>turnPage(-1);$('next-page').onclick=()=>turnPage(1);
  stage.addEventListener('scroll',()=>{if(!manga.length || $('reading-mode').value!=='scroll')return;const top=stage.getBoundingClientRect().top;let visible=0;[...stage.children].forEach((img,i)=>{if(img.getBoundingClientRect().top<=top+stage.clientHeight*.35)visible=i;});pageIndex=visible;pageInfo();});
  stage.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();turnPage(e.key==='ArrowRight'?1:-1);}});
  let touchStart=null;
  stage.addEventListener('touchstart',e=>touchStart={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY},{passive:true});
  stage.addEventListener('touchend',e=>{if(!touchStart || $('reading-mode').value!=='swipe')return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy))turnPage(dx<0?1:-1);touchStart=null;},{passive:true});
  function paceLabel(){$('pace-value').textContent=$('reading-mode').value==='swipe'?`${Math.max(1,Math.round(600/Number($('pace').value)))} s/page`:`${$('pace').value} px/s`;}
  $('pace').oninput=paceLabel;$('reading-mode').addEventListener('change',paceLabel);
  function frame(time){
    if(!scrolling)return;
    const dt=lastFrame?Math.min((time-lastFrame)/1000,.1):0;lastFrame=time;
    if(!document.hidden){
      if($('reading-mode').value==='swipe'){pageElapsed+=dt;if(pageElapsed>=Math.max(1,Math.round(600/Number($('pace').value))))turnPage(1);}
      else if([...stage.children].every(img=>img.complete)){
        carry+=Number($('pace').value)*dt;const move=Math.floor(carry);carry-=move;stage.scrollTop+=move;
        if(stage.scrollTop+stage.clientHeight>=stage.scrollHeight-2){pageElapsed+=dt;if(pageElapsed>1.5){if(!$('next-book').checked || !openManga(bookIndex+1)){stopScroll();notify('You’ve reached the end.');}}}else pageElapsed=0;
      }
    }
    if(scrolling)requestAnimationFrame(frame);
  }
  $('auto-scroll').onclick=()=>{if(scrolling){stopScroll();return;}if(!manga.length){notify('Open a manga folder first.');return;}scrolling=true;$('auto-scroll').textContent='Pause auto-scroll';requestAnimationFrame(frame);};
  // Videos use browser-native controls and local object URLs; no media is uploaded.
  let videos=[],videoUrls=[],videoIndex=-1,videoStatusTimer=null;
  const video=$('video');
  async function play(){try{await video.play();}catch(e){if(e.name!=='AbortError')notify('Press play to start, or check that this video can be converted for the browser.');}}
  function stopVideoStatus(){clearInterval(videoStatusTimer);videoStatusTimer=null;}
  async function updateVideoStatus(item){
    if(!item.status)return;
    try{
      const response=await fetch(item.status),data=await response.json();
      if(videoIndex<0||videos[videoIndex]!==item)return;
      if(data.state==='converting')$('video-status').textContent=`Preparing this episode for the browser… ${data.progress||0}%${data.note?' · '+data.note:''}`;
      else if(data.state==='ready')stopVideoStatus();
      else if(data.state==='error'){$('video-status').textContent='This episode could not be converted.';stopVideoStatus();}
    }catch{}
  }
  function openVideo(index,autoplay=true){
    if(index<0||index>=videos.length)return;
    stopVideoStatus();videoIndex=index;video.pause();video.querySelectorAll('track').forEach(track=>track.remove());video.src=videos[index].src;video.playbackRate=Number($('video-speed').value);
    $('video-title').textContent=videos[index].name;$('video-status').textContent=/\.(mkv|avi|mov|mpv)$/i.test(videos[index].name)?'Preparing a browser-compatible copy. The first conversion can take a little while; it will be cached for next time.':'Loading episode…';document.querySelectorAll('#playlist button').forEach((b,i)=>b.classList.toggle('active',index===i));
    if(videos[index].status){updateVideoStatus(videos[index]);videoStatusTimer=setInterval(()=>updateVideoStatus(videos[index]),1000);}
    if(videos[index].subtitles){const track=document.createElement('track');track.kind='subtitles';track.label='Embedded subtitle track';track.srclang='en';track.src=videos[index].subtitles;track.default=true;track.addEventListener('load',()=>{track.track.mode='showing';$('video-status').textContent='Playing with embedded subtitles.';});track.addEventListener('error',()=>{$('video-status').textContent='Playing. No convertible embedded subtitle track was found.';});video.append(track);}
    $('prev-video').disabled=index===0;$('next-video').disabled=index===videos.length-1;if(autoplay)play();
  }
  function setVideoQueue(items,objectURLs=[]){
    video.pause();video.removeAttribute('src');video.load();release(videoUrls);videoUrls=objectURLs;videos=items;
    $('playlist').replaceChildren(...items.map((item,i)=>{const b=document.createElement('button');b.textContent=`${String(i+1).padStart(2,'0')}  ${item.name}`;b.title=item.name;b.onclick=()=>openVideo(i);return b;}));
    $('video-count').textContent=`${items.length} episode${items.length===1?'':'s'}`;
    if(items.length)openVideo(0,true);else{$('video-title').textContent='Nothing playing yet';$('video-status').textContent='No playable video files were found in that selection.';$('prev-video').disabled=true;$('next-video').disabled=true;notify('No supported video files were found in the selected folder.');}
  }
  function loadVideos(event){
    const files=Array.from(event.target.files).filter(f=>/\.(mp4|m4v|webm|ogv|mkv|avi|mov|mpv)$/i.test(f.name)).sort((a,b)=>natural(a.webkitRelativePath||a.name,b.webkitRelativePath||b.name));
    if(!files.length){notify('No video files found.');return;}
    const objectURLs=files.map(f=>URL.createObjectURL(f));setVideoQueue(files.map((f,i)=>({name:f.webkitRelativePath||f.name,src:objectURLs[i],subtitles:null})),objectURLs);event.target.value='';
  }
  $('video-files').onchange=loadVideos;
  $('test-mkv').onchange=event=>{
    const input=event.target,file=input.files[0];
    if(!file)return;
    const request=new XMLHttpRequest();
    request.open('POST',`/api/video-upload?name=${encodeURIComponent(file.name)}`);
    $('video-title').textContent=file.name;
    $('video-status').textContent='Copying the test MKV into Haven… 0%';
    request.upload.onprogress=progress=>{if(progress.lengthComputable)$('video-status').textContent=`Copying the test MKV into Haven… ${Math.round(progress.loaded/progress.total*100)}%`;};
    request.onload=()=>{
      input.value='';
      try{
        const data=JSON.parse(request.responseText);
        if(request.status<200||request.status>=300)throw new Error(data.error||'The MKV could not be uploaded');
        setVideoQueue([data.video]);
        notify('Test MKV loaded. Haven is preparing it for browser playback.');
      }catch(error){$('video-status').textContent=`Test failed: ${error.message}`;notify(error.message);}
    };
    request.onerror=()=>{input.value='';$('video-status').textContent='The test MKV could not be copied into Haven.';notify('The MKV upload failed.');};
    request.send(file);
  };
  async function loadAnimeFolder(path){
    const response=await fetch(`/api/folder-videos?path=${encodeURIComponent(path)}`),data=await response.json();if(!response.ok)throw new Error(data.error||'Could not read this video folder');
    if(!data.videos.length){notify('No supported video files were found in that folder or its subfolders.');return;}
    setVideoQueue(data.videos);closeFolderBrowser();notify(`${data.videos.length} episodes loaded into Haven’s browser playlist.`);
  }
  $('prev-video').onclick=()=>openVideo(videoIndex-1);$('next-video').onclick=()=>openVideo(videoIndex+1);
  $('replay').onclick=()=>{if(videoIndex<0)return;video.currentTime=0;play();};
  $('video-speed').onchange=()=>video.playbackRate=Number($('video-speed').value);
  video.onended=()=>{
    const looping=$('loop-series').checked, hasNext=videoIndex<videos.length-1;
    if(hasNext&&($('auto-next').checked||looping))openVideo(videoIndex+1);
    else if(looping&&videos.length)openVideo(0);
  };
  video.onloadeddata=()=>{stopVideoStatus();$('video-status').textContent='Episode ready in the browser player.';};
  video.onerror=()=>{stopVideoStatus();$('video-status').textContent='This video could not be prepared for browser playback.';notify('The video could not be converted. Check that the file contains a video track and is readable.');};
  $('fullscreen').onclick=async()=>{try{if(video.requestFullscreen)await video.requestFullscreen();else notify('Use your browser’s fullscreen control.');}catch{notify('Fullscreen is unavailable in this browser.');}};
  async function playAnimeFolder(path){
    const button=$('open-mpv-folder'),old=button.textContent;button.disabled=true;button.textContent='Starting MPV…';
    try{
      const response=await fetch('/api/mpv/open-folder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path})}),data=await response.json();
      if(!response.ok)throw new Error(data.error||'MPV could not be opened');
      if(data.opened)notify(`${data.count} episode${data.count===1?'':'s'} opened in MPV. The series will loop.`);
      else if(data.message)notify(data.message);
    }catch(error){notify(`Could not open MPV: ${error.message}. Start Haven with start-server.bat.`);}
      finally{button.disabled=false;button.textContent=old;}
  }
  $('open-mpv-folder').onclick=()=>openFolderBrowser('anime');
  $('folder-select').onclick=async()=>{if(!folderPath)return;const mode=folderMode,path=folderPath;try{if(mode==='anime')await loadAnimeFolder(path);else{closeFolderBrowser();await importCbzFolder(path);}}catch(error){notify(error.message);}};
  // Explicit saves keep a failed storage write from discarding the editor's contents.
  const STORAGE='haven.books.v1',PAGE_LIMIT=1200;let books=[],editing=null,dirty=false,editPages=[''],editPageIndex=0,readPages=[''],readPageIndex=0;
  function validBook(b){return b && typeof b.id==='string'&&typeof b.title==='string'&&typeof b.text==='string'&&typeof b.description==='string'&&/^#[0-9a-f]{6}$/i.test(b.color);}
  try{const stored=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(!Array.isArray(stored)||!stored.every(validBook))throw Error();books=stored;}catch{notify('Saved books could not be loaded. Import a backup or export before making changes.');}
  function persist(next){try{localStorage.setItem(STORAGE,JSON.stringify(next));books=next;return true;}catch{notify('Could not save: browser storage may be full or disabled. Keep this tab open and export a backup.');return false;}}
  function paginateText(text){
    if(!text)return [''];
    const sections=text.split('\f'),pages=[];
    for(let section of sections){
      if(!section){pages.push('');continue;}
      while(section.length>PAGE_LIMIT){let cut=Math.max(section.lastIndexOf('\n',PAGE_LIMIT),section.lastIndexOf(' ',PAGE_LIMIT));if(cut<PAGE_LIMIT*.55)cut=PAGE_LIMIT;pages.push(section.slice(0,cut));section=section.slice(cut).replace(/^\s/,'');}
      pages.push(section);
    }
    return pages.length?pages:[''];
  }
  function syncEditPage(){editPages[editPageIndex]=$('book-text').value;}
  function wordCount(){syncEditPage();const text=editPages.join(' ').trim();$('word-count').textContent=`${text?text.split(/\s+/).length:0} words · ${editPages.length} page${editPages.length===1?'':'s'}`;$('page-char-count').textContent=`${$('book-text').value.length.toLocaleString()} / ${PAGE_LIMIT.toLocaleString()} characters`;}
  function animatePage(element,direction){element.classList.remove('turn-forward','turn-back');void element.offsetWidth;element.classList.add(direction>0?'turn-forward':'turn-back');}
  function renderEditPage(direction=0){
    $('book-text').value=editPages[editPageIndex];$('edit-page-number').textContent=editPageIndex+1;$('edit-page-footer').textContent=`${editPageIndex+1} / ${editPages.length}`;
    $('edit-prev-page').disabled=editPageIndex===0;$('edit-next-page').disabled=editPageIndex===editPages.length-1;$('delete-page').disabled=editPages.length===1;wordCount();
    if(direction)animatePage(document.querySelector('.compose-page'),direction);
  }
  function renderShelf(){
    const q=$('book-search').value.toLowerCase();const visible=books.filter(b=>(b.title+' '+b.description).toLowerCase().includes(q));$('shelf').replaceChildren();
    if(!visible.length){const empty=document.createElement('div');empty.className='empty';const title=document.createElement('h2');title.textContent=q?'No stories found':'A shelf full of possibilities';const text=document.createElement('p');text.textContent=q?'Try a different title.':'Write your first book and give it a place here.';empty.append(title,text);$('shelf').append(empty);}
    for(const book of visible){const card=document.createElement('div');card.className='shelf-card';const cover=document.createElement('div');cover.className='cover';cover.style.backgroundColor=book.color;cover.textContent=book.title;const body=document.createElement('div');body.className='shelf-body';const desc=document.createElement('p');desc.textContent=book.description||'A story of your own.';const actions=document.createElement('div');actions.className='actions';for(const [name,fn] of [['Read',()=>readBook(book)],['Edit',()=>editBook(book)],['Delete',()=>{if(confirm(`Delete “${book.title}”? This cannot be undone.`)&&persist(books.filter(b=>b.id!==book.id))){renderShelf();notify('Book deleted.');}}]]){const button=document.createElement('button');button.textContent=name;if(name!=='Read')button.className='secondary';button.onclick=fn;actions.append(button);}body.append(desc,actions);card.append(cover,body);$('shelf').append(card);}
  }
  function showBooks(mode){$('shelf').hidden=mode!=='shelf';$('book-search').hidden=mode!=='shelf';$('editor').hidden=mode!=='editor';$('book-reader').hidden=mode!=='reader';}
  function mayLeave(){return !dirty||confirm('Leave without saving your latest changes?');}
  function editBook(book){if(!mayLeave())return;editing=book?book.id:crypto.randomUUID();$('book-title').value=book?.title||'';$('book-description').value=book?.description||'';$('book-color').value=book?.color||'#697961';editPages=paginateText(book?.text||'');editPageIndex=0;dirty=false;$('save-status').textContent='';showBooks('editor');renderEditPage();$('book-title').focus();}
  function draft(){syncEditPage();return {id:editing,title:$('book-title').value.trim()||'Untitled story',description:$('book-description').value.trim(),color:$('book-color').value,text:editPages.join('\f'),updatedAt:new Date().toISOString()};}
  function saveBook(){const book=draft();const next=books.some(b=>b.id===editing)?books.map(b=>b.id===editing?book:b):[book,...books];if(!persist(next))return false;dirty=false;$('save-status').textContent='Saved in this browser';renderShelf();return true;}
  function renderReadPage(direction=0){$('read-text').textContent=readPages[readPageIndex]||'This page is waiting to be written.';$('read-page-number').textContent=readPageIndex+1;$('read-page-count').textContent=`Page ${readPageIndex+1} of ${readPages.length}`;$('read-prev-page').disabled=readPageIndex===0;$('read-next-page').disabled=readPageIndex===readPages.length-1;if(direction)animatePage($('read-page'),direction);}
  function readBook(book){if(!mayLeave())return;dirty=false;$('read-title').textContent=book.title;readPages=paginateText(book.text);readPageIndex=0;showBooks('reader');renderReadPage();}
  $('new-book').onclick=()=>editBook();$('save-book').onclick=saveBook;
  $('read-book').onclick=()=>{if(saveBook())readBook(draft());};
  $('close-editor').onclick=()=>{if(mayLeave()){dirty=false;showBooks('shelf');renderShelf();}};
  $('close-reader').onclick=()=>showBooks('shelf');$('book-search').oninput=renderShelf;
  $('edit-prev-page').onclick=()=>{syncEditPage();if(editPageIndex>0){editPageIndex--;renderEditPage(-1);$('book-text').focus();}};
  $('edit-next-page').onclick=()=>{syncEditPage();if(editPageIndex<editPages.length-1){editPageIndex++;renderEditPage(1);$('book-text').focus();}};
  $('add-page').onclick=()=>{syncEditPage();editPages.splice(editPageIndex+1,0,'');editPageIndex++;dirty=true;$('save-status').textContent='Unsaved changes';renderEditPage(1);$('book-text').focus();};
  $('delete-page').onclick=()=>{if(editPages.length>1&&confirm(`Delete page ${editPageIndex+1}?`)){editPages.splice(editPageIndex,1);editPageIndex=Math.min(editPageIndex,editPages.length-1);dirty=true;$('save-status').textContent='Unsaved changes';renderEditPage(-1);}};
  $('read-prev-page').onclick=()=>{if(readPageIndex>0){readPageIndex--;renderReadPage(-1);}};$('read-next-page').onclick=()=>{if(readPageIndex<readPages.length-1){readPageIndex++;renderReadPage(1);}};
  document.addEventListener('keydown',event=>{if($('book-reader').hidden)return;if(event.key==='ArrowLeft'&&readPageIndex>0){readPageIndex--;renderReadPage(-1);}if(event.key==='ArrowRight'&&readPageIndex<readPages.length-1){readPageIndex++;renderReadPage(1);}});
  for(const id of ['book-title','book-description','book-color'])$(id).addEventListener('input',()=>{dirty=true;$('save-status').textContent='Unsaved changes';});
  $('book-text').addEventListener('input',()=>{editPages[editPageIndex]=$('book-text').value;dirty=true;$('save-status').textContent='Unsaved changes';wordCount();});
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  $('export-books').onclick=()=>{let exported=books;if(dirty && editing){const d=draft();exported=[...books.filter(b=>b.id!==editing),d];}const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,books:exported},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`haven-books-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Books exported, including any open draft.');};
  $('import-books').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.books)||!data.books.every(validBook))throw Error();const imported=data.books.map(b=>({...b,id:crypto.randomUUID()}));if(persist([...books,...imported])){renderShelf();notify(`${imported.length} books imported. Existing books were kept.`);}}catch{notify('That file is not a valid Haven bookshelf backup.');}event.target.value='';};
  pageInfo();renderShelf();route();
})();
