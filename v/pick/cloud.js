// This client only accesses pickplay_* tables. Login storage and logout are app-local.
(() => {
  const panel = document.createElement('details'); panel.className='cloud-panel';
  panel.innerHTML=`<summary>Account &amp; cloud lists</summary>
    <p>Local play needs no account. Sign in for automatic cloud saving of your lists.</p>
    <form id="cloudLogin"><label>Email<input id="cloudLoginEmail" type="email" autocomplete="username" required></label><label>Password<input id="cloudPassword" type="password" autocomplete="current-password" minlength="6" required></label><button type="submit">Sign in</button><button type="button" id="cloudSignup">Create account</button></form>
    <p id="cloudAccountNote">Already registered on the letters website? Use that account's email and password here. This login session is separate; accounts and password changes are shared.</p>
    <div id="cloudSignedIn" hidden><p id="cloudEmail"></p><div class="cloud-actions"><button id="cloudEnable">Enable Pick &amp; Play cloud lists</button><button id="cloudUpload" hidden>Save current list as a cloud copy</button><button id="cloudRefresh" hidden>Refresh cloud lists</button><button id="cloudLogout">Sign out of Pick &amp; Play</button></div><p>Cloud saves are separate copies. Importing adds a local list; it does not replace existing lists. Local copies remain on this browser after sign-out.</p><div id="cloudLists"></div></div>
    <p id="cloudStatus" role="status" aria-live="polite">Cloud connection loads when you open this panel.</p>`;
  document.querySelector('.workspace').before(panel);
  let client, user=null, generation=0, busy=false, loading;
  const status = text => $('cloudStatus').textContent=text;
  function failure(error) {
    if(['42P01','PGRST205'].includes(error.code))return 'Cloud tables are not set up yet. Run supabase/pickplay-setup.sql in Supabase SQL Editor.';
    return error.message || 'Connection failed. Your local lists are safe. Try again.';
  }
  async function init() {
    if(client)return client;
    if(!loading)loading=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
      script.onload=()=>resolve();script.onerror=()=>{script.remove();reject(new Error('Could not load cloud login. Check your connection and try again.'));};document.head.append(script);
    }).then(()=>{
      client=window.supabase.createClient('https://dtzzacrpqnintdcznnqn.supabase.co','sb_publishable_qXlz6gBu_M4GwjEEtZHZcg_d2pw0DFU', {auth:{storageKey:'pickplay-auth-v1',detectSessionInUrl:false}});
      client.auth.onAuthStateChange((event,session)=>{setUser(session?.user||null);});return client;
    }).catch(e=>{loading=null;throw e;});
    return loading;
  }
  function setUser(next) {
    if(user?.id===next?.id)return;
    generation++;user=next;$('cloudLists').replaceChildren();$('cloudSignedIn').hidden=!user;$('cloudLogin').hidden=!!user;$('cloudAccountNote').hidden=!!user;
    $('cloudEnable').hidden=false;$('cloudUpload').hidden=$('cloudRefresh').hidden=true;
    $('cloudEmail').textContent=user?`Signed in as ${user.email}`:'';
    status(user?'Connecting your saved lists…':'Signed out. Local lists are still available.');
    window.dispatchEvent(new CustomEvent('pickplay-auth-changed',{detail:user}));
  }
  async function run(action) {
    if(busy)return;busy=true;panel.querySelectorAll('button').forEach(b=>b.disabled=true);
    try {await init();await action();}catch(e){status(failure(e));}
    finally {busy=false;panel.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  panel.addEventListener('toggle',()=>{if(panel.open&&!client)run(async()=>{const {data,error}=await client.auth.getSession();if(error)throw error;setUser(data.session?.user||null);if(!user)status('Sign in or create an account to use cloud lists.');});});
  $('cloudLogin').onsubmit=e=>{e.preventDefault();run(async()=>{const {data,error}=await client.auth.signInWithPassword({email:$('cloudLoginEmail').value.trim(),password:$('cloudPassword').value});if(error)throw error;$('cloudPassword').value='';setUser(data.user);});};
  $('cloudSignup').onclick=()=>{if(!$('cloudLogin').reportValidity())return;run(async()=>{const {data,error}=await client.auth.signUp({email:$('cloudLoginEmail').value.trim(),password:$('cloudPassword').value});if(error)throw error;$('cloudPassword').value='';if(data.session)setUser(data.user);else status('Check your email to confirm your account, then return here and sign in. Existing users should use Sign in.');});};
  async function refresh() {
    const id=user?.id, version=generation;if(!id)throw new Error('Sign in first.');
    const {data,error}=await client.from('pickplay_lists').select('id,name,items,created_at').eq('owner_id',id).order('created_at',{ascending:false}).limit(100);
    if(error)throw error;if(version!==generation)return;
    $('cloudLists').replaceChildren();
    for(const list of data) {
      const row=document.createElement('div');row.className='cloud-list';const label=document.createElement('span');label.textContent=`${list.name} · ${new Date(list.created_at).toLocaleString()}`;
      const importButton=document.createElement('button');importButton.textContent='Import as local list';
      importButton.onclick=()=>{
        if(generation!==version)return;
        if($('newListBtn').disabled){status('Finish or cancel the current game before importing a list.');return;}
        if(!Array.isArray(list.items)||!list.items.every(x=>typeof x==='string'&&x.length<=48)){status('This cloud list has an unsupported format.');return;}
        persistLists();savedLists.push({name:String(list.name).slice(0,32),items:[...list.items]});currentListIndex=savedLists.length-1;items=[...list.items];persistLists();renderItems();renderSavedLists();status('Imported a local copy. Existing lists were kept.');
      };row.append(label,importButton);$('cloudLists').append(row);
    }
    status(data.length?`Loaded ${data.length} cloud copies (up to 100 most recent).`:'No cloud copies yet. Save your current list to start.');
  }
  $('cloudEnable').onclick=()=>run(async()=>{
    const id=user?.id,version=generation;if(!id)throw new Error('Sign in first.');
    const {data,error}=await client.from('pickplay_members').select('user_id').eq('user_id',id).maybeSingle();if(error)throw error;
    if(!data){const {error}=await client.from('pickplay_members').insert({user_id:id});if(error&&error.code!=='23505')throw error;}
    if(version!==generation)return;$('cloudEnable').hidden=true;$('cloudUpload').hidden=$('cloudRefresh').hidden=false;await refresh();
  });
  $('cloudUpload').onclick=()=>run(async()=>{
    if(!user)throw new Error('Sign in first.');
    persistLists();const list=savedLists[currentListIndex];
    const {error}=await client.from('pickplay_lists').insert({owner_id:user.id,name:list.name,items:[...list.items]});if(error)throw error;await refresh();
  });
  $('cloudRefresh').onclick=()=>run(refresh);
  $('cloudLogout').onclick=()=>run(async()=>{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;setUser(null);});
  window.pickplayCloud = { client: init, user: () => user, open: () => { panel.open=true;panel.scrollIntoView({behavior:'smooth'}); } };
})();
