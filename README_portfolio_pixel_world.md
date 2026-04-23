# Pixel-World Portfolio Website

A recruiter-friendly portfolio website with an optional pixel-art interactive world.

## 1. Project Overview

This project is a personal portfolio website built as a standard web app with an optional game-like exploration mode.

The site has two equally important goals:

1. Let recruiters access key portfolio content immediately.
2. Give visitors a small, memorable, interactive world that reflects my personality and creative style.

The experience is inspired by cozy pixel-art games, but it is **not** a full game. It is a portfolio-first website with a lightweight interactive layer.

## 2. Core Product Goals

The site should be:

- **Personal**: feels specific to me, not like a generic portfolio template.
- **Creative**: pixel-art aesthetic, playful interaction, game-inspired UI.
- **Recruiter-friendly**: fast access to projects, resume, skills, and contact info.
- **Modular**: projects and creative works should be easy to add through JSON.
- **Responsive**: works on both laptop and mobile.
- **Incrementally buildable**: can start with colored blocks and placeholder art, then swap in final pixel art later.

## 3. User Experience Summary

There are two main paths through the site.

### Path A: Direct navigation
From the landing page, users can immediately go to:

- About Me
- Skills / Education
- Technical Projects
- Creative Works
- Contact / Resume

This is the fast path for recruiters.

### Path B: Interactive world
From the landing page, users can click **Join the World** and enter a small pixel-art environment.

The world is intentionally compact and easy to navigate.

## 4. Main Site Structure

### Routes

- `/` — Start screen / main menu
- `/world` — Interactive outside + inside world
- `/about` — About Me
- `/skills-education` — Education + skills
- `/projects` — Technical projects
- `/creative` — Creative works
- `/contact` — Contact + resume
- `/projects/[slug]` — Individual project detail page
- `/creative/[slug]` — Individual creative work detail page

## 5. Start Screen Specification

The homepage should look like a cozy pixel-game title screen.

### Primary CTA
- **Join the World**

### Direct shortcut buttons
- About Me
- Skills / Education
- Technical Projects
- Creative Works
- Contact / Resume

### Start screen goals
- Establish the visual identity immediately.
- Make the game-inspired concept obvious.
- Keep direct portfolio access equally obvious.

### Notes
- The shortcut buttons should not be hidden.
- The site should never force gameplay to access important information.
- There can be optional extras later, like a music toggle or settings icon.

## 6. Interactive World Specification

The interactive world consists of **two scenes**:

1. Outside scene
2. Inside house scene

The world should be small, readable, and fast to explore.

## 7. Outside Scene Specification

### Required layout
- House in center/right
- Signpost near entrance
- Mailbox near path/front area
- Path leading to the door

### Required interactions
- **Signpost** → About Me + Education/Skills
- **Mailbox** → Contact / Resume
- **Path / door** → Enter house

### Design intent
The outside scene should feel like a welcoming mini-home base, not a large explorable map.

## 8. Inside Scene Specification

### Required layout
- Desk/computer
- Easel
- Door back outside

### Required interactions
- **Desk / computer** → Projects
- **Easel** → Creative Works
- **Door** → Return outside

### Design intent
The interior should feel like a small personal workspace. It should not be maze-like or require excessive exploration.

## 9. Interaction Model

### Desktop controls
- WASD movement
- Arrow key movement
- Optional click-to-move
- Optional interaction key when near objects

### Mobile controls
- Tap-to-move preferred
- Tap hotspot directly to interact
- Optional drag movement only if it feels smooth and reliable

### Global controls
- Menu / quick navigation button
- Back to start screen button
- Zoom in / zoom out buttons (`+` and `-`)

## 10. Navigation and Accessibility Rules

### Rules
- A user should be able to reach any major section in one direct click from the homepage.
- A user in the interactive world should reach a main section in under 10 seconds.
- Important objects must look interactive.
- The site must remain usable even if the interactive world is skipped.

### Object affordances
Interactive objects can later use:
- subtle hover outlines
- labels
- small animation
- interaction prompts

## 11. Visual Implementation Strategy

### Recommended world implementation
Instead of a full tile-based system, use:

- one large outside scene image
- one large inside scene image
- a separate player sprite
- invisible collision zones
- invisible hotspot zones

This is the recommended implementation because the world is small and highly curated.

### Why this approach is preferred
- Easier to art direct
- Faster to build
- Easier to replace placeholders with final pixel art later
- Better for a small fixed scene
- Easier to manage in a standard web app

## 12. Placeholder-First Development Strategy

The project should begin with **colored blocks and simple rectangles** before final art is created.

### Phase 1 placeholder visuals
Use:
- plain colored rectangles for buildings and props
- labeled boxes for hotspots
- basic circle or square for player
- simple room/background blocks

### Why start this way
This lets movement, collisions, hotspots, routing, responsiveness, and data structures be solved before investing time in art.

### Art replacement strategy
Later, placeholder blocks should be easily swappable for:
- outside background art
- inside background art
- signpost sprite
- mailbox sprite
- desk/computer sprite
- easel sprite
- character sprite sheet

## 13. Collision System Specification

The world should use invisible blocked areas to control movement.

### Recommended implementation
Use **collision rectangles** stored in data.

### Purpose
Prevent the player from:
- walking on top of the house
- walking through walls
- walking through furniture
- leaving the intended scene bounds

### Why rectangle collision is best initially
- Simple to implement
- Easy to debug
- Easy to edit later
- Good enough for this project scope

A more complex collision mask image can be considered later if needed, but it should not be the starting approach.

## 14. Hotspot System Specification

Interactive objects should be represented by hotspot regions.

### Required hotspots
#### Outside
- signpost hotspot
- mailbox hotspot
- door hotspot

#### Inside
- desk/computer hotspot
- easel hotspot
- exit door hotspot

### Hotspot behavior
When activated, a hotspot should either:
- open a preview panel/modal, or
- navigate directly to the relevant route

### Recommended behavior
Use a small preview overlay with a button like:
- View Full Page
- Open Projects
- Open Resume

This keeps the world feeling interactive while still supporting clear page transitions.

## 15. About / Skills / Education Page Specification

This page should use a **profile / inventory-inspired layout**.

### Concept
It should feel inspired by a Stardew-style profile panel, but adapted for readability and portfolio content.

### Recommended layout
#### Left side
- Character portrait / avatar
- Name
- Short descriptor or title

#### Right side
Structured information like:
- Education History
- Technical Skills
- Tools / Frameworks
- Relevant Coursework
- Interests / focus areas

### Design note
This should be inspired by the game UI, but not copy it literally. The main goal is readability.

### Why this is a good choice
This format works well for structured personal information and fits the theme better than a standard plain text bio page.

## 16. Projects Page Specification

This is a recruiter-priority page and should be cleaner than the in-world UI.

### Layout
- Featured projects section
- Grid of project cards
- Optional filtering later

### Each project card should include
- Title
- Thumbnail
- Short description
- Tech stack
- External links

### Supported links
Projects should support linking out to:
- GitHub
- Live demo
- Personal site
- Case study page
- Other external pages if relevant

### Individual project page
Each project detail page should support:
- Full overview
- What it does
- Why it matters
- Tech stack
- Screenshots
- External links

## 17. Creative Works Page Specification

This page should feel more like a gallery.

### Layout
- Grid of thumbnails
- Title
- Medium
- Year
- Optional description

### Individual creative page
Each creative work detail page can include:
- larger images
- description
- medium / year / context

## 18. Contact / Resume Specification

This page or modal should provide fast access to recruiter-relevant actions.

### Required content
- Email
- LinkedIn
- GitHub
- Resume download or view link

### UX goal
This should be one of the fastest sections to access, especially from the mailbox hotspot.

## 19. Technical Stack Recommendation

### Recommended stack
- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** for transitions
- JSON content files for structured data

### Why this stack
- Easy routing
- Good performance
- Easy deployment
- Strong component system
- Simple to keep modular
- Works well with Codex-assisted implementation

## 20. Data-Driven Content Architecture

The content should be stored separately from the components.

### Goal
Adding a new project or creative work should require only a JSON update and optional image asset, not code changes to the page structure.

### Initial data files
- `about.json`
- `skillsEducation.json`
- `projects.json`
- `creative.json`
- `contact.json`
- `world.json`

## 21. Example Data Structure

### `projects.json`
Each project entry should support:
- `id`
- `slug`
- `title`
- `shortDescription`
- `longDescription`
- `tech`
- `thumbnail`
- `featured`
- `links.github`
- `links.demo`
- `links.website`
- `links.caseStudy`

### `creative.json`
Each creative entry should support:
- `id`
- `slug`
- `title`
- `medium`
- `year`
- `thumbnail`
- `images`
- `description`

### `world.json`
Should define:
- scene names
- background asset paths
- collision rectangles
- hotspot rectangles
- target routes
- labels

## 22. Suggested File Structure

```txt
src/
  app/
    page.tsx
    world/page.tsx
    about/page.tsx
    skills-education/page.tsx
    projects/page.tsx
    creative/page.tsx
    contact/page.tsx
    projects/[slug]/page.tsx
    creative/[slug]/page.tsx

  components/
    StartScreen.tsx
    WorldScene.tsx
    Player.tsx
    HotspotLayer.tsx
    CollisionDebug.tsx
    ZoomControls.tsx
    SectionPreviewModal.tsx
    ProfilePanel.tsx
    ProjectGrid.tsx
    CreativeGrid.tsx
    Navbar.tsx

  data/
    about.json
    skillsEducation.json
    projects.json
    creative.json
    contact.json
    world.json

  lib/
    content.ts
    movement.ts
    collisions.ts
    hotspots.ts

public/
  placeholders/
  art/
  sprites/
```

## 23. Scene System Design

The world should be scene-based.

### Scene 1: outside
Contains:
- full background image or placeholder layout
- player spawn point
- signpost hotspot
- mailbox hotspot
- door hotspot
- collision rectangles

### Scene 2: inside
Contains:
- full background image or placeholder layout
- player spawn point
- desk hotspot
- easel hotspot
- exit hotspot
- collision rectangles

## 24. Movement System Design

### First implementation
Movement can begin very simply.

#### Desktop
- keyboard movement by updating position state

#### Mobile
- tap destination and move toward that point

### Important rule
Movement should feel responsive, but does not need to simulate full game physics.

### Future enhancements
- sprite direction changes
- idle/walk animation
- better easing
- interaction prompt on proximity

## 25. Zoom System Design

### Required controls
- `+` button to zoom in
- `-` button to zoom out

### Behavior
- camera or scene scale changes in fixed steps
- zoom should preserve readability
- extreme zoom levels should be prevented

## 26. Page Layout Philosophy

### Themed shell, readable content
The site should use the pixel-art theme consistently, but the actual text content should remain readable.

### Recommended rule
Use pixel styling for:
- menus
- buttons
- icons
- panels
- decorative accents
- world scenes

Use cleaner readable typography for:
- project descriptions
- bio paragraphs
- detailed content sections

## 27. Development Phases

### Phase 1 — App scaffold
Build:
- Next.js app
- route structure
- JSON loader helpers
- placeholder pages

### Phase 2 — Direct portfolio pages
Build:
- About
- Skills / Education
- Projects
- Creative
- Contact
- Project detail pages
- Creative detail pages

### Phase 3 — Start screen
Build:
- pixel-style homepage
- Join the World button
- direct shortcut buttons

### Phase 4 — Placeholder world
Build world with:
- colored blocks
- placeholder house
- placeholder furniture
- placeholder collision boxes
- placeholder hotspots
- movement and routing

### Phase 5 — Art integration
Replace placeholder visuals with:
- final outside art
- final inside art
- sprite assets
- improved UI art

### Phase 6 — Polish
Add:
- hover states
- transitions
- labels/prompts
- refined mobile behavior
- accessibility improvements

## 28. Debugging and Build-Friendly Features

During development, it should be possible to optionally show:
- collision rectangles
- hotspot rectangles
- current player coordinates
- active scene name

These debug tools should be easy to toggle on/off.

## 29. Success Criteria

The project is successful if:

- users can access main content directly from the start screen
- the world is fun but small and easy to navigate
- collisions prevent awkward movement
- content updates are driven by JSON
- projects can link externally
- mobile and desktop both work well
- placeholder-to-final-art workflow is smooth
- the site feels personal without sacrificing usability

## 30. Immediate Next Steps

1. Scaffold the Next.js app.
2. Create direct pages for all major sections.
3. Set up JSON-driven project and creative content.
4. Build the placeholder start screen.
5. Build the outside and inside scenes using colored blocks.
6. Add movement, collision boxes, and hotspots.
7. Add the inventory-inspired About / Skills page.
8. Replace placeholders with final pixel art later.

## 31. Final Implementation Summary

This project should be built as a **portfolio-first web app** with an optional **small interactive pixel-art world**.

The best implementation approach is:
- standard React/Next architecture
- JSON-driven content
- scene-based world
- large background scenes rather than a full tile engine
- invisible collision rectangles
- placeholder blocks first, final art later

This keeps the project maintainable, visually strong, and realistic to build.
