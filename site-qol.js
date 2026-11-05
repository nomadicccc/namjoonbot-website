(() => {
  'use strict';
  const nav = document.querySelector('header nav');
  const links = nav?.querySelector('.navlinks, .market-nav, .nav-links');
  // Homepage keeps its existing mobile menu.
  if(links && !document.getElementById('menu-toggle')){
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'site-menu-toggle'; button.textContent = 'Menu ☰';
    links.id = 'site-navigation'; links.classList.add('site-navigation'); nav.classList.add('site-navigation-host');
    button.setAttribute('aria-controls',links.id); nav.insertBefore(button,links);
    const mobile = window.matchMedia('(max-width: 640px)');
    function close(){ links.hidden = mobile.matches; button.setAttribute('aria-expanded',String(!links.hidden)); }
    close(); mobile.addEventListener('change',close);
    button.addEventListener('click',() => { links.hidden = !links.hidden; button.setAttribute('aria-expanded',String(!links.hidden)); });
    links.addEventListener('click',event => { if(mobile.matches && event.target.closest('a')) close(); });
    nav.addEventListener('keydown',event => {if(event.key === 'Escape' && mobile.matches && !links.hidden){close();button.focus();}});
  }
  // Repeat a failed read without reloading the page or losing filter choices.
  const isCatalogue = document.body.dataset.page === 'catalogue';
  const status = document.getElementById(isCatalogue ? 'status' : 'market-status');
  if(status && (isCatalogue || document.body.dataset.page === 'market')){
    const retry = document.createElement('button');
    retry.type = 'button'; retry.className = 'site-retry'; retry.textContent = 'Try again'; retry.hidden = true;
    status.after(retry);
    new MutationObserver(() => {retry.hidden = !status.classList.contains('error');}).observe(status,{attributes:true,attributeFilter:['class']});
    retry.addEventListener('click',() => {
      retry.hidden = true;
      if(isCatalogue) document.getElementById('refresh').click();
      else window.NamjoonMarket?.browse();
    });
  }
})();
