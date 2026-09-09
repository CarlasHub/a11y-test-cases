#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";


const argumentsMap = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  argumentsMap.set(process.argv[index], process.argv[index + 1]);
}

const baseUrl = (argumentsMap.get("--url") || "http://127.0.0.1:4173").replace(/\/$/, "");
const cdpUrl = (argumentsMap.get("--cdp") || "http://127.0.0.1:9222").replace(/\/$/, "");
const screenshotDirectory = argumentsMap.get("--screenshot-dir");
const axeSource = await fs.readFile(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");


const targetResponse = await fetch(`${cdpUrl}/json/new?${encodeURIComponent(`${baseUrl}/index.html`)}`, {
  method: "PUT",
});
if (!targetResponse.ok) {
  throw new Error(`Cannot create browser target: ${targetResponse.status} ${targetResponse.statusText}`);
}
const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);

let sequence = 0;
const pending = new Map();
const eventWaiters = new Map();
const runtimeErrors = [];

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result || {});
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    runtimeErrors.push(message.params.exceptionDetails.text || "Runtime exception");
  }
  const waiters = eventWaiters.get(message.method) || [];
  eventWaiters.delete(message.method);
  waiters.forEach((resolve) => resolve(message.params));
});

const send = (method, params = {}) => {
  sequence += 1;
  const id = sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};

const waitForEvent = (method) => new Promise((resolve) => {
  const waiters = eventWaiters.get(method) || [];
  waiters.push(resolve);
  eventWaiters.set(method, waiters);
});

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  }
  return result.result?.value;
};

const navigate = async (url) => {
  const loaded = waitForEvent("Page.loadEventFired");
  await send("Page.navigate", { url });
  await loaded;
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const runAxe = async (pageName) => {
  await evaluate(axeSource);
  const violations = await evaluate(`(async () => {
    const result = await axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
      resultTypes: ["violations"]
    });
    return result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      }))
    }));
  })()`);
  assert(violations.length === 0, `${pageName} has axe violations: ${JSON.stringify(violations)}`);
};

const captureScreenshot = async (filename) => {
  if (!screenshotDirectory) return;
  await fs.mkdir(screenshotDirectory, { recursive: true });
  const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await fs.writeFile(path.join(screenshotDirectory, filename), Buffer.from(screenshot.data, "base64"));
};

const captureElementScreenshot = async (filename, selector, maximumHeight = 2200) => {
  if (!screenshotDirectory) return;
  const clip = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    const rectangle = element.getBoundingClientRect();
    return {
      x: rectangle.left + window.scrollX,
      y: rectangle.top + window.scrollY,
      width: rectangle.width,
      height: Math.min(rectangle.height, ${maximumHeight}),
      scale: 1
    };
  })()`);
  await fs.mkdir(screenshotDirectory, { recursive: true });
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
    clip,
  });
  await fs.writeFile(path.join(screenshotDirectory, filename), Buffer.from(screenshot.data, "base64"));
};

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Accessibility.enable");

  await navigate(`${baseUrl}/index.html`);
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const desktop = await evaluate(`({
    title: document.title,
    h1: document.querySelector("h1")?.textContent.trim(),
    appFrameColumns: getComputedStyle(document.querySelector(".app-frame")).gridTemplateColumns.split(" ").length,
    sidebarPresent: Boolean(document.querySelector(".library-sidebar")),
    workspacePresent: Boolean(document.querySelector(".library-workspace")),
    currentSidebarLinks: document.querySelectorAll('.library-sidebar .site-nav a[aria-current="location"]').length,
    pickerCards: document.querySelectorAll("[data-test-card]").length,
    openTestLinks: document.querySelectorAll(".open-test").length,
    componentPickerCards: document.querySelectorAll('[data-test-kind="component"]').length,
    wcagPickerCards: document.querySelectorAll('[data-test-kind="wcag"]').length,
    pickerHeadings: document.querySelectorAll("[data-test-card] h3[data-test-title]").length,
    selectionControls: document.querySelectorAll("[data-test-select]").length,
    copyButtonLabel: document.querySelector("#copy-test-plan")?.textContent.trim(),
    planProgressMaximum: document.querySelector("#plan-progress")?.max,
    planProgressValue: document.querySelector("#plan-progress")?.value,
    planPanelOpen: document.querySelector(".selection-panel")?.open,
    disclosures: document.querySelectorAll(".test-disclosure").length,
    openDisclosures: document.querySelectorAll(".test-disclosure[open]").length,
    stepDecks: document.querySelectorAll("[data-step-deck]").length,
    readyStepDecks: document.querySelectorAll('[data-step-deck-ready="true"]').length,
    stepTabs: document.querySelectorAll("[data-step-tab]").length,
    selectedStepTabs: document.querySelectorAll('[data-step-tab][aria-selected="true"]').length,
    stepPanels: document.querySelectorAll("[data-step-panel]").length,
    unhiddenStepPanels: document.querySelectorAll("[data-step-panel]:not([hidden])").length,
    procedures: document.querySelectorAll(".component-procedure").length,
    dialogSteps: document.querySelectorAll("#procedure-dialogs-modals-popovers-and-tooltips [data-step-panel]").length,
    structuredSteps: document.querySelectorAll(".component-procedure .step-card-detail").length,
    groups: document.querySelectorAll(".wcag-test-group").length,
    criteria: document.querySelectorAll(".criterion").length,
    manualChecks: document.querySelectorAll(".criterion-manual-check").length,
    manualSteps: document.querySelectorAll(".criterion-manual-check [data-step-panel]").length,
    normativeLinks: Array.from(document.querySelectorAll(".criterion a")).filter((link) => link.href.startsWith("https://www.w3.org/TR/WCAG22/")).length,
    separateHtmlPages: Array.from(document.querySelectorAll("a[href]")).filter((link) => link.getAttribute("href").includes(".html")).length,
    skipTarget: document.querySelector(".skip-link")?.getAttribute("href"),
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  })`);
  assert(desktop.title === "Accessibility test case manager | CarlasHub", "Unexpected home title");
  assert(desktop.h1 === "Accessibility test case manager", "Unexpected home heading");
  assert(desktop.appFrameColumns === 2, `Expected a two-column checklist frame, found ${desktop.appFrameColumns} column(s)`);
  assert(desktop.sidebarPresent === true, "Checklist navigation sidebar is missing");
  assert(desktop.workspacePresent === true, "Checklist workspace is missing");
  assert(desktop.currentSidebarLinks === 1, "Sidebar navigation must expose one current location");
  assert(desktop.pickerCards === 31, `Expected 31 picker cards, found ${desktop.pickerCards}`);
  assert(desktop.openTestLinks === 31, `Expected 31 direct test links, found ${desktop.openTestLinks}`);
  assert(desktop.componentPickerCards === 14, `Expected 14 component picker cards, found ${desktop.componentPickerCards}`);
  assert(desktop.wcagPickerCards === 17, `Expected 17 WCAG picker cards, found ${desktop.wcagPickerCards}`);
  assert(desktop.pickerHeadings === 31, `Expected 31 level-three picker headings, found ${desktop.pickerHeadings}`);
  assert(desktop.selectionControls === 31, `Expected 31 test selection controls, found ${desktop.selectionControls}`);
  assert(desktop.copyButtonLabel === "Copy test plan", `Unexpected copy action label: ${desktop.copyButtonLabel}`);
  assert(desktop.planProgressMaximum === 31, `Expected test-plan progress maximum 31, found ${desktop.planProgressMaximum}`);
  assert(desktop.planProgressValue === 0, `Expected empty test-plan progress, found ${desktop.planProgressValue}`);
  assert(desktop.planPanelOpen === true, "Desktop test-plan panel should start open");
  assert(desktop.disclosures === 31, `Expected 31 focused disclosures, found ${desktop.disclosures}`);
  assert(desktop.openDisclosures === 0, "Test disclosures should start collapsed");
  assert(desktop.stepDecks === 86, `Expected 86 step decks, found ${desktop.stepDecks}`);
  assert(desktop.readyStepDecks === 86, `Expected 86 enhanced step decks, found ${desktop.readyStepDecks}`);
  assert(desktop.stepTabs === 300, `Expected 300 step tabs, found ${desktop.stepTabs}`);
  assert(desktop.selectedStepTabs === 86, `Expected one selected tab per deck, found ${desktop.selectedStepTabs}`);
  assert(desktop.stepPanels === 300, `Expected 300 step cards, found ${desktop.stepPanels}`);
  assert(desktop.unhiddenStepPanels === 86, `Expected one unhidden card per deck, found ${desktop.unhiddenStepPanels}`);
  assert(desktop.procedures === 14, `Expected 14 component procedures, found ${desktop.procedures}`);
  assert(desktop.dialogSteps === 8, `Expected 8 dialog test steps, found ${desktop.dialogSteps}`);
  assert(desktop.structuredSteps >= 84, `Expected at least 84 structured component steps, found ${desktop.structuredSteps}`);
  assert(desktop.groups === 17, `Expected 17 visible WCAG test groups, found ${desktop.groups}`);
  assert(desktop.criteria === 55, `Expected 55 visible success-criterion decisions, found ${desktop.criteria}`);
  assert(desktop.manualChecks === 55, `Expected 55 criterion-level manual checks, found ${desktop.manualChecks}`);
  assert(desktop.manualSteps === 165, `Expected 165 structured criterion steps, found ${desktop.manualSteps}`);
  assert(desktop.normativeLinks === 55, `Expected 55 normative WCAG links, found ${desktop.normativeLinks}`);
  assert(desktop.separateHtmlPages === 0, `Expected no links to separate HTML pages, found ${desktop.separateHtmlPages}`);
  assert(desktop.skipTarget === "#main-content", "Skip link does not target main content");
  assert(desktop.scrollWidth <= desktop.width, `Desktop horizontal overflow: ${desktop.scrollWidth}/${desktop.width}`);

  await evaluate("document.activeElement?.blur()");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  const firstFocus = await evaluate("document.activeElement?.classList.contains('skip-link')");
  assert(firstFocus === true, "Skip link is not the first keyboard focus target");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  const skippedToMain = await evaluate("document.activeElement?.id === 'main-content'");
  assert(skippedToMain === true, "Skip link did not move focus to main content");
  await evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)");

  const filtering = await evaluate(`(() => {
    const setSearch = (value) => {
      const input = document.querySelector("#test-search");
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setSearch("keyboard");
    const keyboardMatches = document.querySelectorAll("[data-test-card]:not([hidden])").length;
    const keyboardGroupShown = !document.querySelector('[data-test-id="TC-07"]').hidden;
    setSearch("");
    document.querySelector('[data-filter-theme="forms"]').click();
    const formMatches = document.querySelectorAll("[data-test-card]:not([hidden])").length;
    document.querySelector('[data-filter-kind="wcag"]').click();
    const wcagFormMatches = document.querySelectorAll("[data-test-card]:not([hidden])").length;
    document.querySelector("#select-visible-tests").click();
    const selectedCount = document.querySelector("#selection-count").textContent.trim();
    const selectedLinks = document.querySelectorAll("#selection-list a").length;
    const removeButtons = document.querySelectorAll("#selection-list [data-remove-test]").length;
    const firstRemove = document.querySelector("#selection-list [data-remove-test]");
    const firstRemoveLabel = firstRemove?.getAttribute("aria-label") || "";
    const copyEnabled = !document.querySelector("#copy-test-plan").disabled;
    const storedCount = JSON.parse(localStorage.getItem("carlashub-a11y-selected-tests") || "[]").length;
    const progressValue = document.querySelector("#plan-progress").value;
    const progressText = document.querySelector("#plan-progress-text").textContent.trim();
    const removedId = firstRemove?.dataset.removeTest;
    firstRemove?.focus();
    firstRemove?.click();
    const countAfterRemove = document.querySelector("#selection-count").textContent.trim();
    const removedCheckboxChecked = document.querySelector('[data-test-select][value="' + removedId + '"]')?.checked;
    const removeFocusRetained = document.activeElement?.matches("[data-remove-test]") || false;
    document.querySelector("#clear-test-plan").click();
    const clearedCount = document.querySelector("#selection-count").textContent.trim();
    const clearedProgress = document.querySelector("#plan-progress").value;
    document.querySelector('[data-filter-kind="all"]').click();
    document.querySelector('[data-filter-theme="all"]').click();
    return {
      keyboardMatches,
      keyboardGroupShown,
      formMatches,
      wcagFormMatches,
      selectedCount,
      selectedLinks,
      removeButtons,
      firstRemoveLabel,
      copyEnabled,
      storedCount,
      progressValue,
      progressText,
      countAfterRemove,
      removedCheckboxChecked,
      removeFocusRetained,
      clearedCount,
      clearedProgress,
      restoredMatches: document.querySelectorAll("[data-test-card]:not([hidden])").length
    };
  })()`);
  assert(filtering.keyboardMatches > 0 && filtering.keyboardMatches < 31, "Keyboard search did not narrow the catalogue");
  assert(filtering.keyboardGroupShown === true, "Keyboard search did not retain TC-07");
  assert(filtering.formMatches === 5, `Expected 5 form-themed tests, found ${filtering.formMatches}`);
  assert(filtering.wcagFormMatches === 3, `Expected 3 form-themed WCAG groups, found ${filtering.wcagFormMatches}`);
  assert(filtering.selectedCount === "3", `Expected 3 selected tests, found ${filtering.selectedCount}`);
  assert(filtering.selectedLinks === 3, `Expected 3 selected-test links, found ${filtering.selectedLinks}`);
  assert(filtering.removeButtons === 3, `Expected 3 remove controls, found ${filtering.removeButtons}`);
  assert(filtering.firstRemoveLabel.endsWith("from test plan"), `Unexpected remove label: ${filtering.firstRemoveLabel}`);
  assert(filtering.copyEnabled === true, "Copy action should be enabled for a non-empty plan");
  assert(filtering.storedCount === 3, `Expected 3 stored test selections, found ${filtering.storedCount}`);
  assert(filtering.progressValue === 3, `Expected progress value 3, found ${filtering.progressValue}`);
  assert(filtering.progressText === "3 of 31 selected", `Unexpected progress text: ${filtering.progressText}`);
  assert(filtering.countAfterRemove === "2", `Expected 2 tests after individual removal, found ${filtering.countAfterRemove}`);
  assert(filtering.removedCheckboxChecked === false, "Removing a plan item did not clear its catalogue checkbox");
  assert(filtering.removeFocusRetained === true, "Focus was not retained after removing a plan item");
  assert(filtering.clearedCount === "0", "Clear action did not empty the test plan");
  assert(filtering.clearedProgress === 0, "Clear action did not reset test-plan progress");
  assert(filtering.restoredMatches === 31, "Reset filters did not restore all picker cards");

  await evaluate(`(() => {
    window.location.hash = "procedure-dialogs-modals-popovers-and-tooltips";
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const openedFromHash = await evaluate(`({
    open: document.querySelector("#procedure-dialogs-modals-popovers-and-tooltips").open,
    visibleSteps: Array.from(document.querySelectorAll("#procedure-dialogs-modals-popovers-and-tooltips [data-step-panel]")).filter((step) => step.getClientRects().length > 0).length,
    selectedTabs: document.querySelectorAll('#procedure-dialogs-modals-popovers-and-tooltips [data-step-tab][aria-selected="true"]').length
  })`);
  assert(openedFromHash.open === true, "Direct test link did not open its disclosure");
  assert(openedFromHash.visibleSteps === 1, `Expected one visible dialog step card, found ${openedFromHash.visibleSteps}`);
  assert(openedFromHash.selectedTabs === 1, "Dialog procedure does not have exactly one selected step tab");

  const tabKeyboard = await evaluate(`(() => {
    const deck = document.querySelector("#procedure-dialogs-modals-popovers-and-tooltips [data-step-deck]");
    const tabs = Array.from(deck.querySelectorAll("[data-step-tab]"));
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    const selectedAfterArrow = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    const focusedAfterArrow = tabs.indexOf(document.activeElement);
    const visibleAfterArrow = deck.querySelectorAll("[data-step-panel]:not([hidden])").length;
    deck.querySelector("[data-step-panel]:not([hidden]) [data-step-next]").click();
    const selectedAfterNext = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    return { selectedAfterArrow, focusedAfterArrow, visibleAfterArrow, selectedAfterNext };
  })()`);
  assert(tabKeyboard.selectedAfterArrow === 1, "Right Arrow did not select the next step tab");
  assert(tabKeyboard.focusedAfterArrow === 1, "Right Arrow did not move focus to the next step tab");
  assert(tabKeyboard.visibleAfterArrow === 1, "Step tab change exposed more than one card");
  assert(tabKeyboard.selectedAfterNext === 2, "Next step link did not select the following card");

  await evaluate("window.scrollTo(0, 0)");
  await captureScreenshot("home-desktop.png");
  await captureElementScreenshot("test-picker-desktop.png", "#choose-tests");
  await captureElementScreenshot(
    "dialog-procedure-desktop.png",
    "#procedure-dialogs-modals-popovers-and-tooltips"
  );
  await evaluate(`document.querySelector("#wcag-2-5-2").closest("details").open = true`);
  await captureElementScreenshot(
    "pointer-cancellation-criterion-desktop.png",
    "#wcag-2-5-2"
  );
  await evaluate("window.scrollTo(0, 0)");

  await send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 800,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const mobile = await evaluate(`({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    appFrameColumns: getComputedStyle(document.querySelector(".app-frame")).gridTemplateColumns.split(" ").length,
    sidebarInnerPosition: getComputedStyle(document.querySelector(".sidebar-inner")).position,
    planPanelOpen: document.querySelector(".selection-panel")?.open,
    pickerCards: document.querySelectorAll("[data-test-card]").length,
    openTestLinks: document.querySelectorAll(".open-test").length,
    visiblePickerCards: document.querySelectorAll("[data-test-card]:not([hidden])").length,
    stepDecks: document.querySelectorAll("[data-step-deck]").length,
    stepTabs: document.querySelectorAll("[data-step-tab]").length,
    stepPanels: document.querySelectorAll("[data-step-panel]").length,
    procedures: document.querySelectorAll(".component-procedure").length,
    groups: document.querySelectorAll(".wcag-test-group").length,
    criteria: document.querySelectorAll(".criterion").length,
    manualChecks: document.querySelectorAll(".criterion-manual-check").length,
    manualSteps: document.querySelectorAll(".criterion-manual-check [data-step-panel]").length
  })`);
  assert(mobile.pickerCards === 31, "Mobile layout lost picker cards");
  assert(mobile.openTestLinks === 31, "Mobile layout lost direct test links");
  assert(mobile.appFrameColumns === 1, `Expected one mobile app-frame column, found ${mobile.appFrameColumns}`);
  assert(mobile.sidebarInnerPosition === "static", `Expected non-sticky mobile sidebar, found ${mobile.sidebarInnerPosition}`);
  assert(mobile.planPanelOpen === false, "Empty mobile test-plan panel should start collapsed");
  assert(mobile.visiblePickerCards === 31, "Mobile layout did not retain the reset picker results");
  assert(mobile.stepDecks === 86, "Mobile layout lost step decks");
  assert(mobile.stepTabs === 300, "Mobile layout lost step tabs");
  assert(mobile.stepPanels === 300, "Mobile layout lost step cards");
  assert(mobile.procedures === 14, "Mobile layout lost component procedures");
  assert(mobile.groups === 17, "Mobile layout lost WCAG test groups");
  assert(mobile.criteria === 55, "Mobile layout lost criterion decisions");
  assert(mobile.manualChecks === 55, "Mobile layout lost criterion-level manual checks");
  assert(mobile.manualSteps === 165, "Mobile layout lost criterion-level manual steps");
  assert(mobile.scrollWidth <= mobile.width, `Mobile horizontal overflow: ${mobile.scrollWidth}/${mobile.width}`);

  const mobilePlanBehavior = await evaluate(`(() => {
    document.querySelector("[data-test-select]").click();
    const openedAfterSelection = document.querySelector(".selection-panel").open;
    const selectedProgress = document.querySelector("#plan-progress").value;
    document.querySelector("#clear-test-plan").click();
    return {
      openedAfterSelection,
      selectedProgress,
      closedAfterClear: !document.querySelector(".selection-panel").open
    };
  })()`);
  assert(mobilePlanBehavior.openedAfterSelection === true, "Selecting a mobile test did not open the test plan");
  assert(mobilePlanBehavior.selectedProgress === 1, `Expected mobile progress value 1, found ${mobilePlanBehavior.selectedProgress}`);
  assert(mobilePlanBehavior.closedAfterClear === true, "Clearing the mobile plan did not collapse the empty panel");

  await captureScreenshot("home-mobile.png");
  await captureElementScreenshot("test-picker-mobile.png", "#choose-tests");
  await captureElementScreenshot(
    "pointer-cancellation-criterion-mobile.png",
    "#wcag-2-5-2"
  );
  await runAxe("Home page");

  await evaluate(`document.querySelector("#test-keyboard-and-focus").open = true`);
  const keyboardGroup = await evaluate(`({
    steps: document.querySelectorAll("#test-keyboard-and-focus .group-section .step-deck [data-step-panel]").length,
    visibleSteps: document.querySelectorAll("#test-keyboard-and-focus .group-section .step-deck [data-step-panel]:not([hidden])").length,
    criteria: document.querySelectorAll("#test-keyboard-and-focus .criterion").length,
    visibleCriteria: Array.from(document.querySelectorAll("#test-keyboard-and-focus .criterion")).filter((item) => item.getClientRects().length > 0).length
  })`);
  assert(keyboardGroup.steps === 4, `Expected 4 guided steps in TC-07, found ${keyboardGroup.steps}`);
  assert(keyboardGroup.visibleSteps === 1, `Expected one visible guided step in TC-07, found ${keyboardGroup.visibleSteps}`);
  assert(keyboardGroup.criteria === 6, `Expected 6 criterion decisions in TC-07, found ${keyboardGroup.criteria}`);
  assert(keyboardGroup.visibleCriteria === 6, "TC-07 criterion decisions must remain visible when the group is open");

  const pointerCancellationCheck = await evaluate(`({
    steps: document.querySelectorAll("#wcag-2-5-2 [data-step-panel]").length,
    visibleSteps: document.querySelectorAll("#wcag-2-5-2 [data-step-panel]:not([hidden])").length,
    structuredDetails: document.querySelectorAll("#wcag-2-5-2 .step-card-detail").length,
    selectedTabs: document.querySelectorAll('#wcag-2-5-2 [data-step-tab][aria-selected="true"]').length,
    criterionVisible: document.querySelector("#wcag-2-5-2").getClientRects().length > 0
  })`);
  assert(pointerCancellationCheck.steps === 3, `Expected 3 manual steps for SC 2.5.2, found ${pointerCancellationCheck.steps}`);
  assert(pointerCancellationCheck.visibleSteps === 1, `Expected one visible SC 2.5.2 step card, found ${pointerCancellationCheck.visibleSteps}`);
  assert(pointerCancellationCheck.structuredDetails === 3, "SC 2.5.2 steps must contain Action, Expected result and Record cards");
  assert(pointerCancellationCheck.selectedTabs === 1, "SC 2.5.2 does not have exactly one selected step tab");
  assert(pointerCancellationCheck.criterionVisible === true, "SC 2.5.2 manual check must be visible");

  const accessibilityTree = await send("Accessibility.getFullAXTree");
  assert(Array.isArray(accessibilityTree.nodes) && accessibilityTree.nodes.length > 0, "Accessibility tree is empty");
  assert(runtimeErrors.length === 0, `Runtime errors: ${runtimeErrors.join("; ")}`);

  console.log("Browser smoke passed: framed desktop/mobile layout, sidebar navigation, compact test rows, plan progress and responsive collapse, tabbed step cards, keyboard navigation, focused disclosures, overflow, accessibility tree and axe checks completed.");
} finally {
  socket.close();
  await fetch(`${cdpUrl}/json/close/${target.id}`).catch(() => {});
}
