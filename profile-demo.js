(() => {
  'use strict';
  const panel=document.getElementById('demo-profile');if(!panel)return;
  const image=panel.querySelector('.dc-profile-portrait'),banner=panel.querySelector('.dc-banner'),title=panel.querySelector('.dc-profile-title code');
  const choices=Array.from(panel.querySelectorAll('[data-profile-look]'));
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const looks=[{"label": "Warm", "title": "Pre-Debut Supporter \u00b7 OT7", "avatar": "mock-pfp-01.webp", "banner": "look-banner-bts_02.webp", "description": "BTS: The Comeback", "level": 12}, {"label": "Cocoa", "title": "The Most Beautiful Moment", "avatar": "mock-pfp-02.webp", "banner": "look-banner-bt21_01.webp", "description": "BT21: Sakura Blossom", "level": 25}, {"label": "Mint", "title": "No More Dream", "avatar": "mock-pfp-03.webp", "banner": "look-banner-bt21_02.webp", "description": "BT21: Pool Party", "level": 12}, {"label": "Cosy", "title": "\uc544\ub9c8 \uadf8\uacf3\uc774 mi casa", "avatar": "mock-pfp-04.webp", "banner": "look-banner-housewarming_2026_banner.webp", "description": "Housewarming Party", "level": 12}, {"label": "Pearl", "title": "OT7", "avatar": "mock-pfp-05.webp", "banner": "look-banner-bt21_03.webp", "description": "BT21: Sleepover", "level": 12}, {"label": "Navy", "title": "We Are Bulletproof", "avatar": "mock-pfp-06.webp", "banner": "look-banner-bts_01.webp", "description": "BTS: Arirang", "level": 75}, {"label": "Midnight", "title": "Fangs Out \u00b7 Sweeter than Sweet", "avatar": "mock-pfp-07.webp", "banner": "look-banner-halloween_2026_banner_2.webp", "description": "Blood Moon Phases", "level": 12}];
  let index=0,timer=null,hovered=false,focused=false,manual=false,inView=true;
  function apply(next){
    index=next;const look=looks[index];title.textContent=look.title;
    const level=look.level||12;panel.querySelector('.dc-profile-level').textContent=level;panel.querySelector('.dc-profile-next-xp').textContent=(100+10*level+2*level*level).toLocaleString();
    image.src='./assets/features/'+look.avatar;banner.src='./assets/features/'+look.banner;banner.alt=look.description;
    choices.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  }
  function schedule(){
    clearTimeout(timer);timer=null;
    if(!panel.hidden&&!panel.querySelector('.dc-profile-home').hidden&&!hovered&&!focused&&!manual&&inView&&!document.hidden&&!motion.matches&&!navigator.connection?.saveData){
      timer=setTimeout(()=>{apply((index+1)%looks.length);schedule();},6000);
    }
  }
  choices.forEach((button,i)=>button.addEventListener('click',()=>{manual=true;apply(i);schedule();}));
  panel.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'){hovered=true;schedule();}});
  panel.addEventListener('pointerleave',()=>{hovered=false;schedule();});
  panel.addEventListener('focusin',()=>{focused=true;schedule();});
  panel.addEventListener('focusout',event=>{if(!panel.contains(event.relatedTarget)){focused=false;schedule();}});
  new MutationObserver(schedule).observe(panel,{attributes:true,subtree:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',schedule);motion.addEventListener('change',schedule);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();},{threshold:.1}).observe(panel);
  window.addEventListener('pagehide',()=>clearTimeout(timer));window.addEventListener('pageshow',schedule);
  apply(0);schedule();
})();
