(() => {
  'use strict';
  const scene=document.querySelector('.art'),card=document.querySelector('.photocard');
  const first=document.querySelector('.hero-image'),frame=document.querySelector('.card-art');
  const API=(window.NAMJOON_SITE?.apiBase||'').replace(/\/$/,'');
  if(!scene||!card||!first||!frame||!API)return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const second=document.createElement('img');second.className='hero-image';second.alt='';second.setAttribute('aria-hidden','true');frame.append(second);
  let deck=[],index=0,previous='',active=first,timer=null,pending=false,hasArt=false;
  let paused=Boolean(navigator.connection?.saveData),hovered=false,focused=false,inView=true,currentName='';
  const allowed=()=>!paused&&!hovered&&!focused&&!motion.matches&&!document.hidden&&inView;
  function label(){card.setAttribute('aria-pressed',String(paused));card.setAttribute('aria-label',(currentName?currentName+'. ':'')+(motion.matches?'Photocard preview':paused?'Resume photocard carousel':'Pause photocard carousel'));}
  function shuffle(){
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    if(deck.length>1&&deck[0].id===previous)[deck[0],deck[1]]=[deck[1],deck[0]];
    index=0;
  }
  function schedule(){clearTimeout(timer);timer=null;if(allowed()&&deck.length>1&&!pending)timer=setTimeout(showNext,6500);label();}
  function showNext(){
    if(pending||!deck.length||document.hidden||!inView)return;
    if(index>=deck.length)shuffle();
    const entry=deck[index++],url=API+entry.image,preload=new Image();pending=true;
    let done=false;
    const finish=success=>{
      if(done)return;done=true;clearTimeout(imageTimeout);pending=false;
      if(success&&!document.hidden&&inView){
        const target=active===first?second:first;target.src=url;target.alt='';target.setAttribute('aria-hidden','true');
        active.classList.remove('ready');target.classList.add('ready');frame.classList.add('has-art');active=target;
        previous=entry.id;currentName=entry.name||'Standard photocard';hasArt=true;
        const behind=deck.filter(item=>item.id!==entry.id);
        document.querySelectorAll('.stack-photo').forEach((image,i)=>{
          const other=behind[i%behind.length];if(!other)return;
          image.onerror=()=>image.remove();image.src=API+other.image;
        });
      }
      schedule();
    };
    const imageTimeout=setTimeout(()=>finish(false),10000);
    preload.onload=()=>finish(true);preload.onerror=()=>finish(false);preload.src=url;
  }
  function resetTilt(){scene.style.removeProperty('--tilt-x');scene.style.removeProperty('--tilt-y');}
  scene.addEventListener('pointermove',event=>{
    if(motion.matches||event.pointerType==='touch')return;
    const rect=scene.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const x=Math.max(-.5,Math.min(.5,(event.clientX-rect.left)/rect.width-.5));
    const y=Math.max(-.5,Math.min(.5,(event.clientY-rect.top)/rect.height-.5));
    scene.style.setProperty('--tilt-x',x*22+'deg');scene.style.setProperty('--tilt-y',-y*18+'deg');
  });
  scene.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'){hovered=true;schedule();}});
  scene.addEventListener('pointerleave',()=>{hovered=false;resetTilt();schedule();});
  card.addEventListener('focus',()=>{focused=true;schedule();});card.addEventListener('blur',()=>{focused=false;schedule();});
  card.addEventListener('click',()=>{paused=!paused;schedule();});
  motion.addEventListener('change',()=>{resetTilt();schedule();});
  document.addEventListener('visibilitychange',()=>{if(!hasArt&&!document.hidden)showNext();else schedule();});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView&&!hasArt)showNext();else schedule();},{threshold:.1}).observe(scene);
  window.addEventListener('pagehide',()=>{clearTimeout(timer);resetTilt();});
  window.addEventListener('pageshow',event=>{if(event.persisted)schedule();});
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  fetch(API+'/api/stats',{signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'})
    .then(response=>{if(!response.ok)throw Error();return response.json();})
    .then(data=>{
      const cards=Array.isArray(data.standard_cards)?data.standard_cards:[];
      deck=cards.filter(item=>typeof item.image==='string'&&/^\/api\/art\/[a-z0-9_]+\.png$/.test(item.image));
      shuffle();
      document.querySelectorAll('[data-gallery-card]').forEach(image=>{
        const entry=deck[Number(image.dataset.galleryCard)%deck.length];if(!entry)return;
        image.onerror=()=>image.remove();image.src=API+entry.image;
      });
      showNext();
    }).catch(()=>{}).finally(()=>clearTimeout(timeout));
  label();
})();
