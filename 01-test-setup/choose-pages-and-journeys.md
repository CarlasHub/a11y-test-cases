# Choose pages and journeys

A test sample must represent the website. A large number of similar pages does not compensate for missing a unique template, shared component or critical user journey.

## 1. Record the scope

Record:

- website and release or deployment identifier;
- test goal and WCAG 2.2 Level AA target;
- included and excluded domains;
- supported languages;
- public, signed-in and role-dependent areas;
- external platforms used during a complete process;
- known limitations and owner-approved exclusions.

Do not silently exclude an external step. Record the handoff and who owns the destination.

## 2. Inventory the website

Include every page and component type you know about before selecting the sample.

Typical pages:

- homepage;
- search results;
- item detail;
- category, location and topic landing pages;
- saved items;
- registration or subscription form;
- sign-in and profile;
- multi-step process and confirmation;
- informational content;
- accessibility, privacy and legal pages;
- sitemap and error pages;
- each supported language or materially different locale.

Typical shared components:

- header, footer, primary navigation and mobile menu;
- language picker;
- keyword and autocomplete search;
- filters, sorting, pagination and result counts;
- content cards and save, share or continue controls;
- cookie notice and settings;
- modal dialogs, accordions, tabs and tooltips;
- carousels, maps, audio and video;
- forms, errors, loading, empty and success messages.

## 3. Select the sample

Always include:

- every unique page template;
- every shared component;
- every critical journey from start to success;
- content known to be high risk or historically defective;
- one representative page per supported language;
- desktop and mobile responsive states;
- default, opened, loading, empty, error, interruption, recovery and success states where available.

Add a small random selection only after the structured sample is complete.

## 4. Define complete journeys

At minimum, include:

1. Search by keyword, change filters, open a result and continue to the next step.
2. Save and remove an item.
3. Submit a registration or subscription form after first triggering validation errors.
4. Change language and return to the equivalent content where available.
5. Open and change cookie settings.
6. Complete sign-in or authentication if it is within scope.

## 5. Freeze the sample

Use `04-templates/page-sample.csv`. Give each page, component and journey a stable ID. Record the date, state, language and reason for selection.

If the sample changes, record what changed, why it changed and whether earlier results remain comparable. Never replace a failed target silently.
