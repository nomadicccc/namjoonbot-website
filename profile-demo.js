(() => {
  'use strict';
  const panel=document.getElementById('demo-profile');if(!panel)return;
  const image=panel.querySelector('.dc-profile-portrait'),banner=panel.querySelector('.dc-banner'),title=panel.querySelector('.dc-profile-title code');
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const looks=[{"label": "Warm", "title": "Pre-Debut Supporter \u00b7 OT7", "avatar": "mock-pfp-01.webp", "banner": "look-banner-bts_02.webp", "description": "BTS: The Comeback", "level": 12, "badges": ["founding_beta_tester", "supporter"]}, {"label": "Cocoa", "title": "The Most Beautiful Moment", "avatar": "mock-pfp-02.webp", "banner": "look-banner-bt21_01.webp", "description": "BT21: Sakura Blossom", "level": 25, "badges": ["supporter", "seven_stars"]}, {"label": "Mint", "title": "No More Dream", "avatar": "mock-pfp-03.webp", "banner": "look-banner-bt21_02.webp", "description": "BT21: Pool Party", "level": 12, "badges": ["founding_beta_tester", "supporter"]}, {"label": "Cosy", "title": "\uc544\ub9c8 \uadf8\uacf3\uc774 mi casa", "avatar": "mock-pfp-04.webp", "banner": "look-banner-housewarming_2026_banner.webp", "description": "Housewarming Party", "level": 12, "badges": ["housewarming_2026", "supporter"]}, {"label": "Pearl", "title": "OT7", "avatar": "mock-pfp-05.webp", "banner": "look-banner-bt21_03.webp", "description": "BT21: Sleepover", "level": 12, "badges": ["supporter", "housewarming_2026"]}, {"label": "Navy", "title": "We Are Bulletproof", "avatar": "mock-pfp-06.webp", "banner": "look-banner-bts_01.webp", "description": "BTS: Arirang", "level": 75, "badges": ["curator", "living_archive"]}, {"label": "Midnight", "title": "Fangs Out \u00b7 Sweeter than Sweet", "avatar": "mock-pfp-07.webp", "banner": "look-banner-halloween_2026_banner_2.webp", "description": "Blood Moon Phases", "level": 12, "badges": ["halloween_2026", "founding_beta_tester"]}];
  const badgeAssets={"founding_beta_tester": {"fallback": "\ud83e\uddea", "label": "Founding Beta Tester", "src": "https://cdn.discordapp.com/emojis/1540817354559201400.png?size=48"}, "supporter": {"fallback": "\ud83d\udc9c", "label": "Supporter"}, "seven_stars": {"fallback": "\ud83c\udf0c", "label": "Seven Stars"}, "housewarming_2026": {"fallback": "\ud83c\udfe0", "label": "Housewarming 2026", "src": "https://cdn.discordapp.com/emojis/1548267955807330375.png?size=48"}, "curator": {"fallback": "\u2728", "label": "Curator"}, "living_archive": {"fallback": "\ud83c\udfdb", "label": "Living Archive"}, "halloween_2026": {"fallback": "\ud83e\udd87", "label": "Halloween 2026", "src": "https://cdn.discordapp.com/emojis/1546655301573414922.png?size=48"}};
  let index=0,timer=null,hovered=false,focused=false,inView=true;
  function apply(next){
    index=next;const look=looks[index];title.textContent=look.title;
    const level=look.level||12;panel.querySelector('.dc-profile-level').textContent=level;panel.querySelector('.dc-profile-next-xp').textContent=(100+10*level+2*level*level).toLocaleString();
    image.src='./assets/features/'+look.avatar;banner.src='./assets/features/'+look.banner;banner.alt=look.description;
    const badges=panel.querySelector('.dc-profile-badges');badges.replaceChildren();
    for(const key of look.badges){const badge=badgeAssets[key];if(!badge)continue;
      const fallback=()=>{const span=document.createElement('span');span.textContent=badge.fallback;span.setAttribute('role','img');span.setAttribute('aria-label',badge.label);span.title=badge.label;return span;};
      if(badge.src){const icon=document.createElement('img');icon.className='dc-profile-badge';icon.alt=badge.label;icon.title=badge.label;icon.loading='lazy';icon.onerror=()=>icon.replaceWith(fallback());icon.src=badge.src;badges.append(icon);}
      else badges.append(fallback());
    }
  }
  function schedule(){
    clearTimeout(timer);timer=null;
    if(!panel.hidden&&!panel.querySelector('.dc-profile-home').hidden&&!hovered&&!focused&&inView&&!document.hidden&&!motion.matches&&!navigator.connection?.saveData){
      timer=setTimeout(()=>{apply((index+1)%looks.length);schedule();},5000);
    }
  }
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
