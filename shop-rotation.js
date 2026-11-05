(() => {
  'use strict';
  const root = document.getElementById('shop-rotation');
  if(!root) return;
  const API = (window.NAMJOON_SITE?.apiBase || '').replace(/\/$/,'');
  const status = document.getElementById('shop-status');
  const retry = document.getElementById('shop-retry');
  let snapshot = null, busy = false, signature = '';
  const node = (tag,text,cls) => {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const number = value => Number(value).toLocaleString();
  function artwork(item){
    const wrap=node('div',undefined,'shop-item-image'),img=node('img');
    img.alt=item.name;img.loading='lazy';img.decoding='async';img.width=360;img.height=540;
    img.src=API+item.image;img.onerror=()=>wrap.replaceChildren(node('span','Artwork unavailable','shop-note'));
    wrap.append(img);return wrap;
  }
  function valid(data){
    return data && Array.isArray(data.packs) && data.packs.length > 0 && data.packs.length <= 3
      && Number.isFinite(Date.parse(data.packs_reset_at)) && data.frame
      && Number.isFinite(Date.parse(data.frame.resets_at))
      && [...data.packs,data.frame].every(item=>typeof item.name==='string' && /^\/api\/shop\/(packs|frames)\/[a-z0-9_]+\.webp$/.test(item.image) && Number.isSafeInteger(item.coin_cost) && item.coin_cost>=0)
      && Number.isSafeInteger(data.frame.petal_cost) && data.frame.petal_cost>=0;
  }
  function render(data){
    const next=JSON.stringify(data);
    if(next===signature)return;
    signature=next;
    const packs=document.getElementById('shop-packs');packs.replaceChildren();
    for(const pack of data.packs){
      const article=node('article',undefined,'shop-item'),info=node('div');
      info.append(node('h4',pack.name),node('p',number(pack.coin_cost)+' coins','shop-price'),node('p',pack.cards_per_pack+' cards per pack'));
      const link=node('a','View set →');link.href='./catalogue.html?set='+encodeURIComponent(pack.set);info.append(link);
      article.append(artwork(pack),info);packs.append(article);
    }
    const frame=data.frame,article=node('article',undefined,'shop-item'),info=node('div');
    info.append(node('h4',frame.name),node('p',number(frame.coin_cost)+' coins or '+number(frame.petal_cost)+' petals','shop-price'),node('p',frame.description,'shop-note'));
    article.append(artwork(frame),info);document.getElementById('shop-frame').replaceChildren(article);
  }
  function clock(){
    if(!snapshot)return;
    for(const [id,end] of [['pack-reset',snapshot.packs_reset_at],['frame-reset',snapshot.frame.resets_at]]){
      const ms=Date.parse(end)-Date.now(),target=document.getElementById(id);
      target.dateTime=end;
      if(ms<=0){target.textContent='Refreshing rotation…';continue;}
      const minutes=Math.ceil(ms/60000),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;
      target.textContent='Resets in '+(days?days+'d ':'')+(hours?hours+'h ':'')+mins+'m';
      target.title='Resets '+new Date(end).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
    }
    // Never present expired artwork and prices as the current rotation.
    if(Date.parse(snapshot.packs_reset_at)<=Date.now() || Date.parse(snapshot.frame.resets_at)<=Date.now()){
      document.getElementById('shop-packs').replaceChildren();document.getElementById('shop-frame').replaceChildren();
      signature='';status.textContent='The shop is refreshing. Checking the current rotation…';
    }
  }
  async function load(){
    if(busy || document.hidden)return;
    busy=true;retry.hidden=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{
      if(!API)throw Error('unavailable');
      const response=await fetch(API+'/api/shop',{signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok)throw Error('unavailable');
      const data=await response.json();if(!valid(data) || Date.parse(data.packs_reset_at)<=Date.now() || Date.parse(data.frame.resets_at)<=Date.now())throw Error('stale');
      snapshot=data;render(data);clock();status.textContent='';
    }catch{
      clock();status.textContent=snapshot && Date.parse(snapshot.packs_reset_at)>Date.now() && Date.parse(snapshot.frame.resets_at)>Date.now()
        ? 'Showing the last checked rotation. Live updates are temporarily unavailable.'
        : 'Shop information is unavailable. Use /shop in Discord to check the current rotation.';
      retry.hidden=false;
    }finally{busy=false;clearTimeout(timeout);}
  }
  retry.addEventListener('click',load);
  setInterval(()=>{if(!document.hidden){clock();if(!snapshot || Date.parse(snapshot.packs_reset_at)<=Date.now() || Date.parse(snapshot.frame.resets_at)<=Date.now())load();}},15000);
  setInterval(load,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){clock();load();}});
  load();
})();
