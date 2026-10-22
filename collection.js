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
function el(tag,text,className) {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function status(message,error=false){statusEl.textContent=message;statusEl.classList.toggle('error',error);}
function clearURLs(urls){urls.forEach(url=>URL.revokeObjectURL(url));urls.clear();}
function clearSession(){sessionStorage.removeItem('namjoon_session');token='';profileData=null;inventoryLoaded=false;requestVersion++;mediaVersion++;clearURLs(imageURLs);clearURLs(profileURLs);grid.replaceChildren();$('profile')?.replaceChildren();$('account-content').hidden=true;$('account-actions').hidden=true;$('login-panel').hidden=false;$('login').disabled=!loginConfigured;modal.close();}
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
function imagePlaceholder(){const p=el('div',undefined,'artwrap');return p;}
function openDetails(card,isInventory,source) {
  modalBody.replaceChildren(el('h2',card.name));
  if(source){const image=el('img');image.src=source;image.alt=card.name;modalBody.append(image);}
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
  }
  modal.showModal();
}
function cardTile(card,isInventory){
  const article=el('article',undefined,'card'+(isInventory?'':' catalogue-card'));
  const button=el('button',undefined,'card-button');button.type='button';button.setAttribute('aria-label','View '+card.name);
  const art=imagePlaceholder(),info=el('div',undefined,'card-info');
  info.append(el('span',isInventory?label(card.rarity):label(card.set),'tag'),el('h3',card.name));
  if(isInventory){info.append(el('p','Print #'+fmt(card.serial)+' / '+fmt(card.printed)),el('p',card.code,'code'));if(card.signed || card.birthday)info.append(el('p',[card.signed?'Signed':'',card.birthday?'Birthday':''].filter(Boolean).join(' · ')));}
  else info.append(el('p',fmt(card.printed)+' printed'),el('p',card.rarities.map(label).join(' · ')));
  let loadedSource=null;
  function setImage(src){loadedSource=src;const image=el('img');image.src=src;image.alt=card.name;image.loading='lazy';image.onerror=()=>{image.remove();art.append(el('span','Artwork unavailable','muted'));};art.replaceChildren(image);}
  button.append(art,info);article.append(button);button.addEventListener('click',()=>openDetails(card,isInventory,loadedSource));
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
  const matches=allCards.filter(card=>(!query || (card.name+' '+card.id).toLowerCase().includes(query))&&(member==='all'||card.members.includes(member))&&(set==='all'||card.set===set)&&(rarity==='all'||card.rarities.includes(rarity)));
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
  const params=new URLSearchParams({page:currentPage,q:$('search').value,member:$('member').value,set:$('set').value,rarity:$('rarity').value,sort:$('sort').value});
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
}
async function loadProfile(){
  const version=++requestVersion;
  status('Loading your profile…');
  try{const data=await api('/api/me',{privateRequest:true});if(version!==requestVersion || !token)return;
    profileData=data;$('login-panel').hidden=true;$('account-actions').hidden=false;$('account-content').hidden=false;$('signed-in').textContent='Signed in as '+data.player.name;
    await renderProfile(data);if(version===requestVersion && token)status('Your current bot profile · Use /profile in Discord to customise it.');
  }catch(error){status(error.message,true);}
}
function selectTab(next){view=next;$('profile').hidden=next!=='profile';$('inventory').hidden=next!=='inventory';for(const name of ['profile','inventory']){const button=$(name+'-tab');button.classList.toggle('active',name===next);button.setAttribute('aria-selected',String(name===next));}if(next==='inventory'&&!inventoryLoaded)loadInventory();}
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
for(const id of ['search','member','set','rarity','sort']){
  const input=$(id);if(!input)continue;
  input.addEventListener(id==='search'?'input':'change',()=>{clearTimeout(filterTimer);filterTimer=setTimeout(()=>{currentPage=1;if(pageKind==='catalogue'&&catalogueReady)renderCatalogue();else if(pageKind==='account'&&token)loadInventory();},id==='search'?250:0);});
}
for(const [id,delta] of [['prev',-1],['next',1]])$(id).addEventListener('click',()=>{currentPage=Math.max(1,Math.min(pages,currentPage+delta));if(pageKind==='catalogue')renderCatalogue();else loadInventory();});
$('refresh').addEventListener('click',()=>{if(pageKind==='catalogue')loadCatalogue().catch(()=>{});else if(view==='inventory')loadInventory();else loadProfile();});
if(pageKind==='catalogue')loadCatalogue().catch(()=>{});
else{
  $('login').addEventListener('click',beginLogin);
  $('logout').addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST',privateRequest:true});}catch{}finally{clearSession();status('Signed out.');}});
  $('profile-tab').addEventListener('click',()=>selectTab('profile'));
  $('inventory-tab').addEventListener('click',()=>selectTab('inventory'));
  const tabs=[$('profile-tab'),$('inventory-tab')];
  tabs.forEach((tab,index)=>tab.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const next=tabs[1-index];next.focus();next.click();}}));
  bootstrapAccount();
}
