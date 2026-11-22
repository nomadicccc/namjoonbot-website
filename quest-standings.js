(() => {
  'use strict';
  const number = new Intl.NumberFormat('en-GB');

  function element(tag, className, text) {
    const item = document.createElement(tag);
    item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }

  function render(competitors) {
    const section = element('section', 'quest-standings');
    section.append(element('h3', 'quest-standings-title', 'Top 10 Competitors'));
    const list = element('ol', 'quest-standings-list');
    let rank = 0;
    let previousScore = null;
    const players = competitors.filter(player => player.displayName?.trim()).slice(0, 10);
    players.forEach((player, index) => {
      if (player.contributed !== previousScore) rank = index + 1;
      previousScore = player.contributed;
      const row = element('li', 'quest-standing');
      const portrait = element('span', 'quest-standing-avatar', Array.from(player.displayName)[0]);
      if (player.avatar?.startsWith('https://')) {
        const image = element('img', '');
        image.alt = '';
        image.loading = 'lazy';
        image.src = player.avatar;
        image.addEventListener('error', () => image.remove(), {once: true});
        portrait.append(image);
      }
      const identity = element('span', 'quest-standing-identity');
      identity.append(element('bdi', 'quest-standing-name', player.displayName));
      if (player.supporter === true) {
        const pill = element('span', 'supporter-pill');
        const heart = element('span', '', '\u2661');
        heart.setAttribute('aria-hidden', 'true');
        pill.append(heart, document.createTextNode(' Supporter'));
        pill.title = 'Supports NamjoonBot';
        identity.append(pill);
      }
      row.append(element('span', 'quest-standing-rank', '#' + rank), portrait, identity,
        element('span', 'quest-standing-score', number.format(player.contributed) + ' packs'));
      list.append(row);
    });
    section.append(list);
    return section;
  }

  function renderMilestones(entry) {
    const list = element('ul', 'quest-milestone-checks');
    list.setAttribute('aria-label', 'Community quest milestones');
    for (const milestone of entry.milestones) {
      const bonus = milestone.percent > 100;
      const reached = entry.total * 100 >= entry.goal * milestone.percent;
      if (bonus && !reached) continue;
      const row = element('li', bonus ? 'bonus-reached' : '');
      row.append(element('strong', '', (reached ? '\u2713 ' : '') + milestone.percent + '%'),
        element('span', '', milestone.reward));
      list.append(row);
    }
    return list;
  }

  window.NamjoonQuestStandings = {render, renderMilestones};
})();
