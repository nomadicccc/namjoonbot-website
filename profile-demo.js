(() => {
  'use strict';
  const panel=document.getElementById('demo-profile');if(!panel)return;
  const image=panel.querySelector('.dc-profile-portrait'),banner=panel.querySelector('.dc-banner'),title=panel.querySelector('.dc-profile-title code');
  const choices=Array.from(panel.querySelectorAll('[data-profile-look]'));
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const looks=[
    {title:'Namjoon Biased',avatar:'avatar-rm.webp',banner:'banner-gradient-07.webp',description:'Land & Sky Gradient'},
    {title:'Jimin Biased',avatar:'avatar-jimin.webp',banner:'banner-gradient-03.webp',description:'Amethyst Gradient'},
    {title:'OT7',avatar:'avatar-jin.webp',banner:'banner-gradient-06.webp',description:'Sunset Gradient'},
  ];
  let index=0,timer=null,hovered=false,focused=false,manual=false,inView=true;
  function apply(next){
    index=next;const look=looks[index];title.textContent=look.title;
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
