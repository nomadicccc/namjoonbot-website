(() => {
  'use strict';
  const M=window.NamjoonMarket,E=window.NamjoonExchange;
  if(!M||!E)return;
  const {node:el,button,api}=M,fmt=n=>Number(n||0).toLocaleString('en-GB');
  let supported=false,active=false,bucket='incoming',generation=0,matchGeneration=0;
  function errorNode(){const n=el('p','','dialog-error');n.setAttribute('role','status');return n;}
  function viewOffers(){M.dialog.close();active=true;M.setKind('offers');E.syncTabs();}
  function sent(){M.openDialog('Price Offer Sent');M.body.append(el('p','The other collector can accept, decline or counter your price. Follow the negotiation in My Offers.'),button('View Price Offers',viewOffers,true));}
  function cardSummary(card){return card.name+' · #'+card.serial+(card.signed?' · Signed by '+card.signed:'')+(card.birthday?' · Birthday: '+card.birthday:'');}
  function sendAction(text,data,error,done){const b=button(text,()=>{b.textContent='Confirm · '+text;b.onclick=()=>M.mutate('/api/me/market/price-offers',data,b,error,done);},true);return b;}
  function form({listing=null,wanted=null,copy=null,offer=null,initialPrice=null}){
    if(!M.wallet?.exists)return;
    const card=offer?.card||copy||listing,isBuyer=offer?M.wallet.id===offer.buyer.id:!wanted;
    const other=offer?(isBuyer?offer.seller:offer.buyer):(wanted?wanted.seller:listing.seller);
    M.openDialog(offer?'Counter the Price':wanted?'Offer This Card at Your Price':'Make a Price Offer');
    const f=el('form'),wrap=el('label','Your price in coins','exchange-field'),price=el('input');
    price.type='number';price.min='1';price.max='1000000000';price.step='1';price.required=true;price.value=initialPrice??offer?.price??wanted?.price??listing?.price;wrap.append(price);
    const note=el('p',isBuyer?'If the seller accepts, you will buy this copy at your offered price. Coins are checked at acceptance. Offers do not reserve cards or coins.':'The buyer can accept, decline or counter. Your card stays yours until the offer is accepted.','dialog-note');
    const review=el('p','','dialog-note'),error=errorNode(),submit=el('button','Review Price Offer','m-btn primary');submit.type='submit';
    f.append(el('p',cardSummary(card)),M.tags(card),el('p',(isBuyer?'Seller: ':'Buyer: ')+other.name,'dialog-note'),wrap,note,review,error,submit);M.body.append(f);
    let reviewed=null;const requestId=crypto.randomUUID();price.oninput=()=>{reviewed=null;submit.textContent='Review Price Offer';review.textContent='';};
    f.onsubmit=e=>{e.preventDefault();const amount=Number(price.value);if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000){error.textContent='Choose a whole price between 1 and 1,000,000,000 coins.';return;}
      if(reviewed!==amount){reviewed=amount;review.textContent=(isBuyer?'Offer to buy from ':'Offer to sell to ')+other.name+' for '+fmt(amount)+' coins?';submit.textContent='Send Offer · '+fmt(amount)+' coins';return;}
      const data=offer?{action:'counter',id:offer.id,revision:offer.revision,price:amount}:{action:'create',price:amount,request_id:requestId,...(wanted?{wanted_id:wanted.id,copy_id:copy.id}:{listing_id:listing.id,...(listing.wanted_id?{match_wanted_id:listing.wanted_id}:{})})};
      M.mutate('/api/me/market/price-offers',data,submit,error,sent);
    };
  }
  function addListingAction(card,info){
    if(supported&&M.wallet?.exists&&M.wallet.id!==card.seller.id)info.append(button('Make a Price Offer',()=>form({listing:card})));
  }
  function addWantedActions(wanted,info,pick){
    if(supported&&M.wallet?.exists&&M.wallet.id!==wanted.seller.id)info.append(button('Offer a Different Price',()=>pick(copy=>form({wanted,copy}))));
    if(M.wallet?.id===wanted.seller.id){const box=el('div',undefined,'suggested-listings');info.append(box);suggestMatches({wanted_id:wanted.id,price:wanted.price},box);}
  }
  function cancelSuggestions(container){container.dataset.matchVersion=String(++matchGeneration);container.replaceChildren();}
  async function suggestMatches(target,container,page=1){
    const version=String(++matchGeneration);container.dataset.matchVersion=version;
    const query=new URLSearchParams({page});for(const key of ['wanted_id','card_id','rarity','signed','birthday'])if(target[key])query.set(key,target[key]);
    container.replaceChildren(el('p','Checking existing sale listings…','dialog-note'));
    try{
      const data=await api('/api/market/wanted-matches?'+query,{auth:!!M.wallet});if(!container.isConnected||container.dataset.matchVersion!==version)return;
      container.replaceChildren();if(!data.total){container.append(el('p','No matching copies are currently listed for sale.','dialog-note'));return;}
      container.append(el('h3',data.total+' Matching '+(data.total===1?'Listing':'Listings')),el('p','Already available: buy a copy, negotiate its price, or continue with your wanted request.','dialog-note'));
      for(const card of data.listings){if(target.wanted_id)card.wanted_id=target.wanted_id;const row=el('div',undefined,'suggested-sale'),text=el('div'),actions=el('div',undefined,'exchange-actions');
        text.append(el('strong',fmt(card.price)+' coins'),el('p',cardSummary(card),'dialog-note'),el('p','Seller: '+card.seller.name+(target.price&&card.price<=target.price?' · Within your budget':''),'dialog-note'));
        actions.append(button('View / Buy',()=>M.openListing(card),true));if(supported&&M.wallet?.exists)actions.append(button('Offer a Price',()=>form({listing:card,initialPrice:target.price||card.price})));
        row.append(text,actions);container.append(row);
      }
      const nav=el('div',undefined,'exchange-actions');if(data.page>1)nav.append(button('Previous',()=>suggestMatches(target,container,data.page-1)));if(data.page<data.pages)nav.append(button('More Matches',()=>suggestMatches(target,container,data.page+1)));container.append(nav);
    }catch{if(container.isConnected&&container.dataset.matchVersion===version)container.replaceChildren(el('p','Existing listings could not be checked. You can still publish your wanted request.','dialog-note'));}
  }
  function navigation(){const nav=el('div',undefined,'market-type-tabs');nav.append(button('Card Trades',()=>{active=false;M.setPage(1);E.offers();}));const current=button('Price Offers',()=>{});current.classList.add('active');nav.append(current);return nav;}
  async function show(){
    active=true;if(!M.wallet){M.status('Sign in to view your price offers.');return;}
    const version=++generation,grid=document.getElementById('market-grid');grid.classList.add('exchange-offers-grid');grid.replaceChildren(navigation());
    const nav=el('div',undefined,'market-type-tabs');for(const [value,text]of[['incoming','Received'],['outgoing','Sent'],['history','History']]){const b=button(text,()=>{bucket=value;M.setPage(1);show();});b.classList.toggle('active',bucket===value);nav.append(b);}grid.append(nav);
    try{const data=await api('/api/me/market/price-offers?'+new URLSearchParams({bucket,page:M.page}),{auth:true});if(version!==generation||M.kind!=='offers'||!active)return;
      M.setPagination(data);M.status(fmt(data.total)+' price offers');
      for(const offer of data.offers){const item=el('article',undefined,'exchange-offer'),buying=offer.buyer.id===M.wallet.id,other=buying?offer.seller:offer.buyer;
        item.append(el('h3',offer.card.name),el('p',(buying?'Buying from ':'Selling to ')+other.name+' · '+offer.status,'dialog-note'),el('p',fmt(offer.price)+' coins','market-price'),el('p',cardSummary(offer.card),'dialog-note'),button(offer.status==='pending'?'Review Price Offer':'View Details',()=>review(offer),offer.status==='pending'));grid.append(item);
      }
      if(!data.offers.length)grid.append(el('p','No price offers in this view.','market-empty'));
    }catch(error){M.status(error.message,true);}
  }
  function review(offer){
    M.openDialog('Price Offer · '+offer.card.name);const buyer=M.wallet.id===offer.buyer.id,sender=M.wallet.id===offer.proposer_id,error=errorNode();
    M.body.append(el('p',cardSummary(offer.card)),M.tags(offer.card),el('p','Buyer: '+offer.buyer.name),el('p','Seller: '+offer.seller.name),el('p',fmt(offer.price)+' coins','market-price'));
    const data={id:offer.id,revision:offer.revision,price:offer.price};
    function done(result){M.openDialog(result.status==='accepted'?'Sale Complete':'Price Offer Updated');M.body.append(el('p',result.status==='accepted'?'The card and '+fmt(offer.price)+' coins have been transferred.':'The price offer is now '+result.status+'.'),button('View Price Offers',viewOffers));}
    if(offer.status==='pending'){
      if(!sender){
        M.body.append(el('p',buyer?'Accepting will deduct '+fmt(offer.price)+' coins and add this copy to your inventory.':'Accepting will transfer this copy to the buyer and pay you '+fmt(offer.price)+' coins.','dialog-note'));
        const accept=sendAction(buyer?'Buy for '+fmt(offer.price)+' Coins':'Sell for '+fmt(offer.price)+' Coins',{...data,action:'accept'},error,done);accept.disabled=buyer&&M.wallet.coins<offer.price;
        if(accept.disabled)M.body.append(el('p','You need '+fmt(offer.price-M.wallet.coins)+' more coins.','dialog-note'));
        M.body.append(accept,button('Counter the Price',()=>form({offer})),sendAction('Decline Offer',{...data,action:'decline'},error,done));
      }else M.body.append(el('p','Waiting for the other collector to respond.','dialog-note'),sendAction('Withdraw Offer',{...data,action:'withdraw'},error,done));
    }else M.body.append(el('p','Status: '+offer.status,'dialog-note'));
    M.body.append(error);
  }
  window.NamjoonPriceOffers={get supported(){return supported;},get active(){return active;},show,form,addListingAction,addWantedActions,suggestMatches,cancelSuggestions};
  api('/api/market/price-offers/options').then(data=>{supported=!!data.price_offers;}).catch(()=>{});
})();
