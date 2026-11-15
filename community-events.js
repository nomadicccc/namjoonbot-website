/* Public event announcement. Keep in sync with WINTER_PREVIEW_START in quests.py. */
(() => {
  'use strict';
  const winter = {
    id: 'winter_2026', name: 'Winter Wonderland', phase: 'upcoming',
    starts_at: '2026-12-01T00:00:00+09:00',
    badge: 'https://cdn.discordapp.com/emojis/1558471904090914887.png?size=128&quality=lossless',
    announcement: true,
  };
  const el = (tag, text, className) => {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  };
  function countdownText(iso, now = Date.now()) {
    const target = Date.parse(iso);
    if (!Number.isFinite(target)) return '';
    const remaining = Math.max(0, Math.ceil((target - now) / 1000));
    if (!remaining) return 'The countdown is complete';
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor(remaining % 86400 / 3600);
    const minutes = Math.floor(remaining % 3600 / 60);
    const seconds = remaining % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  let currentRoot = null, currentEvents = [], nextTransition = Infinity;
  function winterChallenge(box, data) {
    const quest=el('section',undefined,'winter-community');
    const questHead=el('div',undefined,'winter-quest-heading');questHead.append(el('h4','Community Quest'),el('span',`${Number(data.percent).toLocaleString()}%`,'winter-percent'));
    const totalLine=el('p',undefined,'winter-total');totalLine.append(el('strong',Number(data.total).toLocaleString()),el('span','presents sent together'));
    quest.append(questHead,totalLine);
    const start=Number(data.range_start)||0,end=Number(data.range_end)||100;
    const bar=el('progress');bar.max=100;bar.value=Math.max(0,Math.min(100,(Number(data.percent)-start)/(end-start)*100));
    bar.setAttribute('aria-label',`Community progress from ${start}% to ${end}%`);
    quest.append(bar,el('p',`${start}%–${end}% community milestone range`,'winter-range'));
    if(data.final_pending) quest.append(el('p','Earning has ended. Final results are being saved.'));
    const prizes=el('details',undefined,'winter-prizes');prizes.append(el('summary','Milestone prizes'));
    const prizeGrid=el('div',undefined,'winter-prize-grid');
    for(const milestone of data.milestones||[]){
      const reward=el('div',undefined,'winter-milestone');
      reward.append(el('strong',`${milestone.unlocked?'✓':'🔒'} ${milestone.percent}% · ${Number(milestone.target).toLocaleString()} presents`),el('p',milestone.reward),el('small',`Send ${milestone.personal} presents to qualify.`));
      reward.dataset.unlocked=String(Boolean(milestone.unlocked));prizeGrid.append(reward);
    }
    prizes.append(prizeGrid);
    quest.append(prizes);
    function board(title,players,raffle=false){
      const section=el('section',undefined,'winter-board');section.append(el('h4',title));
      if(!players.length) section.append(el('p',raffle?'Results pending.':'No presents sent yet.'));
      for(const player of players){
        const row=el('div',undefined,'winter-player');
        if(!raffle)row.dataset.rank=String(player.rank);
        if(!raffle) row.append(el('strong',`#${player.rank}`,'winter-rank'));
        if(/^https:\/\//.test(player.avatar||'')){const img=el('img');img.src=player.avatar;img.alt='';img.width=32;img.height=32;img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();row.append(img);}
        const text=el('div',undefined,'winter-player-details');text.append(el('strong',player.name||'Collector'));
        if(raffle&&Number.isFinite(player.win_chance)){const percent=player.win_chance*100;const label=percent>0&&percent<0.01?'<0.01':percent.toFixed(2);text.append(el('span',`${label}% chance of winning`,'winter-win-chance'));}
        row.append(text,el('span',`${Number(player.score).toLocaleString()} presents gifted`,'winter-gift-total'));section.append(row);
      }
      quest.append(section);
    }
    board(data.final?'Final Top 7':'Top 7 · Presents Sent',data.leaders||[]);
    if(data.final) board('Raffle Winners',data.raffle_winners||[],true);
    quest.append(el('p',data.final?'Final standings and raffle results are saved. Claim eligible rewards in Discord.':'Send presents in Discord to contribute. Each gift gives one raffle entry; the top seven are excluded from the raffle.','winter-range'));
    box.append(quest);
  }
  function updateCountdowns() {
    if (!currentRoot || document.hidden) return;
    if (Date.now() >= nextTransition) {
      render(currentRoot, currentEvents);
      return;
    }
    currentRoot.querySelectorAll('[data-event-countdown]').forEach(item => {
      item.textContent = countdownText(item.dataset.eventCountdown);
    });
  }
  function render(root, events = []) {
    if (!root) return;
    currentRoot = root;
    currentEvents = Array.isArray(events) ? events : [];
    const now = Date.now();
    const visible = currentEvents.filter(event => {
      if (!event || !Number.isFinite(Date.parse(event.starts_at))) return false;
      const end = Date.parse(event.shop_ends_at);
      return event.id===winter.id || !Number.isFinite(end) || end > now;
    });
    if (now<Date.parse(winter.starts_at) && !visible.some(event => event.id === winter.id || /winter wonderland/i.test(event.name || ''))) {
      visible.push(winter);
    }
    root.replaceChildren();
    nextTransition = Infinity;
    visible.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
    for (const event of visible) {
      const starts = Date.parse(event.starts_at);
      const upcoming = starts > now;
      const earningEnd = Date.parse(event.earning_ends_at);
      const shopEnd = Date.parse(event.shop_ends_at);
      const isWinter = event.id === winter.id || /winter wonderland/i.test(event.name || '');
      const spending = !upcoming && Number.isFinite(earningEnd) && now >= earningEnd;
      const box = el('article', undefined, 'live-event');
      box.dataset.state=upcoming?'upcoming':'active';
      if (isWinter) box.dataset.season = 'winter';
      else if (/halloween/i.test(event.name || '')) box.dataset.season = 'halloween';
      box.append(el('span', upcoming ? 'Next event' : event.challenge?.final ? 'Final results' : spending ? 'Earning ended' : 'Current event', 'event-phase'));
      const heading = el('div', undefined, 'event-title');
      const badge = el('img');
      badge.src = event.badge || (isWinter ? winter.badge : '');
      badge.alt = ''; badge.width = 64; badge.height = 64; badge.className = 'event-badge';
      badge.addEventListener('error', () => {
        badge.replaceWith(el('span', isWinter ? '❄' : '✦', 'event-badge-fallback'));
      }, {once: true});
      if (badge.src) heading.append(badge);
      heading.append(el('strong', event.name)); box.append(heading);
      const target = upcoming ? event.starts_at : spending ? event.shop_ends_at : event.earning_ends_at;
      if (Number.isFinite(Date.parse(target)) && Date.parse(target) > now) {
        box.append(el('p', upcoming ? 'The countdown to winter is on.' : spending ? 'Time left to visit the event shop' : 'Time left to earn event rewards', 'event-countdown-label'));
        const counter = el('p', countdownText(target), 'event-countdown');
        counter.dataset.eventCountdown = target;
        counter.setAttribute('role', 'timer');
        counter.setAttribute('aria-label', upcoming ? 'Time until event starts' : 'Time remaining');
        box.append(counter);
        const date = el('time', new Date(target).toLocaleString('en-GB', {
          dateStyle: 'long', timeStyle: 'short', timeZoneName: undefined,
        }), 'event-start-date');
        date.dateTime = target;
        const line = el('p', upcoming ? 'Starts ' : spending ? 'Shop closes ' : 'Earning ends ');
        line.append(date, document.createTextNode(' · your local time')); box.append(line);
        nextTransition = Math.min(nextTransition, Date.parse(target));
      } else if (!event.challenge) {
        box.append(el('p', 'Winter Wonderland has begun. Event details will appear here when available.'));
      }
      if (upcoming && isWinter) box.append(el('p', 'A new season is on its way. More event details coming soon.', 'event-preview-note'));
      if (!upcoming && isWinter && event.challenge) winterChallenge(box,event.challenge);
      root.append(box);
    }
    if(!visible.length)root.append(el('p','Event updates will appear here when available.'));
  }
  window.NamjoonCommunityEvents = {render, countdownText};
  setInterval(updateCountdowns, 1000);
  document.addEventListener('visibilitychange', updateCountdowns);
})();
