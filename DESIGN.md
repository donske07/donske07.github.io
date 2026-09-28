# Don Le Portfolio Design Contract

## 1. Atmosphere & Identity

A quiet, warm-paper editorial portfolio: charcoal serif headings, readable sans-serif prose, fine rules and four numbered project rows. Its signature is the preserved portrait beside a factual introduction, followed by plainly labeled engineering work rather than a dashboard, decorative terminal or card grid. This is the approved replacement direction, not preservation of the legacy animated site or a new visual discovery exercise.

| Reader | Job and decision path | Contract for success |
| --- | --- | --- |
| Recruiter | Scan role, selected work, profile and contact | Name and positioning first; current employer title separate; four explicit project links; inherited contact links easy to find |
| Hiring manager | Understand mechanisms, trade-offs and limitations | Complete server-delivered case studies; readable diagrams; two concrete trade-offs and candid prototype status per story |
| Keyboard reader | Navigate without pointer or scripts | First-focus skip link, logical DOM order, visible focus and native links throughout |
| Mobile/enlarged-text reader | Read and contact at narrow widths | One-column fallback, wrapping navigation and text, no clipped labels or hidden content |

Identity: homepage H1 `Don Le`; adjacent positioning `Staff Engineer · Data Platforms & Applied AI`; separate current-role text `Staff Engineer / Tech Lead — Data Platform at mod.io`. The positioning is not an employer-title claim. Use plain, project-oriented language, not unsupported ownership, deployment, impact or availability claims.

Content order follows reader decisions: introduce identity (orient), selected engineering work (prove), current professional experience (context), concise about/contact (contact). Public source destinations are supplied for Agent Workforce and Local-first RAG; do not invent additional source/demo links. No invented history, dates, education, metrics, testimonials, proficiency bars, fake screenshots or replacement photography. Contact facts are inherited, not newly verified.

## 2. Color

Light-only palette; no dark-mode variant. All future CSS colors reference these tokens, including interactive states. Do not create lighter text with opacity.

| Token | Exact value | Role |
| --- | --- | --- |
| `--color-paper` | `#F7F6F3` | Page canvas |
| `--color-surface` | `#FFFFFF` | White schematic/quiet content surfaces; skip-link background |
| `--color-text` | `#202622` | Headings, body, active link feedback |
| `--color-secondary` | `#525A55` | Metadata, status, supporting text |
| `--color-accent` | `#245442` | Links and focus outlines only |
| `--color-rule` | `#D8DDD8` | Decorative structural separators only |

Computed WCAG sRGB contrast ratios (rounded for display; thresholds checked before rounding):

| Foreground | On paper | On white | Permitted use |
| --- | ---: | ---: | --- |
| Text | 14.2693:1 | 15.4212:1 | All text sizes |
| Secondary | 6.5815:1 | 7.1128:1 | All text sizes, including 14px metadata |
| Accent | 8.0235:1 | 8.6712:1 | All links and 3px focus indicator |
| Rule | 1.2739:1 | 1.3767:1 | Not text, meaningful graphics, control boundaries or focus |

Normal text must meet 4.5:1, large text 3:1, meaningful non-text indicators 3:1. Rules and paper/white differentiation convey no essential meaning: headings, list numbering and text establish structure without them. All labels remain understandable in monochrome. Status is text, not green success signaling. No extra success/warning/error palette is needed for this static content site; the error document uses ordinary headings and explanatory text.

## 3. Typography

| Token | Exact value | Use |
| --- | --- | --- |
| `--font-heading` | `Georgia, 'Times New Roman', serif` | H1-H4 |
| `--font-body` | `'Helvetica Neue', Arial, sans-serif` | Body, navigation, labels and links |
| `--text-display` | `clamp(2.5rem, 1.5rem + 4vw, 4rem)` | H1: 40-64px at a 16px root |
| `--text-h2` | `2rem` | 32px section heading |
| `--text-h3` | `1.5rem` | 24px project/subsection heading |
| `--text-h4` | `1.25rem` | 20px subheading when content warrants it |
| `--text-body` | `1rem` | 16px body; role and navigation |
| `--text-meta` | `0.875rem` | 14px metadata/status/caption minimum |
| `--leading-display` | `1.15` | Display |
| `--leading-heading` | `1.3` | H2-H4 |
| `--leading-body` | `1.6` | Body, links and metadata |
| `--weight-normal` / `--weight-strong` | `400` / `700` | Prose / headings and emphasis |
| `--tracking-normal` | `0` | All text; no tight tracking or uppercase micro-labels |

Use the browser's default root size (100%); never force a fixed root size or disable zoom. The px equivalents above are defaults, not maximum user text sizes. No remote fonts, downloaded font dependencies or new font libraries; do not reuse legacy font binaries. Native fallback rendering is intentional. No third monospace family is needed for textual schematics.

One H1 per page, followed by sequential semantic headings; appearance never determines heading rank. No line clamps, ellipses, fixed heading heights or title-length limits. Long headings may occupy more than four lines rather than reducing accessible type or losing content. Body/metadata wrap normally; pathological unbroken titles, emails, URLs and diagram labels use `overflow-wrap: anywhere` without changing underlying text or hrefs. Do not break ordinary words indiscriminately with `word-break: break-all`.

## 4. Spacing & Layout

All spacing intent uses a 4px base. Structural thickness and focus requirements are separate tokens, not spacing exceptions invented in components.

| Token | Value | Use |
| --- | --- | --- |
| `--space-1` | 4px | Focus offset, tight separation |
| `--space-2` | 8px | Metadata cluster gap; inline-link surrounding space |
| `--space-3` | 12px | Compact inner separation |
| `--space-4` | 16px | Prose rhythm, stacked content, interactive cluster gap |
| `--space-5` | 20px | Mobile page gutter |
| `--space-6` | 24px | Project-row vertical padding, diagram inset |
| `--space-8` | 32px | Intro columns and local section groups |
| `--space-10` | 40px | Desktop page gutter; print page margin |
| `--space-16` | 64px | Mobile major section gap |
| `--space-24` | 96px | Desktop major section gap |
| `--width-page` | 1120px | Maximum overall inner content width |
| `--width-prose` | 68ch | Maximum reading column width |
| `--width-intro-text-min` | 20rem | Minimum text track for side-by-side intro |
| `--portrait-mobile` / `--portrait-desktop` | 112px / 160px | Original-ratio portrait widths |
| `--target-min` | 44px | Minimum interactive target width and height |
| `--breakpoint-wide` | 48rem (768px at default root) | Wide layout eligible, not required |

Page container: centered, width no greater than viewport minus both gutters, maximum 1120px; content-box width excludes gutters. Prose is `min(100%, 68ch)` within that container. At default root, below 768px use 20px gutters, 64px section gaps and 112px portrait; from 768px use 40px gutters, 96px gaps and 160px portrait. The document owns scrolling: no app shell, nested scroll panels, sticky/fixed header or hide-on-scroll behavior.

Intro defaults to a stack in source order (text then portrait); at wide widths it may become a text/portrait pair with a 32px gap and a shrinkable text track. Keep the text track at least 20rem for side-by-side layout; otherwise stack, including under text enlargement. Portrait width remains the applicable token and never exceeds 246px or the available width. Project rows stack at narrow widths; wide rows may use number/content/action columns with 24px gaps and shrinkable tracks, falling back to a stack whenever content does not fit. Never reorder DOM for aesthetics.

Navigation is a wrapping cluster with 16px gaps and natural height; header identity and navigation also wrap/stack rather than compete for fixed width. Allow flex/grid children to shrink (`min-inline-size: 0`); cap diagrams/images/links to available width. No horizontal document scrolling, clipping, absolute-positioned titles, fixed heights or `overflow: hidden` masking defects.

At 320px the inner width is 280px; at 375px it is 335px; at 768px it is 688px; at 1280px it is 1120px. A 280px content column accommodates the 112px portrait and 44px controls without a second column. Layout uses intrinsic browser mechanics; these geometry checks are contract arithmetic, not evidence of rendered fit.

## 5. Components

Implement these as shared static HTML/CSS primitives, not runtime-generated components. All interactive primitives inherit Section 6; noninteractive primitives are not focusable and have no fake hover/loading/disabled states. Required content missing is an editorial/build failure, not a public placeholder. Optional content is omitted together with its wrapper, separator and empty spacing. Static pages have no asynchronous empty/loading/success UI.

| Primitive | Anatomy, variants and spacing | Keyboard and semantic behavior | Mobile/long content | Empty, optional or failure behavior |
| --- | --- | --- | --- | --- |
| Skip link | First anchor, `Skip to content`, points to unique `#main`; paper/white background, 12px/16px padding, 44px minimum target | First Tab exposes full link and forest focus outline; activation transfers focus to main (native fragment target with `tabindex=-1`); never a tab trap | Wraps within gutters; focused label/outline never clipped or obscured | Main/target is mandatory; absent target fails verification; without CSS it remains a normal visible first link |
| Header | Header landmark, home identity link then primary nav; 24px vertical padding, 16px group gap; ordinary document flow | Home identity has meaningful text; no positive tabindex or visual/DOM order mismatch | Identity/nav stack or wrap; auto height, no overlay | Identity/nav required; no empty logo slot, redundant decorative assets or async states |
| Navigation | Labeled nav with list of Work, Experience, Profile, Contact; 16px gap, targets padded to 44px | Native links to `/#work`, `/#experience`, `/cv/`, `/#contact`; homepage may use same-document fragments; current-page link uses `aria-current=page` only when accurate, not invented scroll tracking | Links always exposed, wrap at 320px; no hamburger, dropdown or scroll-dependent reveal | Required destinations must exist; no disabled placeholder item; no old blog/archive links |
| Intro | One page H1, role/summary, separate current role where relevant, native work/contact link cluster, optional portrait slot; 16px text rhythm, 32px wide gap | Text before portrait in reading order; CTAs use native fragment links; status not buried inside a tooltip | Stack below wide eligibility; long title and role wrap fully | Identity/current-role distinction is mandatory on home/profile; omit unused portrait slot on case studies rather than reserve a blank column |
| CV download | Native link labeled `Download CV (.docx)` to `/cv/Don_Le_CV.docx`, using the browser download behavior and the standard link target/focus treatment | Keyboard reachable in profile-intro reading order; the meaningful label identifies both the document and format; no scripted download or new tab | Wraps inside the profile intro without clipping or overlapping the print instruction | The supplied DOCX is required and byte-preserved; a missing or altered file fails build verification rather than leaving a dead link |
| Portrait | Unmodified `covers/herophoto.png`, intrinsic width 246 and height 263, exact alt `Portrait of Don Le`; 112px/160px display width, automatic height | Plain image, no link, hover or tab stop; alt identifies person if image unavailable | Natural 246:263 ratio; expected heights about 119.740px/171.057px; never crop, stretch, upscale beyond intrinsic width, filter, retouch or mask | Home portrait is required; load failure leaves alt and reserved intrinsic ratio, never a stock/generated substitute; asset absence fails acceptance |
| Project row | Ordered list of four rows; visible 01/02/03/04, H3 title, summary, textual status, native action link; 24px vertical padding, structural rule, no enclosing clickable card | Only actual anchors focusable; accessible CTA name includes the project title via accompanying accessible text; no nested links or new-tab surprise; numbering meaningful without CSS | Number/content/link stack; all title/status text wraps; no truncation or full-row hover movement | Four featured entries and action links required; every row links to its local case study; no `#`, empty href, disabled button or coming-soon text |
| Status label | Plain sentence-case metadata at 14px minimum, secondary color, 8px separation from adjacent metadata | Real text, not `role=status`, a control, color-only badge or live region | Wraps to natural height, including the assistant's two-part label | Required prototype label cannot be hidden/omitted; absent ancillary metadata removes its separator too |
| Prose and inline link | Article/section headings, paragraphs, lists; 68ch maximum, 16px prose gaps, 32px subsection gaps; link inherits body font | Actual anchors underlined and keyboard reachable; inline links receive nonoverlapping 44px minimum inline-block target boxes in line flow, not invisible overlapping hit areas; dense groups may be separate link lists | Shrink to available width; unbroken text wraps; target boxes increase line height naturally without covering adjacent text | Omit optional paragraphs/links and empty headings; summary/problem/approach/two trade-offs/limits remain required; malformed markup is escaped text, never executable author content |
| Textual flow | Labeled figure/section with caption and semantic ordered list, white surface, 24px inset, 16px step gaps; always stacked | Text supplies stage order and meaning without CSS/SVG; optional connectors decorative only, never focusable or sole source of meaning | Long stage labels wrap inside list; no fixed-width horizontal diagram, image-only schematic or pan/zoom | Required stages cannot silently disappear; absent optional annotation removes wrapper; no fake screenshot, progress indicator or inferred execution result |
| Project media | Full-width source screenshot with 1px rule, 4px radius and concise caption; explicit intrinsic dimensions reserve layout | Descriptive alt names the interface and visible state; caption explains why the image matters; image is never the only source of project detail | Scales to container width with automatic height and no horizontal pan; surrounding prose remains readable if the image fails | Only real source output or a capture generated from actual command output; no fabricated product screen, decorative mockup or unsupported result |
| Experience entry | Headed section with normal prose and the supported current role | The section does not invent an employer detail route or unsupported achievement link | One column, wrapping heading/body; same 16px rhythm | No empty dates/history fields, timeline scaffolding or unsupported achievements |
| Contact/footer | Footer/contact landmark with `#contact` on home, concise about text, email and GitHub link cluster; 16px rhythm and cluster gap, major section gap | Native `mailto:don.le@donske.com.au` and `https://github.com/donske07`; visible meaningful labels, default same-context navigation | Wraps at 320px; addresses break visually when needed without altering destination; targets 44px | Both inherited contacts required; no form, invented socials, availability or empty contact slots |
| Error/recovery | `/404.html`: shared shell, one clear unavailable-page H1, concise explanation, Home and Selected work anchors | Native `/` and `/#work` recovery; no forced redirect, timer, back-only control or search dependency | Single column with full wrapping labels and standard target/focus rules | Missing route is a genuine error, not empty home content; arbitrary URL text is not injected into markup; noindex, not an indexable case study |
| Print | Document-flow variant of shared prose/profile; white paper, primary text, 40px page margin, 16px section gaps; normal content, no fixed page heights | Browser Print command only; no script/button dependency; useful link destinations printed alongside descriptive text | A4 and US Letter; long printed URLs wrap; avoid breaking headings from following text and small rows where possible, but allow long blocks to fragment | Retain all substantive text, statuses, diagrams and contact URLs; omit navigation/skip decoration and absent optional content; never blank placeholder sections, clipped overflow or artificial trailing pages |

### Route and content composition

All routes share skip/header/nav/main/footer primitives and an English-language document with descriptive title. There are six indexable routes: home, four local project stories and the profile. Root-relative assets and navigation work from nested error URLs. Canonical origin is `https://www.donske.com.au`.

| Route | Required composition |
| --- | --- |
| `/` | Intro with portrait, exact name/positioning/current role; `#work` four numbered rows in order: Agent Workforce, Local-first RAG for coding agents, Personal AI assistant, Two-stage recommendation engine; every row uses `Read project` to reach its local story; `#experience` current role/high-level data-platform focus; concise about/contact footer |
| `/projects/agent-workforce/` | Summary + `Open-source Go tooling · Public v0.1.0`; coordination problem; two-command architecture, installation, generated MCP tools, nine specialist roles, lifecycle/diagnostic/JSON operations and localhost security boundary; real terminal-menu and Pixel Agent Office screenshots with captions; `Coordination flow`: CLI launch → Forge coordinator → generated MCP tool → focused specialist → synthesized result; two trade-offs (specialization/coordination and convenience/local state); scope plus the supplied public repository link |
| `/projects/local-rag/` | Summary + `Developer-tooling prototype`; problem; implemented approach; `Implementation overview`: sources → chunks → embeddings → vector index → retrieved context; two trade-offs (freshness/reindexing and chunk/retrieval); limits/current status plus the supplied public repository link |
| `/projects/personal-assistant/` | Summary + `Local prototype · In development`; explicit `This project is not production-ready.`; problem; approach; simplified conceptual overview: request → context selection → budget admission → model stream → execution state; two concrete trade-offs; limits/current status, with conceptual ordering not represented as guaranteed internal call order |
| `/projects/recommender/` | Summary + `ML prototype`; problem; approach over MovieLens; overview: rating history → user representation → candidate retrieval → feature-based ranking → recommendations; two trade-offs (retrieval recall/ranking and evaluation leakage/score-scale cautions); limits/current status; no unverified score, live recommendations or completed MMR claim |
| `/cv/` | `Professional profile` page label/title; name, positioning, exact current role, concise project summaries/statuses and inherited contacts; no inferred chronology/history; native `Download CV (.docx)` link to the supplied document plus instruction `Use your browser's Print command to save a copy.`; no PDF download fiction |
| `/404.html` | Shared error/recovery primitive and noindex; unknown/retired requests must return genuine HTTP 404, not catch-all home redirection; direct error-document route may return 200 |

Each local case study is approximately 300-650 words without padding. The Agent Workforce and Local-first RAG stories link to their supplied public GitHub repositories; no source/demo destination has been supplied for the Personal AI assistant or recommendation engine. Do not imply repository adoption, production usage or impact metrics. No employer architecture, private evidence or unverified results appear in schematics, prose, metadata or social art. Required favicon/social artwork is token-based text/monogram/vector treatment only, not fabricated project imagery. Omit unsupported SVG social-image metadata instead of adding a renderer dependency.

## 6. Motion & Interaction

Baseline is completely static: `--duration-none: 0ms`. No press transform is selected; the plan's optional 120ms feedback is unnecessary for native text links. `prefers-reduced-motion: reduce` explicitly retains zero-duration transitions/animations and automatic (not smooth) scrolling. No JavaScript, parallax, ambient animation, scroll reveal, stagger, loading shimmer, fake progress, hide-on-scroll or motion on noninteractive rows/images.

| Link state | Required feedback |
| --- | --- |
| Default/visited | Forest text and visible underline; visited links retain palette and contrast |
| Hover | Thicker underline, no layout shift, no card lift or hidden information |
| Active/pressed | Charcoal text plus thicker underline; no movement required |
| Keyboard focus | `--focus-width: 3px` solid forest outline with `--focus-offset: 4px`; underline retained; never clip/obscure outline or remove native fallback focus |
| Current page | Truthful `aria-current=page`, strong text and underline, not color alone |

Underline tokens: `--link-rule: 1px`, `--link-rule-emphasis: 2px`, `--link-offset: 4px`. Apply hover/active feedback instantly. Every interactive target is at least 44px by 44px and grows for wrapping text; targets and focus outlines must not overlap neighboring content. A focus outline extends 7px beyond its target (3px + 4px), so interactive clusters use 16px gaps, not the 8px metadata gap. Inline-link boxes reserve 8px surrounding space in normal line flow and subtract those margins from maximum available width; reserve the same clearance at container edges. Native Enter activation, Tab/Shift+Tab and browser back behavior remain intact. Do not invent disabled/loading controls, icon-only actions, hover-only descriptions or new-tab surprises. Main/section anchors must be unobscured after navigation. CSS or JS unavailability must not remove content or destinations.

## 7. Depth & Surface

Strategy: fine decorative borders plus paper/white tonal surfaces, with **no shadows**. `--rule-width: 1px`, `--radius-none: 0px`, `--radius-small: 4px`, `--radius-max: 8px`, `--shadow-none: none`. Project rows are squared (`--radius-none`), separated by rules, not large pill cards. Schematics may use `--radius-small`; nothing exceeds 8px. The portrait remains rectangular and unmasked with original pixels and natural ratio.

Hierarchy comes from serif/sans contrast, numbering, whitespace, indentation and real content, not gradients, texture overlays, glow, blur, ornamental illustrations, fake UI or emoji icons. Accent is reserved for interactions. A fine rule can disappear without losing information; if a future control requires a visible boundary, use the contrast-tested accent/text token rather than the pale rule and document the primitive first. No additional imagery, icon/font library or frontend runtime dependency is introduced.

## 8. Accessibility Constraints & Accepted Debt

Target WCAG 2.2 AA. Apply text contrast of at least 4.5:1 (large text 3:1), meaningful graphics/focus contrast of at least 3:1, 3px visible focus and 44px targets. Preserve semantic landmarks, accessible names, heading order and list order. Status and diagram meaning must survive CSS removal, monochrome and screen-reader linear reading. Respect forced colors/system focus colors; do not suppress user high-contrast adjustments. Focus visibility and reading order outrank surface polish.

### Required stress and verification states

| Condition | Required behavior and acceptance |
| --- | --- |
| 320px width | 280px inner column at default root; stacked intro/rows/flows, wrapping nav, portrait 112px; no horizontal document scroll or lost link/focus ring |
| 375/768/1280px | Same complete content/reading order; validate every primitive and all six routes, including focus/hover/active, with actual browser evidence |
| Long project title | Test a multi-sentence title; keep complete text and natural row height; CTA follows content instead of overlapping; more than four heading lines permitted |
| Unbroken/malformed content | Test a 160-character word/URL and literal `<script>` text; wrap within shrinkable tracks, escape markup and preserve actual safe destinations; invalid/empty/unsafe optional URLs are omitted, not made interactive; required invalid destinations fail checks |
| Missing optional link/content | Remove source/demo URL and optional annotation; no anchor, empty wrapper, separator, fake disabled state or reserved blank column remains; required project/status/contact content is not optional |
| 200% enlarged text/zoom | Root-relative type grows; controls, rows and header grow/reflow; no text shrink-to-fit, clipping, overlap or viewport zoom restriction; at equivalent 320 CSS px use narrow layout |
| Text spacing override | 1.5 line-height, 2em paragraph spacing, 0.12em letter spacing and 0.16em word spacing cause reflow, not clipped content or lost actions |
| Reduced motion | Zero duration and no smooth scrolling; exact same visible content and access; no waiting for observer/animation events |
| CSS/JS unavailable, portrait request interrupted | Native headings/lists/links/statuses remain complete; skip target works; image alt identifies portrait; no skeleton, blocked content or replacement image |
| Print A4/US Letter | Complete readable profile, statuses, diagrams and useful URLs; no clipping or artificial blank trailing page; long blocks may fragment |

Reference departures are intentional: locked system font stacks replace suggested remote fonts; 14px minimum replaces tiny uppercase status pills; 8px maximum replaces larger radii; full wrapping replaces four-line heading limits; static content replaces scroll/ambient effects; original portrait replaces suggested overlays/placeholders; numbered rows replace bento grids. These choices protect the approved brief, readability and truthful evidence.

Accepted debt: **None.** There are no unresolved design decisions, placeholder sections or accepted accessibility exceptions. Future deviations require an explicit contract update and user-accepted, located debt; omission from a report is not acceptance.

Verification boundary: this document specifies the future implementation; it does not certify a rendered UI. Task 5 must exercise actual shared styles in an unpublished primitive harness, including all applicable states and stress cases, before product pages. Later browser/axe/visual QA, no-JS walkthroughs and print checks must test real output; final Lane C critique follows objective visual evidence and feeds implementation review. Contract arithmetic, a mockup, a success string or a contrast table cannot substitute for those gates. No hosted or deployment success is implied.
