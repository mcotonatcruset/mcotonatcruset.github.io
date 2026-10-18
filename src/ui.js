import en from '../content/en.json';
import ca from '../content/ca.json';
import es from '../content/es.json';
import { hoopGame } from './hoop.js';

const LANGS = { en, ca, es };
// same left-to-right order as the walk through the room
const SECTIONS = ['experience', 'about', 'projects', 'contact', 'cv', 'makes', 'skills'];
// shown on the screen itself (two monitors and the phone): main.js flies the camera into it, no side panel
const SCREENS = ['about', 'projects', 'contact'];
const CV_URL = `${import.meta.env.BASE_URL}cv/Marti_Cotonat_CV_EN.pdf`;
// card images, in the order of each section's items: bonsai renders made in Blender, prints rendered from their model
const IMG = {
  skills: ['moyogi', 'chokkan', 'kengai', 'salze', 'planter'].map((n) => `${import.meta.env.BASE_URL}bonsais/${n}.webp`),
  makes: [`${import.meta.env.BASE_URL}prints/totoro.webp`],
};
// also drawn on the phone's screen in the room (room.js)
export const LINKS = [
  ['Email', 'mailto:marticotonat@gmail.com', 'marticotonat@gmail.com'],
  ['LinkedIn', 'https://www.linkedin.com/in/mart%C3%AD-cotonat-cruset/', 'linkedin.com/in/martí-cotonat-cruset'],
  ['GitHub', 'https://github.com/mcotonatcruset', 'github.com/mcotonatcruset'],
  ['CV', CV_URL, 'Marti_Cotonat_CV_EN.pdf'],
];

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    return null;
  }
}

export function initUI({ onOpen = () => {}, onClose = () => {}, onWalk = () => {}, onLang = () => {} }) {
  const dialog = document.querySelector('#panel');
  const body = dialog.querySelector('.content');
  const nav = document.querySelector('.menu .links');
  const select = document.querySelector('#lang');

  let lang = store('lang') || navigator.language.slice(0, 2);
  if (!LANGS[lang]) lang = 'en';
  let current = null;

  function fill(card, it) {
    card.append(el('h3', it.title));
    if (it.meta) card.append(el('p', it.meta, 'meta'));
    if (it.body) card.append(el('p', it.body));
    if (it.link) {
      const a = el('a', it.link.text);
      a.href = it.link.href;
      a.target = '_blank';
      a.rel = 'noopener';
      const p = el('p');
      p.append(a);
      card.append(p);
    }
    if (it.tags) {
      const ul = el('ul', '', 'chips');
      for (const t of it.tags) ul.append(el('li', t));
      card.append(ul);
    }
    return card;
  }

  function render(id, into = body) {
    const s = LANGS[lang].sections[id];
    into.replaceChildren(el('h2', s.title));
    for (const p of s.body || []) into.append(el('p', p));
    for (const it of s.items || []) into.append(fill(el('article', '', 'card'), it));
    for (const gr of s.groups || []) {
      into.append(el('h3', gr.name));
      const ul = el('ul', '', 'chips');
      for (const t of gr.items) ul.append(el('li', t));
      into.append(ul);
    }
    if (id === 'cv') {
      const a = el('a', LANGS[lang].ui.download, 'btn');
      a.href = CV_URL;
      a.download = '';
      // the real first page, so the panel shows what you're about to get instead of an empty sheet
      const page = el('a', '', 'cv-page');
      page.href = CV_URL;
      page.target = '_blank';
      const img = el('img');
      img.src = `${import.meta.env.BASE_URL}cv/preview.jpg`;
      img.alt = LANGS[lang].ui.cvPreview;
      img.loading = 'lazy';
      page.append(img);
      into.append(a, page);
    }
    if (id === 'contact') {
      const ul = el('ul', '', 'links-list');
      for (const [name, href, text] of LINKS) {
        const li = el('li');
        const a = el('a', text);
        a.href = href;
        if (href.startsWith('http')) a.target = '_blank', a.rel = 'noopener';
        if (href === CV_URL) a.download = '';
        li.append(el('span', name, 'meta'), a);
        ul.append(li);
      }
      into.append(ul);
    }
  }

  // ---- wardrobe: no side panel, each garment pops its own card ----
  const closet = document.querySelector('.closet');
  const pop = document.querySelector('.popcard');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = (id = 'experience') => LANGS[lang].sections[id].items;
  let shown = -1;

  function showItem(i, x = innerWidth / 2, y = innerHeight / 3, animate = true) {
    const all = items();
    shown = (i + all.length) % all.length;
    const close = el('button', '×', 'pop-close');
    close.setAttribute('aria-label', LANGS[lang].ui.close);
    close.onclick = hideItem;
    pop.replaceChildren(close);
    fill(pop, all[shown]);
    pop.hidden = false;
    // next to the pointer, kept inside the screen (on mobile CSS pins it to the bottom instead)
    pop.style.left = `${Math.max(16, Math.min(innerWidth - pop.offsetWidth - 16, x + 24))}px`;
    pop.style.top = `${Math.max(16, Math.min(innerHeight - pop.offsetHeight - 16, y - 40))}px`;
    if (animate && !reduceMotion) {
      pop.animate([{ opacity: 0, transform: 'translateY(12px) scale(0.97)' }, { opacity: 1, transform: 'none' }],
        { duration: 320, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }); // ease-out-quart, like every panel
    }
  }
  function hideItem() { pop.hidden = true; shown = -1; }

  // keyboard users land back on the button that opened the screen or the wardrobe (the <dialog>s do this themselves)
  let opener = null;
  const refocus = () => { opener?.focus({ preventScroll: true }); opener = null; };

  function closeCloset() {
    hideItem();
    closet.hidden = true;
    current = null;
    onClose();
    refocus();
  }

  closet.querySelector('.back').onclick = closeCloset;
  // one button per garment or bonsai: they carry no label in the room, so touch and keyboard users get the list too.
  // The same card serves the wardrobe (experience: dates under each stage) and the terrace (skills)
  const stages = closet.querySelector('.stages');
  function fillStages() {
    const t = LANGS[lang];
    closet.querySelector('h2').textContent = t.sections[current].title;
    closet.querySelector('p').textContent = t.ui[current === 'experience' ? 'closetHint' : 'terraceHint'];
    stages.replaceChildren(...items(current).map((it, i) => {
      const li = el('li');
      const b = el('button', it.title, 'stage');
      b.setAttribute('aria-label', `${it.title} · ${it.meta}`);
      if (current === 'experience') b.append(el('span', it.meta.split(' · ')[0], 'meta')); // dates only
      b.onclick = () => (current === 'experience' ? showItem(i) : showCard(current, i));
      li.append(b);
      return li;
    }));
  }

  // ---- terrace and print shelf: each bonsai or print opens a centred card with its image beside the text ----
  const specimen = document.querySelector('.specimen');
  let card = null; // { id: 'skills' | 'makes', i }

  function showCard(id, i) {
    const all = items(id);
    card = { id, i: (i + all.length) % all.length };
    const it = all[card.i];
    const img = el('img');
    img.src = IMG[id][card.i];
    img.alt = it.alt || it.meta;
    const figure = el('figure');
    figure.append(img);
    const close = el('button', '×', 'pop-close');
    close.setAttribute('aria-label', LANGS[lang].ui.close);
    close.onclick = () => specimen.close();
    const text = fill(el('div', '', 'text'), it);
    if (all.length > 1) {
      // prev / position / next: the arrow keys do the same
      const pager = el('div', '', 'pager');
      const step = (d, label, glyph) => {
        const b = el('button', glyph, 'step');
        b.setAttribute('aria-label', LANGS[lang].ui[label]);
        b.onclick = () => showCard(id, card.i + d);
        return b;
      };
      pager.append(step(-1, 'prev', '‹'), el('span', `${card.i + 1} / ${all.length}`, 'meta'), step(1, 'next', '›'));
      text.append(pager);
    }
    specimen.replaceChildren(figure, text, close);
    if (!specimen.open) specimen.showModal();
  }
  specimen.addEventListener('close', () => { card = null; });
  // click on the backdrop = back to the terrace
  specimen.addEventListener('click', (e) => { if (e.target === specimen) specimen.close(); });

  // ---- monitors: the section is rendered on the screen ----
  const screen = document.querySelector('.screen');
  const screenBody = screen.querySelector('.content');
  function closeScreen() {
    screen.hidden = true;
    current = null;
    onClose();
    refocus();
  }
  screen.querySelector('.back').onclick = closeScreen;

  // ---- mini-game behind the wardrobe's hoop: a window over the room, back to the open wardrobe on close ----
  const gameDlg = document.querySelector('dialog.game');
  const game = hoopGame(gameDlg.querySelector('canvas'), showScore);
  let score = null; // { points, left, over }
  function startGame() {
    hideItem();
    gameDlg.showModal();
    gameDlg.querySelector('canvas').focus({ preventScroll: true }); // not the close button: Space and Enter shoot
    game.start();
  }
  gameDlg.querySelector('.pop-close').onclick = () => gameDlg.close();
  gameDlg.addEventListener('close', () => {
    game.stop();
    score = null;
    closet.querySelector('.back').focus({ preventScroll: true });
  });
  function showScore(s) {
    score = s;
    const t = LANGS[lang].ui;
    let best = +store('hoopBest') || 0;
    if (s.over && s.points > best) store('hoopBest', (best = s.points));
    const fmt = (text) => text.replace(/\{(\w+)\}/g, (_, key) => ({ ...s, best })[key]);
    gameDlg.querySelector('.score').textContent = fmt(t[s.over ? 'gameOver' : 'gameScore']);
    gameDlg.querySelector('.best').textContent = best ? fmt(t.gameBest) : '';
  }

  addEventListener('keydown', (e) => {
    if (gameDlg.open) return; // its own Escape closes only the game
    if (!screen.hidden && e.key === 'Escape') return closeScreen();
    // keyboard path through the bonsais or prints (the dialog closes itself on Escape)
    if (specimen.open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) return showCard(card.id, card.i + (e.key === 'ArrowRight' ? 1 : -1));
    if (specimen.open || closet.hidden) return; // the card's own Escape closes only the card
    if (current === 'skills') return e.key === 'Escape' && closeCloset();
    if (e.key === 'Escape') shown < 0 ? closeCloset() : hideItem();
    // keyboard path through the garments
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') showItem(shown < 0 ? 0 : shown + (e.key === 'ArrowRight' ? 1 : -1));
  });

  function open(id) {
    const in3d = !document.body.classList.contains('no3d');
    if (document.activeElement !== document.body) opener = document.activeElement;

    // the print shelf hangs above the printer: walk there and open the first print
    if (id === 'makes' && in3d) {
      if (dialog.open) dialog.close();
      onWalk(id);
      return showCard(id, 0);
    }
    if (SCREENS.includes(id) && in3d) {
      current = id;
      render(id, screenBody);
      const phone = id === 'contact';
      screen.classList.toggle('phone', phone);
      // a phone's status bar shows the time; a monitor, the name of the section
      screen.querySelector('.path').textContent = phone ? new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) : LANGS[lang].sections[id].menu;
      screen.style.opacity = 0; // main.js fades it in as the camera reaches the monitor
      screen.hidden = false;
      screenBody.scrollTop = 0;
      screen.querySelector('.back').focus({ preventScroll: true });
      return onOpen(id);
    }
    // wardrobe and terrace: the camera walks up to it and a card lists what's there
    if ((id === 'experience' || id === 'skills') && in3d) {
      if (dialog.open) dialog.close();
      current = id;
      fillStages();
      closet.hidden = false;
      closet.querySelector('.back').focus({ preventScroll: true });
      return onOpen(id);
    }
    current = id;
    render(id);
    if (!dialog.open) dialog.showModal();
    body.scrollTop = 0;
    onOpen(id);
  }

  function applyLang() {
    const t = LANGS[lang];
    document.documentElement.lang = lang;
    for (const n of document.querySelectorAll('[data-i18n]')) n.textContent = t.ui[n.dataset.i18n];
    if (matchMedia('(pointer: coarse)').matches) document.querySelector('.hint').textContent = t.ui.hintTouch;
    onLang(t); // text painted in the 3D scene
    nav.replaceChildren(...SECTIONS.map((id) => {
      const b = el('button', t.sections[id].menu);
      b.onclick = () => open(id);
      return b;
    }));
    select.value = lang;
    quickContact.textContent = t.sections.contact.menu;
    if (here) active(here);
    if (card) showCard(card.id, card.i);
    if (score) showScore(score);
    gameDlg.querySelector('.pop-close').setAttribute('aria-label', t.ui.close);
    if (!closet.hidden) {
      fillStages();
      if (shown >= 0) showItem(shown, pop.offsetLeft - 24, pop.offsetTop + 40, false);
    } else if (current) {
      render(current, screen.hidden ? body : screenBody);
      if (!screen.hidden && !screen.classList.contains('phone')) screen.querySelector('.path').textContent = t.sections[current].menu;
    }
  }

  const quickContact = document.querySelector('.contact-link');
  quickContact.onclick = () => open('contact');
  document.querySelector('.cv-link').href = CV_URL;

  select.onchange = () => {
    lang = select.value;
    store('lang', lang);
    applyLang();
  };
  dialog.addEventListener('close', () => { current = null; onClose(); });
  // click on the backdrop = back to the room
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  // mark where the camera is standing
  let here = null;
  function active(id) {
    here = id;
    nav.querySelectorAll('button').forEach((b, i) => {
      const on = SECTIONS[i] === id;
      b.toggleAttribute('aria-current', on);
    });
  }

  applyLang();
  return {
    open,
    active,
    label: (id) => LANGS[lang].sections[id].menu,
    note: (key) => LANGS[lang].ui[key],
    itemLabel: (i, id = 'experience') => [items(id)[i].title, items(id)[i].meta].join('\n'),
    showItem,
    hideItem,
    showCard,
    cardOpen: () => specimen.open,
    startGame,
    score: showScore,
  };
}
