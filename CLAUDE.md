# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Què és

Portfolio personal interactiu (GitHub Pages d'usuari, servit a l'arrel `/`): una habitació 3D low-poly feta amb Three.js on cada objecte clicable obre una secció del CV. JS vanilla + Vite, sense framework, sense TypeScript.

## Ordres

```bash
npm run dev       # servidor de desenvolupament Vite
npm run build     # genera dist/
npm run preview   # serveix dist/ per comprovar el build
```

No hi ha tests ni linter. La verificació és visual: arrencar `npm run dev` i comprovar al navegador (el `.gitignore` ja preveu `.playwright-cli/` per a captures amb playwright-cli). Comprova també amplada mòbil (<800px), on el panell és un bottom sheet.

Desplegament: `.github/workflows/deploy.yml` fa `npm ci && npm run build` i publica `dist/` a GitHub Pages a cada push a `main`. No hi ha `vite.config.js` (base `/` per defecte, correcte per a un repo `*.github.io`).

## Arquitectura

Tres mòduls a `src/`, connectats per un sol identificador: **l'id de secció** (`about`, `projects`, `experience`, `skills`, `cv`, `makes`, `contact`).

- **`room.js`** — construeix l'escena amb helpers `box`/`cyl`/`add` (unitats ≈ metres; tot alineat a la paret del fons z = -5; habitació x -6.4..0.5, terrassa x 0.5..5.1). El que és a prop de z = 0 (p.ex. el pal de la porta) fa parallax. Cada moble és un `THREE.Group` amb `userData.section = '<id>'`; qualsevol mesh dins d'aquest grup és clicable. Els grups sense secció són decoració. `screenArt()` pinta a les pantalles el contingut real de la secció en l'idioma actiu (`paint(t, LINKS)` que retorna `buildRoom`, cridat des de `onLang`; el rellotge del mòbil cada minut). `painting()` dibuixa en un canvas el pòster de la pista de bàsquet sobre l'escriptori (il·luminat) i la vista de la terrassa (`view()`: cel, turons i teulades, sense llum, a z = -14); són decoració i fan servir `MeshBasicMaterial` sense `emissive`, per això `main.js` només desa `e0` de materials amb `emissive`.
- **`main.js`** — renderer, llums, raycasting (hover + tooltip, només amb ratolí) i càmera de **vista lateral**: mira la paret del fons i només es desplaça en x. `STOPS[id]` és la x de cada parada; comença a `START` (l'ordinador). Roda/trackpad, arrossegar i fletxes mouen la càmera; en parar, `snap()` va a la següent parada en la direcció del moviment (no a la més propera, si no la roda lenta s'encalla). El punter inclina lleugerament la càmera per donar profunditat. `ui.active(id)` marca al menú la parada actual. `setViewOffset` desplaça la vista perquè l'objecte quedi visible al costat del panell (440px a la dreta en escriptori, 78vh a sota en mòbil). Respecta `prefers-reduced-motion`. Si WebGL falla, afegeix `body.no3d` i només funciona el menú + panells.
- **`ui.js`** — menú, selector d'idioma (a la targeta del nom, `.intro`, amb els botons ràpids `CV` i `Contacte` per als recruiters: sempre visibles fora dels panells) i `<dialog id="panel">`. L'armari llista les etapes com a botons (`.stages`), perquè les peces de roba no tenen etiqueta i al mòbil no hi ha hover. `main.js` mostra `.loading` amb el progrés de `THREE.DefaultLoadingManager` fins que tots els `.glb` han carregat. Renderitza cada secció des del JSON de contingut; `cv` i `contact` tenen extres fixos al codi (botó de descàrrega i vista prèvia de la primera pàgina, `public/cv/preview.jpg`, que cal regenerar amb `pdftoppm -jpeg -r 90 -f 1 -l 1 -singlefile` quan canviï el PDF; `LINKS`, que també inclou el CV). Excepció: `experience` no obre el panell (excepte sense WebGL); l'armari s'obre amb zoom (`ZOOM`/portes a `main.js`) i cada peça de roba amb `userData.item = <índex a items>` mostra un tooltip en hover i una carta (`.popcard`) en clicar. `skills` tampoc obre panell (excepte sense WebGL) i el seu grup no té `userData.section` (el banc és decoració): el menú hi porta la càmera i mostra la mateixa targeta `.closet` que l'armari, amb un botó per bonsai (accés per teclat i tàctil; `fillStages()` serveix tots dos, segons `current`), i cada bonsai (`public/models/bonsais.glb`) amb `userData.skill = <índex a items>` és clicable directament, sense mode d'enfocament, i obre una carta centrada (`<dialog class="specimen">`) amb el render de l'arbre (`public/bonsais/*.webp`, fets a Blender; ordre a `IMG` a `ui.js`); en vertical la terrassa té parades extra (`PORTRAIT` a `main.js`) perquè el banc no hi cap. `makes` (impressions 3D) tampoc: les lleixes són a la paret sobre la impressora i comparteixen la parada de `cv` (`STOPS`); el menú hi porta la càmera i obre la carta de la primera impressió, i cada figura amb `userData.print = <índex a items>` obre la mateixa carta `.specimen` que els bonsais (`showCard('makes', i)`; imatges a `public/prints/*.webp`, renderitzades des del seu `.glb`; ordre a `IMG` a `ui.js`). No inventar impressions: només les que l'usuari confirmi. `about`, `projects` i `contact` (`SCREENS` a `ui.js`) tampoc: són els dos monitors i el mòbil de l'escriptori; `main.js` fa entrar la càmera dins la pantalla seguint-ne la normal (`dive`, les malles que retornen `monitor()`/`phone()` a `room.js`) i el contingut es renderitza a `.screen`, un overlay HTML posat i escalat sobre la pantalla 3D (a pantalla completa en mòbil). Idioma: `localStorage('lang')` → `navigator.language` → `en`.

### Afegir o canviar una secció

Cal tocar-ho tot de forma coherent:
1. `SECTIONS` a `src/ui.js` (ordre del menú).
2. Un grup amb `userData.section` a `src/room.js`.
3. Una entrada a `STOPS` a `src/main.js` (x de la parada; `SECTIONS` ha de seguir el mateix ordre esquerra→dreta).
4. `sections.<id>` als **tres** fitxers `content/{en,ca,es}.json`.

### Contingut (`content/*.json`)

Tot el text visible viu aquí; els tres idiomes han de tenir les mateixes claus. Estructura: `ui` (textos fixos, aplicats via `data-i18n` a `index.html`) i `sections.<id>` amb `menu`, `title` i opcionalment `body` (paràgrafs), `items` (targetes amb `title`/`meta`/`body`/`tags`) i `groups` (`name` + `items` com a chips). El renderitzador només entén aquests camps.

El PDF del CV és a `public/cv/Marti_Cotonat_CV_EN.pdf` (només en anglès); la ruta es construeix amb `import.meta.env.BASE_URL`.

## Convencions

- Codi mínim: comentaris `// ponytail:` marquen simplificacions deliberades. Sense dependències noves llevat de necessitat real (només `three`).
- Colors de l'escena com a literals hex a `room.js`; colors d'interfície com a variables CSS a `:root` de `src/style.css`. Paleta: tinta de noguera, terracota (`--accent`, el del filament PLA) com a únic accent, superfícies gairebé blanques (`--surface`) i la paret del fons blau pissarra a `room.js`; els colors de `screenArt` repliquen els tokens. Tipografia: Young Serif (noms i títols, i el rètol dels bonsais) + Atkinson Hyperlegible Next 400/700 (la resta), via Google Fonts a `index.html`; el text dibuixat en canvas a `room.js` (`SERIF`/`SANS`) espera `FONTS` per redibuixar-se amb les mateixes fonts.
- Minijoc de bàsquet (easter egg només d'escriptori: en vertical la cistella queda tapada): amb l'armari obert, clicar la cistella (`userData.hoop`, a la porta dreta) obre `<dialog class="game">` (`ui.startGame`). `src/hoop.js` és un canvas 2D independent de Three.js: la mitja pista del pòster vista de costat, mides FIBA reals en metres, mateixos colors. Es tira arrossegant cap enrere (tirador) o amb tres tocs d'Espai/Enter; 2 punts, o 3 des de darrere la línia de triple; rondes de 30 s i rècord a `localStorage('hoopBest')`.
