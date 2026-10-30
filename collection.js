'use strict';
const pageKind = document.body.dataset.page;
const API = (window.NAMJOON_SITE?.apiBase || '').replace(/\/$/,'');
const statusEl = document.getElementById('status');
const grid = document.getElementById('cards');
const modal = document.getElementById('card-modal');
const modalBody = document.getElementById('modal-body');
const $ = id => document.getElementById(id);
const fmt = n => Number(n || 0).toLocaleString('en-GB');
const label = text => String(text || '').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
let allCards = [], currentPage = 1, pages = 1, view = 'profile';
let requestVersion = 0, inventoryLoaded = false, profileData = null;
let mediaVersion = 0, imageURLs = new Set(), profileURLs = new Set();
let token = sessionStorage.getItem('namjoon_session') || '';
let catalogueReady = false, loginConfigured = false;
let showCatalogueSpoilers = false;
function catalogueSpoilerHidden(card) {
  return pageKind === 'catalogue' && !showCatalogueSpoilers &&
    (card.type === 'secret' || (card.rarities || []).includes('secret_mythical'));
}
function catalogueSearchText(card) {
  return catalogueSpoilerHidden(card) ? 'secret mythical card' : (card.name+' '+card.id).toLowerCase();
}
const catalogueSpoilerSwitch = $('show-catalogue-spoilers');
if(catalogueSpoilerSwitch) {
  catalogueSpoilerSwitch.checked = false;
  catalogueSpoilerSwitch.addEventListener('change',() => {
    showCatalogueSpoilers = catalogueSpoilerSwitch.checked;
    modal.close(); modalBody.replaceChildren();
    if(catalogueReady) renderCatalogue();
  });
  window.addEventListener('pageshow',() => {
    catalogueSpoilerSwitch.checked = false; showCatalogueSpoilers = false;
    modal.close(); modalBody.replaceChildren();
    if(catalogueReady) renderCatalogue();
  });
}
let collectionData=null, collectionPage=1, collectionPages=1, wishData=null;
let collectionRequest=0, wishRequest=0;
function el(tag,text,className) {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function status(message,error=false){statusEl.textContent=message;statusEl.classList.toggle('error',error);}
function clearURLs(urls){urls.forEach(url=>URL.revokeObjectURL(url));urls.clear();}
function clearSession(){window.clearBinderBeta?.();sessionStorage.removeItem('namjoon_session');token='';profileData=null;inventoryLoaded=false;requestVersion++;mediaVersion++;collectionRequest++;wishRequest++;collectionData=null;wishData=null;$('collection-cards')?.replaceChildren();$('collection-summary')?.replaceChildren();$('wish-cards')?.replaceChildren();clearURLs(imageURLs);clearURLs(profileURLs);grid.replaceChildren();$('profile')?.replaceChildren();$('account-content').hidden=true;$('account-actions').hidden=true;$('login-panel').hidden=false;$('login').disabled=!loginConfigured;modal.close();}
async function api(path,{method='GET',body,privateRequest=false,blob=false}={}) {
  if(!API) throw new Error('The live service has not been connected yet.');
  const headers={};
  const sentToken = token;
  if(body!==undefined)headers['Content-Type']='application/json';
  if(privateRequest) {if(!token)throw new Error('Please sign in with Discord.');headers.Authorization='Bearer '+token;}
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
  try {
    const response=await fetch(API+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    if(response.status===401 && privateRequest){if(sentToken===token)clearSession();throw new Error('Your session has expired. Please sign in again.');}
    if(!response.ok){let message='The service is temporarily unavailable.';try{message=(await response.json()).error || message;}catch{}throw new Error(message);}
    return blob?await response.blob():await response.json();
  } catch(error) {if(error.name==='AbortError')throw new Error('The service took too long to respond. Please try again.');throw error;}
  finally{clearTimeout(timer);}
}
function noResults(message){grid.replaceChildren(el('div',message,'empty'));grid.firstChild.style.gridColumn='1 / -1';}
function setPager(total,pageCount){
  pages=pageCount;$('page-info').textContent='Page '+currentPage+' of '+pages+' · '+fmt(total)+' '+(pageKind==='catalogue'?'designs':'cards');
  $('prev').disabled=currentPage<=1;$('next').disabled=currentPage>=pages;
}
function applyRarity(element,rarity){
  const key=String(rarity || '').toLowerCase().replace(/[\s-]+/g,'_');
  if(['mythical','secret_mythical'].includes(key))element.dataset.rarity=key;
}
function imagePlaceholder(){const p=el('div',undefined,'artwrap');return p;}

async function showTopCollectors(card) {
  const section=el('section',undefined,'top-collectors');
  section.setAttribute('aria-label','Top collectors');
  section.append(el('span','THE COLLECTION CLUB','collectors-eyebrow'),el('h3','Top Collectors'),el('p','Copies currently owned across all variants.','collectors-note'));
  const content=el('div','Loading collectors…','collectors-content');content.setAttribute('aria-live','polite');section.append(content);modalBody.append(section);
  async function load() {
    content.replaceChildren(el('p','Loading collectors…','muted'));
    try {
      const data=await api('/api/catalogue/'+encodeURIComponent(card.id)+'/collectors');
      if(!section.isConnected)return;
      const list=el('ol',undefined,'collectors-list');
      for(const [index,collector] of data.collectors.entries()){
        const row=el('li'),rank=el('span',String(index+1).padStart(2,'0'),'collector-rank'),identity=el('div',undefined,'collector-identity');
        if(collector.avatar){const avatar=el('img');avatar.src=collector.avatar;avatar.alt='';avatar.loading='lazy';avatar.className='collector-avatar';avatar.onerror=()=>avatar.remove();row.append(avatar);}
        identity.append(el('span',collector.name,'collector-name'));
        if(collector.supporter)identity.append(el('span','♡ Supporter','collector-supporter'));
        row.prepend(rank);row.append(identity,el('span',fmt(collector.copies)+(collector.copies===1?' copy':' copies'),'collector-count'));list.append(row);
      }
      content.replaceChildren(data.collectors.length?list:el('p','No copies are currently held in player inventories.','muted'));
    }catch{
      if(!section.isConnected)return;
      const retry=el('button','Try again','btn');retry.type='button';retry.onclick=load;
      content.replaceChildren(el('p','Collector rankings are temporarily unavailable.','muted'),retry);
    }
  }
  await load();
}

function openDetails(card,isInventory,source) {
  if(!isInventory && catalogueSpoilerHidden(card)) {
    modalBody.replaceChildren(el('h2','Secret Mythical card'),el('p','Turn on “Show spoilers” above the catalogue to reveal discovered card names and artwork.'));
    modal.showModal();
    return;
  }
  modalBody.replaceChildren(el('h2',card.name));
  if(source){const image=el('img');image.src=source;image.alt=card.name;image.draggable=false;if(isInventory){const stage=el('div',undefined,'interactive-card-stage');applyRarity(stage,card.rarity);stage.append(image);modalBody.append(stage);}else modalBody.append(image);}
  if(isInventory){
    modalBody.append(el('p',label(card.rarity)+' · Print #'+fmt(card.serial)+' / '+fmt(card.printed)));
    modalBody.append(el('p',card.code));
    if(card.signed)modalBody.append(el('p','Signed by '+label(card.signed)));
    if(card.birthday)modalBody.append(el('p','Birthday variant · '+label(card.birthday)));
    modalBody.append(el('p','Status: '+label(card.availability)+(card.favorite?' · Favourite':'')));
    modalBody.append(el('p','Use /view in Discord with the card code to manage this card.'));
  } else {
    modalBody.append(el('p',label(card.set)+' · '+label(card.type)+' · '+fmt(card.printed)+' printed across all variants'));
    const list=el('div',undefined,'rarity-list');
    card.rarities.forEach(rarity=>list.append(el('span',label(rarity)+' · '+fmt(card.printed_by_rarity[rarity] || 0)+' printed','tag')));
    modalBody.append(list,el('p','Artwork preview. Borders and variant details depend on the rarity and card you pull.'));
    void showTopCollectors(card);
  }
  modal.showModal();
}
function cardTile(card,isInventory){
  if(!isInventory && catalogueSpoilerHidden(card)) {
    const article=el('article',undefined,'card catalogue-card spoiler-hidden');
    const button=el('button',undefined,'card-button');button.type='button';
    button.setAttribute('aria-label','Secret Mythical card. Spoilers hidden.');
    const art=el('div',undefined,'artwrap spoiler-placeholder');
    const mark=el('span','✦','spoiler-mark');mark.setAttribute('aria-hidden','true');
    art.append(mark,el('span','Unrevealed','spoiler-caption'));
    const info=el('div',undefined,'card-info');
    info.append(el('span','Secret Mythical','tag'),el('h3','A secret to discover'),el('p','Turn on spoilers to reveal this card.'));
    button.append(art,info);article.append(button);
    button.onclick=()=>openDetails(card,false,null);
    return {article,art,setImage:()=>{}};
  }
  const article=el('article',undefined,'card'+(isInventory?'':' catalogue-card'));
  const button=el('button',undefined,'card-button');button.type='button';button.setAttribute('aria-label','View '+card.name);
  const art=imagePlaceholder(),info=el('div',undefined,'card-info');
  if(isInventory){applyRarity(article,card.rarity);applyRarity(art,card.rarity);}
  info.append(el('span',isInventory?label(card.rarity):label(card.set),'tag'),el('h3',card.name));
  if(isInventory){info.append(el('p','Print #'+fmt(card.serial)+' / '+fmt(card.printed)),el('p',card.code,'code'));if(card.signed || card.birthday)info.append(el('p',[card.signed?'Signed':'',card.birthday?'Birthday':''].filter(Boolean).join(' · ')));}
  else info.append(el('p',fmt(card.printed)+' printed'),el('p',card.rarities.map(label).join(' · ')));
  let loadedSource=null;
  function setImage(src){loadedSource=src;const image=el('img');image.src=src;image.alt=card.name;image.draggable=false;image.loading='lazy';image.onerror=()=>{image.remove();art.append(el('span','Artwork unavailable','muted'));};art.replaceChildren(image);}
  button.append(art,info);article.append(button);button.onclick=()=>openDetails(card,isInventory,loadedSource);
  if(!isInventory && card.image)setImage(API+card.image);
  else if(!isInventory)art.append(el('span','Artwork unavailable','muted'));
  return {article,setImage,art};
}
function populateSets(cards){
  const selected=$('set').value;
  $('set').replaceChildren(new Option('All sets','all'));
  [...new Set(cards.map(card=>card.set))].sort().forEach(set=>$('set').append(new Option(label(set),set)));
  if([...$('set').options].some(option=>option.value===selected))$('set').value=selected;
}
async function loadCatalogue(){
  if(pageKind==='catalogue')status('Loading the catalogue…');
  try{const data=await api('/api/catalogue');allCards=data.cards;catalogueReady=true;populateSets(allCards);if(pageKind==='catalogue')renderCatalogue();return data;}
  catch(error){if(pageKind==='catalogue'){status(error.message,true);noResults('The catalogue is unavailable right now.');}throw error;}
}
function renderCatalogue(){
  const query=$('search').value.trim().toLowerCase(),member=$('member').value,set=$('set').value,rarity=$('rarity').value;
  const matches=allCards.filter(card=>(!query || catalogueSearchText(card).includes(query))&&(member==='all'||card.members.includes(member))&&(set==='all'||card.set===set)&&(rarity==='all'||card.rarities.includes(rarity)));
  pages=Math.max(1,Math.ceil(matches.length/24));currentPage=Math.min(currentPage,pages);
  grid.replaceChildren();matches.slice((currentPage-1)*24,currentPage*24).forEach(card=>grid.append(cardTile(card,false).article));
  if(!matches.length)noResults('No cards match these filters.');
  setPager(matches.length,pages);status(fmt(matches.length)+' matching designs · Counts refresh from the bot approximately every 30 seconds.');
}
async function privateImage(path,urls){
  const blob=await api(path,{privateRequest:true,blob:true});const url=URL.createObjectURL(blob);urls.add(url);return url;
}
async function loadInventory(){
  if(!token)return;
  const version=++requestVersion;mediaVersion++;const versionMedia=mediaVersion;
  clearURLs(imageURLs);status('Loading your inventory…');
  const params=new URLSearchParams({page:currentPage,q:$('search').value,member:$('member').value,set:$('set').value,rarity:$('rarity').value,sort:$('sort').value,variant:$('variant').value});
  try{
    const data=await api('/api/me/inventory?'+params,{privateRequest:true});if(version!==requestVersion || !token)return;
    currentPage=data.page;grid.replaceChildren();const jobs=[];
    data.cards.forEach(card=>{const tile=cardTile(card,true);grid.append(tile.article);jobs.push(async()=>{try{const source=await privateImage(card.image,imageURLs);if(versionMedia===mediaVersion && tile.article.isConnected)tile.setImage(source);else{URL.revokeObjectURL(source);imageURLs.delete(source);}}catch{if(tile.article.isConnected)tile.art.append(el('span','Artwork unavailable','muted'));}});});
    if(!data.cards.length)noResults('No cards match these filters. Try another selection, or start collecting in Discord.');
    setPager(data.total,data.pages);inventoryLoaded=true;status(fmt(data.total)+' matching cards · Updated just now.');
    let next=0;
    async function worker(){while(next<jobs.length && versionMedia===mediaVersion && token){const job=jobs[next++];await job();}}
    void Promise.all(Array.from({length:4},worker));
  }catch(error){if(version===requestVersion)status(error.message,true);}
}
function statCard(name,value){const n=el('div',undefined,'stat');n.append(el('strong',typeof value==='number'?fmt(value):value),el('span',name));return n;}
async function renderProfile(data){
  clearURLs(profileURLs);const box=$('profile');box.replaceChildren();
  if(!data.exists){box.append(el('h2','No player profile yet.'),el('p','Use /profile in a Discord server with NamjoonBot to start your account. Then refresh this page.','muted'));return;}
  const activeToken=token;
  if(data.banner){const image=el('img');image.className='profile-banner';image.alt='Your equipped profile banner';box.append(image);try{const source=await privateImage(data.banner,profileURLs);if(token!==activeToken){URL.revokeObjectURL(source);profileURLs.delete(source);return;}image.src=source;}catch{image.remove();}}
  const identity=el('div',undefined,'identity'),portrait=el('div',data.player.name.slice(0,1),'avatar');
  const text=el('div');text.append(el('h2',data.player.name),el('div',data.titles.join(' · '),'titles'));identity.append(portrait,text);box.append(identity);
  if(data.avatar){const image=el('img');image.className='avatar';image.alt='Your profile picture';image.onerror=()=>image.replaceWith(portrait);if(data.avatar.startsWith('/api/')){try{const source=await privateImage(data.avatar,profileURLs);if(token!==activeToken){URL.revokeObjectURL(source);profileURLs.delete(source);return;}image.src=source;portrait.replaceWith(image);}catch{}}else{image.src=data.avatar;portrait.replaceWith(image);}}
  const metrics=el('div',undefined,'stat-grid');
  [['Level',data.progression.level],['Bora Coins',data.coins],['Smeraldo Petals',data.petals],['Cards owned',data.owned_cards],['Packs opened',data.stats.packs_opened],['Total cards pulled',data.stats.total_cards_pulled],['Unique variants pulled',data.stats.unique_cards_pulled],['Lifetime XP',data.stats.total_xp]].forEach(([name,value])=>metrics.append(statCard(name,value)));
  box.append(metrics);
  const p=data.progression;
  if(p.next_level_xp){box.append(el('p',fmt(p.current_level_xp)+' / '+fmt(p.next_level_xp)+' XP to the next level','muted'));const progress=el('progress');progress.className='xp';progress.max=p.next_level_xp;progress.value=p.current_level_xp;progress.setAttribute('aria-label','Progress to next level');box.append(progress);}
  if(data.stats.most_pulled_member)box.append(el('p','Most pulled member: '+data.stats.most_pulled_member+' · '+Number(data.stats.most_pulled_member_percentage).toFixed(1)+'%','muted'));
  box.append(el('h3','Your badges'));const badges=el('div',undefined,'badge-list');
  data.badges.forEach(badge=>{const item=el('span',undefined,'badge');item.title=badge.description;if(badge.image){const image=el('img');image.src=badge.image;image.alt='';image.loading='lazy';image.onerror=()=>image.remove();item.append(image);}item.append(el('span',badge.name));badges.append(item);});
  box.append(badges);if(!data.badges.length)badges.append(el('p','No badges earned yet.','muted'));
  const heading=el('h3','Your showcase');heading.style.marginTop='28px';box.append(heading,el('p','Your equipped Discord profile cards. Change your selection in Discord.','muted'));
  const showcase=el('div',undefined,'grid showcase-grid');box.append(showcase);
  const entries=data.showcase || [];
  entries.forEach(card=>{
    const tile=cardTile(card,true);showcase.append(tile.article);
    privateImage(card.image,profileURLs).then(source=>{
      if(token===activeToken && tile.article.isConnected)tile.setImage(source);
      else {URL.revokeObjectURL(source);profileURLs.delete(source);}
    }).catch(()=>{if(tile.article.isConnected)tile.art.append(el('span','Artwork unavailable','muted'));});
  });
  for(let slot=entries.length;slot<3;slot++)showcase.append(el('div','Empty showcase slot','empty showcase-empty'));

}
async function loadProfile(){
  const version=++requestVersion;
  status('Loading your profile…');
  try{const data=await api('/api/me',{privateRequest:true});if(version!==requestVersion || !token)return;
    profileData=data;window.checkBinderBetaAccess?.();$('login-panel').hidden=true;$('account-actions').hidden=false;$('account-content').hidden=false;$('signed-in').textContent='Signed in as '+data.player.name;
    await renderProfile(data);if(version===requestVersion && token)status('Your current bot profile · Use /profile in Discord to customise it.');
  }catch(error){status(error.message,true);}
}
function selectTab(next){
  view=next;document.body.classList.toggle('view-profile',next==='profile');
  for(const name of ['profile','inventory','collections','wishlist','binders']){
    $(name).hidden=name!==next;const button=$(name+'-tab');button.classList.toggle('active',name===next);button.setAttribute('aria-selected',String(name===next));
  }
  if(next==='binders')window.openBinderBeta?.();
  if(next==='inventory'&&!inventoryLoaded)loadInventory();
  if(next==='collections'){if(collectionData)renderCollections();else loadCollections();}
  if(next==='wishlist'){if(wishData)renderWishes();else loadWishes();}
}
async function beginLogin(){
  $('login').disabled=true;status('Opening Discord…');
  try{
    const bytes=crypto.getRandomValues(new Uint8Array(32));const proof=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(proof));const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const pending=await api('/api/auth/start',{method:'POST',body:{proof_hash:hash}});
    sessionStorage.setItem('namjoon_login',JSON.stringify({state:pending.state,proof,at:Date.now()}));
    location.assign(pending.url);
  }catch(error){status(error.message,true);$('login').disabled=false;}
}
async function bootstrapAccount(){
  const params=new URLSearchParams(location.search);
  const isCallback=params.has('code')||params.has('error');
  // Remove codes from the address bar before loading user media or external resources.
  if(isCallback)history.replaceState(null,'',location.pathname);
  try{
    const availability=await api('/api/auth/status');loginConfigured=availability.configured;$('login').disabled=!loginConfigured;
    if(params.has('error')){sessionStorage.removeItem('namjoon_login');throw new Error('Discord sign-in was cancelled. You can try again.');}
    if(params.has('code')){
      const pending=JSON.parse(sessionStorage.getItem('namjoon_login')||'null');sessionStorage.removeItem('namjoon_login');
      if(!pending || params.get('state')!==pending.state || Date.now()-pending.at>600000)throw new Error('This login did not start in this browser, or expired. Please sign in again.');
      if(params.has('iss') && params.get('iss')!=='https://discord.com')throw new Error('Unexpected login provider.');
      status('Verifying your Discord account…');
      const result=await api('/api/auth/exchange',{method:'POST',body:{code:params.get('code'),state:pending.state,proof:pending.proof}});
      token=result.session;sessionStorage.setItem('namjoon_session',token);
    }
    if(token){await loadProfile();void loadCatalogue().catch(()=>{});}
    else status(loginConfigured?'Sign in to view your existing profile and cards.':'Discord login is awaiting setup. The public catalogue is available now.');
  }catch(error){status(error.message,true);}
}
$('close-modal').addEventListener('click',()=>modal.close());
modal.addEventListener('click',event=>{if(event.target===modal){const b=modal.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)modal.close();}});
let filterTimer;
for(const id of ['search','member','set','rarity','sort','variant']){
  const input=$(id);if(!input)continue;
  input.addEventListener(id==='search'?'input':'change',()=>{clearTimeout(filterTimer);filterTimer=setTimeout(()=>{currentPage=1;if(pageKind==='catalogue'&&catalogueReady)renderCatalogue();else if(pageKind==='account'&&token)loadInventory();},id==='search'?250:0);});
}
for(const [id,delta] of [['prev',-1],['next',1]])$(id).addEventListener('click',()=>{currentPage=Math.max(1,Math.min(pages,currentPage+delta));if(pageKind==='catalogue')renderCatalogue();else loadInventory();});
$('refresh').addEventListener('click',()=>{if(pageKind==='catalogue')loadCatalogue().catch(()=>{});else if(view==='inventory')loadInventory();else if(view==='collections')loadCollections();else if(view==='wishlist')loadWishes();else loadProfile();});
if(pageKind==='catalogue')loadCatalogue().catch(()=>{});
else{
  $('login').addEventListener('click',beginLogin);
  $('logout').addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST',privateRequest:true});}catch{}finally{clearSession();status('Signed out.');}});
  $('profile-tab').addEventListener('click',()=>selectTab('profile'));
  $('inventory-tab').addEventListener('click',()=>selectTab('inventory'));
  document.body.classList.add('view-profile');
  $('collections-tab').addEventListener('click',()=>selectTab('collections'));
  $('wishlist-tab').addEventListener('click',()=>selectTab('wishlist'));
  const tabs=['profile','inventory','collections','wishlist','binders'].map(name=>$(name+'-tab'));
  tabs.forEach((tab,index)=>tab.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const next=tabs[(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length];next.focus();next.click();}}));
  bootstrapAccount();
}

function variantMatches(item,kind){
  return kind==='all' || (kind==='unsigned'&&!item.signed&&!item.birthday) || (kind==='signed'&&!!item.signed) || (kind==='birthday'&&!!item.birthday);
}
async function loadCollections(){
  const version=++collectionRequest;const activeToken=token;status('Loading collection progress…');
  try{
    const data=await api('/api/me/collections?basis='+$('collection-basis').value,{privateRequest:true});
    if(version!==collectionRequest || token!==activeToken || !token)return;
    collectionData=data;collectionPage=1;
    const selected=$('collection-set').value;
    $('collection-set').replaceChildren(new Option('All sets','all'));
    Object.keys(data.summaries || Object.fromEntries(data.cards.map(card=>[card.set,{}]))).sort().forEach(set=>$('collection-set').append(new Option(label(set),set)));
    if([...$('collection-set').options].some(option=>option.value===selected))$('collection-set').value=selected;
    renderCollections();status('Collection progress updated · '+(data.basis==='owned'?'Currently owned cards':'Lifetime discoveries'));
  }catch(error){if(version===collectionRequest)status(error.message,true);}
}
function renderCollections(){
  if(!collectionData)return;
  const q=$('collection-search').value.trim().toLowerCase(),set=$('collection-set').value,member=$('collection-member').value;
  const rarity=$('collection-rarity').value,kind=$('collection-variant').value,missing=$('collection-missing').checked;
  const summary=$('collection-summary');summary.replaceChildren();
  const groups=new Map();
  if(collectionData.summaries)Object.entries(collectionData.summaries).forEach(([set,value])=>groups.set(set,value));
  else collectionData.cards.forEach(card=>{const value=groups.get(card.set)||{done:0,total:0};value.done+=card.collected;value.total+=card.total;groups.set(card.set,value);});
  groups.forEach((value,setId)=>{
    if(set!=='all'&&set!==setId)return;
    const item=el('div',undefined,'set-summary');
    item.append(el('strong',label(setId)),el('span',fmt(value.done)+' / '+fmt(value.total)+' variants · '+(value.total?(value.done*100/value.total).toFixed(1):'0')+'%'));
    const progress=el('progress');progress.max=value.total||1;progress.value=value.done;progress.setAttribute('aria-label',label(setId)+' completion');item.append(progress);summary.append(item);
  });
  const matches=collectionData.cards.filter(card=>(!q||(card.name+' '+card.id).toLowerCase().includes(q))&&(set==='all'||card.set===set)&&(member==='all'||card.members.includes(member))).map(card=>({
    ...card,shownVariants:card.variants.filter(v=>(rarity==='all'||v.rarity===rarity)&&variantMatches(v,kind)&&(!missing||!v.collected))
  })).filter(card=>card.shownVariants.length);
  collectionPages=Math.max(1,Math.ceil(matches.length/12));collectionPage=Math.min(collectionPage,collectionPages);
  const target=$('collection-cards');target.replaceChildren();
  matches.slice((collectionPage-1)*12,collectionPage*12).forEach(card=>{
    const tile=cardTile(card,false);const info=tile.article.querySelector('.card-info');
    info.append(el('p',fmt(card.collected)+' / '+fmt(card.total)+' normal variants collected'));
    if(card.birthday_collected)info.append(el('span','Birthday bonus collected','tag'));
    const checklist=el('div',undefined,'variant-checklist');
    card.shownVariants.forEach(v=>{
      const row=el('div',undefined,'variant-row'+(v.collected?' collected':' missing'));
      row.append(el('span',v.collected?'✓':'○'),el('span',label(v.rarity)+' · '+(v.signed?'Signed '+label(v.signed):'Unsigned')+(v.birthday?' · Birthday '+label(v.birthday):'')));
      row.title=v.collected?'Collected':'Missing';checklist.append(row);
    });
    // Checklist is outside the details button, so scrolling does not open it.
    tile.article.append(checklist);target.append(tile.article);
  });
  if(!matches.length){const empty=el('p','No variants match these filters.','empty');empty.style.gridColumn='1 / -1';target.append(empty);}
  $('collection-count').textContent=fmt(matches.length)+' matching artworks · Birthday bonuses are tracked separately. Set totals include undiscovered cards; hidden artwork stays secret.';
  $('collection-page').textContent='Page '+collectionPage+' of '+collectionPages;
  $('collection-prev').disabled=collectionPage<=1;$('collection-next').disabled=collectionPage>=collectionPages;
}
async function loadWishes(){
  const version=++wishRequest;const activeToken=token;status('Loading your wishlist…');
  try{const data=await api('/api/me/wishlist',{privateRequest:true});if(version!==wishRequest || token!==activeToken || !token)return;wishData=data.wishes;renderWishes();status('Wishlist synced from Discord.');}
  catch(error){if(version===wishRequest)status(error.message,true);}
}
function renderWishes(){
  if(!wishData)return;
  const q=$('wish-search').value.trim().toLowerCase(),filter=$('wish-status').value;
  const wishes=wishData.filter(wish=>(!q||wish.name.toLowerCase().includes(q))&&(filter==='all'||(filter==='owned'?wish.owned:!wish.owned)));
  const target=$('wish-cards');target.replaceChildren();
  wishes.forEach(wish=>{
    if(wish.hidden){target.append(el('div','Undiscovered card · Details hidden until revealed','empty'));return;}
    const tile=cardTile(wish,false);
    const info=tile.article.querySelector('.card-info');info.replaceChildren(el('span',wish.owned?'Currently owned':'Still missing','tag'),el('h3',wish.name),
      el('p',wish.rarity?label(wish.rarity)+' · '+(wish.signed?'Signed '+label(wish.signed):'Unsigned')+(wish.birthday?' · Birthday '+label(wish.birthday):''):'Any rarity or variant'));
    tile.article.querySelector('button').onclick=()=>openWish(wish);
    target.append(tile.article);
  });
  if(!wishes.length){const empty=el('p','No wishlist entries match. Use /wishlist cards in Discord to manage your list.','empty');empty.style.gridColumn='1 / -1';target.append(empty);}
  $('wish-count').textContent=fmt(wishes.length)+' wishes';
}
function openWish(wish){
  modalBody.replaceChildren(el('h2',wish.name));
  if(wish.image){const image=el('img');image.src=API+wish.image;image.alt=wish.name;modalBody.append(image);}
  modalBody.append(el('p',wish.rarity?label(wish.rarity)+' · '+(wish.signed?'Signed by '+label(wish.signed):'Unsigned')+(wish.birthday?' · Birthday '+label(wish.birthday):''):'Any rarity or variant'),
    el('p',wish.owned?'You currently own a matching card.':'You do not currently own a matching card.'));
  modal.showModal();
}
if(pageKind==='account'){
  $('collection-basis').addEventListener('change',loadCollections);
  for(const id of ['collection-search','collection-set','collection-member','collection-rarity','collection-variant','collection-missing'])
    $(id).addEventListener(id==='collection-search'?'input':'change',()=>{collectionPage=1;renderCollections();});
  $('collection-prev').addEventListener('click',()=>{collectionPage=Math.max(1,collectionPage-1);renderCollections();});
  $('collection-next').addEventListener('click',()=>{collectionPage=Math.min(collectionPages,collectionPage+1);renderCollections();});
  $('wish-search').addEventListener('input',renderWishes);$('wish-status').addEventListener('change',renderWishes);
}

const showcaseMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function resetShowcaseTilt(card) {
  if(!card)return;
  card.style.removeProperty('--showcase-x');
  card.style.removeProperty('--showcase-y');
  card.classList.remove('showcase-hover');
}
document.addEventListener('pointermove',event=>{
  if(showcaseMotion.matches || event.pointerType==='touch')return;
  const card=event.target.closest?.('.showcase-grid .artwrap, .interactive-card-stage');
  if(!card)return;
  const bounds=card.getBoundingClientRect();
  const x=Math.max(-.5,Math.min(.5,(event.clientX-bounds.left)/bounds.width-.5));
  const y=Math.max(-.5,Math.min(.5,(event.clientY-bounds.top)/bounds.height-.5));
  card.style.setProperty('--showcase-x',(-y*10).toFixed(2)+'deg');
  card.style.setProperty('--showcase-y',(x*12).toFixed(2)+'deg');
  card.classList.add('showcase-hover');
});
document.addEventListener('pointerout',event=>{
  const card=event.target.closest?.('.showcase-grid .artwrap, .interactive-card-stage');
  if(card && (!event.relatedTarget || !card.contains(event.relatedTarget)))resetShowcaseTilt(card);
});
window.addEventListener('blur',()=>document.querySelectorAll('.showcase-hover').forEach(resetShowcaseTilt));
showcaseMotion.addEventListener('change',()=>document.querySelectorAll('.showcase-hover').forEach(resetShowcaseTilt));

