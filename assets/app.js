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
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!phoneOk()) { phone.focus(); phone.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'center'}); return; }
    const via = e.submitter?.value || 'wa', t = buildText();
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
