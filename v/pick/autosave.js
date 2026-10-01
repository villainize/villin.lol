(() => {
  let user=null,version=0,timer,busy=false,ready=false;
  const fingerprints=new Map();
  const fingerprint=l=>JSON.stringify([l.name,l.items]);
  const say=s=>$('listSaveStatus').textContent=s;
  // Keep the old panel's IDs for compatibility, but remove manual save/setup controls.
  $('cloudEnable').hidden=true;$('cloudUpload').hidden=true;
  const note=$('cloudSignedIn').querySelector('p:not(#cloudEmail)');
  if(note)note.textContent='Your edits save automatically. Local lists remain on this browser after sign-out. Cloud lists load when you sign in.';
  function store(){localStorage.setItem('pick-play-lists',JSON.stringify(savedLists));}
  function changed(){
    const list=savedLists[currentListIndex];if(!list)return;
    const fp=fingerprint(list),old=fingerprints.get(list.localId);fingerprints.set(list.localId,fp);
    const select=$('listSelect');Array.from(select.options).forEach((o,i)=>{const l=savedLists[i];if(l)o.textContent=`${l.name} · ${l.items.length} items`;});
    if(old===fp)return;
    if(user&&(!list.cloudOwner||list.cloudOwner===user.id)){
      list.cloudOwner=user.id;list.cloudId ||= crypto.randomUUID();list.cloudDirty=true;store();say('Saved on this device · Saving to cloud…');schedule();
    }else say(user?'Saved on this device. This list is linked to a different account.':'Saved automatically on this device.');
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(flush,650);}
  async function flush(){
    if(busy||!user||!ready)return;busy=true;const account=user.id,stamp=version;
    try{
      const client=await window.pickplayCloud.client();
      for(const list of savedLists.filter(l=>l.cloudOwner===account&&l.cloudDirty)){
        if(stamp!==version)return;
        const fp=fingerprint(list),{error}=await client.rpc('pickplay_list_save',{p_id:list.cloudId,p_name:list.name,p_items:[...list.items]});if(error)throw error;
        if(stamp!==version)return;if(fp===fingerprint(list))list.cloudDirty=false;store();
      }
      if(stamp===version)say('All changes saved to your account.');
    }catch(e){if(stamp===version)say(/PGRST202|42P01|PGRST205/.test(e.code||'')?'Saved on this device. Run supabase/pickplay-autosave.sql to enable cloud autosave.':'Saved on this device · Cloud save failed; will retry when online or on your next edit.');}
    finally{busy=false;if(stamp===version&&savedLists.some(l=>l.cloudOwner===account&&l.cloudDirty)) {clearTimeout(timer);timer=setTimeout(flush,15000);}}
  }
  async function load(account,stamp){
    try{
      const client=await window.pickplayCloud.client();const {data,error}=await client.from('pickplay_lists').select('id,name,items,created_at').eq('owner_id',account).order('created_at',{ascending:false}).limit(100);if(error)throw error;
      if(stamp!==version)return;
      for(const row of data){
        if(!Array.isArray(row.items)||!row.items.every(x=>typeof x==='string'))continue;
        let local=savedLists.find(l=>l.cloudId===row.id&&l.cloudOwner===account);
        if(!local){local={localId:crypto.randomUUID(),cloudId:row.id,cloudOwner:account,name:row.name,items:row.items};savedLists.push(local);}
        else if(!local.cloudDirty){local.name=row.name;local.items=row.items;}
      }
      store();fingerprints.clear();savedLists.forEach(l=>fingerprints.set(l.localId,fingerprint(l)));
      // Do not interrupt a local game already in progress.
      if(!$('newListBtn').disabled){items=[...savedLists[currentListIndex].items];renderItems();renderSavedLists();}
      ready=true;say('Cloud connected · New lists and edits save automatically.');await flush();
    }catch(e){if(stamp===version){ready=true;say('Saved on this device · Cloud connection unavailable. Check database setup or your connection.');schedule();}}
  }
  function auth(next){
    version++;user=next;ready=false;clearTimeout(timer);$('cloudEnable').hidden=$('cloudUpload').hidden=true;$('cloudRefresh').hidden=!user;
    if(user){say('Loading your saved lists…');setTimeout(()=>load(user?.id,version),0);}else say('Lists save automatically on this device.');
  }
  savedLists.forEach(l=>{l.localId ||= crypto.randomUUID();fingerprints.set(l.localId,fingerprint(l));});store();
  window.addEventListener('pickplay-lists-changed',changed);
  window.addEventListener('pickplay-auth-changed',e=>auth(e.detail));
  window.addEventListener('online',()=>{if(user)load(user.id,version);});
  $('cloudRefresh').onclick=()=>{if(user)load(user.id,version);};
  // Restore saved login even when the account panel is closed.
  window.pickplayCloud.client().then(async c=>{const {data}=await c.auth.getSession();if(data?.session&&!user)auth(data.session.user);}).catch(()=>say('Lists save automatically on this device. Cloud connection unavailable.'));
})();
