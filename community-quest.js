/* Read-only community quest UI. No reward claims or sample data in production. */
(() => {
  'use strict';
  const root = document.getElementById('community-quest-panel');
  const link = document.getElementById('community-quest-link');
  const MAX_AGE = 5 * 60 * 1000;
  const milestones = [
    {percent: 25, icon: '📦', name: '2 Community Boosted Packs'},
    {percent: 50, icon: '✨', name: 'Booster bundle'},
    {percent: 75, icon: '🎨', name: 'Frame Choice Voucher'},
    {percent: 100, icon: '💜', name: 'Mythical Mystery Reward'},
  ];
  const bonus = [
    [125, '1 Community Boosted Pack'], [150, 'Booster bundle'],
    [175, '1 Community Boosted Pack'], [200, 'Mythical Mystery Reward'],
    [225, 'Booster bundle'], [250, 'Frame Choice Voucher'],
  ];
  const number = value => value.toLocaleString('en-GB');
  const el = (tag, text, className) => {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  };
  function state(quest, updatedAt, now = Date.now()) {
    if (!quest || quest.id !== 'pack_mentality' || quest.active !== true) return null;
    const starts = Date.parse(quest.starts_at), ends = Date.parse(quest.ends_at);
    const updated = Date.parse(updatedAt);
    if (![starts, ends, updated].every(Number.isFinite) || starts >= ends) return null;
    if (now < starts || now >= ends || now - updated > MAX_AGE || updated > now + 120000) return null;
    if (!Number.isSafeInteger(quest.total) || quest.total < 0 ||
        !Number.isSafeInteger(quest.goal) || quest.goal <= 0) return null;
    if (!Number.isSafeInteger(quest.minimum_contribution) || quest.minimum_contribution < 1) return null;
    const percent = quest.total * 100 / quest.goal;
    return {...quest, starts, ends, percent, complete: quest.total >= quest.goal,
      next: [...milestones.map(m => [m.percent, m.name]), ...bonus]
        .find(([p]) => quest.total < Math.ceil(quest.goal * p / 100)) || null};
  }
  function remaining(ends, now) {
    const seconds = Math.max(0, Math.ceil((ends - now) / 1000));
    return `${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s`;
  }
  function hide() {
    if (root) { root.hidden = true; root.replaceChildren(); }
    if (link) link.hidden = true;
    signature = '';
  }
  function listItem(parent, title, text) {
    const item = el('div', undefined, 'cq-detail');
    item.append(el('h4', title), el('p', text)); parent.append(item);
  }
  function draw(s) {
    const wasOpen = root.querySelector('.cq-rules')?.open || false;
    root.replaceChildren();
    const top = el('div', undefined, 'cq-top');
    const title = el('div');
    title.append(el('span', 'Community Quest', 'cq-eyebrow'), el('h2', '📦 Pack Mentality'));
    top.append(title, el('span', s.complete ? 'Goal complete ✓' : 'Live community quest', 'cq-status'));
    root.append(top, el('p', 'Open packs together to unlock rewards for everyone.', 'cq-intro'));
    const total = el('div', undefined, 'cq-total');
    total.append(el('strong', `${number(s.total)} / ${number(s.goal)} packs`),
      el('span', `${number(Math.round(s.percent * 10) / 10)}%`, 'cq-percent'));
    const progress = el('progress'); progress.max = s.goal; progress.value = Math.min(s.total, s.goal);
    progress.setAttribute('aria-label', 'Community progress towards the main goal');
    root.append(total, progress);
    const timerLine = el('p', undefined, 'cq-timer-line');
    const timer = el('span', '', 'cq-time'); timer.setAttribute('role', 'timer');
    const date = el('time', new Date(s.ends).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'}));
    date.dateTime = s.ends_at;
    timerLine.append('Ends in ', timer, ' · ', date, ' (your local time)'); root.append(timerLine);
    if (s.complete) root.append(el('p', 'You did it! Every main milestone is unlocked. Anything beyond this is a bonus.', 'cq-celebration'));
    if (s.next) {
      const threshold = Math.ceil(s.goal * s.next[0] / 100);
      root.append(el('p', `${s.complete ? 'Next bonus' : 'Next milestone'}: ${s.next[0]}% · ${number(threshold - s.total)} packs to go`, 'cq-next'));
    }
    const grid = el('div', undefined, 'cq-milestones');
    for (const m of milestones) {
      const threshold = Math.ceil(s.goal * m.percent / 100), unlocked = s.total >= threshold;
      const item = el('article', undefined, 'cq-milestone');
      item.dataset.unlocked = String(unlocked);
      item.append(el('span', `${m.percent}% · ${number(threshold)} packs`, 'cq-milestone-target'),
        el('h3', `${m.icon} ${m.name}`), el('span', unlocked ? '✓ Unlocked' : 'Locked', 'cq-milestone-state'));
      grid.append(item);
    }
    root.append(grid);
    const eligibility = el('p', undefined, 'cq-eligibility');
    eligibility.append(el('strong', `Open ${number(s.minimum_contribution)} qualifying packs to participate. `),
      'Claim unlocked rewards through /quests → Community Quest in Discord.'); root.append(eligibility);
    const rules = el('details', undefined, 'cq-rules'); rules.open = wasOpen;
    rules.append(el('summary', 'Rewards & rules'));
    const body = el('div', undefined, 'cq-rules-body');
    listItem(body, 'Community Boosted Packs', 'Choose a released permanent set. Each pack contains 3 Rare-or-better cards, including at least 1 signed card. Duplicates are possible.');
    listItem(body, 'Rarity odds · each card', 'Rare 70% · Legendary 24% · Standard Mythical 4% · Exclusive Mythical 1.9% · Secret Mythical 0.1%. One randomly selected slot is guaranteed signed; the other two have a 3% signature chance each.');
    listItem(body, 'Frame Choice Voucher', 'Redeem one regular-shop frame, even outside its featured week. Preview before choosing. Event-exclusive and retired frames are excluded.');
    listItem(body, 'Mythical Mystery Reward', 'One permanent-set card: 60% unsigned standard Mythical, 35% signed standard Mythical, 5% Secret Mythical. Duplicates are possible. No extra signature or birthday rolls.');
    listItem(body, 'What counts', 'One purchased permanent-set pack or daily streak pack opened equals one contribution. Pack Mentality reward packs do not contribute. There is no daily contribution cap or individual leaderboard.');
    listItem(body, 'Claiming', 'Qualify before contributions close to claim every unlocked milestone, including earlier milestones. Claim once per milestone in Discord. The website never awards cards, packs, or vouchers.');
    if (s.claim_ends_at && Number.isFinite(Date.parse(s.claim_ends_at)) && Date.parse(s.claim_ends_at) >= s.ends) {
      listItem(body, 'Reward claim deadline', new Date(s.claim_ends_at).toLocaleString('en-GB', {dateStyle: 'long', timeStyle: 'short'}) + ' · your local time.');
    }
    rules.append(body); root.append(rules);
    if (s.complete) {
      const stretch = el('details', undefined, 'cq-rules'); stretch.append(el('summary', 'Optional bonus milestones'));
      const list = el('div', undefined, 'cq-rules-body');
      for (const [p, name] of bonus) list.append(el('p', `${s.total >= Math.ceil(s.goal * p / 100) ? '✓' : '○'} ${p}% · ${number(Math.ceil(s.goal * p / 100))} packs · ${name}`));
      stretch.append(list); root.append(stretch);
    }
    root.hidden = false;
    if (link) link.hidden = false;
  }
  let quest = null, updated = null, signature = '';
  function refresh() {
    if (!root) return;
    const now = Date.now(), s = state(quest, updated, now);
    if (!s) { hide(); return; }
    const nextSignature = JSON.stringify(quest);
    if (nextSignature !== signature || root.hidden) { draw(s); signature = nextSignature; }
    const timer = root.querySelector('.cq-time');
    if (timer) timer.textContent = remaining(s.ends, now);
  }
  function update(data, updatedAt) { quest = data; updated = updatedAt; refresh(); }
  window.NamjoonCommunityQuest = {update, state, remaining};
  hide();
  setInterval(refresh, 1000);
  document.addEventListener('visibilitychange', refresh);
})();
