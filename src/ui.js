import en from '../content/en.json';
import ca from '../content/ca.json';
import es from '../content/es.json';
import { hoopGame } from './hoop.js';

const LANGS = { en, ca, es };
// same left-to-right order as the walk through the room
const SECTIONS = ['experience', 'about', 'projects', 'contact', 'cv', 'makes', 'skills'];
// shown on the screen itself (two monitors and the phone): main.js flies the camera into it, no side panel
const SCREENS = ['about', 'projects', 'contact'];
// a card lists what's there: the wardrobe's garments, the terrace's bonsais, the shelf's prints
const CLOSETS = ['experience', 'skills', 'makes'];
const CV_URL = `${import.meta.env.BASE_URL}cv/Marti_Cotonat_CV_EN.pdf`;
// card images, in the order of each section's items: bonsai renders made in Blender, prints rendered from their model
const IMG = {
  skills: ['moyogi', 'chokkan', 'kengai', 'salze', 'planter'].map((n) => `${import.meta.env.BASE_URL}bonsais/${n}.webp`),
  makes: ['totoro', 'primaris', 'overlord', 'lychguard', 'termagants'].map((n) => `${import.meta.env.BASE_URL}prints/${n}.webp`),
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

  function fill(card, it, heading = 'h3') {
    card.append(el(heading, it.title));
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

  // prev / position / next under a card: the wardrobe's garments and the bonsais and prints page the same way (arrow keys too)
  function pager(i, n, go) {
    const p = el('div', '', 'pager');
    const step = (d, label, glyph) => {
      const b = el('button', glyph, 'step');
      b.setAttribute('aria-label', LANGS[lang].ui[label]);
      b.onclick = () => go(i + d);
      return b;
    };
    p.append(step(-1, 'prev', '‹'), el('span', `${i + 1} / ${n}`, 'meta'), step(1, 'next', '›'));
    return p;
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
    if (id === 'about' || id === 'projects') {
      // the dive ends on what a recruiter came for, not a dead end (the name card is hidden inside a screen)
      const next = el('p', '', 'next');
      const cv = el('a', LANGS[lang].ui.quickCv, 'btn small');
      cv.href = CV_URL;
      cv.download = '';
      const contact = el('button', LANGS[lang].sections.contact.menu, 'btn small ghost');
      contact.onclick = () => open('contact');
      next.append(cv, contact);
      into.append(next);
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

  // ---- wardrobe, terrace and shelf: a card lists what's there, each item opens the centred card (showCard) ----
  const closet = document.querySelector('.closet');
  const specimen = document.querySelector('.specimen');
  const items = (id = 'experience') => LANGS[lang].sections[id].items;
  // the stage whose card is showing reads as pressed in the list
  const mark = (i) => closet.querySelectorAll('.stage').forEach((b, j) => b.setAttribute('aria-pressed', i === j));

  // keyboard users land back on the button that opened the screen or the wardrobe (the <dialog>s do this themselves)
  // a section opened from a link (#about) has no opener: its menu button stands in
  let opener = null;
  let last = null;
  const refocus = () => {
    (opener?.isConnected ? opener : nav.children[SECTIONS.indexOf(last)])?.focus({ preventScroll: true });
    opener = null;
  };

  // each open section is a history entry: the back button or gesture closes it instead of leaving the site.
  // A deep link (#projects) has no entry of ours behind it, so closing that one only drops the hash
  let pushed = false;
  const unhash = () => {
    if (pushed) history.back();
    else if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    pushed = false;
  };

  function closeCloset() {
    unhash();
    if (specimen.open) specimen.close();
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
    const s = t.sections[current];
    closet.querySelector('h2').textContent = s.title;
    closet.setAttribute('aria-label', s.title);
    // the bonsai key (size = years) and the note on the prints live in the section's body: the 3D path shows it here
    closet.querySelector('p').textContent = current === 'experience' ? t.ui.closetHint : [s.body[0], current === 'skills' && t.ui.terraceHint].filter(Boolean).join(' ');
    stages.replaceChildren(...items(current).map((it, i) => {
      const li = el('li');
      const b = el('button', it.title, 'stage');
      b.setAttribute('aria-label', `${it.title} · ${it.meta}`);
      b.setAttribute('aria-pressed', false);
      if (current === 'experience') b.append(el('span', it.meta.split(' · ')[0], 'meta')); // dates only
      b.onclick = () => showCard(current, i);
      li.append(b);
      return li;
    }));
  }

  // ---- the centred card: a garment's stage, or a bonsai or print with its image beside the text ----
  let card = null; // { id: 'experience' | 'skills' | 'makes', i }

  function showCard(id, i) {
    const all = items(id);
    card = { id, i: (i + all.length) % all.length };
    const it = all[card.i];
    const figure = el('figure');
    if (IMG[id]) {
      const img = el('img');
      img.src = IMG[id][card.i];
      img.alt = it.alt || it.meta;
      img.classList.toggle('photo', !!it.photo); // a real photo, not a render on a clear background
      figure.append(img);
    }
    specimen.classList.toggle('plain', !IMG[id]); // garments have no picture: text only
    const close = el('button', '×', 'pop-close');
    close.setAttribute('aria-label', LANGS[lang].ui.close);
    close.onclick = () => specimen.close();
    const text = fill(el('div', '', 'text'), it, 'h2'); // the card's own title: dialogs start their outline again
    if (all.length > 1) text.append(pager(card.i, all.length, (j) => showCard(id, j)));
    close.autofocus = true; // not "previous": the first thing to reach is the way out
    // paging rebuilds the card: keep focus on the same control (‹, › or ×) instead of dropping it to the page
    const kept = specimen.open && specimen.contains(document.activeElement) ? document.activeElement.getAttribute('aria-label') : null;
    specimen.replaceChildren(...(IMG[id] ? [figure] : []), text, close);
    if (kept) [...specimen.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === kept)?.focus();
    specimen.setAttribute('aria-label', it.title);
    if (!specimen.open) specimen.showModal();
    if (id === current) mark(card.i);
  }
  specimen.addEventListener('close', () => {
    card = null;
    mark(-1);
    if (current === 'cv') { unhash(); current = null; onClose(); refocus(); }
  });

  // the CV in the same card: its first page as the picture, the download beside it
  function showCv() {
    const text = el('div', '', 'text');
    render('cv', text);
    const figure = el('figure');
    figure.append(text.querySelector('.cv-page'));
    const close = el('button', '×', 'pop-close');
    close.setAttribute('aria-label', LANGS[lang].ui.close);
    close.onclick = () => specimen.close();
    close.autofocus = true;
    specimen.classList.remove('plain');
    specimen.setAttribute('aria-label', LANGS[lang].sections.cv.title);
    specimen.replaceChildren(figure, text, close);
    if (!specimen.open) specimen.showModal();
  }
  // click on the backdrop = back to the terrace
  specimen.addEventListener('click', (e) => { if (e.target === specimen) specimen.close(); });

  // ---- monitors: the section is rendered on the screen ----
  const screen = document.querySelector('.screen');
  const screenBody = screen.querySelector('.content');
  function closeScreen() {
    unhash();
    screen.hidden = true;
    current = null;
    onClose();
    refocus();
  }
  screen.querySelector('.back').onclick = closeScreen;
  // a monitor's title bar names the screens on the desk: the camera moves straight from one to the next
  function tabs(id) {
    screen.querySelector('.path').replaceChildren(...SCREENS.map((s) => {
      const b = el('button', LANGS[lang].sections[s].menu, 'tab');
      if (s === id) b.setAttribute('aria-current', 'page');
      b.onclick = () => { open(s); screen.querySelector('.tab[aria-current]')?.focus(); }; // stay on the tabs, not Back
      return b;
    }));
  }

  // ---- mini-game behind the wardrobe's hoop: a window over the room, back to the open wardrobe on close ----
  const gameDlg = document.querySelector('dialog.game');
  const game = hoopGame(gameDlg.querySelector('canvas'), showScore);
  let score = null; // { points, left, over }
  function startGame() {
    if (specimen.open) specimen.close();
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
    // keyboard path through the garments, bonsais or prints (the dialog closes itself on Escape)
    if (card && specimen.open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) return showCard(card.id, card.i + (e.key === 'ArrowRight' ? 1 : -1));
    if (specimen.open || closet.hidden) return; // the card's own Escape closes only the card
    if (e.key === 'Escape') closeCloset();
    if (current === 'experience' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) showCard(current, e.key === 'ArrowRight' ? 0 : -1);
  });

  function open(id) {
    if (location.hash !== `#${id}`) {
      // one entry per visit: moving from one open section to another replaces it
      if (current || pushed) history.replaceState(null, '', `#${id}`);
      else history.pushState(null, '', `#${id}`), (pushed = true);
    }
    const in3d = !document.body.classList.contains('no3d');
    if (!current && document.activeElement !== document.body) opener = document.activeElement;
    last = id;
    // on desktop the menu stays up beside the wardrobe, terrace and shelf card: leaving it for another section closes the card
    if (specimen.open) specimen.close();
    if (!closet.hidden && !(CLOSETS.includes(id) && in3d)) closet.hidden = true;
    if (!screen.hidden && !(SCREENS.includes(id) && in3d)) screen.hidden = true;

    if (id === 'cv' && in3d) {
      current = id;
      showCv();
      return onOpen(id);
    }

    if (SCREENS.includes(id) && in3d) {
      current = id;
      render(id, screenBody);
      const phone = id === 'contact';
      screen.classList.toggle('phone', phone);
      // a phone's status bar shows the time; a monitor, the name of the section
      screen.setAttribute('aria-label', LANGS[lang].sections[id].title);
      if (phone) screen.querySelector('.path').textContent = new Date().toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });
      else tabs(id);
      screen.style.opacity = 0; // main.js fades it in as the camera reaches the monitor
      screen.hidden = false;
      screenBody.scrollTop = 0;
      screen.querySelector('.back').focus({ preventScroll: true });
      return onOpen(id);
    }
    // wardrobe, terrace and print shelf: the camera walks up to it and a card lists what's there
    if (CLOSETS.includes(id) && in3d) {
      if (dialog.open) dialog.close();
      current = id;
      fillStages();
      closet.hidden = false;
      closet.querySelector('.back').focus({ preventScroll: true });
      return onOpen(id);
    }
    current = id;
    render(id);
    dialog.setAttribute('aria-label', LANGS[lang].sections[id].title);
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
    select.setAttribute('aria-label', t.ui.language);
    document.querySelector('.menu').setAttribute('aria-label', t.ui.sections);
    quickContact.textContent = t.sections.contact.menu;
    if (here) active(here);
    if (card) showCard(card.id, card.i);
    else if (current === 'cv' && specimen.open) showCv();
    if (score) showScore(score);
    gameDlg.querySelector('.pop-close').setAttribute('aria-label', t.ui.close);
    if (!closet.hidden) {
      fillStages();
      if (card?.id === current) mark(card.i);
    } else if (current) {
      render(current, screen.hidden ? body : screenBody);
      if (!screen.hidden && !screen.classList.contains('phone')) tabs(current);
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
  dialog.addEventListener('close', () => { unhash(); current = null; onClose(); });
  // click on the backdrop = back to the room
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  // mark where the camera is standing
  let here = null;
  function active(id) {
    here = id;
    nav.querySelectorAll('button').forEach((b, i) => {
      const on = SECTIONS[i] === id;
      if (on) b.setAttribute('aria-current', 'location');
      else b.removeAttribute('aria-current');
    });
  }

  applyLang();
  // a link to /#projects opens that section; back / forward open or close sections
  function fromHash() {
    const id = location.hash.slice(1);
    if (SECTIONS.includes(id)) return document.activeElement.blur(), open(id); // a link opened it, not whatever had focus
    pushed = false; // the entry is already gone
    if (specimen.open) specimen.close();
    if (!screen.hidden) closeScreen();
    else if (!closet.hidden) closeCloset();
    else if (dialog.open) dialog.close();
  }
  addEventListener('popstate', fromHash);
  fromHash();
  return {
    open,
    active,
    label: (id) => LANGS[lang].sections[id].menu,
    note: (key) => LANGS[lang].ui[key],
    itemLabel: (i, id = 'experience') => [items(id)[i].title, items(id)[i].meta].join('\n'),
    showCard,
    cardOpen: () => specimen.open,
    startGame,
    score: showScore,
  };
}
