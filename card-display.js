(() => {
  'use strict';
  const grids = ['cards', 'collection-cards', 'wish-cards', 'market-grid'];
  let columns = '4';
  try { columns = localStorage.getItem('namjoon-card-columns') || '4'; } catch {}
  if (!['3', '4', '5', '6'].includes(columns)) columns = '4';
  const controls = [];
  function apply(value) {
    document.documentElement.dataset.cardColumns = value;
    document.documentElement.style.setProperty('--card-columns', value);
    controls.forEach(control => { control.value = value; });
    try { localStorage.setItem('namjoon-card-columns', value); } catch {}
  }
  grids.forEach(id => {
    const grid = document.getElementById(id);
    if (!grid) return;
    grid.classList.add('adjustable-card-grid');
    const bar = document.createElement('div'); bar.className = 'card-display-controls';
    const label = document.createElement('label'); label.textContent = 'Card Size ';
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Card size');
    [['3', 'Large · 3 per row'], ['4', 'Medium · 4 per row'], ['5', 'Small · 5 per row'], ['6', 'Compact · 6 per row']].forEach(([value, text]) => select.add(new Option(text, value)));
    select.onchange = () => apply(select.value);
    controls.push(select); label.append(select); bar.append(label); grid.before(bar);
  });
  apply(columns);
})();
