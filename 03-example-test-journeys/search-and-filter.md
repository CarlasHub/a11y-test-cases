# Search and filter journey

## Goal

Find content by keyword, refine the results and reach a detail page without losing context.

## Steps

1. Submit the search with empty and invalid values where validation exists.
2. Enter a keyword and location using keyboard only, including autocomplete suggestions.
3. Confirm focus order, visible focus, control names, roles, values and instructions.
4. Apply, change and remove filters and sorting.
5. Confirm result counts, loading and no-results messages are announced without unnecessary focus movement.
6. Review result-card headings, links, metadata and save controls.
7. Move through pagination, load-more or infinite-results behaviour.
8. Reload or use browser Back and confirm the expected search state and focus recovery.
9. Repeat at the equivalent of a 320 CSS-pixel viewport and on a touch device where required.

## Required states

- initial search;
- autocomplete open, no suggestions and suggestion selected;
- results loading, results available and zero results;
- filters closed, open, applied and cleared;
- saved and unsaved item;
- first and later result pages.

## Related tests

Run TC-01, TC-03 through TC-13 and TC-17 when animation or flashing is present.
