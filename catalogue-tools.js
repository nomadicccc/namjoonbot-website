/* Catalogue browsing state. Never saves authentication or spoiler preferences. */
(() => {
  'use strict';
  if(document.body.dataset.page !== 'catalogue') return;
  const fields = {q:'search',member:'member',set:'set',rarity:'rarity'};
  const storageKey = 'namjoon-catalogue-filters-v1';
  const chips = document.getElementById('catalogue-active-filters');
  const reset = document.getElementById('catalogue-reset');
  const copy = document.getElementById('catalogue-copy-link');
  const note = document.getElementById('catalogue-tools-status');
  const initialURL = new URL(location.href);
  let initial = {};
  const hasURLFilters = [...Object.keys(fields),'page'].some(key => initialURL.searchParams.has(key));
  if(hasURLFilters) initial = Object.fromEntries(initialURL.searchParams);
  else { try { initial = JSON.parse(sessionStorage.getItem(storageKey) || '{}') || {}; } catch {} }
  function restore(values){
    for(const [key,id] of Object.entries(fields)){
      const input = document.getElementById(id);
      const value = typeof values[key] === 'string' ? values[key] : key === 'q' ? '' : 'all';
      if(key === 'q') input.value = value.slice(0,100);
      else input.value = [...input.options].some(option => option.value === value) ? value : 'all';
    }
    const requested = Number(values.page);
    currentPage = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  }
  function state(){
    return Object.fromEntries([...Object.entries(fields).map(([key,id]) => [key,document.getElementById(id).value]),['page',currentPage]]);
  }
  function sync(){
    const values = state();
    const url = new URL(location.href);
    for(const key of [...Object.keys(fields),'page']) url.searchParams.delete(key);
    for(const [key,value] of Object.entries(values)){
      if(key === 'page' ? value > 1 : value && value !== 'all') url.searchParams.set(key,String(value));
    }
    try { history.replaceState(history.state,'',url); } catch {}
    try { sessionStorage.setItem(storageKey,JSON.stringify(values)); } catch {}
    chips.replaceChildren();
    let count = 0;
    for(const [key,id] of Object.entries(fields)){
      const input = document.getElementById(id);
      if(!values[key] || values[key] === 'all') continue;
      count++;
      const text = key === 'q' ? 'Search: '+values[key] : input.selectedOptions[0].textContent;
      const chip = document.createElement('button');
      chip.type = 'button'; chip.className = 'filter-chip';
      chip.textContent = text+' ×'; chip.setAttribute('aria-label','Remove filter: '+text);
      chip.addEventListener('click',() => {
        input.value = key === 'q' ? '' : 'all'; currentPage = 1;
        renderCatalogue(); input.focus();
      });
      chips.append(chip);
    }
    chips.hidden = !count;
    reset.disabled = !count;
  }
  restore(initial);
  let restoredSets = false;
  window.catalogueTools = {beforeRender(){
    // Set options arrive from the API; restore their value only after that load.
    if(!restoredSets){
      const input = document.getElementById('set');
      if([...input.options].some(option => option.value === initial.set)) input.value = initial.set;
      restoredSets = true;
    }
  },sync};
  reset.addEventListener('click',() => {
    clearTimeout(filterTimer); restore({}); renderCatalogue();
    document.getElementById('search').focus();
  });
  copy.addEventListener('click',async () => {
    try { await navigator.clipboard.writeText(location.href); note.textContent = 'Link copied.'; }
    catch { note.textContent = 'Copy the page address from your browser to share these filters.'; }
  });
  for(const id of ['prev','next']) document.getElementById(id).addEventListener('click',() => {
    const status = document.getElementById('status'); status.focus({preventScroll:true});
    status.scrollIntoView({block:'start',behavior:'instant'});
  });
  window.addEventListener('popstate',() => {
    restore(Object.fromEntries(new URL(location.href).searchParams));
    if(catalogueReady) renderCatalogue();
  });
  if(catalogueReady) renderCatalogue();
})();
