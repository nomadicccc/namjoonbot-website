(() => {
  'use strict';
  const root = document.getElementById('archive');
  const number = value => new Intl.NumberFormat('en-GB').format(value);
  const present = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  function el(tag, text, className) {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  }
  const date = value => new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(value));
  function render(event) {
    const pending = event.status !== 'final';
    const article = el('article', undefined, 'event'); article.id = event.id;
    const header = el('div', undefined, 'event-head');
    header.append(el('span', pending ? 'Results pending' : 'Archived', 'badge'), el('h2', event.name), el('p', event.edition));
    header.append(el('p', `Earning: ${date(event.startsAt)} – ${date(event.earningEndsAt)} KST`, 'dates'));
    header.append(el('p', `Event shop closes: ${date(event.shopEndsAt)} KST`, 'dates'));
    const body = el('div', undefined, 'event-body');
    if (pending) body.append(el('p', 'Our Halloween recap is on its way. Final community results will be added after Candy earning closes.', 'notice'));
    const stats = el('dl', undefined, 'stats');
    const days = Math.round((Date.parse(event.earningEndsAt) - Date.parse(event.startsAt)) / 86400000);
    for (const [label, value] of [['Earning Period', `${days} days`], ['Participants', pending ? null : event.participants], ['Candy Earned', pending ? null : event.candyEarned], ['Event Cards Collected', pending ? null : event.cardsCollected]]) {
      const item = el('div', undefined, 'stat');
      const known = typeof value === 'string' || present(value);
      item.append(el('dt', label), el('dd', known ? (typeof value === 'number' ? number(value) : value) : 'Awaiting final results', known ? '' : 'pending'));
      stats.append(item);
    }
    body.append(stats);
    const quest = el('section', undefined, 'quest'); quest.append(el('h3', event.quest.name));
    if (!pending && present(event.quest.total) && present(event.quest.goal) && event.quest.goal > 0) {
      const percent = event.quest.total / event.quest.goal * 100;
      quest.append(el('p', `${number(event.quest.total)} / ${number(event.quest.goal)} ${event.quest.unit} · ${percent.toFixed(1)}% complete`));
      const bar = el('progress'); bar.max = 100; bar.value = Math.min(100, percent); bar.setAttribute('aria-label', `${event.name} community quest completion`); quest.append(bar);
    } else quest.append(el('p', 'Final progress and completion percentage will appear here once results are confirmed.'));
    body.append(quest, el('h3', 'The Event Collection'));
    const cosmetics = el('div', undefined, 'cosmetics');
    for (const group of event.cosmetics) {
      const card = el('section', undefined, 'cosmetic'); const list = el('ul');
      group.items.forEach(name => list.append(el('li', name)));
      card.append(el('h4', group.type), list); cosmetics.append(card);
    }
    body.append(cosmetics, el('p', 'A look back at the event collection. Archived items are not available to claim or purchase here.', 'footnote'));
    article.append(header, body); return article;
  }
  fetch('./event-archive.json').then(response => {
    if (!response.ok) throw new Error('Archive unavailable');
    return response.json();
  }).then(data => {
    const events = data.events.slice().sort((a,b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
    root.replaceChildren(...events.map(render));
    if (!events.length) root.append(el('p', 'Our first event memories will appear here soon.', 'notice'));
  }).catch(() => {
    root.replaceChildren(el('p', 'Event memories could not be loaded. Please refresh to try again.', 'notice'));
  });
})();
