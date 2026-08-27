# Contributing

This is an internal QA test case manager. Changes must keep the guidance accurate, reproducible and understandable to testers who are new to accessibility.

## Editing test cases

1. Edit `content/test-cases.json` for grouped guidance and result rules, or `content/criterion-manual-checks.json` for criterion-level procedures.
2. Keep stable test-case IDs.
3. Give each criterion-level step one direct action, one observable expected result and one specific evidence instruction.
4. Keep WCAG requirements separate when a test case covers several success criteria.
5. Cite current official W3C material for normative requirements.
6. Do not add Level AAA requirements to the Level AA result set.
7. Do not convert advice, techniques or heuristics into conformance requirements.
8. Do not add confidential URLs, credentials, real user data, workstation paths or references to unrelated repositories.
9. Rebuild and run every verification command in `README.md`.

Every active WCAG 2.2 Level A and AA criterion must have exactly one criterion-level manual check with at least three structured steps. Do not add obsolete SC 4.1.1 to the result set.

Do not edit `index.html` directly. It is the single generated website page and is built from canonical content.

## Review requirements

Behavioural changes require:

- a WCAG mapping review;
- a plain-language QA review;
- a review of the manager interface with keyboard, zoom and a screen reader;
- updated validation tests when the content model changes.

Automated tests do not replace these reviews.
