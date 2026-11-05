(() => {
  'use strict';
  const root=document.querySelector('.home-discord-features');if(!root)return;
  const tabs=Array.from(root.querySelectorAll('[role="tab"]'));
  function select(tab,focus=false){
    for(const item of tabs){
      const active=item===tab;
      item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;
      document.getElementById(item.getAttribute('aria-controls')).hidden=!active;
    }
    if(focus)tab.focus();
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>select(tab));
    tab.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      if(next!==undefined){event.preventDefault();select(tabs[next],true);}
    });
  });
  root.querySelectorAll('[data-profile-example]').forEach(button=>button.addEventListener('click',()=>{
    const cards=button.dataset.profileExample==='cards';
    root.querySelector('.dc-profile-home').hidden=cards;
    root.querySelector('.dc-profile-actions').hidden=cards;
    root.querySelector('.profile-look-picker').hidden=cards;
    root.querySelector('.dc-showcase').hidden=!cards;
    root.querySelector('.dc-showcase-actions').hidden=!cards;
    root.querySelector(cards?'[data-profile-example="home"]':'[data-profile-example="cards"]').focus();
  }));
})();
