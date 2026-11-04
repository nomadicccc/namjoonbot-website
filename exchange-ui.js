(() => {
  'use strict';
  const M = window.NamjoonMarket;
  if (!M) return;
  const {node: el, button, api} = M;
  const $ = id => document.getElementById(id);
  const fmt = value => Number(value || 0).toLocaleString('en-GB');
  const label = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  let supportsMatching=false;let screen = 0;const pickerImages=new Set();function clearPickerImages(){pickerImages.forEach(url=>URL.revokeObjectURL(url));pickerImages.clear();}M.dialog.addEventListener('close',clearPickerImages);
  function open(title) {clearPickerImages();screen++; M.openDialog(title); M.body.dataset.exchangeScreen=String(screen);return screen;}
  function live(version) {return version === screen && M.dialog.open && M.body.dataset.exchangeScreen===String(version);}
  function field(text, type = 'text') {
    const wrap = el('label', text, 'exchange-field'), input = el('input'); input.type = type;
    wrap.append(input); return {wrap, input};
  }
  function selectField(text, options) {
    const wrap = el('label', text, 'exchange-field'), input = el('select');
    options.forEach(([value, name]) => input.add(new Option(name, value))); wrap.append(input); return {wrap, input};
  }
  function errorNode() {const error = el('p', '', 'dialog-error'); error.setAttribute('role', 'status'); return error;}
  function success(text) {open('Done'); M.body.append(el('p', text));}
  function action(text, data, error, done, primary = false) {
    const b = button(text, () => {
      b.textContent = 'Confirm · ' + text;
      b.onclick = () => M.mutate('/api/me/market/exchange', data, b, error, done || (() => success('Updated.')));
    }, primary); return b;
  }
  function auth() {
    if (M.wallet?.exists) return true;
    open('Sign in to continue'); const link = el('a', 'Sign in with Discord', 'm-btn primary');link.href='./account.html';M.body.append(link);return false;
  }
  function chips(cards, container, remove) {
    container.replaceChildren(); cards.forEach(card => container.append(button(card.name + ' #' + card.serial + ' ×', () => remove(card))));
  }
  async function picker({title, selected = [], owner = null, max = 5, done, cardId = null, filter = null, matchTrade = null, matchWanted = null}) {
    const version = open(title), chosen = new Map(selected.map(card => [card.id, card]));
    let page = 1, pages = 1, request = 0;
    const search = field('Search cards', 'search'), form = el('form', undefined, 'sell-search'); search.input.maxLength=100;
    const submit = el('button', 'Search', 'm-btn');submit.type='submit';form.append(search.wrap,submit);
    const selection = el('div', undefined, 'exchange-picks'), info = el('p', '', 'dialog-note'), grid = el('div', undefined, 'exchange-picker');
    const prev = button('Previous', () => {page--; load();}), next = button('Next', () => {page++;load();}), position = el('span');
    const pager = el('div', undefined, 'sell-pager');pager.append(prev,position,next);
    const finish = button('Use Selected Cards', () => done([...chosen.values()]), true);
    M.body.append(form,selection,info,grid,pager,finish);
    let duplicates = null;
    if (!owner) {
      const check=el('label',''),box=el('input');box.type='checkbox';check.append(box,document.createTextNode(' Duplicates only'));M.body.insertBefore(check,form.nextSibling);duplicates=box;box.onchange=()=>{page=1;load();};
    }
    let matchBox=null;if(matchTrade){const wrap=el('label'),box=el('input');box.type='checkbox';box.checked=true;wrap.append(box,document.createTextNode(' Match their preferences'));M.body.insertBefore(wrap,form.nextSibling);matchBox=box;box.onchange=()=>{page=1;load();};}
    function update() {chips([...chosen.values()],selection,card=>{chosen.delete(card.id);update();});finish.disabled=!chosen.size;info.textContent=chosen.size+' / '+max+' selected';grid.querySelectorAll('[data-copy]').forEach(b=>b.setAttribute('aria-pressed',String(chosen.has(b.dataset.copy))));}
    form.onsubmit=e=>{e.preventDefault();page=1;load();};
    async function load() {
      const generation=++request;clearPickerImages();prev.disabled=next.disabled=true;grid.replaceChildren();info.textContent='Loading cards…';
      try {
        const params=new URLSearchParams({page,q:search.input.value,available:'yes',sort:'highest'});
        if (duplicates?.checked) params.set('duplicates','yes');
        if (cardId) params.set('card_id',cardId);if(matchTrade&&matchBox?.checked)params.set('match_trade',matchTrade);if(matchWanted)params.set('match_wanted',matchWanted);
        const path=owner?'/api/market/exchange?'+new URLSearchParams({kind:'wtt',seller:owner,page,q:search.input.value}):'/api/me/inventory?'+params;
        const data=await api(path,{auth:!owner});if(!live(version)||generation!==request)return;
        pages=data.pages;page=data.page;position.textContent=page+' / '+pages;prev.disabled=page<=1;next.disabled=page>=pages;
        let cards=data.cards||data.listings;
        if(filter)cards=cards.filter(filter);
        for(const card of cards) {
          const b=button('',()=>{if(chosen.has(card.id))chosen.delete(card.id);else if(chosen.size<max)chosen.set(card.id,card);else{info.textContent='Choose up to '+max+' cards.';return;}update();});
          b.dataset.copy=card.id;b.setAttribute('aria-pressed',String(chosen.has(card.id)));
          const title=el('span',card.name+' · #'+card.serial+(card.favorite?' · Favourite':''));
          b.append(title,el('small',label(card.rarity)+(card.signed?' · Signed by '+label(card.signed):'')+(card.birthday?' · Birthday: '+label(card.birthday):'')));
          const image=el('img');image.alt=card.name;image.loading='lazy';b.prepend(image);grid.append(b);
          if(card.image)api(card.image,{auth:!owner,blob:true}).then(blob=>{if(!live(version)||generation!==request)return;const url=URL.createObjectURL(blob);pickerImages.add(url);image.src=url;}).catch(()=>image.remove());
        }
        update();if(!cards.length)info.textContent='No matching available cards on this page.';
      }catch(error){if(live(version)&&generation===request)info.textContent=error.message;}
    }
    update();await load();
  }
  function create() {
    if(!auth())return;open('Create a Listing');
    M.body.append(button('For Sale · WTS',M.sell,true),button('Wanted · WTB',()=>wanted()),button('For Trade · WTT',()=>picker({title:'Choose Cards for Trade',max:20,done:markTrade})),button('List Several Cards for Sale',()=>picker({title:'Choose Cards to Sell',max:20,done:bulk})));
  }
  function requirementsText(req) {
    if(!req)return 'Open to offers';
    const parts=[req.card_name,req.set?label(req.set):'',req.member?label(req.member):'',req.rarity?label(req.rarity):'',req.signed==='yes'?'Signed':req.signed==='no'?'Unsigned':'',req.birthday==='yes'?'Birthday':req.birthday==='no'?'Non-birthday':''].filter(Boolean);
    return parts.length?'Looking for: '+parts.join(' · '):'Open to offers';
  }
  async function markTrade(cards) {
    const version=open('List for Trade'),error=errorNode();
    M.body.append(el('p','Choose what you would like in return. These preferences help other collectors find matching cards.','dialog-note'));
    cards.forEach(card=>M.body.append(el('p',card.name+' · #'+card.serial+(card.favorite?' · Favourite':''))));
    const loading=el('p','Loading card choices…','dialog-note');M.body.append(loading);
    try{
      let support;try{support=await api('/api/market/exchange/options');}catch{support=null;}if(!live(version))return;supportsMatching=!!support?.trade_requirements;syncTabs();
      if(!support?.trade_requirements){loading.remove();M.body.append(el('p','Trade preferences are not available yet. You can still list these cards as open to offers.','dialog-note'),action('List as Open to Offers',{action:'wtt_bulk',copy_ids:cards.map(c=>c.id)},error,()=>success('Your cards are now listed for trade.'),true),error);return;}
      const catalogue=await api('/api/catalogue');if(!live(version))return;loading.remove();
      const previous=cards.length===1?(cards[0].requirements||{}):{},form=el('form'),fields=el('div',undefined,'trade-requirement-fields');
      const search=field('Find a specific card (optional)','search');search.input.placeholder='Search card names…';search.input.maxLength=100;
      const artwork=selectField('Specific card',[['','Any card matching the choices below']]);
      const pack=selectField('Pack',[['','Any pack'],...[...new Set(catalogue.cards.map(c=>c.set))].sort().map(set=>[set,label(set)])]);
      const member=selectField('Member',[['','Any member'],...['rm','jin','suga','jhope','jimin','v','jungkook'].map(m=>[m,label(m)])]);
      const rarity=selectField('Rarity',[['','Any rarity'],...['common','uncommon','rare','event','legendary','mythical','secret_mythical'].map(r=>[r,label(r)])]);
      const signed=selectField('Signature',[['any','Any signature'],['yes','Signed'],['no','Unsigned']]),birthday=selectField('Birthday',[['any','Any edition'],['yes','Birthday only'],['no','Non-birthday only']]);
      pack.input.value=previous.set||'';member.input.value=previous.member||'';rarity.input.value=previous.rarity||'';signed.input.value=previous.signed||'any';birthday.input.value=previous.birthday||'any';
      function drawCards(){const chosen=artwork.input.value;artwork.input.replaceChildren(new Option('Any card matching the choices below',''));catalogue.cards.filter(c=>(!pack.input.value||c.set===pack.input.value)&&(!member.input.value||c.members.includes(member.input.value))&&(!rarity.input.value||c.rarities.includes(rarity.input.value))&&(!search.input.value||c.name.toLowerCase().includes(search.input.value.toLowerCase()))).forEach(c=>artwork.input.add(new Option(c.name,c.id)));if([...artwork.input.options].some(o=>o.value===chosen))artwork.input.value=chosen;}
      drawCards();artwork.input.value=previous.card_id||'';
      const submit=el('button','Review Trade Listing','m-btn primary');submit.type='submit';const review=el('p','','dialog-note');let reviewed='';
      function changed(){reviewed='';submit.textContent='Review Trade Listing';review.textContent='';}
      [pack,member,rarity].forEach(f=>f.input.onchange=()=>{drawCards();changed();});[artwork,signed,birthday].forEach(f=>f.input.onchange=changed);search.input.oninput=()=>{drawCards();changed();};
      fields.append(pack.wrap,member.wrap,rarity.wrap,signed.wrap,birthday.wrap);form.append(search.wrap,artwork.wrap,fields,review,error,submit);M.body.append(form);
      form.onsubmit=e=>{e.preventDefault();const req={card_id:artwork.input.value||null,set:pack.input.value||null,member:member.input.value||null,rarity:rarity.input.value||null,signed:signed.input.value,birthday:birthday.input.value};const key=JSON.stringify(req);
        if(reviewed!==key){reviewed=key;const chosen=catalogue.cards.find(c=>c.id===req.card_id);review.textContent=requirementsText({...req,card_name:chosen?.name})+' · Applies to '+cards.length+' selected '+(cards.length===1?'card':'cards')+'.';submit.textContent='Confirm Trade Listing';return;}
        M.mutate('/api/me/market/exchange',{action:'wtt_bulk',copy_ids:cards.map(c=>c.id),requirements:req},submit,error,()=>success('Your trade listing is ready. Collectors can now match against your preferences.'));
      };
    }catch(err){if(live(version)){loading.remove();error.textContent=err.message;M.body.append(error);}}
  }
  function bulk(cards) {
    open('Set Sale Prices');const form=el('form'),inputs=[];
    M.body.append(el('p','Set a coin price for each copy, then review the full list. Frames stay with you.','dialog-note'));
    cards.forEach(card=>{const row=field(card.name+' · #'+card.serial+(card.favorite?' · Favourite':''),'number');row.input.min=1;row.input.max=1000000000;row.input.step=1;row.input.required=true;inputs.push({card,input:row.input});form.append(row.wrap);});
    const error=errorNode(),review=el('p','','dialog-note'),submit=el('button','Review Listings','m-btn primary');submit.type='submit';form.append(review,error,submit);M.body.append(form);let reviewed='';
    form.oninput=()=>{reviewed='';submit.textContent='Review Listings';review.textContent='';};
    form.onsubmit=e=>{e.preventDefault();const items=inputs.map(({card,input})=>({copy_id:card.id,price:Number(input.value)}));
      if(items.some(x=>!Number.isSafeInteger(x.price)||x.price<1||x.price>1000000000)){error.textContent='Enter a whole coin price for each card.';return;}
      const key=JSON.stringify(items);if(reviewed!==key){reviewed=key;review.textContent='Publish '+items.length+' listings for '+fmt(items.reduce((sum,x)=>sum+x.price,0))+' coins in total?';submit.textContent='Confirm All Listings';return;}
      M.mutate('/api/me/market/bulk',{items},submit,error,()=>success('All '+items.length+' cards have been listed.'));
    };
  }
  function edit(card) {
    open('Edit Sale Price');const price=field('New price in coins','number');price.input.min=1;price.input.max=1000000000;price.input.step=1;price.input.value=card.price;price.input.required=true;
    const form=el('form'),error=errorNode(),submit=el('button','Review New Price','m-btn primary');submit.type='submit';form.append(el('p',card.name+' · #'+card.serial),price.wrap,error,submit);M.body.append(form);let reviewed=null;
    price.input.oninput=()=>{reviewed=null;submit.textContent='Review New Price';};
    form.onsubmit=e=>{e.preventDefault();const amount=Number(price.input.value);if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000){error.textContent='Choose a whole coin price.';return;}
      if(reviewed!==amount){reviewed=amount;submit.textContent='Confirm · '+fmt(amount)+' coins';return;}
      M.mutate('/api/me/market/edit',{listing_id:card.id,previous_price:card.price,price:amount},submit,error,()=>success('Listing price updated.'));
    };
  }
  async function wanted(initial=null) {
    if(!auth())return;const version=open('Create a Wanted Request'),search=field('Find a card','search'),results=el('div',undefined,'exchange-picker'),error=errorNode();
    M.body.append(search.wrap,results,error);
    try {
      const data=await api('/api/catalogue');if(!live(version))return;
      const draw=()=>{results.replaceChildren();data.cards.filter(card=>(!initial||card.id===initial)&&(!search.input.value||card.name.toLowerCase().includes(search.input.value.toLowerCase()))).slice(0,30).forEach(card=>results.append(button(card.name,()=>wantedForm(card))));};
      search.input.oninput=draw;draw();
      if(initial){const card=data.cards.find(c=>c.id===initial);if(card)wantedForm(card);}
    }catch(err){if(live(version))error.textContent=err.message;}
  }
  function wantedForm(card) {
    open('Wanted · '+card.name);
    const form=el('form'),rarity=selectField('Variant',[['','Any variant'],...card.rarities.map(r=>[r,label(r)])]),price=field('Coins offered','number');
    const signature=selectField('Signature',[['','Unsigned'],...(!card.event_id&&card.type!=='event'?card.members.map(m=>[m,'Signed by '+label(m)]):[])]);
    const birthday=selectField('Birthday',[['','Regular edition'],...(!card.event_id&&card.type!=='event'?card.members.map(m=>[m,label(m)+' Birthday']):[])]);
    signature.input.disabled=birthday.input.disabled=true;rarity.input.onchange=()=>{signature.input.disabled=birthday.input.disabled=!rarity.input.value;};
    price.input.min=1;price.input.max=1000000000;price.input.step=1;price.input.required=true;
    const error=errorNode(),review=el('p','Coins are checked when someone fulfils this request; they are not reserved. Each request buys one card.','dialog-note'),submit=el('button','Review Request','m-btn primary');submit.type='submit';
    form.append(rarity.wrap,signature.wrap,birthday.wrap,price.wrap,review,error,submit);M.body.append(form);let reviewed='';
    form.oninput=()=>{reviewed='';submit.textContent='Review Request';};
    form.onsubmit=e=>{e.preventDefault();const amount=Number(price.input.value);if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000){error.textContent='Choose a whole coin price.';return;}
      const data={action:'wanted',card_id:card.id,rarity:rarity.input.value||null,signed:rarity.input.value?signature.input.value||null:null,birthday:rarity.input.value?birthday.input.value||null:null,price:amount};
      const key=JSON.stringify(data);if(reviewed!==key){reviewed=key;submit.textContent='Confirm Request · '+fmt(amount)+' coins';return;}
      M.mutate('/api/me/market/exchange',data,submit,error,()=>success('Your wanted request is now published.'));
    };
  }
  async function openListing(card) {
    if(card.kind==='wtb') {
      open('Wanted · '+card.name);const error=errorNode();M.body.append(M.art(card),M.tags(card),el('p',card.seller.name+' is offering '+fmt(card.price)+' coins.'),el('p',card.rarity?'Matches this exact rarity, signature and birthday edition.':'Accepts any variant of this artwork.','dialog-note'));
      if(!authForDetail())return;
      if(card.seller.id===M.wallet.id)M.body.append(action('Remove Request',{action:'cancel_wanted',id:card.id},error));
      else M.body.append(button('Sell a Matching Card',()=>picker({title:'Choose a Matching Copy',max:1,cardId:card.card_id,matchWanted:card.id,filter:c=>!card.rarity||(c.rarity===card.rarity&&(c.signed||null)===(card.signed||null)&&(c.birthday||null)===(card.birthday||null)),done:cards=>fulfil(card,cards[0])}),true));
      M.body.append(error);return;
    }
    const version=open('Trade Card');
    try {
      const fresh=await api('/api/market/copies/'+encodeURIComponent(card.copy_id||card.id),{auth:!!M.wallet});if(!live(version))return;
      M.body.append(M.art(fresh),el('h3',fresh.name),M.tags(fresh),el('p','Print #'+fresh.serial),el('p',fresh.code,'dialog-note'),el('p',requirementsText(fresh.requirements),'trade-looking-for'));const error=errorNode();
      if(!authForDetail())return;
      if(fresh.seller.id===M.wallet.id)M.body.append(action('Remove from Trade Listings',{action:'wtt',copy_id:fresh.id,enabled:false},error),button('Edit What I Want',()=>markTrade([fresh])));
      else M.body.append(button('Make an Offer',()=>compose({recipient:fresh.seller,requested:[fresh],offered:[]}),true));M.body.append(error);
    }catch(error){if(live(version))M.body.append(el('p',error.message,'dialog-error'));}
  }
  function authForDetail(){if(M.wallet?.exists)return true;const link=el('a','Sign in with Discord','m-btn primary');link.href='./account.html';M.body.append(link);return false;}
  function fulfil(request,copy) {
    open('Review Sale');const error=errorNode();M.body.append(el('p','Sell '+copy.name+' · #'+copy.serial+' to '+request.seller.name+' for '+fmt(request.price)+' coins?'),M.tags(copy),el('p',copy.code,'dialog-note'),el('p','Your equipped frame stays with you.','dialog-note'),action('Complete Sale',{action:'fulfil',id:request.id,copy_id:copy.id,price:request.price},error,()=>success('Sale complete. The card and coins have been transferred.'),true),error);
  }
  function compose(state) {
    if(!auth())return;open(state.id?'Counteroffer':'Make an Offer');
    const sides=el('div',undefined,'exchange-sides');
    for(const [key,title,owner] of [['offered','You Offer',null],['requested','You Receive',state.recipient.id]]) {
      const side=el('div',undefined,'exchange-side');side.append(el('h3',title));if(key==='offered')state.requested.forEach(c=>{if(c.requirements)side.append(el('p',requirementsText(c.requirements),'dialog-note'));});
      state[key].forEach(card=>side.append(el('p',card.name+' · '+label(card.rarity)+' · #'+card.serial+(card.signed?' · Signed by '+label(card.signed):'')+(card.birthday?' · Birthday: '+label(card.birthday):''))));
      side.append(button('Choose Cards',()=>picker({title,selected:state[key],owner,matchTrade:key==='offered'&&!state.id?state.requested.map(c=>c.id).join(','):null,done:cards=>{state[key]=cards;compose(state);}})));sides.append(side);
    }
    const note=field('Optional note (up to 300 characters)');note.input.maxLength=300;note.input.value=state.message||'';note.input.oninput=()=>state.message=note.input.value;
    const error=errorNode(),data={action:state.id?'counter':'propose',id:state.id,revision:state.revision,recipient:state.recipient.id,offered:state.offered.map(c=>c.id),requested:state.requested.map(c=>c.id),message:state.message||''};
    const send=action(state.id?'Send Counteroffer':'Send Offer',data,error,()=>success('Offer sent. You can follow its progress in My Offers.'),true);send.disabled=!state.offered.length||!state.requested.length;
    note.input.oninput=()=>{state.message=note.input.value;data.message=note.input.value;};
    M.body.append(sides);if(!state.id)M.body.append(note.wrap);M.body.append(el('p','One to five cards per side. Frames stay with their owners. Cards are checked again when the offer is accepted.','dialog-note'),send,error);
  }
  let bucket='incoming',offerRequest=0;
  async function offers() {
    if(!M.wallet){M.status('Sign in to view your offers.');return;}
    const version=++offerRequest,grid=$('market-grid');grid.classList.add('exchange-offers-grid');grid.replaceChildren();
    const nav=el('div',undefined,'market-type-tabs');[['incoming','Received'],['outgoing','Sent'],['confirm','Final Confirmation'],['history','History']].forEach(([value,title])=>{const b=button(title,()=>{bucket=value;M.setPage(1);M.browse();});b.classList.toggle('active',value===bucket);nav.append(b);});grid.append(nav);
    try {
      const params=new URLSearchParams({bucket,page:M.page});
      const data=await api('/api/me/market/offers?'+params,{auth:true});if(version!==offerRequest||M.kind!=='offers')return;
      M.setPagination(data);M.status(fmt(data.total)+' offers');
      for(const trade of data.offers){
        const item=el('article',undefined,'exchange-offer'),mine=trade.proposer.id===M.wallet.id;
        item.append(el('h3',(mine?'You → '+trade.recipient.name:trade.proposer.name+' → You')+' · '+label(trade.status)));
        const sides=el('div',undefined,'exchange-sides');
        for(const [title,cards] of [[mine?'You Offer':'You Receive',trade.offered],[mine?'You Receive':'You Offer',trade.requested]]){
          const side=el('div',undefined,'exchange-side');side.append(el('strong',title));
          cards.forEach(card=>{const row=el('div',undefined,'exchange-copy'),image=el('img');image.alt=card.name;
            // Participant-only images are fetched with the session header.
            api(card.image,{auth:true,blob:true}).then(blob=>{if(!row.isConnected)return;const url=URL.createObjectURL(blob);image.src=url;image.onload=()=>URL.revokeObjectURL(url);image.onerror=()=>URL.revokeObjectURL(url);}).catch(()=>image.remove());
            row.append(image,el('span',card.name+' · '+label(card.rarity)+' · #'+card.serial+(card.signed?' · Signed by '+label(card.signed):'')+(card.birthday?' · Birthday: '+label(card.birthday):'')));side.append(row);});sides.append(side);
        }
        item.append(sides);if(trade.message)item.append(el('p',trade.message,'exchange-note'));
        const controls=el('div',undefined,'exchange-actions');
        const review=button('Review Offer',()=>reviewOffer(trade));controls.append(review);item.append(controls);grid.append(item);
      }
      if(!data.offers.length)grid.append(el('p','No offers in this view.','market-empty'));
    }catch(error){M.status(error.message,true);}
  }
  function reviewOffer(trade){
    open('Review Trade');const mine=trade.proposer.id===M.wallet.id,error=errorNode();
    for(const [title,cards] of [[mine?'You Give':'You Receive',trade.offered],[mine?'You Receive':'You Give',trade.requested]]){
      M.body.append(el('h3',title));cards.forEach(card=>M.body.append(el('p',card.name+' · '+label(card.rarity)+' · #'+card.serial+(card.signed?' · Signed by '+label(card.signed):'')+(card.birthday?' · Birthday: '+label(card.birthday):'')),el('p',card.code,'dialog-note')));
    }
    const base={id:trade.id,revision:trade.revision},done=()=>success('Trade updated. Check My Offers for its latest status.');
    if(['pending','countered'].includes(trade.status)){
      if(!mine)M.body.append(action('Accept Offer',{...base,action:'accept'},error,done,true),action('Decline Offer',{...base,action:'decline'},error,done));
      M.body.append(button('Make Counteroffer',()=>compose({id:trade.id,revision:trade.revision,recipient:mine?trade.recipient:trade.proposer,offered:mine?trade.offered:trade.requested,requested:mine?trade.requested:trade.offered})));
    }
    if(trade.status==='awaiting_final'&&mine)M.body.append(action('Confirm Exchange',{...base,action:'confirm'},error,done,true));
    if(['pending','countered','awaiting_final'].includes(trade.status))M.body.append(action('Withdraw Offer',{...base,action:'withdraw'},error,done));M.body.append(error);
  }
  const tabs=el('div',undefined,'market-type-tabs');
  [['wts','For Sale · WTS'],['wtb','Wanted · WTB'],['wtt','For Trade · WTT'],['offers','My Offers']].forEach(([value,title])=>{const b=button(title,()=>{M.setKind(value);syncTabs();});b.dataset.kind=value;if(value==='offers'){b.dataset.exchangeAuth='';b.disabled=true;}tabs.append(b);});
  document.querySelector('.market-results').prepend(tabs);
  const contextAction=button('Create Listing',create,true);contextAction.dataset.exchangeAuth='';contextAction.disabled=!M.wallet?.exists;document.querySelector('.market-actions').append(contextAction);
  const matchLabel=el('label'),matchBox=el('input');matchBox.type='checkbox';matchBox.id='market-matching';matchBox.disabled=!M.wallet?.exists;matchLabel.append(matchBox,document.createTextNode(' Only Trades I Can Match'));document.querySelector('.market-filters .filter-checks').append(matchLabel);matchBox.onchange=()=>{M.setPage(1);M.browse();};

  function syncTabs(){
    const kind=M.kind,offersView=kind==='offers';
    if($('market-group'))$('market-group').parentElement.hidden=kind!=='wts';
    if($('market-matching')){$('market-matching').parentElement.hidden=kind!=='wtt';$('market-matching').disabled=!M.wallet?.exists||!supportsMatching;}
    ['all','mine'].forEach(value=>{const active=M.scope===value;$('market-'+value).classList.toggle('active',active);$('market-'+value).setAttribute('aria-pressed',String(active));});
    tabs.querySelectorAll('button').forEach(b=>{const active=b.dataset.kind===kind;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    $('market-mine').hidden=$('market-all').hidden=offersView;document.querySelector('.market-toolbar>label').hidden=offersView;
    const names=kind==='wtb'?{all:'All Requests',owned:'Requests for Cards I Own',unowned:'Requests I Cannot Supply',wishlist:'Requests on My Wishlist',supply:'Cards I Can Sell Now'}:{all:'All Cards',owned:'Cards I Own',unowned:'Cards I’m Missing',wishlist:'Matches My Wishlist',supply:'Cards I Can Supply'};
    for(const option of $('market-ownership').options){const text=names[option.value]||option.textContent;if(option.textContent!==text)option.textContent=text;option.hidden=option.value==='supply'&&kind!=='wtb';}
    const note=M.wallet?(kind==='wtb'?'Owned includes locked copies. Cards I Can Sell Now shows available copies matching the request.':'Missing compares the exact rarity, signature and birthday variant.'):'Sign in to use your collection filters.';
    if($('market-ownership-note').textContent!==note)$('market-ownership-note').textContent=note;
    if(contextAction){contextAction.hidden=offersView;contextAction.disabled=!M.wallet?.exists;const text=kind==='wtb'?'Add Wanted Request':kind==='wtt'?'List Cards for Trade':'Sell a Card';if(contextAction.textContent!==text)contextAction.textContent=text;contextAction.onclick=kind==='wtb'?()=>wanted():kind==='wtt'?()=>picker({title:'Choose Cards for Trade',max:20,done:markTrade}):M.sell;}
  }
  const layout=document.querySelector('.market-layout'),toggle=button('Hide Filters',()=>{const collapsed=layout.classList.toggle('filters-collapsed');toggle.textContent=collapsed?'Show Filters':'Hide Filters';toggle.setAttribute('aria-expanded',String(!collapsed));});toggle.classList.add('market-filter-toggle');toggle.setAttribute('aria-expanded','true');layout.before(toggle);
  async function group(card,page=1){
    const version=open(card.name+' · Available Copies');
    try{const params=M.query();params.set('variant',card.variant_key);params.set('page',page);params.set('sort','cheapest');params.set('group','no');const data=await api('/api/market?'+params,{auth:!!M.wallet});if(!live(version))return;
      data.listings.forEach(copy=>M.body.append(button('#'+copy.serial+' · '+fmt(copy.price)+' coins · '+copy.seller.name,()=>M.openListing(copy))));
      const nav=el('div',undefined,'exchange-actions');if(data.page>1)nav.append(button('Previous',()=>group(card,data.page-1)));if(data.page<data.pages)nav.append(button('Next',()=>group(card,data.page+1)));M.body.append(nav);
    }catch(error){if(live(version))M.body.append(el('p',error.message,'dialog-error'));}
  }
  const groupLabel=el('label'),groupBox=el('input');groupBox.type='checkbox';groupBox.id='market-group';groupLabel.append(groupBox,document.createTextNode(' Group identical cards'));document.querySelector('.market-toolbar').append(groupLabel);groupBox.onchange=()=>{M.setPage(1);M.browse();};
  window.NamjoonExchange={create,edit,open:openListing,offers,syncTabs,wanted,group,requirementsText};
  // Collection shortcuts always re-fetch the owned copy before opening a form.
  const params=new URLSearchParams(location.search);
  async function shortcut(){
    if(!M.wallet?.exists)return;
    if(params.get('wanted')){wanted(params.get('wanted'));return;}
    const id=params.get('sell')||params.get('trade');if(!id)return;
    try{const card=await api('/api/market/copies/'+encodeURIComponent(id),{auth:true});if(card.seller.id!==M.wallet.id)throw new Error('This card is no longer yours.');if(params.has('sell'))M.priceCard(card);else markTrade([card]);}catch(error){open('Card unavailable');M.body.append(el('p',error.message,'dialog-error'));}
  }
  api('/api/market/exchange/options').then(data=>{supportsMatching=!!data.trade_requirements;syncTabs();}).catch(()=>{supportsMatching=false;syncTabs();});
  let checked=false;const initial=setInterval(()=>{if(!checked&&M.wallet){checked=true;clearInterval(initial);shortcut();}syncTabs();},300);setTimeout(()=>clearInterval(initial),15000);
})();
