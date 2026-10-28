// Главная: упрощённая живая карта блока 2 (наезд и параллакс — общие, в js/v2.js).
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // наезд блока 2 и параллакс — в js/v2.js

  // ---- мини-карта ----
  const mm = document.querySelector('[data-mm]');
  if (!mm || !window.MAP) return;
  const D = window.MAP, $ = s => mm.querySelector(s);
  const view = $('[data-view]'), world = $('.mm-world'), card = $('[data-card]'), list = $('[data-list]');
  const WW = 1000, WH = WW * D.aspect;
  const SUB = {}, REG = {};
  D.groups.forEach(g => g.subs.forEach(([k, name, total, desc]) => { SUB[k] = { k, name, total, desc, g }; }));
  D.regions.forEach(r => { REG[r.id] = r; });
  const icon = k => `<svg><use href="#b-${k}"/></svg>`;
  const off = new Set(), found = new Set();
  let q = '', sel = null, wp = null;

  // блипы
  const blips = $('.mm-blips');
  const pins = (window.PINS || []).map((p, i) => {
    const s = SUB[p.k], el = document.createElement('button');
    el.type = 'button'; el.className = 'mm-bp'; el.dataset.cat = s.g.id;
    el.style.left = p.x + '%'; el.style.top = p.y + '%';
    el.innerHTML = icon(p.k) + `<b>${p.n}</b>`; el.setAttribute('aria-label', p.n);
    blips.appendChild(el);
    return { ...p, i, s, el };
  });
  const you = document.createElement('span'); you.className = 'mm-you'; you.innerHTML = icon('you');
  you.style.left = D.you[0] + '%'; you.style.top = D.you[1] + '%'; blips.appendChild(you);

  // легенда: группы и типы, счётчики по точкам на карте
  list.innerHTML = D.groups.map(g => {
    const rows = g.subs.map(([k, name, total]) => {
      const n = pins.filter(p => p.k === k).length;
      const meta = g.track ? `<span data-f="${k}">0</span>/${n} · ${total}` : n;
      return `<button class="mm-i" type="button" data-k="${k}" data-cat="${g.id}"><span class="mini">${icon(k)}</span>${name}<i>${meta}</i></button>`;
    }).join('');
    const n = pins.filter(p => p.s.g === g).length;
    return `<div class="mm-g" data-g="${g.id}" data-cat="${g.id}"><button class="mm-gh" type="button" data-gid="${g.id}"><span>${g.name}</span><i>${g.track ? `<span data-fg="${g.id}">0</span>/${n}` : n}</i></button>${rows}</div>`;
  }).join('');

  const match = p => !q || p.n.toLowerCase().includes(q) || p.s.name.toLowerCase().includes(q);
  const refresh = () => {
    let shown = 0;
    pins.forEach(p => { const on = !off.has(p.k) && match(p); p.el.hidden = !on; if (on) shown++; });
    $('[data-shown]').textContent = shown;
    list.querySelectorAll('.mm-i').forEach(r => {
      r.classList.toggle('is-off', off.has(r.dataset.k));
      r.hidden = !!q && !pins.some(p => p.k === r.dataset.k && match(p));
    });
    list.querySelectorAll('.mm-g').forEach(g => {
      const rows = [...g.querySelectorAll('.mm-i')];
      g.hidden = rows.every(r => r.hidden);
      g.querySelector('.mm-gh').classList.toggle('is-off', rows.every(r => off.has(r.dataset.k)));
    });
  };
  list.addEventListener('click', e => {
    const r = e.target.closest('.mm-i'), h = e.target.closest('.mm-gh');
    if (r) { off.has(r.dataset.k) ? off.delete(r.dataset.k) : off.add(r.dataset.k); }
    else if (h) {
      const ks = D.groups.find(g => g.id === h.dataset.gid).subs.map(s => s[0]);
      const allOff = ks.every(k => off.has(k));
      ks.forEach(k => allOff ? off.delete(k) : off.add(k));
    } else return;
    refresh();
  });
  mm.querySelectorAll('[data-all]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.all === 'on') off.clear(); else Object.keys(SUB).forEach(k => off.add(k));
    refresh();
  }));
  $('[data-q]').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); refresh(); });

  // ---- камера: в покое — как в макете (картинка 871×1081 при (206, −58), остров по центру слоя) ----
  let z = 1, tx = 0, ty = 0, z0 = 1;
  const U = () => mm.clientWidth / 1300;
  const home = () => { const u = U(); return { z: 753.8 * u / WW, tx: 264.6 * u, ty: -58 * u }; };
  const zl = $('[data-zl]'), zin = $('[data-z="in"]'), zout = $('[data-z="out"]');
  const set = (ease = false) => {
    // остров не уводим из окна целиком: хотя бы четверть остаётся видна
    const w = mm.clientWidth, h = mm.clientHeight, mw = WW * z, mh = WH * z;
    tx = clamp(tx, -mw * .75, w - mw * .25); ty = clamp(ty, -mh * .75, h - mh * .25);
    world.classList.toggle('is-ease', ease);
    world.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${z.toFixed(4)})`;
    world.style.setProperty('--iz', (1 / z).toFixed(4));
    zl.textContent = (z / z0).toFixed(1) + '×';
    mm.classList.toggle('is-far', z / z0 < 1.45);
    zin.disabled = z >= z0 * 6 - 1e-3; zout.disabled = z <= z0 * .8 + 1e-3;
  };
  const zoomAt = (f, cx, cy, ease) => {
    const nz = clamp(z * f, z0 * .8, z0 * 6), k = nz / z;
    tx = cx - (cx - tx) * k; ty = cy - (cy - ty) * k; z = nz; set(ease);
  };
  const fit = (ease = true) => { ({ z, tx, ty } = home()); z0 = z; set(ease); };
  mm.querySelector('.mm-zoom').addEventListener('click', e => {
    const b = e.target.closest('[data-z]'); if (!b) return;
    // приближаем к середине свободного поля между легендой и карточкой
    const u = U(), cx = (card.hidden ? 1080 : 628) * u, cy = mm.clientHeight / 2;
    if (b.dataset.z === 'fit') fit(); else zoomAt(b.dataset.z === 'in' ? 1.5 : 1 / 1.5, cx, cy, true);
  });

  // перетаскивание; клик без сдвига по блипу — выбор
  let drag = null;
  view.addEventListener('pointerdown', e => {
    if (e.button) return;
    drag = { x: e.clientX, y: e.clientY, tx, ty, moved: false, id: e.pointerId };
  });
  addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) { drag.moved = true; view.classList.add('is-drag'); view.setPointerCapture(e.pointerId); }
    tx = drag.tx + dx; ty = drag.ty + dy; set();
  });
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null; view.classList.remove('is-drag');
    if (moved) return;
    const b = e.target.closest && e.target.closest('.mm-bp');
    if (b) pick(pins.find(p => p.el === b));
  };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  view.addEventListener('dblclick', e => { const r = mm.getBoundingClientRect(); zoomAt(1.8, e.clientX - r.left, e.clientY - r.top, true); });

  // колесо: с Ctrl — зум под курсором, без — страница листается, а снизу всплывает подсказка
  const hint = $('[data-hint]'); let hintT = 0;
  view.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const r = mm.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * .0025), e.clientX - r.left, e.clientY - r.top);
      return;
    }
    hint.classList.add('is-on'); clearTimeout(hintT);
    hintT = setTimeout(() => hint.classList.remove('is-on'), 1400);
  }, { passive: false });

  // ---- карточка места ----
  const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * D.aspect) / 100 * D.kmPerMap;
  const fmt = km => km < 1 ? Math.round(km * 20) * 50 + ' m' : km.toFixed(1) + ' km';
  const syncFound = () => {
    $('[data-found]').textContent = found.size;
    $('[data-bar]').style.width = Math.max(1.5, found.size / 349 * 100) + '%';
    Object.keys(SUB).forEach(k => { const el = list.querySelector(`[data-f="${k}"]`); if (el) el.textContent = pins.filter(p => p.k === k && found.has(p.i)).length; });
    D.groups.forEach(g => { const el = list.querySelector(`[data-fg="${g.id}"]`); if (el) el.textContent = pins.filter(p => p.s.g === g && found.has(p.i)).length; });
    pins.forEach(p => p.el.classList.toggle('is-found', found.has(p.i)));
  };
  const syncActs = () => {
    $('[data-wp] span').textContent = wp === sel ? 'Remove waypoint' : 'Set waypoint';
    const fd = $('[data-fd]'); fd.classList.toggle('is-on', found.has(sel.i));
    fd.querySelector('span').textContent = found.has(sel.i) ? 'Found' : 'Mark found';
  };
  function pick(p, pan = false) {
    if (sel) sel.el.classList.remove('is-sel');
    sel = p; p.el.classList.add('is-sel');
    card.dataset.cat = p.s.g.id;
    card.querySelector('.mm-ic use').setAttribute('href', '#b-' + p.k);
    $('.mm-cat').textContent = `${p.s.g.name} · ${p.s.name}`;
    $('.mm-name').textContent = p.n;
    $('.mm-rg').textContent = (REG[p.r] || {}).name || 'Leonida';
    $('.mm-dist').textContent = fmt(dist(p, { x: D.you[0], y: D.you[1] })) + ' away';
    $('.mm-desc').textContent = p.s.desc;
    $('[data-near]').innerHTML = pins.filter(o => o !== p).sort((a, b) => dist(a, p) - dist(b, p)).slice(0, 4)
      .map(o => `<li><button type="button" data-i="${o.i}" data-cat="${o.s.g.id}"><span class="mini">${icon(o.k)}</span>${o.n}<i>${fmt(dist(o, p))}</i></button></li>`).join('');
    syncActs();
    card.hidden = false;
    if (pan) { // точку — в середину свободного поля
      const u = U(); tx = 628 * u - p.x / 100 * WW * z; ty = mm.clientHeight / 2 - p.y / 100 * WH * z; set(true);
    }
  }
  const close = () => { card.hidden = true; if (sel) sel.el.classList.remove('is-sel'); };
  $('[data-close]').addEventListener('click', close);
  $('[data-near]').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) pick(pins[+b.dataset.i], true); });
  $('[data-wp]').addEventListener('click', () => {
    if (wp) wp.el.classList.remove('is-wp');
    wp = wp === sel ? null : sel;
    if (wp) wp.el.classList.add('is-wp');
    syncActs();
  });
  $('[data-fd]').addEventListener('click', () => { found.has(sel.i) ? found.delete(sel.i) : found.add(sel.i); syncFound(); syncActs(); });

  let inView = false;
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: .3 }).observe(mm);
  addEventListener('keydown', e => { if (inView && e.key === 'Escape' && !card.hidden) close(); });

  new ResizeObserver(() => fit(false)).observe(mm);
  refresh(); syncFound(); fit(false);
  // как в макете: открыта карточка оружейного в Вайс-Сити, на нём метка пути
  const start = pins.find(p => p.k === 'weapon' && p.r === 'vice') || pins[0];
  pick(start); wp = start; start.el.classList.add('is-wp'); syncActs();
})();
