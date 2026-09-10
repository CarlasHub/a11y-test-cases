# CarlasHub accessibility test case manager

[![Quality checks](https://github.com/CarlasHub/a11y-test-cases/actions/workflows/quality.yml/badge.svg)](https://github.com/CarlasHub/a11y-test-cases/actions/workflows/quality.yml)
[![GitHub Pages](https://github.com/CarlasHub/a11y-test-cases/actions/workflows/pages.yml/badge.svg)](https://github.com/CarlasHub/a11y-test-cases/actions/workflows/pages.yml)

> **Work in progress:** This project is actively being developed. Test coverage, wording, data formats and reporting may change, so review exported results before sharing or relying on them.

Use the manager to select, organise and run accessibility test cases for websites and web applications.

**[Open the CarlasHub accessibility test case manager](https://carlashub.github.io/a11y-test-cases/)**

## Video tutorial

**[Watch the faster step-by-step tutorial (11 minutes, 12 seconds)](tutorial-video/carlashub-accessibility-test-case-manager-tutorial-faster.mp4)**

The tutorial demonstrates the complete workflow: setting up an evaluation, choosing tests, running five checks against Buggyland, recording results and evidence, reviewing coverage, and exporting CSV, HTML and JSON reports. Captions, a visible cursor and keyboard-focus indicators are included.

**[Read the accessible tutorial transcript](tutorial-video/carlashub-accessibility-test-case-manager-tutorial-transcript.md)**

## What this repository provides

- 14 detailed procedures for common web components.
- 17 task-based WCAG test groups.
- A criterion-level manual check for all 55 active WCAG 2.2 Level A and Level AA success criteria.
- 165 structured manual steps, each with an action, expected result and evidence instruction.
- Search, type filters and colour-coded theme filters.
- A browser-saved, coverage-aware test plan with a guided runner, result fields and direct links to each test.
- A spreadsheet-ready UTF-8 CSV export and import for continuing a test run in another browser or opening results in Excel, Numbers or Google Sheets.
- WCAG-EM-inspired scope, sampling and review fields, plus readable, responsive HTML finding cards and structured JSON evaluation reports.
- Reusable scope, result, issue and summary templates.

Level AAA success criteria and obsolete SC 4.1.1 are outside the result set.

## How to use the manager

1. Open the [published manager](https://carlashub.github.io/a11y-test-cases/).
2. Agree the pages, components, states, languages, environments and complete user journeys in scope.
3. Complete the essential fields in **Set up this test run** so results identify the target, state and environment. Open the scope and sampling groups when preparing a formal evaluation.
4. Search or filter the catalogue for components present in the test target.
5. Add the relevant component procedures and WCAG groups to **My test plan**, then review its criterion coverage.
6. Choose **Start testing** and follow each selected procedure's numbered steps in order.
7. Record an actual result, evidence and a separate outcome for every applicable WCAG success criterion.
8. Export the spreadsheet-ready working CSV to continue the run in another browser, open it in a spreadsheet app, or use **Import working CSV** to restore it.
9. Open **Review and report** to check gaps, then export a readable HTML report or the complete structured JSON data.

Read [Start here](START-HERE.md) before beginning a formal test run. Use [Choose pages and journeys](01-test-setup/choose-pages-and-journeys.md) to define the sample and [Test environments](01-test-setup/test-environments.md) to record reproducible browser, device and assistive-technology coverage.

## Result model

Execution status and WCAG outcome are deliberately separate.

| Type | Values | Meaning |
| --- | --- | --- |
| Execution status | Not started, In progress, Blocked, Needs specialist review, Completed | Describes the progress of the test. |
| Criterion outcome | Pass, Fail, Not applicable | Records the decision after all required testing for the defined sample is complete. |

Do not assign a completed criterion outcome while testing is unfinished or waiting for specialist review. See [Result definitions](05-reference/result-definitions.md) and use the [working results CSV template](04-templates/test-results.csv).

## Accessibility and assessment boundary

The manager supports structured evaluation. It does not certify a website, provide legal advice or prove that untested content conforms to WCAG. Automated tools cover only some accessibility requirements.

Use evidence-based language such as “no failure was found in the tested sample”. Do not state that an entire website conforms unless the full WCAG conformance requirements, complete processes and required environments have been evaluated by appropriately skilled reviewers.

WCAG 2.2 is the normative source. W3C Understanding documents, How to Meet WCAG, Techniques and the WAI-ARIA Authoring Practices Guide are supporting guidance; they do not add success-criterion requirements.

## Repository structure

| Path | Purpose |
| --- | --- |
| `content/component-procedures.json` | Canonical component procedures. |
| `content/test-cases.json` | WCAG groups, coverage and criterion result guidance. |
| `content/criterion-manual-checks.json` | Criterion-level procedures and structured steps. |
| `index.html` | Generated single-page manager. Do not edit it directly. |
| `assets/` | Interface styles, scripts and icon. |
| `01-test-setup/` | Scope, environments, tools and result recording. |
| `03-example-test-journeys/` | Generic complete-process examples. |
| `04-templates/` | Scope, result, issue and summary templates. |
| `05-reference/` | WCAG coverage, terminology, sources and escalation guidance. |
| `scripts/` | Build, validation and browser-check scripts. |
| `test/` | Content, coverage, link and generated-output tests. |

## Run locally

```sh
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/`.

## Make a content change

1. Edit the relevant canonical JSON file under `content/`.
2. Keep every action, expected result and evidence instruction direct and observable.
3. Keep normative WCAG requirements separate from guidance and preferred techniques.
4. Rebuild `index.html`.
5. Run all validation commands.
6. Update tests and documentation when behaviour, wording, commands or structure change.

Do not edit `index.html` directly because it is generated from the canonical content.

## Build and verify

Install the pinned development dependency:

```sh
npm ci
```

Run the required checks:

```sh
npm run build
npm run validate
npm test
npm run check:build
node --check assets/app.js
node --check scripts/browser_smoke.mjs
```

The browser smoke test needs a local server and Chromium remote-debugging endpoint:

```sh
npm run test:browser -- --url http://127.0.0.1:4173 --cdp http://127.0.0.1:9222
```

The browser test checks desktop and mobile layout, keyboard behaviour, the test picker, coverage-aware planning, undo, the guided runner, saved results, same-hash disclosures, step tabs, horizontal overflow, the browser accessibility tree and automated axe rules. It does not replace manual keyboard testing or testing with a real screen reader.

## Publishing

Pushes to `main` run the quality workflow and publish the generated static manager through GitHub Pages. The Pages artifact contains only the generated page, required assets and downloadable results template.

## Authoritative sources

- [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- [How to Meet WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)
- [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
- [Techniques for WCAG 2.2](https://www.w3.org/WAI/WCAG22/Techniques/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG-EM 2.0](https://www.w3.org/TR/wcag-em-2/)
- [Selecting Web Accessibility Evaluation Tools](https://www.w3.org/WAI/test-evaluate/tools/selecting/)

## Contributing

For improvements, corrections or new test cases, [open an issue in the CarlasHub repository](https://github.com/CarlasHub/a11y-test-cases/issues).
