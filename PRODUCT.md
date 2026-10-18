# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Recruiters / HR**, arriving from LinkedIn or an application with one or two minutes: do I fit the role, and how do I reach him.
- **Tech leads / CTOs**, reading more carefully: how he thinks, what he has actually built and fixed.

The usual path is a quick recruiter filter first and a technical read later, so the site has to work at both depths.

## Product Purpose

The personal portfolio of Martí Cotonat Cruset, a software developer from Girona (C#, VB.NET, .NET, SQL; full-time at Asartec; part-time Computer Engineering at UOC). It exists to land backend .NET/C# and AI & automation roles, remote or in Girona. It works when a visitor leaves knowing who he is, what he is good at, and how to contact him, with the CV a click away.

## Positioning

The one thing a visitor should remember: **a person with his own judgment and personality, not one more CV.** The room, the bonsai and the 3D prints carry this. The professional evidence (real problems solved, AI-assisted workflow) backs it up, but the site's job is to make him memorable as a person.

## Operating Context

- Visitors come from links in a CV, on LinkedIn or in applications, on desktop and on mobile.
- A two-page English CV (PDF) can be downloaded from the site.
- Static site on GitHub Pages, built with Vite; Three.js is already in the stack.

## Capabilities and Constraints

- Sections: About, Projects, Experience & education, Skills, 3D prints, CV, Contact.
- Three languages, CA / ES / EN, chosen by the visitor (saved locally; defaults to the browser language). All copy lives in `content/{ca,es,en}.json`.
- Must still work without WebGL: the full content stays reachable without 3D.
- User direction (2026-10-18, confirmed after the critique): **keep the 3D room** — a side-view walk past each object. An earlier idea of moving to a mostly 2D experience was dropped. The "reads very AI" problem is solved inside the 3D scene (real personal objects, one consistent panel language, no template typography), not by removing it.

## Brand Commitments

Confirmed by the user as non-negotiable, whatever the visual redesign:

- **The room metaphor:** each object in his room is a section (desk = projects, wardrobe = experience, shelves = 3D prints, printer = CV, phone = contact, poster/notebook = about).
- **Bonsai = skills:** the size of each tree is years of practice; the small sapling is what he is growing next.
- **Three languages:** CA / ES / EN.
- **The 3D prints section:** his own designed and printed figures.

## Evidence on Hand

- Real copy for every section in `content/*.json`: Asartec helpdesk (built alone, now the company-wide ticketing system), the load-time fix (10–20 s → under 1 s), the PRL desktop/API/.NET MAUI apps, the Claude Code automation work, the DAM final project (10/10).
- CV PDF: `public/cv/Marti_Cotonat_CV_EN.pdf` (English only).
- Contact: email, LinkedIn, GitHub (in `src/ui.js`).
- 3D prints: so far only **Totoro** (his print, on the shelf above the printer; model `public/models/totoro.glb`, card image `public/prints/totoro.webp` rendered from it). Printed at home on his Ender-3 V3 SE. Not claimed as his own design. **Open:** more prints and real photos; do not invent any.
- No testimonials, metrics or client logos beyond the content above. Do not fabricate any.

## Product Principles

1. **Personality first, proof second.** The site is memorable through his own world (room, bonsai, prints); the facts back it up rather than lead.
2. **Two depths.** A recruiter gets role, stack and contact in seconds; a tech lead can dig into the projects without hunting.
3. **His world, not a template.** Every motif comes from his actual life; nothing generic stands in for it.
4. **Content reachable without 3D:** the 3D is a layer on top, never the only way in.
