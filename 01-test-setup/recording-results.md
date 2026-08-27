# Recording results

Record test progress separately from the WCAG outcome.

## Execution status

- `not_started`: no step has been run.
- `in_progress`: some steps or targets have been run.
- `completed`: every required target, state and step in the defined sample has been run.
- `blocked`: testing cannot continue because a required environment, account, state or decision is unavailable.
- `needs_specialist_review`: the criterion applies, but the available evidence or tester expertise cannot support a reliable outcome.

Execution status is not a WCAG outcome. Leave the outcome empty until the test is completed.

## Criterion outcome

- `pass`: every applicable target and state tested for that criterion met the stated requirement.
- `fail`: at least one applicable target failed the requirement.
- `not_applicable`: the completed inventory contains no target to which the criterion applies.

Only record an outcome when execution is `completed`. Use execution status to represent incomplete or unresolved work.

Do not use a grouped test-case result. Record one outcome for each success criterion listed in the test case.

## Minimum evidence

Every result must identify:

- test-run and test-case ID;
- WCAG success criterion;
- page, component or journey target;
- state and language;
- environment and input method;
- exact action;
- expected and actual result;
- evidence reference;
- limitation or uncertainty;
- issue ID when failed.

A screenshot rarely proves semantics, reading order, announcements or complete keyboard interaction. Include DOM, accessibility-tree, keystroke, announcement, measurement or media evidence when the method needs it.

## Reporting language

Use:

- “No failure was found in the tested sample for 2.4.7.”
- “The filter failed 4.1.2 in its expanded state.”
- “1.2.4 was not applicable because the completed media inventory contained no live media.”
- “3.3.8 needs specialist review because the available authentication environment did not provide enough evidence for a reliable outcome.”

Do not use:

- “The site is fully accessible.”
- “The automated score proves compliance.”
- “Screen readers pass.”
- “Not applicable” when an applicable target was merely unavailable.
