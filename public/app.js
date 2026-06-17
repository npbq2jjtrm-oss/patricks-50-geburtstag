
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

async function getMenu() {
  const res = await fetch('/api/menu', { cache: 'no-store' });
  if (!res.ok) throw new Error('Menü konnte nicht geladen werden.');
  return res.json();
}

function applyMenuText(menu) {
  document.title = menu.eventTitle || menu.eventName || 'QR-Bestellung';
  $$('[data-restaurant]').forEach(el => el.textContent = menu.restaurantName || 'QR-Bestellung');
  $$('[data-subtitle]').forEach(el => el.textContent = menu.eventSubtitle || 'Einfach scannen und bestellen.');
}

function tableFromUrl() {
  return new URLSearchParams(location.search).get('table') || '1';
}

function priceText(item) {
  return typeof item.price === 'number' ? `${item.price.toFixed(2).replace('.', ',')} €` : (item.price || 'zahlt Patrick');
}

function iconFor(item, group) {
  const text = `${item.id} ${item.name}`.toLowerCase();
  if (text.includes('cola')) return '🥤';
  if (text.includes('fanta')) return '🍹';
  if (text.includes('schorle')) return '🍷';
  if (text.includes('wasser')) return '💧';
  if (text.includes('bier')) return '🍺';
  if (text.includes('weizen')) return '🍻';
  if (text.includes('kaffee')) return '☕';
  if (text.includes('espresso')) return '☕';
  if (text.includes('tee')) return '🍵';
  if (text.includes('steak')) return '🥩';
  if (text.includes('wurst')) return '🌭';
  if (text.includes('hähnchen') || text.includes('haehnchen')) return '🍗';
  if (text.includes('käse') || text.includes('kaese') || text.includes('haloumi')) return '🧀';
  return group === 'drinks' ? '🥂' : '🍽️';
}

function showToast(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function playBirthdayTone() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.13, ctx.currentTime + i * 0.09 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.09);
      osc.stop(ctx.currentTime + i * 0.09 + 0.24);
    });
  } catch {}
}

function burstConfetti() {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#c8102e', '#f7c243', '#00a398', '#fff7ef'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.72,
    vx: (Math.random() - 0.5) * 11,
    vy: -Math.random() * 12 - 5,
    size: Math.random() * 7 + 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.25,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 1
  }));
  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pieces) {
      p.vy += 0.28; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.008;
      ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*.58); ctx.restore();
    }
    if (frame < 150) requestAnimationFrame(tick); else canvas.remove();
  }
  requestAnimationFrame(tick);
}

async function initOrderPage() {
  const menu = await getMenu();
  applyMenuText(menu);
  $('[data-table]').textContent = tableFromUrl();

  const musicSelect = $('#musicSelect');
  const musicCustom = $('#musicCustom');
  if (musicSelect) {
    const options = menu.musicOptions || ['Kein Musikwunsch','Hits der 90er','Summer Hits','You’ll Never Walk Alone','Liverpool / Stadion-Hymnen','Party Klassiker','Rock Klassiker','Eigener Wunsch'];
    musicSelect.innerHTML = options.map(option => `<option value="${option === 'Kein Musikwunsch' ? '' : option}">${option}</option>`).join('');
    musicSelect.addEventListener('change', () => {
      const custom = musicSelect.value === 'Eigener Wunsch';
      musicCustom.hidden = !custom;
      if (custom) musicCustom.focus(); else musicCustom.value = '';
    });
  }

  $('.music-open')?.addEventListener('click', () => $('#musicPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  const selected = new Map();

  function renderGroup(name, label, items) {
    const box = document.createElement('section');
    box.className = 'menu-card';
    box.id = name === 'drinks' ? 'drinks' : 'food';
    box.innerHTML = `<div class="card-head"><h2>${name === 'drinks' ? '🥤' : '🍽️'} ${label}</h2><span class="pill">Antippen</span></div><div class="items"></div>`;
    const list = $('.items', box);

    for (const item of items) {
      const row = document.createElement('article');
      row.className = 'item';
      row.innerHTML = `
        <div class="emoji">${iconFor(item, name)}</div>
        <div class="item-text"><strong>${item.name}</strong><small>${priceText(item)}</small></div>
        <div class="stepper">
          <button class="round minus" type="button" aria-label="${item.name} weniger">−</button>
          <span class="qty"></span>
          <button class="round plus" type="button" aria-label="${item.name} mehr">+</button>
        </div>`;
      const [minus, plus] = $$('button', row);
      const qty = $('.qty', row);
      const update = (delta) => {
        const next = Math.max(0, Math.min(50, (selected.get(item.id) || 0) + delta));
        if (next) selected.set(item.id, next); else selected.delete(item.id);
        qty.textContent = next || '';
        row.classList.toggle('active', next > 0);
        updateBar();
      };
      row.addEventListener('click', e => { if (!e.target.closest('button')) update(1); });
      minus.addEventListener('click', e => { e.stopPropagation(); update(-1); });
      plus.addEventListener('click', e => { e.stopPropagation(); update(1); });
      list.append(row);
    }
    return box;
  }

  $('#menu').append(renderGroup('food', 'Essen', menu.food || []));
  $('#menu').append(renderGroup('drinks', 'Getränke', menu.drinks || []));

  function updateBar() {
    const count = [...selected.values()].reduce((a, b) => a + b, 0);
    $('#count').textContent = count ? `${count} Artikel ausgewählt` : 'Noch nichts ausgewählt';
    $('#submit').disabled = count === 0;
  }

  $('#submit').addEventListener('click', async () => {
    const items = [...selected.entries()].map(([id, qty]) => ({ id, qty }));
    $('#submit').disabled = true;
    $('#status').textContent = 'Bestellung wird gesendet …';
    const music = musicSelect?.value === 'Eigener Wunsch' ? musicCustom?.value : musicSelect?.value;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: tableFromUrl(), items, note: $('#note').value, music })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Bestellung fehlgeschlagen.');
      $('#status').textContent = '';
      showToast('Danke! Deine Bestellung ist angekommen 🎉');
      playBirthdayTone(); burstConfetti(); navigator.vibrate?.([90, 45, 140]);
      selected.clear();
      $$('.qty').forEach(el => el.textContent = '');
      $$('.item').forEach(el => el.classList.remove('active'));
      $('#note').value = '';
      if (musicSelect) musicSelect.value = '';
      if (musicCustom) { musicCustom.value = ''; musicCustom.hidden = true; }
      updateBar();
    } catch (err) {
      $('#status').textContent = err.message;
      updateBar();
    }
  });

  updateBar();
}

async function initDashboard() {
  const menu = await getMenu();
  applyMenuText(menu);

  const orders = $('#orders');
  const empty = $('#empty');
  const itemCounter = $('#itemCounter');
  const counterEmpty = $('#counterEmpty');
  const totalItemCount = $('#totalItemCount');
  const itemTotals = new Map();
  let soundReady = false;
  const sound = new Audio('data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YTAAAAAAAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAA=');

  $('#enableSound')?.addEventListener('click', async () => {
    soundReady = true;
    await sound.play().catch(() => {});
    $('#enableSound').textContent = '🔔 aktiv';
  });

  function renderCounter() {
    if (!itemCounter) return;
    const entries = [...itemTotals.entries()].filter(([, d]) => d.qty > 0).sort((a,b) => b[1].qty - a[1].qty || a[1].name.localeCompare(b[1].name, 'de'));
    itemCounter.innerHTML = entries.map(([id, data], index) => {
      const width = entries[0] ? Math.max(8, Math.round((data.qty / entries[0][1].qty) * 100)) : 0;
      return `<div class="counter-row"><div class="counter-rank">#${index + 1}</div><div class="counter-main"><div class="counter-top"><strong>${data.name}</strong><span>${data.qty}×</span></div><div class="counter-bar"><i style="width:${width}%"></i></div></div></div>`;
    }).join('');
    const total = entries.reduce((sum, [, d]) => sum + d.qty, 0);
    if (counterEmpty) counterEmpty.hidden = entries.length !== 0;
    if (totalItemCount) totalItemCount.textContent = `${total}`;
  }

  function addToCounter(order) {
    for (const item of order.items) {
      const current = itemTotals.get(item.id) || { name: item.name, qty: 0 };
      current.qty += item.qty;
      itemTotals.set(item.id, current);
    }
    renderCounter();
  }

  function refreshEmpty() {
    if (empty) empty.hidden = orders.children.length !== 0;
  }

  function addOrder(order) {
    if ($(`[data-order-id="${order.id}"]`)) return;
    addToCounter(order);
    const el = document.createElement('article');
    el.className = 'order new-order';
    el.dataset.orderId = order.id;
    const time = new Date(order.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    el.innerHTML = `
      <div class="order-mark"><strong>NEU</strong><span>L.F.C.</span></div>
      <div class="order-info"><h3>Tisch ${order.table}</h3><time>${time} Uhr</time></div>
      <ul>${order.items.map(i => `<li><strong>${i.qty}×</strong> ${i.name}</li>`).join('')}</ul>
      <div class="order-side">
        ${order.total ? `<strong>${order.total.toFixed(2).replace('.', ',')} €</strong>` : '<strong>Einladung</strong>'}
        ${order.note ? `<div class="note">💬 ${order.note}</div>` : ''}
        ${order.music ? `<div class="music-note"><small>Musikwunsch</small><b>🎵 ${order.music}</b></div>` : ''}
      </div>
      <button class="done" type="button">Erledigt ✓</button>`;
    $('.done', el).addEventListener('click', async () => {
      await fetch(`/api/orders/${order.id}/done`, { method: 'POST' });
      el.remove();
      refreshEmpty();
    });
    orders.prepend(el);
    refreshEmpty();
    if (soundReady) sound.play().catch(() => {});
    playBirthdayTone(); navigator.vibrate?.([160, 70, 160]);
  }

  const es = new EventSource('/api/stream');
  es.addEventListener('order', e => addOrder(JSON.parse(e.data)));
  es.addEventListener('done', e => {
    const { id } = JSON.parse(e.data);
    const el = $(`[data-order-id="${id}"]`);
    if (el) el.remove();
    refreshEmpty();
  });
  refreshEmpty();
  renderCounter();
}

async function initQr() {
  const menu = await getMenu();
  applyMenuText(menu);
  const origin = $('#origin');
  origin.value = location.origin;
  function make() {
    const base = origin.value.replace(/\/$/, '');
    const count = Math.max(1, Math.min(99, parseInt($('#tables').value, 10) || 1));
    const grid = $('#qrGrid');
    grid.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      const url = `${base}/order.html?table=${i}`;
      const img = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(url)}`;
      const card = document.createElement('div');
      card.className = 'qr-card';
      card.innerHTML = `<img class="qr-logo" src="/assets/liverpool-logo.png" onerror="this.style.display='none'" alt=""><h2>Tisch ${i}</h2><img alt="QR-Code Tisch ${i}" src="${img}"><p>Scannen & bestellen</p>`;
      grid.append(card);
    }
  }
  $('#makeQr').addEventListener('click', make);
  $('#print').addEventListener('click', () => print());
  make();
}

window.app = { initOrderPage, initDashboard, initQr, getMenu, applyMenuText };
