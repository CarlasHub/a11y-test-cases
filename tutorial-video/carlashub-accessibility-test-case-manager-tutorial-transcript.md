# CarlasHub accessibility test case manager tutorial

Narrated by a calm, conversational woman voice. Captions reproduce this transcript word for word.

## 1. Open the manager and explain its purpose

This is the CarlasHub accessibility test case manager. It helps you choose repeatable manual tests, record the result of each WCAG criterion and turn the work into a report. The library contains component procedures and WCAG groups. In this tutorial I will use five groups to test BuggyLand, a page built with deliberate accessibility problems. The navigation on the left follows the same order as the work: prepare, choose tests, run the plan, then review and report.

## 2. Read the “Before testing” checklist

Before choosing tests, agree what is in scope: the site or release, languages, page types, components, states and user journeys. Record the browser, device, viewport, input method and assistive technology. Use safe test data and never put personal details or credentials into evidence. Automated checks can help with a first pass, but the applicable manual procedures still need to be completed. Save evidence another tester can repeat. The guidance links are there when you need the normative rule or recognised component behaviour.

## 3. Enter the core run details

I will identify this run as BUGGYLAND-2026-09-10. The target name tells a reader what was tested; the URL lets them find it; the release or state prevents results being confused with another version. The environment records how the checks were performed, and the tester field records responsibility. These details save in this browser as I type, so I can leave and continue later on the same device.

## 4. Define the WCAG-EM-inspired evaluation context

The optional sections add the context expected in a useful evaluation report. First, define the owner, dates, WCAG version, conformance target, scope, exclusions and accessibility-support baseline. The conformance choices are Level A, AA, AAA or no target; this run uses WCAG 2.2 Level AA. Next, describe the technologies, common states, essential journeys and sampling method. Because BuggyLand is one demonstration page, the structured sample is the whole page and there is no random sample. Finally, add a short summary, honest limitations and review details. These fields follow the shape of WCAG-EM reporting, but the exported report is not a W3C certification.

## 5. Find and preview tests

Search accepts a subject such as keyboard, a control such as forms, or a criterion number such as 1.4.3. Test type separates component procedures from grouped WCAG checks. Themes narrow the list to structure, interaction, forms and journeys, visual and layout, or media and motion. The result count confirms what the current filters are showing. Open test lets me read a procedure before adding it, which is useful when I am deciding whether it applies.

## 6. Build the five-test plan

I am adding five WCAG groups: page structure and language, images and visual text, contrast, keyboard and focus, and form names and instructions. Add selects one test. Add all shown selects the current filtered results, while Remove shown removes only the tests visible under that filter. The plan shows how many tests are selected, how many are complete and how many of the 55 Level A and AA criteria are represented. Coverage gaps are prompts to consider, not automatic failures. Each selected test can also be removed individually.

## 7. Explain the five BuggyLand tests before running them

These five tests answer different questions. TC-01 checks whether the page title, structure, reading sequence and language are available programmatically. TC-02 checks alternatives for images and icons and whether text is unnecessarily embedded in an image. TC-05 measures text contrast and the visual boundaries of controls. TC-07 uses only the keyboard to check operation, escape, bypass, focus order, focus visibility and whether focus is obscured. TC-11 checks labels, instructions, autocomplete and the accessible name, role, state and value of form controls. Together they produce 20 separate criterion decisions; they are not one combined pass or fail.

## 8. Read a procedure correctly

A procedure starts by saying when to use it, what equipment or information is needed and what should happen. Each numbered step has an action, an expected result and the evidence to save. The Previous and Next controls move through the steps. The step tabs also work with the arrow, Home and End keys. After performing the steps on the target, use the decision guidance for each criterion. The W3C link is the normative reference when the short guidance is not enough.

## 9. Run TC-01: page structure, reading order and language

For TC-01 I first compare the browser title, main heading and visible purpose. BuggyLand’s title is too generic to distinguish this page, so 2.4.2 fails. The visual list uses line breaks instead of list semantics, and the data display uses divs without table-header relationships, so 1.3.1 fails. The order example does not preserve the same meaning programmatically, so 1.3.2 fails. The heading examples are not consistently descriptive, so 2.4.6 fails. The document language is correctly set to English, so 3.1.1 passes. There are no in-scope passages in another language, so 3.1.2 is not applicable. This gives six decisions: four fails, one pass and one not applicable.

## 10. Run TC-02: images, icons and visual text

TC-02 begins with an inventory: is each item informative, functional, complex or decorative? The chart is informative but has no text alternative. The icon-only button is functional but has no accessible name. Both are failures of 1.1.1 because their meaning or action is unavailable without the visual. The visual-text example presents important words as an image without an equivalent text presentation, so 1.4.5 fails. Save the item, its purpose, its accessible name or alternative, and the visual context.

## 11. Run TC-05: text and control contrast

TC-05 separates readable text from the visual information needed to identify a control. Ordinary text needs at least 4.5 to 1 contrast, qualifying large text needs 3 to 1, and required control boundaries need 3 to 1 against adjacent colours unless an exception applies. BuggyLand’s pale text uses approximately RGB 198, 202, 216 on RGB 223, 227, 240 and does not reach the text requirement, so 1.4.3 fails. The faint control boundary is not distinguishable from its background, so 1.4.11 fails. The evidence records the colours, measured ratio, target and state.

## 12. Run TC-07: keyboard access, focus and bypass

TC-07 is performed without a pointer. The clickable div and custom slider cannot be operated with the expected keyboard controls, so 2.1.1 fails. The trap example does not provide a predictable keyboard exit, so 2.1.2 fails. Repeated content cannot be bypassed, so 2.4.1 fails. Positive tabindex values force focus through controls in an order that does not match the page, so 2.4.3 fails. Focus is not consistently visible, so 2.4.7 fails. Sticky content can cover the focused item, so 2.4.11 fails. For each problem, record the exact key sequence, expected operation, actual focus target and recovery attempt.

## 13. Run TC-11: form names, instructions and autocomplete

TC-11 checks both what a form looks like and what assistive technology receives. The personal-data inputs do not expose recognised autocomplete purposes, so 1.3.5 fails. One control’s accessible name does not contain its visible label, so a speech-input user cannot reliably say the words they see and 2.5.3 fails. Placeholder-only fields and the phone field do not provide persistent labels or the instructions needed to enter the value, so 3.3.2 fails. The custom controls do not expose the required accessible name, role, state or value, so 4.1.2 fails. Record the visible label, computed name, role, state, value, instructions and autocomplete token.

## 14. Teach status, outcome and evidence controls

Execution status and criterion outcome answer different questions. Not started means no work has begun. In progress means testing is underway. Blocked records something that prevents completion. Needs specialist review keeps an uncertain result open for another tester. Complete is only available as a valid final state when every criterion in this group has an outcome. A criterion outcome is Pass, Fail or Not applicable. Pass means the full defined sample met the requirement. Fail means at least one applicable target failed. Not applicable means the completed inventory contains nothing covered by that criterion; it must not be used for blocked or unfinished work. Actual result explains what happened. Evidence reference tells another person where to verify it. Issue ID links remediation work, and Limitation or blocker explains unfinished or constrained testing. Every change is saved locally.

## 15. Navigate and complete the full plan

Previous and Next follow the plan order. Current test jumps directly to another selected test, and Open the full procedure returns to the detailed instructions whenever I need them. After all five groups are complete, the plan contains 20 criterion decisions: 18 fails, one pass and one not applicable. The totals describe this BuggyLand sample only.

## 16. Copy, export, import, clear and restore the working plan

Copy test plan creates a shareable text summary with the run details, selected procedures, criterion decisions and direct procedure links. Export working CSV creates one row for each criterion, so this run has 20 data rows. The file uses spreadsheet-compatible UTF-8 text, and here the headings and punctuation are opening correctly. The CSV is the continuation format: after I remove a test, Import working CSV restores the selections, metadata, statuses, outcomes, evidence and issue references. Clear plan removes the current selection but preserves the recorded results. Undo clear restores the selection immediately.

## 17. Check report readiness

Review and report checks whether the evaluation is understandable before it is shared. It looks for a target, evaluation scope, accessibility-support baseline, environment, sampling method, structured sample, complete processes, tester, completed selected tests and an outcome for every selected criterion. The report can still describe limitations, but a missing item is made visible instead of being silently omitted. Restoring this field returns the run to ready.

## 18. Download and read the HTML report

The HTML report is the version intended for people to read. It begins with the target and result totals, then explains the scope, accessibility support, sample, summary and limitations. Results are grouped by test, but every WCAG criterion keeps its own outcome, actual result, evidence and issue reference. Here 3.1.1 is a pass, 3.1.2 is not applicable and the failed criteria keep their supporting evidence. The card layout also remains readable at a narrow width.

## 19. Download the JSON report data

Download report data creates the full structured evaluation in JSON. Use the HTML report for reading and review, the working CSV for spreadsheet work and resuming a run, and JSON when another system needs the complete data structure. These formats serve different jobs, so choose the one your next user or system needs.

## 20. Finish at the next practical action

The run is now repeatable: the plan records what was tested, the evidence explains each decision, and the report is ready for review. The next step is to assign the failed criteria through their issue IDs, fix the barriers, then repeat the same procedures on the updated release. The footer links lead to CarlasHub, LinkedIn and the public GitHub repository.
