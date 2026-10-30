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
  let q = '', sel = null;

  // телефон: заставка вместо живой карты — весь остров, блипы точками, переход на полную карту; ниже лента регионов.
  // Точки строятся на подходе к блоку: первому экрану они не нужны
  if (window.NB_MOB && NB_MOB.matches) {
    const place = () => {
      const w = mm.clientWidth, h = mm.clientHeight, k = Math.max(w / WW, (h * .9) / WH);
      // портрет — остров от верхнего края, снизу его закрывает подпись; широкая карточка на планшете и на боку — по середине, на Вайс-Сити
      const ty = w > h * 1.2 ? (h - WH * k) / 2 : -WH * k * .035;
      world.style.transform = `translate(${((w - WW * k) / 2).toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.toFixed(4)})`;
      world.style.setProperty('--iz', (1 / k).toFixed(4));
    };
    mm.classList.add('is-far'); place();
    new ResizeObserver(place).observe(mm);
    const rg = document.querySelector('[data-regions]');
    if (rg) rg.innerHTML = D.regions.map(r => `<a class="b2-rt" href="map.html#${r.id}" style="--g0:${r.g[0]};--g1:${r.g[1]}">
      <span class="b2-rt-map"><img src="img/regions/${r.id}.webp" alt="" width="46" height="64" loading="lazy"></span>
      <span class="b2-rt-t"><b>${r.name}</b><span><i>${(window.PINS || []).filter(p => p.r === r.id).length}</i>points</span></span></a>`).join('');
    new IntersectionObserver(([e], io) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      $('.mm-blips').innerHTML = (window.PINS || []).map(p => `<i class="mm-bp" data-cat="${SUB[p.k].g.id}" style="left:${p.x}%;top:${p.y}%"></i>`).join('');
    }, { rootMargin: '300px 0px' }).observe(mm);
    return;
  }

  // блипы
  const blips = $('.mm-blips');
  const pins = (window.PINS || []).map((p, i) => {
    const s = SUB[p.k], el = document.createElement('button');
    el.type = 'button'; el.className = s.g.track ? 'mm-bp is-col' : 'mm-bp'; el.dataset.cat = s.g.id;
    el.style.left = p.x + '%'; el.style.top = p.y + '%';
    el.innerHTML = icon(p.k) + `<b>${p.n}</b>`; el.setAttribute('aria-label', p.n);
    blips.appendChild(el);
    return { ...p, i, s, el };
  });

  // легенда: коллекционные и обычные места, в них группы и типы, счётчики по точкам на карте
  const groupRow = g => {
    const rows = g.subs.map(([k, name, total]) => {
      const n = pins.filter(p => p.k === k).length;
      const meta = g.track ? `<span data-f="${k}">0</span>/${n} · ${total}` : n;
      return `<button class="mm-i" type="button" data-k="${k}" data-cat="${g.id}"><span class="mini">${icon(k)}</span>${name}<i>${meta}</i></button>`;
    }).join('');
    const n = pins.filter(p => p.s.g === g).length;
    return `<div class="mm-g" data-g="${g.id}" data-cat="${g.id}"><button class="mm-gh" type="button" data-gid="${g.id}"><span>${g.name}</span><i>${g.track ? `<span data-fg="${g.id}">0</span>/${n}` : n}</i></button>${rows}</div>`;
  };
  const part = (name, cls, gs) => `<div class="mm-part"><p class="mm-cap"><i class="kd ${cls}"></i>${name}</p>${gs.map(groupRow).join('')}</div>`;
  list.innerHTML = part('Collectibles', 'kd-col', D.groups.filter(g => g.track)) + part('Places', '', D.groups.filter(g => !g.track));
  const KEYS = t => D.groups.filter(g => !!g.track === (t === 'col')).flatMap(g => g.subs.map(s => s[0]));

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
    list.querySelectorAll('.mm-part').forEach(s => { s.hidden = [...s.querySelectorAll('.mm-g')].every(g => g.hidden); });
    const only = t => off.size === KEYS(t === 'col' ? 'place' : 'col').length && KEYS(t).every(k => !off.has(k));
    mm.querySelectorAll('[data-all]').forEach(b => b.classList.toggle('is-on', b.dataset.all === 'all' ? !off.size : only(b.dataset.all)));
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
    off.clear();
    if (b.dataset.all !== 'all') KEYS(b.dataset.all === 'col' ? 'place' : 'col').forEach(k => off.add(k));
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
  const syncFound = () => {
    $('[data-found]').textContent = found.size;
    $('[data-bar]').style.width = Math.max(1.5, found.size / 349 * 100) + '%';
    Object.keys(SUB).forEach(k => { const el = list.querySelector(`[data-f="${k}"]`); if (el) el.textContent = pins.filter(p => p.k === k && found.has(p.i)).length; });
    D.groups.forEach(g => { const el = list.querySelector(`[data-fg="${g.id}"]`); if (el) el.textContent = pins.filter(p => p.s.g === g && found.has(p.i)).length; });
    pins.forEach(p => p.el.classList.toggle('is-found', found.has(p.i)));
  };
  const syncActs = () => {
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
    const shot = $('[data-shot]'), src = D.spot(p, p.i);
    if (shot.getAttribute('src') !== src) { shot.classList.remove('is-on'); shot.src = src; }
    shot.alt = `Where to find ${p.n}`;
    card.classList.toggle('is-place', !p.s.g.track);
    $('.mm-rg').textContent = (REG[p.r] || {}).name || 'Leonida';
    $('.mm-desc').textContent = p.s.desc;
    syncActs();
    card.hidden = false;
    if (pan) { // точку — в середину свободного поля
      const u = U(); tx = 628 * u - p.x / 100 * WW * z; ty = mm.clientHeight / 2 - p.y / 100 * WH * z; set(true);
    }
  }
  const close = () => { card.hidden = true; if (sel) sel.el.classList.remove('is-sel'); };
  $('[data-close]').addEventListener('click', close);
  $('[data-shot]').addEventListener('load', e => e.target.classList.add('is-on'));
  $('[data-fd]').addEventListener('click', () => { found.has(sel.i) ? found.delete(sel.i) : found.add(sel.i); syncFound(); syncActs(); });

  let inView = false;
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: .3 }).observe(mm);
  addEventListener('keydown', e => { if (inView && e.key === 'Escape' && !card.hidden) close(); });

  new ResizeObserver(() => fit(false)).observe(mm);
  refresh(); syncFound(); fit(false);
  // сразу открыта карточка коллекционного предмета в Вайс-Сити
  pick(pins.find(p => p.k === 'fragment' && p.r === 'vice') || pins[0]);
})();
