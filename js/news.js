// Лента новостей: вкладки меток (и адрес #leak и т. п.), поиск по заголовку и анонсу, пустое состояние.
(() => {
  const tabs = document.querySelector('[data-tabs]'), grid = document.querySelector('[data-grid]');
  if (!tabs || !grid) return; // вкладок и поиска на странице больше нет
  const lead = document.querySelector('.nw-lead .ls'), q = document.querySelector('[data-q]'), empty = document.querySelector('[data-empty]');
  const cards = [...grid.querySelectorAll('.sc')];
  let k = 'all', text = '';

  const apply = () => {
    const ok = el => (k === 'all' || el.dataset.k === k) && (!text || (el.dataset.q || '').includes(text));
    let n = 0;
    // промо Telegram — только в общем списке без поиска
    cards.forEach(c => { const on = c.dataset.k === 'promo' ? k === 'all' && !text : ok(c); c.hidden = !on; if (on) c.style.setProperty('--i', n++); });
    const leadOn = lead && ok(lead);
    if (lead) lead.hidden = !leadOn;
    empty.hidden = n > 0 || leadOn;
    // карточки заново проявляются волной
    grid.classList.remove('is-swap'); void grid.offsetWidth; grid.classList.add('is-swap');
  };
  const pick = v => {
    k = v;
    tabs.querySelectorAll('button').forEach(b => { const on = b.dataset.v === v; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    history.replaceState(null, '', v === 'all' ? location.pathname : '#' + v);
    apply();
  };
  tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pick(b.dataset.v); });
  q.addEventListener('input', () => { text = q.value.trim().toLowerCase(); apply(); });
  document.querySelector('[data-reset]').addEventListener('click', () => { q.value = ''; text = ''; pick('all'); });
  const h = location.hash.slice(1);
  if (h && tabs.querySelector(`[data-v="${h}"]`)) pick(h);
  // ссылки «#метка» внутри страницы (из хлебных крошек статьи) — тоже переключают
  addEventListener('hashchange', () => { const v = location.hash.slice(1); if (tabs.querySelector(`[data-v="${v}"]`)) pick(v); });
})();
