(() => {
  'use strict';
  const API = (window.NAMJOON_SITE?.apiBase || '').replace(/\/$/, '');
  const $ = id => document.getElementById(id);
  const node = (tag, text, cls) => {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const fmt = n => Number(n || 0).toLocaleString('en-GB');
  const label = value => String(value || '').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
  const isMarket = document.body.dataset.page === 'market';
  let token=sessionStorage.getItem('namjoon_session') || '', wallet=null, page=1, pages=1, scope='all', kind='wts', generation=0, busy=false;
  let inventoryGeneration=0, privateImages=new Set();
  async function api(path,{body,auth=false,blob=false}={}) {
    if(!API)throw new Error('The market service is not connected yet.');
    const headers={};if(auth&&token)headers.Authorization='Bearer '+token;
    if(auth&&!token)throw new Error('Please sign in with Discord.');
    if(body!==undefined)headers['Content-Type']='application/json';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try {
      const response=await fetch(API+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
      if(response.status===401&&auth){sessionStorage.removeItem('namjoon_session');token='';wallet=null;syncAuth();}
      if(!response.ok){let message='The market is temporarily unavailable. Please try again.';try{message=(await response.json()).error || message;}catch{}throw new Error(message);}
      return blob?response.blob():response.json();
    }catch(error){if(error.name==='AbortError')throw new Error('The request took too long. Refresh before trying again.');throw error;}
    finally{clearTimeout(timer);}
  }
  function tags(card) {
    const row=node('div',undefined,'market-tags'),rarity=node('span',label(card.rarity),'market-tag');rarity.dataset.rarity=card.rarity;row.append(rarity);
    if(!card.rarity)rarity.textContent='Any variant';
    if(card.signed)row.append(node('span','Signed','market-tag'));
    if(card.birthday)row.append(node('span','Birthday','market-tag'));
    return row;
  }
  function art(card,src) {
    const wrap=node('div',undefined,'market-art'),img=node('img');img.src=src || API+card.image;img.alt=card.name;img.loading='lazy';img.width=300;img.height=420;
    img.onerror=()=>wrap.replaceChildren(node('span','Artwork unavailable','muted'));wrap.append(img);return wrap;
  }
  function tile(card,onClick) {
    const item=node('article',undefined,'market-card'),button=node('button',undefined,'market-card-button'),info=node('div',undefined,'market-card-info');button.type='button';
    button.setAttribute('aria-label',card.name+', '+(card.kind==='wtt'?'For trade':fmt(card.price)+' coins'));
    info.append(node('p',card.kind==='wtb'?'WTB · Wanted':card.kind==='wtt'?'WTT · For Trade':'WTS · For Sale','exchange-kind'),tags(card),node('h3',card.name));
    if(card.available_count>1)info.append(node('p',card.available_count+' available · from '+fmt(card.price)+' coins','market-owned'));
    if(card.serial)info.append(node('p','Print #'+fmt(card.serial)+' / '+fmt(card.printed),'market-print'));
    info.append(node('p',card.kind==='wtt'?'Open to offers':(card.kind==='wtb'?'Offering ':'')+fmt(card.price)+' coins','market-price'),node('p',(card.kind==='wtb'?'Wanted by ':'Listed by ')+card.seller.name,'market-seller'));
    if(card.owned!==null&&card.owned!==undefined)info.append(node('p',card.owned?'✓ Variant owned':'Missing from your collection','market-owned'));
    button.append(art(card),info);item.append(button);button.onclick=()=>onClick(card);return item;
  }
  async function latest() {
    const strip=$('market-latest-listings');if(!strip)return;
    try{const data=await api('/api/market');const pos=strip.scrollLeft;strip.replaceChildren();
      data.listings.slice(0,12).forEach(card=>strip.append(tile(card,c=>location.assign('./market.html?listing='+encodeURIComponent(c.id)))));
      if(!data.listings.length)strip.append(node('p','No cards are listed yet. Be the first to add one.','muted'));
      strip.scrollLeft=pos;
    }catch{if(!strip.querySelector('.market-card'))strip.replaceChildren(node('p','Market listings are temporarily unavailable.','muted'));}
  }
  if(!isMarket){latest();setInterval(()=>{if(!document.hidden)latest();},30000);return;}
  const dialog=$('market-dialog'),body=$('market-dialog-body');
  function syncAuth() {
    $('market-login').hidden=!!wallet;$('market-sell').hidden=!wallet?.exists;$('market-wallet').hidden=!wallet;
    $('market-mine').disabled=!wallet;document.querySelectorAll('[data-exchange-auth]').forEach(el=>el.disabled=!wallet?.exists);$('market-ownership').disabled=!wallet;
    $('market-wallet').textContent=fmt(wallet?.coins)+' coins';
    $('market-ownership-note').textContent=wallet?'Matches the exact rarity, signature and birthday variant.':'Sign in to find cards missing from your collection.';
    if(!wallet){scope='all';$('market-ownership').value='all';$('market-all').setAttribute('aria-pressed','true');$('market-mine').setAttribute('aria-pressed','false');$('market-all').classList.add('active');$('market-mine').classList.remove('active');}
    window.syncMarketDropdowns?.();
  }
  function status(text,error=false){$('market-status').textContent=text;$('market-status').classList.toggle('error',error);}
  async function loadWallet(){if(token){try{wallet=await api('/api/me/market',{auth:true});}catch(error){status(error.message,true);}}syncAuth();}
  function query() {
    return new URLSearchParams({page,scope,kind,group:$('market-group')?.checked?'yes':'no',q:$('market-search').value,member:$('market-member').value,set:$('market-set').value,rarity:$('market-rarity').value,ownership:$('market-ownership').value,sort:$('market-sort').value,signed:$('market-signed').checked?'yes':'all',birthday:$('market-birthday').checked?'yes':'all'});
  }
  async function browse(quiet=false) {
    const version=++generation;if(!quiet)status('Loading listings…');$('market-prev').disabled=true;$('market-next').disabled=true;
    try {
      if(kind==='offers'){await window.NamjoonExchange?.offers();return;}
      const params=query();if(kind==='wts'&&params.get('ownership')==='supply')params.set('ownership','owned');
      const data=await api((kind==='wts'?'/api/market?':'/api/market/exchange?')+params,{auth:!!wallet});if(version!==generation)return;
      page=data.page;pages=data.pages;$('market-grid').classList.remove('exchange-offers-grid');$('market-grid').replaceChildren(...data.listings.map(card=>tile(card,kind==='wts'?(card=>card.available_count>1?window.NamjoonExchange.group(card):openListing(card)):card=>window.NamjoonExchange.open(card))));
      if(!data.listings.length)$('market-grid').append(node('div',scope==='mine'?'You have no active listings. Use Sell a Card to add one.':'No listings match these filters. Try another search.','market-empty'));
      remember();status(fmt(data.total)+' '+(data.total===1?'listing':'listings')+(scope==='mine'?' in your shop':''));
      $('market-page').textContent='Page '+page+' of '+pages;
      const select=$('market-set'),selected=select.value;
      data.sets.forEach(pack=>{if(![...select.options].some(option=>option.value===pack))select.append(new Option(label(pack),pack));});select.value=selected;window.syncMarketDropdowns?.();
    }catch(error){if(version!==generation)return;status(error.message,true);}
    finally{if(version===generation){$('market-prev').disabled=page<=1;$('market-next').disabled=page>=pages;}}
  }
  function clearPrivateImages(){privateImages.forEach(url=>URL.revokeObjectURL(url));privateImages.clear();}
  function openDialog(title){body.dataset.exchangeScreen='';inventoryGeneration++;clearPrivateImages();$('market-dialog-title').textContent=title;body.replaceChildren();if(!dialog.open)dialog.showModal();}
  function button(text,action,primary=false){const b=node('button',text,'m-btn'+(primary?' primary':''));b.type='button';b.onclick=action;return b;}
  async function mutate(path,data,trigger,errorEl,onSuccess) {
    if(busy)return;busy=true;trigger.disabled=true;$('market-close').disabled=true;errorEl.textContent='';
    try{const result=await api(path,{body:data,auth:true});if(wallet&&result.coins!==undefined){wallet.coins=result.coins;syncAuth();}await onSuccess(result);void browse(true);}
    catch(error){errorEl.textContent=error.message;trigger.disabled=false;}
    finally{busy=false;$('market-close').disabled=false;}
  }
  async function openListing(card) {
    openDialog('Card details');const version=inventoryGeneration;body.append(node('p','Checking this listing…','muted'));
    try {
      const current=await api('/api/market/listings/'+encodeURIComponent(card.id),{auth:!!wallet});
      if(!dialog.open||version!==inventoryGeneration)return;
      if(wallet){await loadWallet();if(!dialog.open||version!==inventoryGeneration)return;}
      $('market-dialog-title').textContent=current.name;
      const detail=node('div',undefined,'market-detail'),info=node('div'),error=node('p','','dialog-error');error.setAttribute('role','status');
      info.append(tags(current),node('p','Print #'+fmt(current.serial)+' / '+fmt(current.printed)),node('p',current.code,'market-code'),node('p','Seller: '+current.seller.name),node('p',new Date(current.listed_at).toLocaleString('en-GB'),'dialog-note'),node('p',fmt(current.price)+' coins','market-price'));
      if(current.signed)info.append(node('p','Signed by '+label(current.signed),'dialog-note'));
      if(current.birthday)info.append(node('p','Birthday: '+label(current.birthday),'dialog-note'));
      info.append(node('p','Cosmetic frames stay with the seller.','dialog-note'));
      if(!wallet){const login=node('a','Sign in to purchase ↗','m-btn primary');login.href='./account.html';info.append(login);}
      else if(current.seller.id===wallet.id){
        info.append(node('p','Remove this listing to make the card available in your inventory again.','dialog-note'));
        const remove=button('Confirm removal',()=>mutate('/api/me/market/remove',{listing_id:current.id},remove,error,()=>{body.replaceChildren(node('p','Listing removed. Your card is available again.'));}));info.append(remove,button('Edit price',()=>window.NamjoonExchange.edit(current)));
      }else if(!wallet.exists){info.append(node('p','Start your collection in Discord before purchasing.','dialog-note'));}
      else {
        info.append(node('p','Your balance: '+fmt(wallet.coins)+' coins','dialog-note'));
        info.append(node('p','After purchase: '+fmt(wallet.coins-current.price)+' coins','dialog-note'));
        const requestId=crypto.randomUUID();
        const buy=button('Buy for '+fmt(current.price)+' coins',()=>{
          buy.textContent='Confirm purchase · '+fmt(current.price)+' coins';
          buy.onclick=()=>mutate('/api/me/market/buy',{listing_id:current.id,price:current.price,request_id:requestId},buy,error,()=>{body.replaceChildren(node('p','Purchase complete! This card is now in your inventory.'),node('a','View My Collection →','m-btn'));body.lastChild.href='./account.html';});
        },true);
        buy.disabled=wallet.coins<current.price;if(buy.disabled)info.append(node('p','You need '+fmt(current.price-wallet.coins)+' more coins.','dialog-note'));info.append(buy);
      }
      info.append(error);detail.append(art(current),info);body.replaceChildren(detail);
    }catch(error){if(dialog.open&&version===inventoryGeneration)body.replaceChildren(node('p',error.message,'dialog-error'));}
  }
  async function sell() {
    openDialog('Sell a Card');let invPage=1,invPages=1;
    const form=node('form',undefined,'sell-search'),searchLabel=node('label','Search your inventory'),search=node('input');search.type='search';search.maxLength=100;search.placeholder='Card name…';searchLabel.append(search);
    const submit=node('button','Search','m-btn');submit.type='submit';form.append(searchLabel,submit);
    const cards=node('div',undefined,'sell-cards'),message=node('p','','dialog-note'),pager=node('div',undefined,'sell-pager'),prev=button('← Previous',()=>{invPage--;load();}),next=button('Next →',()=>{invPage++;load();}),pageText=node('span');pager.append(prev,pageText,next);
    body.append(node('p','Choose an available copy. Locked cards must be unlocked in Discord first.','dialog-note'),form,message,cards,pager);
    form.onsubmit=e=>{e.preventDefault();invPage=1;load();};
    async function load() {
      const version=++inventoryGeneration;clearPrivateImages();message.textContent='Loading your cards…';cards.replaceChildren();prev.disabled=next.disabled=true;
      try {
        const data=await api('/api/me/inventory?'+new URLSearchParams({q:search.value,page:invPage,available:'yes',sort:'highest'}),{auth:true});
        if(!dialog.open||version!==inventoryGeneration)return;
        invPage=data.page;invPages=data.pages;message.textContent=fmt(data.total)+' available cards';pageText.textContent=invPage+' / '+invPages;prev.disabled=invPage<=1;next.disabled=invPage>=invPages;
        for(const card of data.cards){
          const tile=node('article',undefined,'market-card'),pick=button('Select copy #'+fmt(card.serial),()=>priceCard(card));
          const image=node('div','Loading artwork…','market-art'),info=node('div',undefined,'market-card-info');info.append(tags(card),node('h3',card.name),node('p',card.code,'market-print'),pick);tile.append(image,info);cards.append(tile);
          void api(card.image,{auth:true,blob:true}).then(blob=>{if(!dialog.open||version!==inventoryGeneration)return;const url=URL.createObjectURL(blob);privateImages.add(url);image.replaceWith(art(card,url));}).catch(()=>{if(image.isConnected)image.textContent='Artwork unavailable';});
        }
        if(!data.cards.length)message.textContent='No available cards match this search.';
      }catch(error){if(version===inventoryGeneration){message.textContent=error.message;prev.disabled=invPage<=1;next.disabled=invPage>=invPages;}}
    }
    await load();
  }
  function priceCard(card) {
    openDialog('List '+card.name);const form=node('form'),priceLabel=node('label','Price in coins'),price=node('input');price.type='number';price.min='1';price.max='1000000000';price.step='1';price.required=true;price.placeholder='Enter a price';priceLabel.append(price);
    const review=node('p','','dialog-note'),error=node('p','','dialog-error'),confirm=node('button','Review listing','m-btn primary');confirm.type='submit';error.setAttribute('role','status');
    form.append(tags(card),node('p',card.name+' · Print #'+fmt(card.serial)),node('p',card.code,'dialog-note'),priceLabel,review,error,confirm,button('← Choose another card',sell));body.append(form);price.focus();let reviewed=null;
    price.oninput=()=>{reviewed=null;review.textContent='';confirm.textContent='Review listing';};
    form.onsubmit=e=>{e.preventDefault();const amount=Number(price.value);if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000){error.textContent='Choose a whole price between 1 and 1,000,000,000 coins.';return;}
      if(reviewed!==amount){reviewed=amount;review.textContent='List this copy for '+fmt(amount)+' coins? It will be reserved until sold or removed. Any equipped frame stays yours.';confirm.textContent='Confirm listing · '+fmt(amount)+' coins';return;}
      void mutate('/api/me/market/list',{copy_id:card.id,price:amount},confirm,error,result=>{body.replaceChildren(node('p','Your card is now listed for '+fmt(amount)+' coins.'),button('View listing',()=>openListing({id:result.listing_id})));});
    };
  }
  $('market-close').onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});dialog.addEventListener('close',()=>{inventoryGeneration++;clearPrivateImages();});
  $('market-sell').onclick=()=>window.NamjoonExchange.create();
  let debounce;
  $('market-search').oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>{page=1;browse();},250);};
  ['member','set','rarity','ownership','sort','signed','birthday'].forEach(name=>$('market-'+name).addEventListener('change',()=>{page=1;browse();}));
  function setScope(value){scope=value;page=1;['all','mine'].forEach(name=>{const active=name===scope;$('market-'+name).classList.toggle('active',active);$('market-'+name).setAttribute('aria-pressed',String(active));});browse();}
  $('market-all').onclick=()=>setScope('all');$('market-mine').onclick=()=>setScope('mine');
  $('market-prev').onclick=()=>{page--;browse();};$('market-next').onclick=()=>{page++;browse();};
  $('market-reset').onclick=()=>{clearTimeout(debounce);$('market-search').value='';['member','set','rarity','ownership'].forEach(name=>$('market-'+name).value='all');$('market-sort').value='newest';$('market-signed').checked=$('market-birthday').checked=false;window.syncMarketDropdowns?.();page=1;browse();};
  window.NamjoonMarket={api,node,button,openDialog,mutate,art,tags,sell,priceCard,browse,status,
    get body(){return body;},get dialog(){return dialog;},get wallet(){return wallet;},openListing,get kind(){return kind;},get page(){return page;},get scope(){return scope;},query,
    setPage(value){page=value;},setKind(value){kind=value;page=1;scope='all';if($('market-ownership').value==='supply'&&value!=='wtb')$('market-ownership').value='all';if(value==='wtt'&&['cheapest','priciest'].includes($('market-sort').value))$('market-sort').value='newest';setScope('all');},
    setPagination(data){page=data.page;pages=data.pages;$('market-page').textContent='Page '+page+' of '+pages;$('market-prev').disabled=page<=1;$('market-next').disabled=page>=pages;}};
  function remember(){const state=Object.fromEntries(query());state.scroll=window.scrollY;try{sessionStorage.setItem('namjoon-market-view',JSON.stringify(state));}catch{}}
  function restore(){try{const state=JSON.parse(sessionStorage.getItem('namjoon-market-view')||'{}');if(state.set&&state.set!=='all')$('market-set').append(new Option(label(state.set),state.set));['member','set','rarity','ownership','sort'].forEach(key=>{if(state[key]&&[...$('market-'+key).options].some(x=>x.value===state[key]))$('market-'+key).value=state[key];});$('market-search').value=state.q||'';if($('market-group'))$('market-group').checked=state.group==='yes';window.__marketScroll=Number(state.scroll)||0;$('market-signed').checked=state.signed==='yes';$('market-birthday').checked=state.birthday==='yes';page=Math.max(1,Number(state.page)||1);if(['wts','wtb','wtt'].includes(state.kind))kind=state.kind;if(wallet&&state.scope==='mine')scope='mine';}catch{}}
  async function init(){await loadWallet();restore();if(!wallet){scope='all';$('market-ownership').value='all';}await browse();if(window.__marketScroll)window.scrollTo(0,window.__marketScroll);const id=new URLSearchParams(location.search).get('listing');if(id)await openListing({id});window.NamjoonExchange?.syncTabs();}
  window.addEventListener('pagehide',remember);init();setInterval(()=>{if(!document.hidden&&!dialog.open&&!busy)browse(true);},30000);
})();
