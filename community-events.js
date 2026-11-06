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
      return !Number.isFinite(end) || end > now;
    });
    if (!visible.some(event => event.id === winter.id || /winter wonderland/i.test(event.name || ''))) {
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
      if (isWinter) box.dataset.season = 'winter';
      else if (/halloween/i.test(event.name || '')) box.dataset.season = 'halloween';
      box.append(el('span', upcoming ? 'Next event' : spending ? 'Event shop' : 'Current event', 'event-phase'));
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
      } else {
        box.append(el('p', 'Winter Wonderland has begun. Event details will appear here when available.'));
      }
      if (upcoming && isWinter) box.append(el('p', 'A new season is on its way. More event details coming soon.', 'event-preview-note'));
      root.append(box);
    }
  }
  window.NamjoonCommunityEvents = {render, countdownText};
  setInterval(updateCountdowns, 1000);
  document.addEventListener('visibilitychange', updateCountdowns);
})();
