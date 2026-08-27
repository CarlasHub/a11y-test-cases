# Using automated tools

Automated tools are a preliminary check. They cannot determine whether a website is accessible or whether every WCAG success criterion passes.

## What to use

Use team-approved tools that support the current WCAG 2.2 rules relevant to the project. The minimum tool capability should include:

- automated page checks;
- accessibility-tree or computed-name inspection;
- colour-contrast measurement;
- heading and landmark inspection;
- CSS-pixel target measurement;
- text-spacing application;
- objective flash analysis when flashing is suspected.

Tool availability and rule coverage change. Record the exact tool name and version in every test run.

## Automated pre-check

For every sampled page and material state:

1. Load the intended state completely.
2. Run the approved automated checker.
3. Save or reference the report.
4. Reproduce each reported issue on the page.
5. Remove false positives only with a recorded reason.
6. Route confirmed issues to the matching manual test case and success criterion.
7. Continue every applicable manual test even if the automated report is empty.

## What automated output proves

An automated failure can identify a reproducible issue after human confirmation. An automated pass proves only that the tool found no failure within its implemented rules and the tested DOM state.

Automated results do not by themselves prove:

- useful alternative text;
- logical reading or focus order;
- complete keyboard operation;
- caption or audio-description quality;
- understandable instructions and errors;
- screen-reader usability;
- complete journey accessibility;
- site-wide WCAG conformance.
