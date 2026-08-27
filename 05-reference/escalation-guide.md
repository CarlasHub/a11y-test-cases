# Escalation guide

Use the `needs_specialist_review` execution status when the target is applicable but the evidence cannot support a reliable decision. Leave the criterion outcome empty until the review is resolved.

## Always escalate

- Suspected flashing content requiring threshold analysis.
- Complex data tables, charts or maps whose equivalent information is unclear.
- CAPTCHA or authentication exceptions.
- Claims that timing, orientation, dragging, gestures or images of text are essential.
- Custom widgets with disputed names, roles, states or keyboard patterns.
- Caption, transcript or audio-description quality in an unfamiliar language.
- Conflicting behaviour across browsers or assistive technologies.
- External platforms that cannot be tested fully.
- Any proposed site-wide conformance statement.

## Escalation record

Include:

- test-run, test-case and success-criterion IDs;
- exact target and state;
- why the criterion applies;
- steps and evidence already completed;
- the unresolved question;
- the person or environment needed;
- effect on the current result and test schedule.

Do not turn uncertainty into pass or not applicable.
