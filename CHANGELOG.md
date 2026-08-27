# Changelog

## Unreleased

- Replaced the README contact with the Director of Accessibility at Radancy and removed the repeated two-line page footer.
- Added automated GitHub Pages publishing for the generated manager and required download asset.
- Reworked the README with a live-site link, usage guide, result model, repository map, contributor workflow, assessment boundary and Radancy accessibility contact details.
- Reviewed all 55 Level A and Level AA criterion titles, levels and fragment identifiers against the official WCAG 2.2 specification and locked that metadata in validation.
- Corrected criterion guidance for prerecorded audio description, meaningful sequence, text spacing, page titles, headings and labels, label in name, target size, context changes, form safeguards and status messages.
- Separated completed criterion outcomes from unfinished execution statuses throughout the interface, templates and reference guidance.
- Removed unrelated service, commercial and sector-specific wording; renamed setup, journey and report files around a generic Radancy test-case workflow.
- Added clear source guidance that WCAG 2.2 is normative while Understanding documents, How to Meet WCAG, Techniques and ARIA Authoring Practices are informative.
- Reworked the homepage into a framed checklist workspace based on the supplied accessibility-checklist layout, using Radancy purple surfaces and the existing accessible theme palette.
- Added a responsive navigation sidebar with current-section indication, a persistent desktop test plan and semantic selection progress.
- Replaced the large two-column picker cards with compact test rows that provide clear add and direct **Open test** actions.
- Added a revision identifier to the generated CSS and JavaScript URLs so browsers do not retain the pre-redesign interface.
- Replaced long procedure step lists with progressive tabbed cards that show one action, expected result and evidence requirement at a time.
- Added Left Arrow, Right Arrow, Up Arrow, Down Arrow, Home and End keyboard behavior, previous/next links and a no-JavaScript all-cards fallback for every step deck.
- Added a searchable test picker covering all 14 component procedures and 17 WCAG test groups.
- Added accessible type and theme filter chips for structure, interaction, forms, visual layout, and media testing.
- Added a browser-saved test-plan form with individual selection, add-all-shown, clear and copy actions.
- Replaced the uninterrupted long page with focused disclosure panels while retaining all canonical procedures and result guidance in the generated page.
- Added direct-link disclosure opening, expand/collapse controls and responsive card layouts.
- Extended unit and browser smoke coverage for filtering, selection, disclosure behavior, theme mapping and theme contrast.

## 1.0.0 - 2026-08-06

- Created the internal Radancy accessibility test case manager.
- Added 17 task-based test cases covering all 55 WCAG 2.2 Level A and AA success criteria.
- Added generic user-journey checklists, test templates, evidence guidance, result definitions and escalation rules.
- Added an accessible static catalogue using Radancy colours.
- Added dependency-free build and validation tests.
- Set the local preview and browser-test port to `4173` to avoid conflicts with other internal services.
- Reworked the interface as a restrained, single-page reference index with direct links to all 55 success criteria.
- Added 14 detailed mainstream web-component procedures with expected behaviour, structured test steps, evidence requirements, common failures and specialist-review guidance.
- Reorganised all 17 WCAG test-group sections around “What should happen”, “How to test it” and “What to record”.
- Made every component procedure and numbered step visible by default instead of hiding instructions in collapsed disclosures.
- Consolidated the website into one comprehensive `index.html` containing preparation guidance, 14 component procedures, 17 WCAG test groups and all 55 result decisions.
- Structured every component step into explicit Action, Expected result and Record fields for QA execution.
- Removed the 37 obsolete generated guide, journey, reference and standalone test HTML pages.
- Added 55 visible criterion-level manual checks containing 165 structured Action, Expected result and Record steps.
- Added explicit manual procedures for checks covered by the reference workbook, while excluding obsolete SC 4.1.1 and retaining active SC 4.1.3.
