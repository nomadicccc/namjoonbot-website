(() => {
  'use strict';
  const image=document.querySelector('.hero-image'),frame=document.querySelector('.card-art');
  const API=(window.NAMJOON_SITE?.apiBase||'').replace(/\/$/,'');
  if(!image||!frame||!API)return;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  // One artwork selection per visit; no autoplay or ongoing stats polling.
  fetch(API+'/api/stats',{signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'})
    .then(response=>{if(!response.ok)throw Error();return response.json();})
    .then(data=>{
      const cards=(data.standard_cards||[]).filter(card=>typeof card.image==='string'&&/^\/api\/art\/[a-z0-9_]+\.png$/.test(card.image));
      if(!cards.length)return;const card=cards[Math.floor(Math.random()*cards.length)];
      image.onload=()=>{frame.classList.add('has-art');image.classList.add('ready');};
      image.src=API+card.image;image.alt=card.name+' — standard card artwork';
    }).catch(()=>{}).finally(()=>clearTimeout(timeout));
})();
