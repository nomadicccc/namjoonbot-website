(() => {
'use strict';
// Keep native selects as the source of truth for existing handlers and permissions.
const binderDropdowns=[],binderDropdownMenu=document.createElement('div');
binderDropdownMenu.id='binderDropdownMenu';binderDropdownMenu.className='themed-select-menu';binderDropdownMenu.hidden=true;binderDropdownMenu.setAttribute('role','listbox');document.body.append(binderDropdownMenu);
let openBinderDropdown=null,activeDropdownOption=0,dropdownSearch='',dropdownSearchTimer;
function closeBinderDropdown(){if(openBinderDropdown){openBinderDropdown.trigger.setAttribute('aria-expanded','false');openBinderDropdown.trigger.removeAttribute('aria-activedescendant');}openBinderDropdown=null;binderDropdownMenu.hidden=true;}
function syncBinderDropdowns(){for(const entry of binderDropdowns){const selected=entry.select.options[entry.select.selectedIndex];entry.value.textContent=selected?.textContent||'No matching cards';entry.trigger.disabled=entry.select.disabled||!entry.select.options.length;entry.trigger.setAttribute('aria-disabled',String(entry.trigger.disabled));}}
function setDropdownActive(index){if(!openBinderDropdown)return;const options=[...openBinderDropdown.select.options];if(!options.length)return;activeDropdownOption=Math.max(0,Math.min(options.length-1,index));for(const [i,item]of [...binderDropdownMenu.children].entries())item.classList.toggle('is-active',i===activeDropdownOption);const active=binderDropdownMenu.children[activeDropdownOption];if(active){openBinderDropdown.trigger.setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'});}}
function chooseBinderOption(index){const entry=openBinderDropdown;if(!entry)return;const option=entry.select.options[index];if(!option||option.disabled)return;closeBinderDropdown();entry.select.value=option.value;entry.select.dispatchEvent(new Event('input',{bubbles:true}));entry.select.dispatchEvent(new Event('change',{bubbles:true}));syncBinderDropdowns();entry.trigger.focus();}
function openBinderMenu(entry){
  const wasOpen=openBinderDropdown===entry;closeBinderDropdown();if(wasOpen||entry.trigger.disabled)return;
  openBinderDropdown=entry;dropdownSearch='';binderDropdownMenu.replaceChildren();
  const dialog=entry.select.closest('dialog');(dialog?.open?dialog:document.body).append(binderDropdownMenu);
  for(const [index,option]of [...entry.select.options].entries()){
    const item=document.createElement('div');item.id=entry.select.id+'-choice-'+index;item.className='themed-select-option';item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.selected));item.setAttribute('aria-disabled',String(option.disabled||option.getAttribute?.('aria-disabled')==='true'));
    const text=document.createElement('span'),tick=document.createElement('span');text.textContent=option.textContent;tick.textContent='✓';tick.className='themed-select-tick';tick.setAttribute('aria-hidden','true');item.append(text,tick);
    item.onpointerdown=event=>event.preventDefault();item.onclick=()=>chooseBinderOption(index);item.onpointermove=()=>setDropdownActive(index);binderDropdownMenu.append(item);
  }
  binderDropdownMenu.hidden=false;entry.trigger.setAttribute('aria-expanded','true');binderDropdownMenu.setAttribute('aria-label',entry.label);
  const rect=entry.trigger.getBoundingClientRect(),width=Math.min(Math.max(rect.width,entry.select.id==='sample'?310:210),window.innerWidth-24),below=window.innerHeight-rect.bottom-14,above=rect.top-14,up=below<200&&above>below;
  binderDropdownMenu.style.width=width+'px';binderDropdownMenu.style.maxHeight=Math.min(320,Math.max(80,up?above:below))+'px';binderDropdownMenu.style.left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12))+'px';binderDropdownMenu.style.top=up?'auto':rect.bottom+7+'px';binderDropdownMenu.style.bottom=up?window.innerHeight-rect.top+7+'px':'auto';
  setDropdownActive(Math.max(0,entry.select.selectedIndex));
}
function enhanceBinderDropdown(select){
  if(select.dataset.binderDropdown)return;select.dataset.binderDropdown='true';
  const wrapper=document.createElement('div'),trigger=document.createElement('button'),value=document.createElement('span'),arrow=document.createElement('span');wrapper.className='themed-select';trigger.type='button';trigger.className='themed-select-trigger';trigger.id=select.id+'-trigger';value.className='themed-select-value';arrow.className='themed-select-arrow';arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');
  const label=select.getAttribute('aria-label')||select.closest('label')?.firstChild?.textContent.trim()||select.id;trigger.setAttribute('aria-label',label);trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',binderDropdownMenu.id);trigger.append(value,arrow);wrapper.append(trigger);select.after(wrapper);select.classList.add('editor-select-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const entry={select,trigger,value,label};binderDropdowns.push(entry);trigger.onclick=()=>openBinderMenu(entry);
  trigger.onkeydown=event=>{
    const open=openBinderDropdown===entry;
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();if(!open)openBinderMenu(entry);else setDropdownActive(event.key==='Home'?0:event.key==='End'?select.options.length-1:activeDropdownOption+(event.key==='ArrowDown'?1:-1));}
    else if(event.key==='Enter'||event.key===' '){event.preventDefault();if(open)chooseBinderOption(activeDropdownOption);else openBinderMenu(entry);}
    else if(event.key==='Escape'||event.key==='Tab'){if(open){if(event.key==='Escape')event.preventDefault();closeBinderDropdown();}}
    else if(open&&event.key.length===1&&!event.ctrlKey&&!event.metaKey){dropdownSearch+=event.key.toLowerCase();clearTimeout(dropdownSearchTimer);dropdownSearchTimer=setTimeout(()=>dropdownSearch='',650);const index=[...select.options].findIndex(option=>option.textContent.toLowerCase().includes(dropdownSearch));if(index>=0)setDropdownActive(index);}
  };
  new MutationObserver(()=>{if(openBinderDropdown===entry)closeBinderDropdown();syncBinderDropdowns();}).observe(select,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','aria-disabled']});
}
for(const select of document.querySelectorAll('select'))enhanceBinderDropdown(select);
window.syncMarketDropdowns=syncBinderDropdowns;
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.themed-select,#binderDropdownMenu'))closeBinderDropdown();});
window.addEventListener('resize',closeBinderDropdown);window.addEventListener('scroll',event=>{if(!binderDropdownMenu.contains(event.target))closeBinderDropdown();},true);
syncBinderDropdowns();

})();
