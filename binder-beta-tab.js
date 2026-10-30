'use strict';
// Public launcher only. The backend checks membership before returning editor code.
let binderBetaVersion=0,binderBetaFrame=null,binderBetaOpening=false;
function binderAssetBootstrap(runtime){
  window.BINDER_WEB_RUNTIME=Object.freeze(runtime);
  const cache=new Map(),wanted=new WeakMap();
  const srcDescriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  function deny(){parent.postMessage({type:'binder-beta-expired'},runtime.siteOrigin);}
  window.binderBetaAsset=async function(src){
    const match=/^assets\/(cards|frames|stickers)\/([a-zA-Z0-9_-]+\.(?:webp|png))$/.exec(String(src));
    if(!match)return src;
    if(!cache.has(src)){
      const request=fetch(runtime.apiBase+'/api/me/binder-beta/assets/'+match[1]+'/'+match[2],{headers:{Authorization:'Bearer '+runtime.session},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'}).then(async response=>{if(response.status===401||response.status===403){deny();throw Error('Binder access expired');}if(!response.ok)throw Error('Card artwork unavailable');return URL.createObjectURL(await response.blob());}).catch(error=>{cache.delete(src);throw error;});
      cache.set(src,request);
    }
    return cache.get(src);
  };
  Object.defineProperty(HTMLImageElement.prototype,'src',{...srcDescriptor,set(value){
    const src=String(value);wanted.set(this,src);
    if(/^assets\/(cards|frames|stickers)\/[a-zA-Z0-9_-]+\.(?:webp|png)$/.test(src)){
      window.binderBetaAsset(src).then(url=>{if(wanted.get(this)===src)srcDescriptor.set.call(this,url);}).catch(()=>{this.alt='Artwork unavailable — refresh or sign in again';});
    }else srcDescriptor.set.call(this,value);
  }});
  window.addEventListener('pagehide',()=>{for(const item of cache.values())item.then(url=>URL.revokeObjectURL(url)).catch(()=>{});cache.clear();});
}
window.clearBinderBeta=function(){binderBetaVersion++;binderBetaOpening=false;if(binderBetaFrame)binderBetaFrame.remove();binderBetaFrame=null;$('binder-beta-host').replaceChildren();$('expand-binder-beta').hidden=true;$('binders').classList.remove('beta-expanded');$('binder-beta-status').textContent='Sign in to check beta access.';};
window.checkBinderBetaAccess=async function(){
  const version=binderBetaVersion,sent=token;
  if(!sent)return;
  try{const data=await api('/api/me/binder-beta/status',{privateRequest:true});if(version!==binderBetaVersion||token!==sent)return;$('binders-tab').classList.toggle('binder-beta-locked-tab',!data.allowed);$('binders-tab').setAttribute('aria-disabled',String(!data.allowed));return data;}
  catch(error){if(version===binderBetaVersion&&token===sent)$('binder-beta-status').textContent=error.message;}
};
window.openBinderBeta=async function(){
  if(binderBetaFrame||binderBetaOpening)return;
  const version=binderBetaVersion,sent=token;
  if(!sent){$('binder-beta-status').textContent='Sign in with Discord first.';return;}
  binderBetaOpening=true;$('binder-beta-status').textContent='Checking supporter access…';
  try{
    const access=await api('/api/me/binder-beta/status',{privateRequest:true});if(version!==binderBetaVersion||sent!==token)return;
    $('binder-beta-locked').hidden=access.allowed;
    if(!access.allowed){$('binder-beta-status').textContent='This testing feature is currently available to supporters only.';return;}
    $('binder-beta-status').textContent='Loading your binder editor…';
    const data=await api('/api/me/binder-beta/editor',{privateRequest:true});if(version!==binderBetaVersion||sent!==token)return;
    if(typeof data.html!=='string'||!data.html.includes('<!--BINDER_BETA_RUNTIME-->'))throw Error('The binder editor is awaiting an update.');
    const runtime={apiBase:API,session:sent,userId:access.user_id,siteOrigin:location.origin};
    const json=JSON.stringify(runtime).replaceAll('<','\\u003c');
    const bootstrap='<script>('+binderAssetBootstrap.toString()+')('+json+');<\/script>';
    const frame=document.createElement('iframe');frame.title='NamjoonBot binder editor';frame.className='binder-beta-frame';frame.referrerPolicy='no-referrer';
    binderBetaFrame=frame;frame.srcdoc=data.html.replace('<!--BINDER_BETA_RUNTIME-->',bootstrap);$('binder-beta-host').replaceChildren(frame);$('expand-binder-beta').hidden=false;
    $('binder-beta-status').textContent='';
  }catch(error){if(version===binderBetaVersion&&token===sent)$('binder-beta-status').textContent=error.message;}
  finally{if(version===binderBetaVersion)binderBetaOpening=false;}
};
$('binders-tab').addEventListener('click',()=>selectTab('binders'));
$('expand-binder-beta').addEventListener('click',()=>{const expanded=$('binders').classList.toggle('beta-expanded');$('expand-binder-beta').textContent=expanded?'Back to My Collection':'Expand editor';});
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==binderBetaFrame?.contentWindow||event.data?.type!=='binder-beta-expired')return;window.clearBinderBeta();$('binder-beta-status').textContent='Your session or supporter access changed. Sign in again to reopen the editor.';});
if(token)window.checkBinderBetaAccess();
