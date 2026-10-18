/* Интерактив сайта «Кроны». Вся разметка и тексты уже есть в HTML (их собирает build.js),
   скрипт только оживляет их: занавес между страницами, меню, слайдшоу, фильтры, лайтбокс, видео, форма заявки. */
'use strict';
if (location.hash.startsWith('#/')) location.replace('/' + location.hash.replace(/^#\/?|\/$/g, '') + '/');   // старые ссылки /#/collection/lusso (QR в PDF-каталоге)
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ── появление при прокрутке ── */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), {rootMargin:'0px 0px -6% 0px', threshold:.08}) : null;
$$('[data-r]').forEach(el => io ? io.observe(el) : el.classList.add('in'));

/* ── занавес: поднимается при открытии страницы, опускается перед переходом ── */
const curtain = $('#curtain');
const setT = (t, tr) => { curtain.style.transition = tr; curtain.style.transform = t; };
async function lift(){
  if (reduce) { curtain.classList.remove('boot'); setT('translateY(100%)', 'none'); return; }
  curtain.classList.add('shown');
  await wait(380);
  curtain.classList.remove('boot');
  setT('translateY(-100%)', 'transform .7s cubic-bezier(.7,0,.3,1)');
  setTimeout(() => curtain.classList.remove('shown'), 250);
  await wait(720);
  setT('translateY(100%)', 'none');
}
lift();
addEventListener('pageshow', e => { if (e.persisted) { curtain.classList.remove('shown', 'boot'); setT('translateY(100%)', 'none'); } });   // возврат «назад» из кэша браузера
document.addEventListener('click', async e => {
  const a = e.target.closest('a[href]');
  if (!a || reduce || a.target || a.hasAttribute('download') || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || /\.(mp4|webp|jpg|png)$/.test(u.pathname)) return;
  if (u.pathname === location.pathname && u.search === location.search) return;   // якорь на этой же странице
  e.preventDefault();
  closeMenu();
  $('#curtain-label').textContent = a.dataset.label || '';
  setT('translateY(100%)', 'none'); void curtain.offsetWidth;
  curtain.classList.add('shown');
  setT('translateY(0)', 'transform .5s cubic-bezier(.7,0,.3,1)');
  await wait(520);
  location.href = u.href;
});

/* ── мобильное меню ── */
const menu = $('#menu'), burger = $('#burger');
function openMenu(){ menu.classList.add('open'); menu.setAttribute('aria-hidden','false'); burger.setAttribute('aria-expanded','true'); $('#menu-close').focus(); }
function closeMenu(){ if (!menu.classList.contains('open')) return; menu.classList.remove('open'); menu.setAttribute('aria-hidden','true'); burger.setAttribute('aria-expanded','false'); }
burger.addEventListener('click', openMenu);
$('#menu-close').addEventListener('click', closeMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

/* ── главная: изделия сменяют друг друга ── */
const show = $('#show');
if (show) {
  const imgs = [...show.children], dots = [...$('#dots').children], link = $('#show-link');
  let si = 0, timer = null;
  const setShow = k => {
    si = (k + imgs.length) % imgs.length;
    imgs.forEach((im, j) => im.classList.toggle('on', j === si));
    dots.forEach((d, j) => { d.removeAttribute('aria-current'); if (j === si) { void d.offsetWidth; d.setAttribute('aria-current', 'true'); } });
    const d = dots[si].dataset;
    $('#show-name').textContent = d.name; $('#show-kind').textContent = d.kind;
    link.href = d.href; link.setAttribute('aria-label', `${d.kind} «${d.name}»`);
  };
  const run = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => setShow(si + 1), 5500); };
  imgs.slice(1).forEach(im => im.loading = 'eager');   // остальные кадры подгружаем заранее, чтобы смена была плавной
  $('#dots').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { setShow(+b.dataset.k); run(); } });
  setShow(0); run();
}

/* ── коллекция: фильтр по категориям ── */
const filters = $('#filters');
if (filters) {
  const cards = $$('#grid .card');
  const setCat = cat => {
    $$('#filters [data-cat]').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === cat));
    cards.forEach(c => { c.hidden = cat !== 'all' && c.dataset.cat !== cat; if (!c.hidden) c.classList.add('in'); });
  };
  let cat = 'all';
  try { const c = localStorage.getItem('krona-cat'); if (filters.querySelector(`[data-cat="${c}"]`)) cat = c; } catch (e) {}
  setCat(cat);
  filters.addEventListener('click', e => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    try { localStorage.setItem('krona-cat', b.dataset.cat); } catch (e) {}
    setCat(b.dataset.cat);
  });
}

/* ── страница изделия: фото на весь экран ── */
const gallery = $('#gallery'), lb = $('#lb');
if (gallery && lb) {
  const shots = [...new Map($$('#gallery [data-lb]').map(a => [a.dataset.lb, a])).values()];   // главное фото повторяется в миниатюрах
  const lbImg = $('#lb-img'), thumbs = $('#lb-thumbs');
  let idx = 0;
  $('#lb-title').textContent = gallery.dataset.title;
  $('#lb-meta').textContent = gallery.dataset.meta;
  $('#lb-order').href = gallery.dataset.order;
  const multi = shots.length > 1;
  $('#lb-prev').hidden = $('#lb-next').hidden = !multi;
  if (multi) shots.forEach((a, k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'stage'; b.dataset.k = k; b.setAttribute('aria-label', `Фото ${k + 1}`);
    b.appendChild(a.querySelector('img').cloneNode()); b.firstChild.removeAttribute('srcset'); b.firstChild.src = a.dataset.sm;
    thumbs.appendChild(b);
  });
  const showImg = i => {
    idx = (i + shots.length) % shots.length;
    lbImg.src = shots[idx].href;
    lbImg.alt = shots[idx].querySelector('img').alt;
    $('#lb-count').textContent = multi ? `${idx + 1} / ${shots.length}` : '';
    [...thumbs.children].forEach((t, k) => t.setAttribute('aria-current', k === idx));
  };
  gallery.addEventListener('click', e => { const a = e.target.closest('[data-lb]'); if (!a) return; e.preventDefault(); showImg(+a.dataset.lb); lb.showModal(); });
  $('#lb-prev').onclick = () => showImg(idx - 1);
  $('#lb-next').onclick = () => showImg(idx + 1);
  thumbs.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) showImg(+b.dataset.k); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') showImg(idx - 1); if (e.key === 'ArrowRight') showImg(idx + 1); });
  let sx = null;
  $('#lb-stage').addEventListener('pointerdown', e => sx = e.clientX);
  $('#lb-stage').addEventListener('pointerup', e => { if (sx !== null && multi && Math.abs(e.clientX - sx) > 50) showImg(idx + (e.clientX < sx ? 1 : -1)); sx = null; });
  lb.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target.classList.contains('lb-stage') || e.target.classList.contains('lb')) lb.close(); });
}

/* ── видео: играет прямо в карточке ── */
function stopVideos(except){
  $$('.vcard video').forEach(v => { if (v !== except) { const m = v.parentElement; v.pause(); v.remove(); m.classList.remove('playing'); m.querySelector('[data-play]').hidden = false; } });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-play]'); if (!b) return;
  e.preventDefault();
  const m = b.parentElement, v = document.createElement('video');
  v.src = b.dataset.play; v.controls = true; v.playsInline = true; v.preload = 'auto';
  stopVideos(); b.hidden = true; m.classList.add('playing'); m.appendChild(v);
  v.play().catch(() => {});
  v.addEventListener('play', () => stopVideos(v));
});
if (location.hash.startsWith('#v-')) {   // переход к конкретному обзору с другой страницы
  const card = document.getElementById(location.hash.slice(1));
  if (card) setTimeout(() => { card.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'center'}); card.classList.add('flash'); setTimeout(() => card.classList.remove('flash'), 2200); }, 700);
}

/* ── заявка ── */
const form = $('#form');
if (form) {
  const result = $('#result'), out = $('#result-text'), picker = $('#picker'), phone = $('#phone'), phoneErr = $('#phone-err');
  const {wa: WA, tg: TG, max: MAX, mail: MAIL} = form.dataset;
  const waLink = t => `${WA}?text=${encodeURIComponent(t)}`;
  const tgLink = t => `${TG}?text=${encodeURIComponent(t)}`;
  const KIND = {mirror:'k-mirror', table:'k-table', door:'k-door'};
  let chosen = null;
  const setWood = name => { const r = [...form.elements.wood].find(r => r.value === name); if (r) r.checked = true; };
  function choose(id){
    const b = id && picker.querySelector(`[data-pick="${id}"]`);
    chosen = b ? b.dataset : null;
    [...picker.children].forEach(x => x.setAttribute('aria-pressed', x === b));
    $('#chosen').classList.toggle('on', !!chosen);
    if (chosen) {
      $('#chosen-img').src = chosen.img;
      $('#chosen-name').textContent = chosen.name;
      $('#chosen-kind').textContent = chosen.meta;
      $('#model').value = `${chosen.kind} «${chosen.name}»`;
      $('#' + KIND[chosen.cat]).checked = true;
      $('#b-model').checked = true;
      if (chosen.wood) setWood(chosen.wood);
    }
    saveDraft();
  }
  function saveDraft(){ try { localStorage.setItem('krona-draft', JSON.stringify({...Object.fromEntries(new FormData(form)), pick: chosen?.pick || ''})); } catch (e) {} }
  picker.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) choose(b.dataset.pick === chosen?.pick ? null : b.dataset.pick); });
  $('#chosen-clear').addEventListener('click', () => { choose(null); $('#model').value = ''; saveDraft(); });
  // черновик из прошлого визита
  try {
    const d = JSON.parse(localStorage.getItem('krona-draft') || '{}');
    for (const [k, v] of Object.entries(d)) { const el = form.elements[k]; if (el && typeof v === 'string' && !['kind', 'wood', 'basis'].includes(k)) el.value = v; }
    for (const k of ['kind', 'wood', 'basis']) if (d[k]) { const r = [...form.elements[k]].find(r => r.value === d[k]); if (r) r.checked = true; }
    if (d.pick) { const m = $('#model').value; choose(d.pick); $('#model').value = m; }
  } catch (e) {}
  // что выбрали на другой странице: ?model=bella, ?kind=k-door&idea=…, ?wood=Карагач
  const q = new URLSearchParams(location.search);
  if (q.get('model')) choose(q.get('model'));
  if (q.get('kind') && $('#' + q.get('kind'))) { choose(null); $('#' + q.get('kind')).checked = true; $('#model').value = q.get('idea') || ''; }
  if (q.get('wood')) setWood(q.get('wood'));
  if ([...q.keys()].length) saveDraft();
  form.addEventListener('input', saveDraft);

  function buildText(){
    const f = Object.fromEntries(new FormData(form));
    const lines = ['Здравствуйте! Хочу заказать изделие в «Кроне».', '', `Что: ${f.kind}`, `Как делать: ${f.basis}`, `Порода: ${f.wood}`];
    if (f.model) lines.push(`Модель / идея: ${f.model}`);
    if (f.size) lines.push(`Размеры: ${f.size}`);
    if (f.city) lines.push(`Город: ${f.city}`);
    if (f.msg) lines.push(`Пожелания: ${f.msg}`);
    if (f.basis === 'По моему эскизу или фото') lines.push('Эскиз или фото пришлю следующим сообщением.');
    lines.push('');
    if (f.name) lines.push(`Меня зовут ${f.name}.`);
    if (f.phone) lines.push(`Телефон: ${f.phone}`);
    return lines.join('\n');
  }
  async function copy(text){
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { out.focus(); out.select(); return false; }
  }
  async function showResult(){
    out.value = buildText();
    $('#send-wa').href = waLink(out.value);
    $('#send-tg').href = tgLink(out.value);
    $('#send-mail').href = `mailto:${MAIL}?subject=${encodeURIComponent('Заказ в мастерской «Крона»')}&body=${encodeURIComponent(out.value)}`;
    form.hidden = true; result.hidden = false;
    const ok = await copy(out.value);
    $('#result-note').textContent = ok
      ? 'Текст скопирован. Выберите, куда отправить, и вставьте его в сообщение. В WhatsApp, Telegram и на почту текст подставится сам.'
      : 'Скопируйте текст ниже (он уже выделен) и отправьте нам удобным способом. В WhatsApp, Telegram и на почту текст подставится сам.';
  }
  function phoneOk(){
    const ok = phone.value.replace(/\D/g, '').length >= 10;
    phone.setAttribute('aria-invalid', !ok); phoneErr.hidden = ok;
    return ok;
  }
  phone.addEventListener('input', () => { if (phone.getAttribute('aria-invalid') === 'true') phoneOk(); });
  // заявка сразу попадает в CRM мастерской, а клиент переходит на страницу своего заказа
  const name = $('#name'), nameErr = $('#name-err'), agree = $('#agree'), agreeErr = $('#agree-err'), sendBtn = $('#send-crm'), formErr = $('#form-err');
  const WOOD = {'Карагач':'karagach', 'Чёрный орех':'walnut', 'Дуб':'oak', 'Сосна':'pine', 'Клён':'maple'};
  function nameOk(){
    const ok = name.value.trim().length > 1;
    name.setAttribute('aria-invalid', !ok); nameErr.hidden = ok;
    return ok;
  }
  name.addEventListener('input', () => { if (name.getAttribute('aria-invalid') === 'true') nameOk(); });
  agree.addEventListener('change', () => { if (agree.checked) agreeErr.hidden = true; });
  const focusOn = el => { el.focus(); el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'center'}); };
  async function sendToWorkshop(){
    const f = Object.fromEntries(new FormData(form));
    const kind = form.querySelector('input[name=kind]:checked');
    const wishes = [f.basis !== 'По моему эскизу или фото' ? f.basis : '', f.msg].filter(Boolean).join('. ');
    const d = {name: f.name.trim(), phone: f.phone, city: f.city || '', cat: kind ? kind.id.slice(2) : 'other', wood: WOOD[f.wood] || '',
      item_id: chosen?.pick || '', title: (f.model || '').trim() || (kind ? kind.value : 'Заявка с сайта'), size: f.size || '', wishes};
    const r = await fetch(form.dataset.api + '/rest/v1/rpc/submit_order', {method: 'POST',
      headers: {apikey: form.dataset.key, Authorization: 'Bearer ' + form.dataset.key, 'Content-Type': 'application/json'}, body: JSON.stringify({d})});
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.message || r.status);
    return body;
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const via = e.submitter?.value || 'crm';
    if (via === 'crm') {
      const okName = nameOk(), okPhone = phoneOk();
      if (!okName) return focusOn(name);
      if (!okPhone) return focusOn(phone);
      if (!agree.checked) { agreeErr.hidden = false; return focusOn(agree); }
      sendBtn.disabled = true; sendBtn.textContent = 'Отправляем…'; formErr.hidden = true;
      try {
        const {token} = await sendToWorkshop();
        try {
          const mine = JSON.parse(localStorage.getItem('krona-orders') || '[]');
          localStorage.setItem('krona-orders', JSON.stringify([token, ...mine.filter(t => t !== token)].slice(0, 20)));
          localStorage.removeItem('krona-draft');
        } catch (x) {}
        location.href = '/zakaz/?t=' + token;
      } catch (x) {
        sendBtn.disabled = false; sendBtn.textContent = 'Отправить заявку';
        formErr.textContent = /too_many/.test(x.message) ? 'Заявка уже отправлена. Мы скоро перезвоним, или напишите нам в WhatsApp ниже.'
          : 'Не получилось отправить заявку, возможно, пропал интернет. Попробуйте ещё раз или напишите нам в WhatsApp: текст заявки уже готов.';
        formErr.hidden = false;
      }
      return;
    }
    if (!phoneOk()) return focusOn(phone);
    const t = buildText();
    window.open(via === 'tg' ? tgLink(t) : via === 'max' ? MAX : waLink(t), '_blank', 'noopener');
    showResult();
  });
  $('#send-other').addEventListener('click', () => { if (phoneOk()) showResult(); else phone.focus(); });
  $('#copy-again').addEventListener('click', async () => {
    const ok = await copy(out.value);
    $('#result-note').textContent = ok ? 'Скопировано ещё раз.' : 'Текст выделен, скопируйте его вручную.';
  });
  $('#edit').addEventListener('click', () => { result.hidden = true; form.hidden = false; });
}

/* ── страница «Ваш заказ»: клиент видит этапы, срок, оплату и фото из мастерской ── */
const track = $('#track');
if (track) {
  const {api: API, key: KEY, wa: WA, tel: TEL} = track.dataset;
  const ITEMS = JSON.parse($('#track-items').textContent);
  const H = {apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json'};
  const rpc = (fn, body) => fetch(`${API}/rest/v1/rpc/${fn}`, {method: 'POST', headers: H, body: JSON.stringify(body)}).then(r => r.ok ? r.json() : Promise.reject(r.status));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
  const MON = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const date = d => { const z = new Date(d.length === 10 ? d + 'T12:00' : d); return `${z.getDate()} ${MON[z.getMonth()]}`; };
  const rub = n => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
  const WOODS = {karagach:'Карагач', walnut:'Чёрный орех', oak:'Дуб', pine:'Сосна', maple:'Клён'};
  const CATS = {mirror:'Зеркало', table:'Стол', door:'Дверь', kitchen:'Кухня', furniture:'Мебель', sill:'Подоконник', other:'Изделие'};
  // этапы цеха в CRM → понятные клиенту шаги
  const STEPS = [
    ['Заявка получена', 'Мастер свяжется с вами в течение рабочего дня, уточнит детали и ответит на вопросы.', ['lead']],
    ['Обсуждаем детали', 'Согласуем размеры, породу, тон и покрытие, рассчитываем стоимость.', ['calc']],
    ['Предоплата', 'После предоплаты заказ уходит в цех.', ['agreed']],
    ['Изготавливаем', 'Ваша вещь в работе в нашем цеху.', ['board', 'prep', 'form', 'finish', 'coat']],
    ['Фото на одобрение', 'Покажем готовое изделие до упаковки, чтобы вы убедились, что всё как задумано.', ['approve']],
    ['Доставка и установка', 'Бережно упаковываем, привозим и устанавливаем или отправляем в ваш город.', ['delivery']],
    ['Готово', 'Спасибо, что выбрали «Крону»!', ['done']],
  ];
  const WORK = {board: 'подбор доски', prep: 'подготовка заготовок', form: 'форма и рельеф', finish: 'ручная доводка', coat: 'покрытие'};
  const t = new URLSearchParams(location.search).get('t') || '';
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('krona-orders') || '[]'); } catch (e) {}
  const photoUrls = {};

  const photo = path => photoUrls[path] ||= fetch(`${API}/storage/v1/object/authenticated/photos/${path}`, {headers: {apikey: KEY, Authorization: 'Bearer ' + KEY}})
    .then(r => r.ok ? r.blob() : null).then(b => b ? URL.createObjectURL(b) : '').catch(() => '');
  function head(eyebrow, h1, lead){ $('#t-eyebrow').textContent = eyebrow; $('#t-title').innerHTML = h1; $('#t-lead').textContent = lead; }
  function notFound(){
    head('Ваш заказ', 'Заказ <em>не найден</em>', 'Проверьте ссылку или напишите нам: подскажем, на каком этапе ваш заказ.');
    track.innerHTML = `<div class="ctas"><a class="btn" href="${WA}" target="_blank" rel="noopener">Написать в WhatsApp</a><a class="btn ghost" href="/order/">Оставить заявку</a></div>`;
  }

  async function draw(){
    let o;
    try { o = await rpc('get_order', {p_token: t}); } catch (e) {
      if (!track.dataset.ok) track.innerHTML = '<p class="muted">Не получилось загрузить заказ. Проверьте интернет и обновите страницу.</p>';
      return;
    }
    if (!o) return notFound();
    track.dataset.ok = 1;
    const it = ITEMS[o.item_id], lost = o.stage === 'lost';
    const cur = STEPS.findIndex(s => s[2].includes(o.stage));
    const name = (o.name || '').trim();
    head(`Заказ №${o.num} · от ${date(o.created_at)}`,
      `${esc(name)}, <em>${lost ? 'заказ отменён' : o.stage === 'done' ? 'заказ готов' : o.stage === 'lead' ? 'заявка принята' : 'ваш заказ в работе'}</em>`,
      lost ? 'Если хотите вернуться к заказу, просто напишите нам.' : STEPS[cur]?.[1] || '');
    const details = [['Изделие', o.title], ['Порода', WOODS[o.wood]], ['Размер', o.size], ['Готовность', o.deadline ? `ориентировочно ${date(o.deadline)}` : '']].filter(r => r[1]);
    const left = o.price ? o.price - (o.paid || 0) : 0;
    const money = o.price ? `<div class="t-money"><div><span>Стоимость</span><b>${rub(o.price)}</b></div><div><span>Внесено</span><b>${rub(o.paid || 0)}</b></div>
      <div><span>Осталось</span><b class="${left > 0 ? 'gold' : ''}">${left > 0 ? rub(left) : 'оплачено'}</b></div>
      <i class="bar"><i style="width:${Math.min(100, (o.paid || 0) / o.price * 100)}%"></i></i></div>` : '';
    const approve = o.stage !== 'approve' ? '' : o.client_ok === true ? '<div class="t-ok">Спасибо! Вы одобрили изделие, готовим его к упаковке.</div>' : `
      <div class="t-approve"><h3>Посмотрите фото готового изделия</h3><p>Если всё нравится, нажмите кнопку, и мы начнём упаковку. Если есть вопрос, напишите его, мастер ответит.</p>
        ${o.client_ok === false ? '<p class="gold">Ваш вопрос получен, мастер скоро ответит.</p>' : ''}
        <div class="ctas"><button class="btn" type="button" id="t-yes">Всё нравится, упаковывайте</button><button class="btn ghost" type="button" id="t-ask">Есть вопрос</button></div>
        <form id="t-q" hidden><textarea name="q" placeholder="Ваш вопрос или пожелание" required></textarea><button class="btn">Отправить</button></form></div>`;
    track.innerHTML = `
      <div class="t-grid">
        <div class="t-card">
          <div class="stage t-img">${it ? `<img src="${it.img}" alt="${esc(it.name)}">` : `<span>${esc(CATS[o.cat] || 'Изделие')}</span>`}</div>
          <dl>${details.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          ${o.wishes ? `<div class="t-wish"><span>Ваши пожелания</span><p>${esc(o.wishes)}</p></div>` : ''}
        </div>
        <div class="t-side">
          ${lost ? '' : `<ol class="t-steps">${STEPS.map((s, i) => `<li class="${i < cur ? 'past' : i === cur ? 'cur' : ''}"><b>${s[0]}</b>${i === cur && s[2].length > 1 ? `<small>Сейчас: ${WORK[o.stage]}</small>` : ''}</li>`).join('')}</ol>`}
          ${approve}${money}
        </div>
      </div>
      ${o.photos.length ? `<div class="t-photos"><div class="eyebrow">Фото из мастерской</div><div class="t-ph">${o.photos.map(p => `<a data-path="${esc(p.path)}" target="_blank" rel="noopener"><img alt="Фото вашего изделия" data-path="${esc(p.path)}"><small>${date(p.at)}</small></a>`).join('')}</div></div>` : ''}
      <div class="t-foot">
        <div><h3>Есть вопрос?</h3><p class="muted">Пишите или звоните, мы на связи.</p></div>
        <div class="ctas"><a class="btn" href="${WA}?text=${encodeURIComponent(`Здравствуйте! Вопрос по заказу №${o.num}.`)}" target="_blank" rel="noopener">WhatsApp</a><a class="btn ghost" href="tel:${TEL}">Позвонить</a><button class="btn ghost" type="button" id="t-copy">Скопировать ссылку</button></div>
        <p class="muted small">Сохраните эту страницу в закладки: по ссылке всегда видно, на каком этапе ваш заказ. Пароль не нужен.</p>
      </div>`;
    track.querySelectorAll('[data-path]').forEach(async el => { const u = await photo(el.dataset.path); if (!u) return; if (el.tagName === 'IMG') el.src = u; else el.href = u; });
    $('#t-copy').onclick = async () => { try { await navigator.clipboard.writeText(location.href); $('#t-copy').textContent = 'Ссылка скопирована'; } catch (e) { prompt('Скопируйте ссылку:', location.href); } };
    $('#t-yes')?.addEventListener('click', async () => { await rpc('client_reply', {p_token: t, p_ok: true, p_text: ''}).catch(() => {}); draw(); });
    $('#t-ask')?.addEventListener('click', () => { $('#t-q').hidden = false; $('#t-q').q.focus(); });
    $('#t-q')?.addEventListener('submit', async e => { e.preventDefault(); await rpc('client_reply', {p_token: t, p_ok: false, p_text: e.target.q.value}).catch(() => {}); draw(); });
  }

  const busy = () => document.hidden || document.activeElement?.closest('#t-q');
  if (t) {
    if (!saved.includes(t)) try { localStorage.setItem('krona-orders', JSON.stringify([t, ...saved].slice(0, 20))); } catch (e) {}
    draw();
    // пока страница открыта, статус обновляется сам
    setInterval(() => { if (!busy()) draw(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!busy()) draw(); });
  } else if (saved.length) {
    head('Ваши заказы', 'Ваши <em>заказы</em>', 'Заказы, оформленные с этого устройства.');
    Promise.all(saved.map(s => rpc('get_order', {p_token: s}).catch(() => null))).then(list => {
      const rows = list.map((o, i) => o ? `<a href="/zakaz/?t=${saved[i]}"><b>№${o.num} ${esc(o.title)}</b><span>${esc(STEPS.find(s => s[2].includes(o.stage))?.[0] || 'Отменён')}</span></a>` : '').join('');
      if (rows) track.innerHTML = `<div class="t-list">${rows}</div>`; else notFound();
    });
  } else notFound();
}
