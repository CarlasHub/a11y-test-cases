# Test environments

Record actual operating-system, browser, assistive-technology and device versions. “Latest” is not a reproducible version.

## Minimum web QA set

### Desktop visual and keyboard

- A current Chromium-based browser in a clean profile.
- A current Firefox release for cross-browser comparison of material issues.
- Physical keyboard with the pointer parked outside the page during keyboard tests.
- 1280 CSS-pixel-wide viewport for the 400 percent reflow check.

### Screen reader

Use at least one real desktop screen reader and browser combination approved by the project accessibility-support matrix. Common combinations include:

- NVDA with Firefox on Windows;
- VoiceOver with Safari on macOS.

Record the screen reader, browser and operating-system versions and any non-default settings. Accessibility-tree inspection or simulated speech is diagnostic support, not a real screen-reader execution.

### Mobile and touch

- A physical phone or tablet where the site is expected to support touch use.
- Portrait and landscape orientation.
- A real mobile screen reader when mobile assistive-technology coverage is required.

Browser device emulation can help reproduce layout dimensions, but it does not prove physical touch or mobile screen-reader behaviour.

## Required settings and states

Record:

- viewport width and height in CSS pixels;
- browser zoom and operating-system scaling;
- input method;
- light, dark or forced-colour mode if evaluated;
- reduced-motion preference;
- page language and account state;
- extensions or stored preferences that may change results.

## Clean start

Before testing:

1. Record the website release or test timestamp.
2. Use a clean profile or document stored cookies, preferences and extensions.
3. Clear saved-item and form state only when authorised.
4. Use approved test accounts and fictional test data.
5. Do not store credentials or real user data in screenshots, exports or repository files.
