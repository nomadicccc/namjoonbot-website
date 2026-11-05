'use strict';
// Keep all destinations available if JavaScript is unavailable.
const navigation = document.querySelector('header .nav-links');
const menuToggle = document.getElementById('menu-toggle');
const narrowNavigation = window.matchMedia('(max-width: 640px)');
function syncNavigation(){
  navigation.hidden = narrowNavigation.matches;
  menuToggle.setAttribute('aria-expanded', String(!navigation.hidden));
}
document.documentElement.classList.add('navigation-ready');
syncNavigation();
narrowNavigation.addEventListener('change', syncNavigation);
menuToggle.addEventListener('click', () => {
  navigation.hidden = !navigation.hidden;
  menuToggle.setAttribute('aria-expanded', String(!navigation.hidden));
});
navigation.addEventListener('click', event => {
  if(narrowNavigation.matches && event.target.closest('a')) syncNavigation();
});
document.addEventListener('keydown', event => {
  if(event.key === 'Escape' && narrowNavigation.matches && !navigation.hidden){
    syncNavigation();
    menuToggle.focus();
  }
});
