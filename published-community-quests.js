/* Published Studio quests: read-only announcements, progress and milestones. */
(() => {
  'use strict';
  const root=document.getElementById('published-community-quests'),link=document.getElementById('published-community-quest-link');
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const number=n=>n.toLocaleString('en-GB');
  const kst=value=>new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short',hourCycle:'h23'})+' KST';
  const remaining=target=>{const minutes=Math.max(0,Math.ceil((target-Date.now())/60000));return `${Math.floor(minutes/1440)}d ${Math.floor(minutes%1440/60)}h ${minutes%60}m`;};
  let quests=[],updated=null,signature='';
  function state(q,now=Date.now()){
    if(!q||typeof q.id!=='string'||typeof q.name!=='string'||!Array.isArray(q.milestones))return null;
    const start=Date.parse(q.starts_at),end=Date.parse(q.ends_at),claim=Date.parse(q.claim_ends_at);
    if(![start,end,claim].every(Number.isFinite)||start>=end||claim<end||now>=claim)return null;
    if(!Number.isSafeInteger(q.total)||q.total<0||!Number.isSafeInteger(q.goal)||q.goal<1||!Number.isSafeInteger(q.minimum_contribution)||q.minimum_contribution<1)return null;
    if(!q.milestones.length||q.milestones.length>50||q.milestones.some(m=>!Number.isSafeInteger(m.target)||m.target<1||!Array.isArray(m.reward_labels)||m.reward_labels.some(label=>typeof label!=='string')))return null;
    return {...q,start,end,claim,phase:now<start?'scheduled':now<end?'live':'claiming'};
  }
  function draw(states){
    const opened=new Set([...root.querySelectorAll('details[open]')].map(n=>n.dataset.quest));root.replaceChildren();
    for(const s of states){
      const card=el('article',undefined,'community-quest'),top=el('div',undefined,'cq-top'),heading=el('div');
      heading.append(el('span','Community quest','cq-eyebrow'),el('h2',s.name));
      top.append(heading,el('span',s.phase==='scheduled'?'Coming soon':s.phase==='claiming'?'Rewards available':s.total>=s.goal?'Goal complete ✓':'Live community quest','cq-status'));card.append(top);
      card.append(el('p',s.phase==='scheduled'?'New community quest coming soon.':s.phase==='claiming'?'Contributions have closed. Eligible players can still claim unlocked rewards.':s.description||'Work together to unlock community rewards.','cq-intro'));
      if(s.phase==='scheduled'&&s.description)card.append(el('p',s.description,'cq-intro'));
      card.append(el('p',s.task_label||s.task,'cq-next'));
      if(s.phase!=='scheduled'){
        const total=el('div',undefined,'cq-total');total.append(el('strong',`${number(s.total)} / ${number(s.goal)}`),el('span',`${number(Math.round(s.total/s.goal*1000)/10)}%`,'cq-percent'));
        const progress=el('progress');progress.max=s.goal;progress.value=Math.min(s.total,s.goal);progress.setAttribute('aria-label',s.name+' community progress');card.append(total,progress);
      }
      const target=s.phase==='scheduled'?s.start:s.phase==='live'?s.end:s.claim,label=s.phase==='scheduled'?'Starts':s.phase==='live'?'Ends':'Claim deadline';
      const timer=el('p',undefined,'cq-timer-line'),countdown=el('span',undefined,'published-cq-countdown');countdown.dataset.target=String(target);countdown.textContent=remaining(target);
      const time=el('time',kst(target));time.dateTime=new Date(target).toISOString();timer.append(label+' in ',countdown,' · ',time);card.append(timer);
      const details=el('details',undefined,'cq-rules');details.dataset.quest=s.id;details.open=opened.has(s.id);details.append(el('summary','Milestones & rewards'));
      const grid=el('div',undefined,'cq-milestones');
      for(const m of s.milestones){const unlocked=s.phase!=='scheduled'&&s.total>=m.target,item=el('article',undefined,'cq-milestone');item.dataset.unlocked=String(unlocked);item.append(el('span',number(m.target)+' contributions','cq-milestone-target'),el('h3',m.reward_labels.join(' + ')),el('span',unlocked?'✓ Unlocked':'Locked','cq-milestone-state'));grid.append(item);}details.append(grid);card.append(details);
      card.append(el('p',`Contribute at least ${number(s.minimum_contribution)} towards this task to qualify. Claim unlocked rewards in Discord through /quests → Community Events, or /community.`,'cq-eligibility'));
      root.append(card);
    }
  }
  function refresh(){
    if(!root)return;const now=Date.now(),stamp=Date.parse(updated),fresh=Number.isFinite(stamp)&&now-stamp<=300000&&stamp<=now+120000;
    const states=fresh?quests.map(q=>state(q,now)).filter(Boolean).sort((a,b)=>({live:0,claiming:1,scheduled:2}[a.phase]-{live:0,claiming:1,scheduled:2}[b.phase]||a.start-b.start)):[];
    root.hidden=!states.length;if(link)link.hidden=!states.length;
    const next=JSON.stringify(states.map(s=>[s.id,s.phase,s.total,s.goal,s.name,s.description,s.task_label,s.start,s.end,s.claim,s.minimum_contribution,s.milestones]));
    if(next!==signature){draw(states);signature=next;}
    root.querySelectorAll('.published-cq-countdown').forEach(n=>n.textContent=remaining(Number(n.dataset.target)));
  }
  window.NamjoonPublishedQuests={update(data,at){quests=Array.isArray(data)?data:[];updated=at;refresh();},state,refresh};
  refresh();setInterval(refresh,1000);document.addEventListener('visibilitychange',refresh);
})();
