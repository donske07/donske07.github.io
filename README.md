# Don Le's portfolio

This repository contains editable HTML and shared CSS for a static portfolio. There is no frontend runtime, CMS or live AI demo. Native links and browser Print work without JavaScript. Development dependencies package and test the site; they aren't shipped to visitors.

## Source layout

- `index.html`: introduction, current role and four selected projects.
- `projects/{agent-workforce,local-rag,personal-assistant,recommender}/index.html`: four project stories, in homepage display order; Agent Workforce and Local-first RAG include public source links.
- `cv/index.html`: printable HTML profile, not a PDF download. Use your browser's Print command to save a copy.
- `404.html`: custom error document for retired and unknown routes, not an indexable page.
- `assets/css/{tokens,site,print}.css`: shared design tokens, layout and print rules. See `DESIGN.md` before changing presentation.
- `assets/img/agent-workforce-{office,terminal}.png`: source Office screenshot and command-menu capture used by the Agent Workforce story.
- `covers/herophoto.png`, local SVGs, `CNAME`, `.nojekyll`, `robots.txt` and `sitemap.xml`: public assets and hosting metadata.
- `scripts/` and `tests/`: development tooling only. `dist/` is generated, never the editing source.

## Local setup and checks

Use Node 22 LTS-compatible tooling and npm from this repository, not a parent workspace. Install from the checked-in lockfile. Browser installation needs network access and may need administrator permission for system dependencies. Chrome stable is required separately for real-Chrome Lighthouse audits; a headless-shell substitute or a skipped browser isn't a passing audit.

```sh
npm ci
npx playwright install --with-deps
npx playwright install chrome
export EVIDENCE_DIR="$PWD/.omo/evidence/recruiter-ai-portfolio/local-checks"
npm run verify
```

`verify` runs build, unit tests, site checks, browser tests and audits in that order. It stops nonzero on failure. Missing browsers, missing audit prerequisites and failing scores are blockers, not successes. The integration owner must confirm fresh results against the final source before reporting acceptance; this README isn't a receipt that these commands passed.

For individual checks:

```sh
npm run build
npm test
npm run check:site
npm run test:e2e
npm run audit
```

The audit gate requires three measurements per mobile/desktop preset on each of the six indexable routes, with category medians of 100 for performance, accessibility, best practices and SEO. The noindex error document is excluded from the SEO score gate, not from functional or accessibility review.

To inspect the built artifact locally:

```sh
npm run build
npm run check:site
npm run preview -- --port 4173
```

Open `http://127.0.0.1:4173`. Preview binds to loopback and serves true custom 404 responses, including nested unknown URLs. Stop it with Ctrl+C before `npm run verify`: browser tests own port 4173 and must not reuse a stale server. Rebuild after editing source. Check navigation, keyboard focus, narrow layouts, no-JS reading, print output and missing-asset text fallback; a screenshot alone doesn't prove these work.

Keep detailed reports, screenshots and traces under private `EVIDENCE_DIR`. Don't stage or upload `.omo/`, research, claim ledgers, credentials, test reports or local session data. Review the dirty worktree before editing or staging; preserve unrelated changes and stage only explicitly reviewed files.

## Content and portrait preservation

Keep portfolio positioning separate from the supplied current employer title. Only supported title/company and high-level data-platform claims belong in employer copy. Don't add chronology, personal impact numbers, adoption, production outcomes, private repository names, internal architecture or unsupported credentials.

Project descriptions are bounded descriptions. The personal assistant is not production-ready; don't imply enabled retrieval, tools, uploads, cloud acceptance or verified billing. Local embeddings don't establish end-to-end privacy for RAG. The recommender's evaluation methodology isn't an achieved score, and optional MMR isn't established as part of serving. Agent Workforce and Local-first RAG have supplied public repositories at `https://github.com/donske07/agent-workforce` and `https://github.com/donske07/opencode-rag-plugin`; don't imply adoption, production usage or impact metrics, and don't invent source/demo links for the other projects. Existing email and GitHub contacts are inherited, not newly verified.

Preserve `covers/herophoto.png` byte-for-byte: 246x263 pixels, 102066 bytes, SHA-256 `5f476b810f513cd73089ee7aaf5439791de1b0ca918ee2b591ad8e82804cf8b7`. Keep alt text `Portrait of Don Le`, natural aspect ratio, 112px mobile/160px desktop display widths and no enlargement beyond intrinsic width. No crop, conversion, retouch or generated replacement.

Keep `CNAME` exactly `www.donske.com.au` followed by one newline. Canonical origin is `https://www.donske.com.au`. Maintain six indexable routes: `/`, `/projects/agent-workforce/`, `/projects/local-rag/`, `/projects/personal-assistant/`, `/projects/recommender/`, `/cv/`. Retired blog/tag/article paths must remain real 404s, not home redirects. The error document stays noindex with no canonical.

## Allowlisted build and CI

`scripts/publish-files.json` enumerates exactly 19 files. Build cleans `dist/` and copies only those approved files, including the unchanged portrait/CNAME and empty `.nojekyll`. The site checker independently enforces the expected public boundary, links and metadata. If an authorized change needs another public file, review its contents and update the manifest, independent checker expectations and related tests together. Never replace the allowlist with a recursive repository upload.

`.github/workflows/portfolio-check.yml` runs on pull requests and manual dispatch. It uses `contents: read`, doesn't persist checkout credentials, installs locked dependencies and browsers, requires Chrome stable, then runs `npm run verify`. Only successful verification reaches `actions/upload-artifact`, which uploads `dist/` as an ordinary review artifact. Artifacts expire after 14 days and aren't a deployment or permanent rollback archive.

## Publishing

GitHub Pages must remain configured to use GitHub Actions, not branch-root publishing. `.github/workflows/deploy-pages.yml` runs for pushes to `master` or manual dispatch. Its verification job rebuilds and tests the site before `actions/upload-pages-artifact` packages only `dist/`; the deploy job then publishes that verified Pages artifact with the minimum `pages: write` and `id-token: write` permissions. Repository docs, scripts, tests and private evidence aren't uploaded.

The custom domain remains `www.donske.com.au`, HTTPS enforcement remains enabled and DNS isn't managed from this repository. Preserve the prior approved artifact and source revision before promotion. For rollback, redeploy a verified prior artifact through the same Pages workflow; don't switch back to branch-root publication, reset unrelated source changes or silently alter DNS.

### Hosted checks

After an authorized deployment, verify HTTPS and the custom domain; HTTP 200 on every indexable route; correct canonical/OG host `https://www.donske.com.au`; CSS/image loading on root and nested pages; and real HTTP 404 with readable recovery links for all inventoried retired aliases and arbitrary nested unknown URLs. Check browser navigation, no-JS reading, contacts without sending mail, print output and stale cache behavior on the actual host. An API build status or local `dist/` alone doesn't establish any of these outcomes.
