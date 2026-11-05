(() => {
  'use strict';
  const root=document.querySelector('.member-header');if(!root)return;
  const menu=document.getElementById('member-account'),signin=document.getElementById('member-signin'),portrait=document.getElementById('member-avatar'),name=document.getElementById('member-name');
  const API=(window.NAMJOON_SITE?.apiBase||'').replace(/\/$/,'');
  const session=()=>{try{return sessionStorage.getItem('namjoon_session')||'';}catch{return '';}};
  let version=0;
  function identity(player){
    version++;
    const signed=!!player;menu.hidden=!signed;signin.hidden=signed;
    portrait.replaceChildren();
    if(!signed){menu.open=false;return;}
    name.textContent=player.name||'Discord account';portrait.textContent=(player.name||'A').slice(0,1).toUpperCase();
    if(player.avatar){
      let url;try{url=new URL(player.avatar);}catch{return;}
      // Use the Discord account avatar, rather than a custom bot profile image.
      if(url.protocol!=='https:'||!['cdn.discordapp.com','media.discordapp.net'].includes(url.hostname))return;
      const identityVersion=version,image=document.createElement('img');image.alt='';image.referrerPolicy='no-referrer';image.onload=()=>{if(identityVersion===version)portrait.replaceChildren(image);};image.src=url.href;
    }
  }
  async function load(){
    const sent=session();if(!sent||!API){identity(null);return;}
    const request=++version,controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(API+'/api/me',{headers:{Authorization:'Bearer '+sent},signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
      if(request!==version||sent!==session())return;
      if(response.status===401){identity(null);return;}
      if(!response.ok)throw Error('unavailable');
      const data=await response.json();if(request===version&&sent===session())identity(data.player);
    }catch{if(request===version&&sent===session())identity({name:'Account'});}
    finally{clearTimeout(timeout);}
  }
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});
  document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))menu.open=false;});
  menu.addEventListener('click',event=>{if(event.target.closest('a'))menu.open=false;});
  window.addEventListener('namjoon:identity',event=>identity(event.detail));
  window.addEventListener('pageshow',event=>{if(event.persisted)load();});
  document.getElementById('member-signout').addEventListener('click',async()=>{
    const accountLogout=document.getElementById('logout');
    if(document.body.dataset.page==='account'&&accountLogout){accountLogout.click();return;}
    const sent=session(),button=document.getElementById('member-signout');button.disabled=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
    try{if(sent&&API)await fetch(API+'/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+sent},signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});}catch{}
    finally{clearTimeout(timeout);try{sessionStorage.removeItem('namjoon_session');}catch{}identity(null);location.assign('./');}
  });
  // Account's existing profile request provides identity after an OAuth callback.
  if(document.body.dataset.page!=='account')load();
  else if(typeof profileData!=='undefined'&&profileData)identity(profileData.player);
})();
