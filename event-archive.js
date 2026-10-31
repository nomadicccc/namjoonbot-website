(() => {
'use strict';
const root=document.getElementById('archive'),list=document.getElementById('event-list'),dialog=document.getElementById('art-dialog');
let events=[];
const number=value=>new Intl.NumberFormat('en-GB').format(value);
const present=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const date=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(value));
function el(tag,text,cls){const item=document.createElement(tag);if(text!==undefined)item.textContent=text;if(cls)item.className=cls;return item;}
function safeImage(source){if(!source)return '';try{const url=new URL(source,location.href);return url.protocol==='https:'||url.origin===location.origin?url.href:'';}catch{return '';}}
function image(source,alt,cls){
 const img=el('img',undefined,cls);img.alt=alt;img.loading='lazy';img.decoding='async';
 img.addEventListener('error',()=>{const parent=img.parentElement;const fallback=el('span',cls?.includes('badge')?'âœ¦':'Preview unavailable',(cls||'')+' image-unavailable');fallback.setAttribute('role','img');fallback.setAttribute('aria-label',alt+' â€” preview unavailable');img.replaceWith(fallback);if(parent?.tagName==='BUTTON')parent.disabled=true;},{once:true});
 const src=safeImage(source);if(src)img.src=src;return img;
}
function artwork(item,label=item.name){
 const figure=el('figure',undefined,'art-tile'),button=el('button',undefined,'art-button');button.type='button';button.setAttribute('aria-label','Preview '+label);button.append(image(item.image,label));
 button.addEventListener('click',()=>{const preview=document.getElementById('art-preview');preview.src=safeImage(item.image);preview.alt=label;document.getElementById('art-caption').textContent=label;dialog.showModal();});
 figure.append(button,el('figcaption',label));return figure;
}
function section(title,note){const wrapper=el('section',undefined,'collection-section'),heading=el('div',undefined,'section-title');heading.append(el('h3',title));if(note)heading.append(el('small',note));wrapper.append(heading);return wrapper;}
function render(event){
 const pending=event.status!=='final',article=el('article',undefined,'event-detail');article.dataset.theme=event.theme||'default';
 const hero=el('div',undefined,'event-hero'),top=el('div',undefined,'hero-top');
 top.append(el('span',event.edition,'season-label'),el('span',pending?'Final results pending':'Archived','status-pill'));
 const identity=el('div',undefined,'event-identity'),copy=el('div');copy.append(el('h2',event.name),el('p',event.description,'event-description'));identity.append(image(event.badge,event.edition+' badge','hero-badge'),copy);
 const dates=el('div',undefined,'event-dates');
 dates.append(el('span','Earning: '+date(event.startsAt)+' â€“ '+date(event.earningEndsAt)+' Â· KST'),el('span','Shop closes: '+date(event.shopEndsAt)+' Â· KST'));
 hero.append(top,identity,dates);article.append(hero);
 const stats=el('dl',undefined,'stats'),days=Math.round((Date.parse(event.earningEndsAt)-Date.parse(event.startsAt))/86400000);
 for(const [label,value] of [['Earning Period',days+' days'],['Participants',pending?null:event.participants],['Candy Earned',pending?null:event.candyEarned],['Event Cards Collected',pending?null:event.cardsCollected]]){
  const item=el('div',undefined,'stat'),known=typeof value==='string'||present(value);item.append(el('dt',label),el('dd',known?(typeof value==='number'?number(value):value):'Results pending',known?'':'pending'));stats.append(item);
 }article.append(stats);
 const quest=el('section',undefined,'quest'),heading=el('div',undefined,'section-title');heading.append(el('h3',event.quest.name));
 const hasResults=!pending&&present(event.quest.total)&&present(event.quest.goal)&&event.quest.goal>0,percent=hasResults?event.quest.total/event.quest.goal*100:null;
 heading.append(el('span',hasResults?percent.toFixed(1)+'% complete':'Awaiting final total','quest-count'));quest.append(heading);
 if(hasResults){const bar=el('progress');bar.max=100;bar.value=Math.min(100,percent);bar.setAttribute('aria-label',event.name+' community quest completion');quest.append(bar);}
 else{const bar=el('div',undefined,'quest-pending');bar.setAttribute('aria-hidden','true');quest.append(bar);}
 const milestones=el('ul',undefined,'milestones');
 for(const milestone of event.quest.milestones||[]){const row=el('li');row.append(el('strong',(hasResults&&percent>=milestone.percent?'âœ“ ':'')+milestone.percent+'%'),el('span',milestone.reward));milestones.append(row);}
 quest.append(milestones,el('p',hasResults?number(event.quest.total)+' / '+number(event.quest.goal)+' '+event.quest.unit+' earned together.':'The final community total and completion percentage will be saved here after earning closes.','quest-note'));article.append(quest);
 const cards=section('The Photocards',event.cards.length+' members Â· Event edition'),strip=el('div',undefined,'card-strip');strip.tabIndex=0;strip.setAttribute('role','region');strip.setAttribute('aria-label','Event photocard gallery, scroll for more');event.cards.forEach(card=>strip.append(artwork(card)));cards.append(strip);article.append(cards);
 const banners=section('Profile Banners','A little seasonal colour'),grid=el('div',undefined,'banners');event.banners.forEach(banner=>grid.append(artwork(banner)));banners.append(grid);article.append(banners);
 const extras=el('div',undefined,'extras'),titles=el('section',undefined,'extra-panel'),titleHeading=el('div',undefined,'section-title');titleHeading.append(el('h3','Titles & Badge'));titles.append(titleHeading);
 const chips=el('div',undefined,'title-chips');event.titles.forEach(title=>{const chip=el('span',undefined,'title-chip');chip.append(image(event.badge,''),el('span',title));chips.append(chip);});
 const badge=el('div',undefined,'badge-showcase'),badgeCopy=el('div');badgeCopy.append(el('strong',event.edition+' Badge'),el('p','A keepsake from the season.'));badge.append(image(event.badge,event.edition+' badge'),badgeCopy);titles.append(chips,badge);
 const frames=el('section',undefined,'extra-panel'),frameHeading=el('div',undefined,'section-title');frameHeading.append(el('h3','The Toploader'));frames.append(frameHeading);
 event.frames.forEach(frame=>{const row=el('div',undefined,'frame-showcase'),text=el('div');text.append(el('strong',frame.name),el('p','An exclusive finishing touch for your collection.'));row.append(artwork(frame),text);frames.append(row);});extras.append(titles,frames);article.append(extras);
 if(event.limitedCard){const card=event.limitedCard,limited=el('section',undefined,'limited');if(card.revealed&&safeImage(card.image))limited.append(artwork(card));else{const hidden=el('div',undefined,'unrevealed');hidden.setAttribute('aria-label','OT7 artwork not yet unveiled');hidden.append(el('span','âœ¦'),el('small','Unrevealed'));limited.append(hidden);}
 const text=el('div');text.append(el('span','âœ¦ Limited edition Â· '+card.editionSize+' copies','edition-pill'),el('h4',card.name),el('p',card.revealed?'A rare keepsake from this event.':'A rare keepsake. Artwork will appear here after its official reveal.'));limited.append(text);article.append(limited);}
 article.append(el('p','A look back at what was available this season. Archive previews do not offer purchases or reward claims.','archive-footnote'));return article;
}
function selectEvent(id,updateHash=false){const selected=events.find(event=>event.id===id)||events[0];if(!selected)return;root.replaceChildren(render(selected));list.querySelectorAll('button').forEach(button=>button.setAttribute('aria-current',String(button.dataset.event===selected.id)));document.title=selected.name+' Â· Event Archive Â· NamjoonBot';if(updateHash)history.replaceState(null,'','#'+encodeURIComponent(selected.id));}
function fromHash(){let id='';try{id=decodeURIComponent(location.hash.slice(1));}catch{}selectEvent(id);}
document.getElementById('art-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
window.addEventListener('hashchange',fromHash);
fetch('./event-archive.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error('Archive unavailable');return response.json();}).then(data=>{
 events=data.events.slice().sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt));list.replaceChildren();document.getElementById('event-count').textContent=events.length+' event'+(events.length===1?'':'s');
 events.forEach(event=>{const button=el('button',undefined,'event-pill');button.type='button';button.dataset.event=event.id;button.dataset.theme=event.theme||'default';button.setAttribute('aria-controls','archive');const text=el('span',undefined,'pill-text');text.append(el('strong',event.name),el('small',event.edition));button.append(image(event.badge,'','pill-badge'),text,el('span','â€º','pill-arrow'));button.addEventListener('click',()=>selectEvent(event.id,true));list.append(button);});
 if(events.length)fromHash();else root.replaceChildren(el('p','Our first event memories will appear here soon.','notice'));
}).catch(()=>{root.replaceChildren(el('p','Event memories could not be loaded. Please refresh to try again.','notice'));list.replaceChildren(el('p','Events unavailable','muted'));});
})();
