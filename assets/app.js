(() => {
  "use strict";

  const SELECTION_STORAGE_KEY = "carlashub-a11y-selected-tests";
  const RUN_META_STORAGE_KEY = "carlashub-a11y-run-metadata";
  const RUN_RESULTS_STORAGE_KEY = "carlashub-a11y-run-results";
  const REPORT_SCHEMA_VERSION = "1.0";
  const EXECUTION_STATUSES = new Set([
    "not_started",
    "in_progress",
    "blocked",
    "needs_review",
    "complete",
  ]);
  const CRITERION_OUTCOMES = new Set(["pass", "fail", "not_applicable"]);
  const CSV_HEADERS = [
    "schema_version",
    "test_run_id",
    "test_case_id",
    "test_case_title",
    "wcag_sc",
    "target_name",
    "target_id",
    "state",
    "environment",
    "execution_status",
    "criterion_outcome",
    "actual_result",
    "evidence_reference",
    "issue_id",
    "limitation",
    "tester",
    "test_date",
    "reviewer",
    "review_date",
    "procedure_url",
  ];

  const cards = Array.from(document.querySelectorAll("[data-test-card]"));
  const cardById = new Map(cards.map((card) => [card.dataset.testId, card]));
  const allCriteria = Array.from(
    new Set(cards.flatMap((card) => getCriteria(card))),
  ).sort(compareCriteria);
  const selectionCount = document.querySelector("#selection-count");
  const selectionPanel = document.querySelector(".selection-panel");
  const selectionEmpty = document.querySelector("#selection-empty");
  const selectionList = document.querySelector("#selection-list");
  const selectionFeedback = document.querySelector("#selection-feedback");
  const planProgress = document.querySelector("#plan-progress");
  const planProgressText = document.querySelector("#plan-progress-text");
  const copyButton = document.querySelector("#copy-test-plan");
  const exportButton = document.querySelector("#export-test-plan");
  const clearButton = document.querySelector("#clear-test-plan");
  const undoButton = document.querySelector("#undo-clear-test-plan");
  const startTestingLink = document.querySelector("#start-testing");
  const importInput = document.querySelector("#import-test-plan");
  const searchInput = document.querySelector("#test-search");
  const pickerStatus = document.querySelector("#test-picker-status");
  const pickerEmpty = document.querySelector("#test-picker-empty");
  const addVisibleButton = document.querySelector("#select-visible-tests");
  const removeVisibleButton = document.querySelector("#remove-visible-tests");
  const coverageSummary = document.querySelector("#coverage-summary");
  const coverageGapsSummary = document.querySelector("#coverage-gaps-summary");
  const coverageGapsList = document.querySelector("#coverage-gaps-list");
  const runnerEmpty = document.querySelector("#runner-empty");
  const runnerWorkspace = document.querySelector("#runner-workspace");
  const runPlanSummary = document.querySelector("#run-plan-summary");
  const currentRunTest = document.querySelector("#current-run-test");
  const previousRunTest = document.querySelector("#previous-run-test");
  const nextRunTest = document.querySelector("#next-run-test");
  const runnerPosition = document.querySelector("#runner-position");
  const runnerTitle = document.querySelector("#runner-test-title");
  const runnerProcedureLink = document.querySelector("#runner-procedure-link");
  const runnerStatus = document.querySelector("#runner-status");
  const criterionOutcomes = document.querySelector("#criterion-outcomes");
  const runnerActualResult = document.querySelector("#runner-actual-result");
  const runnerEvidenceReference = document.querySelector("#runner-evidence-reference");
  const runnerIssueId = document.querySelector("#runner-issue-id");
  const runnerLimitation = document.querySelector("#runner-limitation");
  const runnerFeedback = document.querySelector("#runner-feedback");
  const reportReadiness = document.querySelector("#report-readiness");
  const reportReadinessGaps = document.querySelector("#report-readiness-gaps");
  const downloadReportButton = document.querySelector("#download-evaluation-report");
  const downloadDataButton = document.querySelector("#download-evaluation-data");
  const mobilePlanMedia = window.matchMedia("(max-width: 36rem)");

  let activeKind = "all";
  let activeTheme = "all";
  const storedSelection = safeRead(SELECTION_STORAGE_KEY, []);
  const storedRunMeta = safeRead(RUN_META_STORAGE_KEY, {});
  const storedResults = safeRead(RUN_RESULTS_STORAGE_KEY, {});
  let selected = new Set(
    (Array.isArray(storedSelection) ? storedSelection : []).filter((identifier) =>
      cardById.has(identifier),
    ),
  );
  let runMeta = !Array.isArray(storedRunMeta) ? storedRunMeta : {};
  let results = !Array.isArray(storedResults) ? storedResults : {};
  let currentTestId = "";
  let clearedSelection = null;

  if (!runMeta.testRunId) {
    runMeta.testRunId = `A11Y-${localDate()}`;
  }
  runMeta.wcagVersion ||= "WCAG 2.2";
  runMeta.conformanceTarget ||= "AA";

  function safeRead(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      announce("This browser could not save the latest change.");
    }
  }

  function getCriteria(card) {
    return (card?.dataset.testCriteria || "")
      .split(",")
      .map((criterion) => criterion.trim())
      .filter(Boolean);
  }

  function compareCriteria(left, right) {
    return left.localeCompare(right, undefined, { numeric: true });
  }

  function localDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  function testTitle(card) {
    return card.querySelector("[data-test-title]")?.textContent.trim() || card.dataset.testId;
  }

  function selectedCards() {
    return cards.filter((card) => selected.has(card.dataset.testId));
  }

  function resultFor(identifier) {
    if (!results[identifier] || typeof results[identifier] !== "object") {
      results[identifier] = {};
    }
    const result = results[identifier];
    if (!EXECUTION_STATUSES.has(result.status)) {
      result.status = "not_started";
    }
    if (!result.outcomes || typeof result.outcomes !== "object" || Array.isArray(result.outcomes)) {
      result.outcomes = {};
    }
    result.actualResult ||= "";
    result.evidenceReference ||= "";
    result.issueId ||= "";
    result.limitation ||= "";
    result.testDate ||= "";
    return result;
  }

  function announce(message) {
    if (selectionFeedback) {
      selectionFeedback.textContent = message;
    }
  }

  function setSelected(identifier, isSelected, { preserveUndo = false } = {}) {
    if (!cardById.has(identifier)) {
      return;
    }
    if (isSelected) {
      selected.add(identifier);
    } else {
      selected.delete(identifier);
    }
    if (!preserveUndo) {
      clearedSelection = null;
      undoButton.hidden = true;
    }
    saveAndRender();
  }

  function saveAndRender() {
    safeWrite(SELECTION_STORAGE_KEY, Array.from(selected));
    renderSelection();
    applyFilters();
  }

  function renderSelection() {
    const chosenCards = selectedCards();
    const count = chosenCards.length;
    const completed = chosenCards.filter(
      (card) => resultFor(card.dataset.testId).status === "complete",
    ).length;

    selectionCount.textContent = String(count);
    selectionCount.setAttribute("aria-label", `${count} selected tests`);
    planProgress.value = count;
    planProgress.textContent = `${count} of ${cards.length} selected`;
    planProgressText.textContent = `${count} of ${cards.length} selected · ${completed} complete`;
    selectionEmpty.hidden = count > 0;
    selectionList.replaceChildren();

    if (selectionPanel instanceof HTMLDetailsElement) {
      if (count > 0) {
        selectionPanel.open = true;
      } else if (mobilePlanMedia.matches) {
        selectionPanel.open = false;
      }
    }

    chosenCards.forEach((card) => {
      const identifier = card.dataset.testId;
      const listItem = document.createElement("li");
      const link = document.createElement("a");
      const removeButton = document.createElement("button");
      link.href = card.dataset.testTarget;
      link.textContent = `${identifier} ${testTitle(card)}`;
      removeButton.type = "button";
      removeButton.className = "plan-remove-button";
      removeButton.dataset.removeTest = identifier;
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove ${identifier} from test plan`);
      listItem.append(link, removeButton);
      selectionList.append(listItem);
    });

    [copyButton, exportButton, clearButton].forEach((control) => {
      control.disabled = count === 0;
    });
    startTestingLink.classList.toggle("is-disabled", count === 0);
    startTestingLink.setAttribute("aria-disabled", String(count === 0));
    renderCoverage(chosenCards);
    renderRunner(chosenCards);
    updateReportReadiness(chosenCards);

    cards.forEach((card) => {
      const isSelected = selected.has(card.dataset.testId);
      const checkbox = card.querySelector("[data-test-select]");
      const labelText = card.querySelector(".picker-select > span");
      checkbox.checked = isSelected;
      card.classList.toggle("is-selected", isSelected);
      if (labelText) {
        labelText.firstChild.textContent = isSelected ? "Added" : "Add";
      }
    });
  }

  function renderCoverage(chosenCards) {
    const represented = new Set(chosenCards.flatMap((card) => getCriteria(card)));
    const gaps = allCriteria.filter((criterion) => !represented.has(criterion));
    coverageSummary.textContent = `${represented.size} of ${allCriteria.length} criteria represented`;
    coverageGapsSummary.textContent = gaps.length
      ? `${gaps.length} criteria not yet represented`
      : `All ${allCriteria.length} criteria represented`;
    coverageGapsList.replaceChildren();
    gaps.forEach((criterion) => {
      const item = document.createElement("li");
      item.textContent = criterion;
      coverageGapsList.append(item);
    });

    cards
      .filter((card) => card.dataset.testKind === "wcag")
      .forEach((card) => {
        const criteria = getCriteria(card);
        const count = criteria.filter((criterion) => represented.has(criterion)).length;
        let indicator = card.querySelector(".picker-card-coverage");
        if (!indicator) {
          indicator = document.createElement("span");
          indicator.className = "picker-card-coverage";
          card.querySelector(".picker-card-details")?.append(indicator);
        }
        indicator.textContent = `${count}/${criteria.length} represented`;
      });
  }

  function renderRunner(chosenCards) {
    const count = chosenCards.length;
    const completed = chosenCards.filter(
      (card) => resultFor(card.dataset.testId).status === "complete",
    ).length;
    runnerEmpty.hidden = count > 0;
    runnerWorkspace.hidden = count === 0;
    runPlanSummary.textContent = count
      ? `${completed} of ${count} selected tests complete. Results are saved in this browser.`
      : "Choose at least one test to start a guided run.";

    if (!count) {
      currentTestId = "";
      return;
    }
    if (!chosenCards.some((card) => card.dataset.testId === currentTestId)) {
      currentTestId =
        chosenCards.find((card) => resultFor(card.dataset.testId).status !== "complete")
          ?.dataset.testId || chosenCards[0].dataset.testId;
    }

    currentRunTest.replaceChildren();
    chosenCards.forEach((card) => {
      const option = document.createElement("option");
      option.value = card.dataset.testId;
      option.textContent = `${card.dataset.testId} — ${testTitle(card)}`;
      currentRunTest.append(option);
    });
    currentRunTest.value = currentTestId;
    renderCurrentTest(chosenCards);
  }

  function renderCurrentTest(chosenCards = selectedCards()) {
    const card = cardById.get(currentTestId);
    if (!card || !chosenCards.length) {
      return;
    }
    const index = chosenCards.findIndex((item) => item.dataset.testId === currentTestId);
    const result = resultFor(currentTestId);
    const criteria = getCriteria(card);

    runnerPosition.textContent = `Test ${index + 1} of ${chosenCards.length}`;
    runnerTitle.textContent = `${currentTestId} — ${testTitle(card)}`;
    runnerProcedureLink.href = card.dataset.testTarget;
    runnerStatus.value = result.status;
    currentRunTest.value = currentTestId;
    previousRunTest.disabled = index === 0;
    nextRunTest.disabled = index === chosenCards.length - 1;
    criterionOutcomes.replaceChildren();
    const legend = document.createElement("legend");
    legend.textContent = "Criterion outcomes";
    criterionOutcomes.append(legend);

    criteria.forEach((criterion) => {
      const label = document.createElement("label");
      const select = document.createElement("select");
      const selectId = `outcome-${currentTestId}-${criterion}`.replaceAll(".", "-");
      label.htmlFor = selectId;
      label.textContent = `WCAG ${criterion}`;
      select.id = selectId;
      select.dataset.criterionOutcome = criterion;
      [
        ["", "Choose outcome"],
        ["pass", "Pass"],
        ["fail", "Fail"],
        ["not_applicable", "Not applicable"],
      ].forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        select.append(option);
      });
      select.value = result.outcomes[criterion] || "";
      label.append(select);
      criterionOutcomes.append(label);
    });

    runnerActualResult.value = result.actualResult;
    runnerEvidenceReference.value = result.evidenceReference;
    runnerIssueId.value = result.issueId;
    runnerLimitation.value = result.limitation;
    runnerFeedback.textContent =
      result.status === "complete" ? "This test is marked complete." : "";
  }

  function moveCurrentTest(offset) {
    const chosenCards = selectedCards();
    const index = chosenCards.findIndex((card) => card.dataset.testId === currentTestId);
    const next = chosenCards[index + offset];
    if (next) {
      currentTestId = next.dataset.testId;
      renderCurrentTest(chosenCards);
      runnerTitle.focus({ preventScroll: true });
    }
  }

  function saveCurrentResult() {
    const result = resultFor(currentTestId);
    result.actualResult = runnerActualResult.value.trim();
    result.evidenceReference = runnerEvidenceReference.value.trim();
    result.issueId = runnerIssueId.value.trim();
    result.limitation = runnerLimitation.value.trim();
    safeWrite(RUN_RESULTS_STORAGE_KEY, results);
  }

  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;
    let visibleSelectedCount = 0;

    cards.forEach((card) => {
      const matchesQuery = !query || card.dataset.searchText.includes(query);
      const matchesKind = activeKind === "all" || card.dataset.testKind === activeKind;
      const matchesTheme = activeTheme === "all" || card.dataset.testTheme === activeTheme;
      const visible = matchesQuery && matchesKind && matchesTheme;
      card.hidden = !visible;
      if (visible) {
        visibleCount += 1;
        if (selected.has(card.dataset.testId)) {
          visibleSelectedCount += 1;
        }
      }
    });

    pickerStatus.textContent = `${visibleCount} ${visibleCount === 1 ? "test" : "tests"} shown`;
    pickerEmpty.hidden = visibleCount > 0;
    addVisibleButton.disabled = visibleCount === 0 || visibleSelectedCount === visibleCount;
    removeVisibleButton.disabled = visibleSelectedCount === 0;
  }

  function visibleCards() {
    return cards.filter((card) => !card.hidden);
  }

  function metadataText() {
    const labels = {
      testRunId: "Test run ID",
      targetName: "Target name",
      targetId: "Target",
      state: "Release, state or scope",
      wcagVersion: "Standard",
      conformanceTarget: "Conformance target",
      scopeDescription: "Evaluation scope",
      environment: "Environment",
      tester: "Tester",
    };
    return Object.entries(labels)
      .map(([key, label]) => `${label}: ${runMeta[key] || "Not recorded"}`)
      .join("\n");
  }

  async function copyPlan() {
    const lines = ["Accessibility test plan", metadataText(), ""];
    selectedCards().forEach((card, index) => {
      const result = resultFor(card.dataset.testId);
      const criteria = getCriteria(card);
      const outcomes = criteria
        .map((criterion) => `${criterion}: ${result.outcomes[criterion] || "not recorded"}`)
        .join(", ");
      lines.push(
        `${index + 1}. ${card.dataset.testId} — ${testTitle(card)}`,
        `   Procedure: ${new URL(card.dataset.testTarget, window.location.href).href}`,
        `   Criteria: ${criteria.join(", ")}`,
        `   Status: ${result.status}; outcomes: ${outcomes}`,
      );
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      announce("Test plan and recorded results copied.");
    } catch {
      announce("Copy failed. Export the CSV instead.");
    }
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function procedureUrl(card) {
    return new URL(card.dataset.testTarget, window.location.href).href;
  }

  function exportRows() {
    const rows = [CSV_HEADERS];
    selectedCards().forEach((card) => {
      const result = resultFor(card.dataset.testId);
      getCriteria(card).forEach((criterion) => {
        rows.push([
          REPORT_SCHEMA_VERSION,
          runMeta.testRunId || "",
          card.dataset.testId,
          testTitle(card),
          criterion,
          runMeta.targetName || "",
          runMeta.targetId || "",
          runMeta.state || "",
          runMeta.environment || "",
          result.status,
          result.outcomes[criterion] || "",
          result.actualResult,
          result.evidenceReference,
          result.issueId,
          result.limitation,
          runMeta.tester || "",
          result.testDate || (result.status === "complete" ? localDate() : ""),
          runMeta.reviewer || "",
          runMeta.reviewDate || "",
          procedureUrl(card),
        ]);
      });
    });
    return rows;
  }

  function downloadFile(contents, filename, type) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function exportFileBase() {
    return (runMeta.testRunId || "accessibility-test-results")
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "accessibility-test-results";
  }

  function exportCsv() {
    const csv = exportRows()
      .map((row) => row.map(csvEscape).join(","))
      .join("\r\n");
    downloadFile(csv, `${exportFileBase()}.csv`, "text/csv;charset=utf-8");
    announce("Working results CSV exported.");
  }

  function humanStatus(value) {
    return String(value || "not recorded")
      .replaceAll("_", " ")
      .replace(/^./, (character) => character.toUpperCase());
  }

  function buildReportData() {
    const chosenCards = selectedCards();
    const findings = chosenCards.flatMap((card) => {
      const result = resultFor(card.dataset.testId);
      return getCriteria(card).map((criterion) => ({
        testCaseId: card.dataset.testId,
        testCaseTitle: testTitle(card),
        testKind: card.dataset.testKind,
        procedureUrl: procedureUrl(card),
        wcagSuccessCriterion: criterion,
        executionStatus: result.status,
        criterionOutcome: result.outcomes[criterion] || "not_recorded",
        actualResult: result.actualResult || "",
        evidenceReference: result.evidenceReference || "",
        issueId: result.issueId || "",
        limitation: result.limitation || "",
        tester: runMeta.tester || "",
        testDate: result.testDate || (result.status === "complete" ? localDate() : ""),
      }));
    });
    const statusCounts = Object.fromEntries(
      Array.from(EXECUTION_STATUSES, (status) => [
        status,
        chosenCards.filter((card) => resultFor(card.dataset.testId).status === status).length,
      ]),
    );
    const outcomeCounts = {
      pass: findings.filter((finding) => finding.criterionOutcome === "pass").length,
      fail: findings.filter((finding) => finding.criterionOutcome === "fail").length,
      notApplicable: findings.filter(
        (finding) => finding.criterionOutcome === "not_applicable",
      ).length,
      notRecorded: findings.filter(
        (finding) => finding.criterionOutcome === "not_recorded",
      ).length,
    };

    return {
      schemaVersion: REPORT_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      generator: "CarlasHub Accessibility Test Case Manager",
      methodology: {
        name: "Website Accessibility Conformance Evaluation Methodology (WCAG-EM) 2.0",
        version: "W3C Group Note, 23 July 2026",
        uri: "https://www.w3.org/TR/wcag-em-2/",
        statement:
          "This CarlasHub report is structured around WCAG-EM 2.0. It is not a W3C conformance claim, certification or endorsement.",
      },
      evaluation: {
        testRunId: runMeta.testRunId || "",
        targetName: runMeta.targetName || "",
        targetId: runMeta.targetId || "",
        state: runMeta.state || "",
        commissioner: runMeta.commissioner || "",
        evaluationStart: runMeta.evaluationStart || "",
        evaluationEnd: runMeta.evaluationEnd || "",
        wcagVersion: runMeta.wcagVersion || "WCAG 2.2",
        conformanceTarget: runMeta.conformanceTarget || "AA",
        scopeDescription: runMeta.scopeDescription || "",
        excludedScope: runMeta.excludedScope || "",
        accessibilitySupport: runMeta.accessibilitySupport || "",
        environment: runMeta.environment || "",
        technologies: runMeta.technologies || "",
        commonViews: runMeta.commonViews || "",
        essentialFunctions: runMeta.essentialFunctions || "",
        sampleMethod: runMeta.sampleMethod || "",
        structuredSample: runMeta.structuredSample || "",
        randomSample: runMeta.randomSample || "",
        completeProcesses: runMeta.completeProcesses || "",
        evaluationSummary: runMeta.evaluationSummary || "",
        reportLimitations: runMeta.reportLimitations || "",
        tester: runMeta.tester || "",
        reviewer: runMeta.reviewer || "",
        reviewDate: runMeta.reviewDate || "",
      },
      summary: {
        selectedTests: chosenCards.length,
        completedTests: statusCounts.complete,
        criterionChecks: findings.length,
        statusCounts,
        outcomeCounts,
      },
      sample: chosenCards.map((card) => ({
        testCaseId: card.dataset.testId,
        title: testTitle(card),
        kind: card.dataset.testKind,
        wcagSuccessCriteria: getCriteria(card),
        procedureUrl: procedureUrl(card),
      })),
      findings,
    };
  }

  function htmlEscape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function reportText(value) {
    return htmlEscape(value || "Not recorded").replaceAll("\n", "<br>");
  }

  function definitionList(entries) {
    return `<dl>${entries
      .map(
        ([term, value]) =>
          `<div><dt>${htmlEscape(term)}</dt><dd>${reportText(value)}</dd></div>`,
      )
      .join("")}</dl>`;
  }

  function buildReportHtml(data) {
    const { evaluation, summary, sample, findings, methodology } = data;
    const sampleRows = sample
      .map(
        (item) => `<tr>
          <th scope="row"><a href="${htmlEscape(item.procedureUrl)}">${htmlEscape(item.testCaseId)}</a><span>${htmlEscape(item.title)}</span></th>
          <td>${htmlEscape(humanStatus(item.kind))}</td>
          <td>${htmlEscape(item.wcagSuccessCriteria.join(", "))}</td>
        </tr>`,
      )
      .join("");
    const findingRows = findings
      .map(
        (finding) => `<tr>
          <th scope="row"><a href="${htmlEscape(finding.procedureUrl)}">${htmlEscape(finding.testCaseId)}</a><span>${htmlEscape(finding.testCaseTitle)}</span></th>
          <td>${htmlEscape(finding.wcagSuccessCriterion)}</td>
          <td>${htmlEscape(humanStatus(finding.executionStatus))}</td>
          <td>${htmlEscape(humanStatus(finding.criterionOutcome))}</td>
          <td>${reportText(finding.actualResult)}</td>
          <td>${reportText(finding.evidenceReference)}</td>
          <td>${reportText(finding.issueId)}</td>
          <td>${reportText(finding.limitation)}</td>
        </tr>`,
      )
      .join("");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(evaluation.testRunId || "Accessibility evaluation")} — CarlasHub</title>
  <style>
    :root { color-scheme: light; font: 100%/1.55 Arial, sans-serif; color: #202124; background: #f8f9fa; }
    body { margin: 0; }
    main { width: min(76rem, calc(100% - 2rem)); margin: 0 auto; padding: 3rem 0 5rem; }
    header, section { background: #fff; border: 1px solid #dadce0; border-radius: .75rem; margin-block: 1rem; padding: clamp(1rem, 3vw, 2rem); }
    header { border-top: .4rem solid #1a73e8; }
    h1, h2 { line-height: 1.2; color: #174ea6; }
    a { color: #1967d2; }
    .notice { border-left: .3rem solid #f9ab00; padding-left: 1rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: .75rem; padding: 0; list-style: none; }
    .summary li { padding: 1rem; background: #e8f0fe; border-radius: .5rem; }
    .summary strong { display: block; font-size: 1.7rem; color: #174ea6; }
    dl { display: grid; grid-template-columns: minmax(12rem, 1fr) 3fr; }
    dl div { display: contents; }
    dt, dd { margin: 0; padding: .65rem; border-top: 1px solid #e8eaed; }
    dt { font-weight: 700; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .92rem; }
    caption { text-align: left; font-weight: 700; padding-block: 0 1rem; }
    th, td { text-align: left; vertical-align: top; border: 1px solid #dadce0; padding: .65rem; }
    thead th { background: #e8f0fe; }
    tbody th span { display: block; font-weight: 400; min-width: 12rem; }
    footer { color: #5f6368; margin-top: 2rem; }
    @media (max-width: 42rem) { dl { display: block; } dl div { display: block; } dd { padding-top: 0; border-top: 0; } }
    @media print { :root { background: #fff; font-size: 10pt; } main { width: 100%; padding: 0; } header, section { break-inside: avoid; border-radius: 0; } a { color: inherit; } }
  </style>
</head>
<body>
<main>
  <header>
    <p>CarlasHub accessibility evaluation</p>
    <h1>${reportText(evaluation.targetName || evaluation.targetId || "Accessibility evaluation")}</h1>
    <p>Test run ${reportText(evaluation.testRunId)} · generated ${htmlEscape(data.generatedAt)}</p>
    <p class="notice">${htmlEscape(methodology.statement)}</p>
  </header>
  <section aria-labelledby="summary-title">
    <h2 id="summary-title">Evaluation summary</h2>
    <ul class="summary">
      <li><strong>${summary.selectedTests}</strong> selected tests</li>
      <li><strong>${summary.completedTests}</strong> completed tests</li>
      <li><strong>${summary.outcomeCounts.pass}</strong> pass outcomes</li>
      <li><strong>${summary.outcomeCounts.fail}</strong> fail outcomes</li>
      <li><strong>${summary.outcomeCounts.notApplicable}</strong> not applicable</li>
      <li><strong>${summary.outcomeCounts.notRecorded}</strong> not recorded</li>
    </ul>
    <h3>Evaluator summary</h3>
    <p>${reportText(evaluation.evaluationSummary)}</p>
  </section>
  <section aria-labelledby="scope-title">
    <h2 id="scope-title">1. Define the evaluation scope</h2>
    ${definitionList([
      ["Target", evaluation.targetName],
      ["Target ID or URL", evaluation.targetId],
      ["Release, state or scope", evaluation.state],
      ["Scope description", evaluation.scopeDescription],
      ["Excluded from scope", evaluation.excludedScope],
      ["Standard", `${evaluation.wcagVersion} — ${evaluation.conformanceTarget === "No conformance target" ? evaluation.conformanceTarget : `Level ${evaluation.conformanceTarget}`}`],
      ["Accessibility support baseline", evaluation.accessibilitySupport],
      ["Commissioner or owner", evaluation.commissioner],
      ["Evaluation dates", [evaluation.evaluationStart, evaluation.evaluationEnd].filter(Boolean).join(" to ")],
    ])}
  </section>
  <section aria-labelledby="explore-title">
    <h2 id="explore-title">2. Explore the target website</h2>
    ${definitionList([
      ["Technologies relied on", evaluation.technologies],
      ["Common views and states", evaluation.commonViews],
      ["Essential functions and journeys", evaluation.essentialFunctions],
      ["Test environment", evaluation.environment],
    ])}
  </section>
  <section aria-labelledby="sample-title">
    <h2 id="sample-title">3. Select a representative sample</h2>
    ${definitionList([
      ["Sampling method", evaluation.sampleMethod],
      ["Structured sample", evaluation.structuredSample],
      ["Random sample", evaluation.randomSample],
      ["Complete processes", evaluation.completeProcesses],
    ])}
    <h3>Selected test sample</h3>
    <div class="table-wrap"><table>
      <caption>${summary.selectedTests} tests selected for this evaluation</caption>
      <thead><tr><th scope="col">Test</th><th scope="col">Type</th><th scope="col">WCAG success criteria</th></tr></thead>
      <tbody>${sampleRows}</tbody>
    </table></div>
  </section>
  <section aria-labelledby="findings-title">
    <h2 id="findings-title">4. Evaluate the sample</h2>
    <div class="table-wrap"><table>
      <caption>Recorded findings for ${summary.criterionChecks} criterion checks</caption>
      <thead><tr><th scope="col">Test</th><th scope="col">WCAG SC</th><th scope="col">Status</th><th scope="col">Outcome</th><th scope="col">Actual result</th><th scope="col">Evidence</th><th scope="col">Issue</th><th scope="col">Limitation</th></tr></thead>
      <tbody>${findingRows}</tbody>
    </table></div>
  </section>
  <section aria-labelledby="report-title">
    <h2 id="report-title">5. Report the findings</h2>
    ${definitionList([
      ["Report limitations", evaluation.reportLimitations],
      ["Tester", evaluation.tester],
      ["Reviewer", evaluation.reviewer],
      ["Review date", evaluation.reviewDate],
      ["Methodology", methodology.name],
      ["Methodology version", methodology.version],
    ])}
    <p><a href="${htmlEscape(methodology.uri)}">Read WCAG-EM 2.0</a></p>
  </section>
  <footer><p>Generated by CarlasHub Accessibility Test Case Manager. Review the scope, evidence and incomplete results before sharing.</p></footer>
</main>
</body>
</html>`;
  }

  function downloadEvaluationReport() {
    const data = buildReportData();
    downloadFile(
      buildReportHtml(data),
      `${exportFileBase()}-evaluation-report.html`,
      "text/html;charset=utf-8",
    );
    announce("Readable HTML evaluation report exported.");
  }

  function downloadEvaluationData() {
    downloadFile(
      `${JSON.stringify(buildReportData(), null, 2)}\n`,
      `${exportFileBase()}-evaluation-report.json`,
      "application/json;charset=utf-8",
    );
    announce("Structured evaluation data exported as JSON.");
  }

  function updateReportReadiness(chosenCards = selectedCards()) {
    const gaps = [];
    if (!chosenCards.length) {
      reportReadiness.textContent = "Choose at least one test to prepare a report.";
      reportReadinessGaps.replaceChildren();
      reportReadinessGaps.hidden = true;
      downloadReportButton.disabled = true;
      downloadDataButton.disabled = true;
      return;
    }
    if (!runMeta.targetName && !runMeta.targetId) {
      gaps.push("Add a target name or URL.");
    }
    [
      ["scopeDescription", "Describe the evaluation scope."],
      ["accessibilitySupport", "Record the accessibility support baseline."],
      ["environment", "Record the test environment."],
      ["sampleMethod", "Explain how the sample was selected."],
      ["structuredSample", "List the structured sample."],
      ["completeProcesses", "Record complete processes, or state that none apply."],
      ["tester", "Name the tester."],
    ].forEach(([key, message]) => {
      if (!runMeta[key]) {
        gaps.push(message);
      }
    });
    const unfinished = chosenCards.filter(
      (card) => resultFor(card.dataset.testId).status !== "complete",
    ).length;
    const missingOutcomes = chosenCards.reduce(
      (total, card) =>
        total +
        getCriteria(card).filter(
          (criterion) => !resultFor(card.dataset.testId).outcomes[criterion],
        ).length,
      0,
    );
    if (unfinished) {
      gaps.push(`Finish ${unfinished} selected ${unfinished === 1 ? "test" : "tests"}.`);
    }
    if (missingOutcomes) {
      gaps.push(
        `Record ${missingOutcomes} criterion ${missingOutcomes === 1 ? "outcome" : "outcomes"}.`,
      );
    }

    reportReadiness.textContent = gaps.length
      ? `This is a draft report with ${gaps.length} ${gaps.length === 1 ? "gap" : "gaps"}. You can export it now and complete it later.`
      : "The selected tests and core reporting details are complete. Review the summary and limitations before sharing.";
    reportReadinessGaps.replaceChildren(
      ...gaps.map((message) => {
        const item = document.createElement("li");
        item.textContent = message;
        return item;
      }),
    );
    reportReadinessGaps.hidden = gaps.length === 0;
    downloadReportButton.disabled = false;
    downloadDataButton.disabled = false;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (quoted) {
        if (character === '"' && text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (character === '"') {
          quoted = false;
        } else {
          cell += character;
        }
      } else if (character === '"') {
        quoted = true;
      } else if (character === ",") {
        row.push(cell);
        cell = "";
      } else if (character === "\n") {
        row.push(cell.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += character;
      }
    }
    if (cell || row.length) {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
    }
    return rows;
  }

  async function importCsv(file) {
    const rows = parseCsv(await file.text());
    const headers = rows.shift() || [];
    const indexes = Object.fromEntries(headers.map((header, index) => [header.trim(), index]));
    if (!("test_case_id" in indexes) || !("wcag_sc" in indexes)) {
      announce("Import failed: use the CarlasHub working CSV columns.");
      return;
    }
    const importedIds = new Set();
    let importedRows = 0;
    rows.forEach((row) => {
      const identifier = row[indexes.test_case_id]?.trim();
      if (!cardById.has(identifier)) {
        return;
      }
      importedIds.add(identifier);
      importedRows += 1;
      const result = resultFor(identifier);
      const criterion = row[indexes.wcag_sc]?.trim();
      const importedOutcome = row[indexes.criterion_outcome]?.trim();
      if (
        criterion &&
        getCriteria(cardById.get(identifier)).includes(criterion) &&
        CRITERION_OUTCOMES.has(importedOutcome)
      ) {
        result.outcomes[criterion] = importedOutcome;
      }
      const importedStatus = row[indexes.execution_status]?.trim();
      if (EXECUTION_STATUSES.has(importedStatus)) {
        result.status = importedStatus;
      }
      result.actualResult = row[indexes.actual_result]?.trim() || result.actualResult;
      result.evidenceReference =
        row[indexes.evidence_reference]?.trim() || result.evidenceReference;
      result.issueId = row[indexes.issue_id]?.trim() || result.issueId;
      result.limitation = row[indexes.limitation]?.trim() || result.limitation;
      result.testDate = row[indexes.test_date]?.trim() || result.testDate;
      [
        ["test_run_id", "testRunId"],
        ["target_name", "targetName"],
        ["target_id", "targetId"],
        ["state", "state"],
        ["environment", "environment"],
        ["tester", "tester"],
        ["reviewer", "reviewer"],
        ["review_date", "reviewDate"],
      ].forEach(([column, key]) => {
        const value = row[indexes[column]]?.trim();
        if (importedRows === 1 && value) {
          runMeta[key] = value;
        }
      });
    });

    if (!importedIds.size) {
      announce("No matching CarlasHub test IDs were found in that CSV.");
      return;
    }
    selected = importedIds;
    safeWrite(RUN_META_STORAGE_KEY, runMeta);
    safeWrite(RUN_RESULTS_STORAGE_KEY, results);
    populateMetadata();
    saveAndRender();
    announce(`${importedIds.size} tests and ${importedRows} result rows imported.`);
  }

  function populateMetadata() {
    document.querySelectorAll("[data-run-meta]").forEach((input) => {
      input.value = runMeta[input.dataset.runMeta] || "";
    });
  }

  function setupStepDecks() {
    document.querySelectorAll("[data-step-deck]").forEach((deck) => {
      const tabList = deck.querySelector(".step-tabs");
      const tabs = Array.from(deck.querySelectorAll("[data-step-tab]"));
      const panels = Array.from(deck.querySelectorAll("[data-step-panel]"));
      if (!tabList || tabs.length !== panels.length || !tabs.length) {
        return;
      }
      tabList.setAttribute("role", "tablist");
      tabs.forEach((tab, index) => {
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", panels[index].id);
        tab.setAttribute("aria-selected", String(index === 0));
        tab.tabIndex = index === 0 ? 0 : -1;
        panels[index].setAttribute("role", "tabpanel");
        panels[index].setAttribute("aria-labelledby", tab.id);
        panels[index].hidden = index !== 0;
      });

      const activate = (index, focus = false) => {
        tabs.forEach((tab, tabIndex) => {
          const active = tabIndex === index;
          tab.setAttribute("aria-selected", String(active));
          tab.tabIndex = active ? 0 : -1;
          panels[tabIndex].hidden = !active;
        });
        if (focus) {
          tabs[index].focus();
        }
      };
      deck.activateStep = activate;

      tabs.forEach((tab, index) => {
        tab.addEventListener("click", (event) => {
          event.preventDefault();
          activate(index);
          history.replaceState(null, "", tab.hash);
        });
        tab.addEventListener("keydown", (event) => {
          let nextIndex = index;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            nextIndex = (index + 1) % tabs.length;
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            nextIndex = (index - 1 + tabs.length) % tabs.length;
          } else if (event.key === "Home") {
            nextIndex = 0;
          } else if (event.key === "End") {
            nextIndex = tabs.length - 1;
          } else {
            return;
          }
          event.preventDefault();
          activate(nextIndex, true);
        });
      });

      deck.querySelectorAll("[data-step-previous], [data-step-next]").forEach((link) => {
        link.addEventListener("click", (event) => {
          const targetIndex = panels.findIndex((panel) => `#${panel.id}` === link.hash);
          if (targetIndex >= 0) {
            event.preventDefault();
            activate(targetIndex);
            history.replaceState(null, "", link.hash);
            panels[targetIndex].scrollIntoView({ block: "nearest" });
          }
        });
      });
      deck.dataset.stepDeckReady = "true";
    });
  }

  function openDisclosureForHash(
    hash = window.location.hash,
    { scroll = false, focus = false } = {},
  ) {
    if (!hash || hash === "#") {
      return false;
    }
    let target;
    try {
      target = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return false;
    }
    if (!target) {
      return false;
    }
    let ancestor = target.parentElement;
    while (ancestor) {
      if (ancestor.tagName === "DETAILS") {
        ancestor.open = true;
      }
      ancestor = ancestor.parentElement;
    }
    if (target.tagName === "DETAILS") {
      target.open = true;
    }

    const panel = target.matches("[data-step-panel]")
      ? target
      : target.closest("[data-step-panel]");
    if (panel?.id) {
      const deck = panel.closest("[data-step-deck]");
      const panels = Array.from(deck?.querySelectorAll("[data-step-panel]") || []);
      const panelIndex = panels.indexOf(panel);
      if (panelIndex >= 0) {
        deck.activateStep?.(panelIndex);
      }
    }
    if (scroll) {
      target.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    if (focus) {
      const focusTarget = target.matches("details") ? target.querySelector(":scope > summary") : target;
      if (focusTarget && !focusTarget.matches("a, button, input, select, textarea, summary, [tabindex]")) {
        focusTarget.tabIndex = -1;
      }
      focusTarget?.focus({ preventScroll: true });
    }
    return true;
  }

  function setupCurrentSectionNavigation() {
    const links = Array.from(document.querySelectorAll(".library-sidebar .site-nav a[href^='#']"));
    const targets = links
      .map((link) => document.querySelector(link.hash))
      .filter(Boolean);
    if (!targets.length) {
      return;
    }
    const update = () => {
      const current =
        [...targets].reverse().find((target) => target.getBoundingClientRect().top <= 180) ||
        targets[0];
      links.forEach((link) => {
        if (link.hash === `#${current.id}`) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };
    document.addEventListener("scroll", update, { passive: true });
    update();
  }

  document.querySelectorAll("[data-filter-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      activeKind = button.dataset.filterKind;
      document.querySelectorAll("[data-filter-kind]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      applyFilters();
    });
  });

  document.querySelectorAll("[data-filter-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTheme = button.dataset.filterTheme;
      document.querySelectorAll("[data-filter-theme]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      applyFilters();
    });
  });

  searchInput.addEventListener("input", applyFilters);

  cards.forEach((card) => {
    card.querySelector("[data-test-select]").addEventListener("change", (event) => {
      setSelected(card.dataset.testId, event.currentTarget.checked);
      announce(
        event.currentTarget.checked
          ? `${card.dataset.testId} added to the plan.`
          : `${card.dataset.testId} removed from the plan.`,
      );
    });
  });

  selectionList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-test]");
    if (removeButton) {
      const removeButtons = Array.from(selectionList.querySelectorAll("[data-remove-test]"));
      const buttonIndex = removeButtons.indexOf(removeButton);
      setSelected(removeButton.dataset.removeTest, false);
      const remainingButtons = Array.from(selectionList.querySelectorAll("[data-remove-test]"));
      if (remainingButtons.length) {
        remainingButtons[Math.min(buttonIndex, remainingButtons.length - 1)].focus();
      } else {
        selectionPanel?.querySelector("summary")?.focus();
      }
      announce(`${removeButton.dataset.removeTest} removed from the plan.`);
    }
  });

  addVisibleButton.addEventListener("click", () => {
    visibleCards().forEach((card) => selected.add(card.dataset.testId));
    clearedSelection = null;
    undoButton.hidden = true;
    saveAndRender();
    announce("All shown tests added to the plan.");
  });

  removeVisibleButton.addEventListener("click", () => {
    visibleCards().forEach((card) => selected.delete(card.dataset.testId));
    clearedSelection = null;
    undoButton.hidden = true;
    saveAndRender();
    announce("All shown tests removed from the plan.");
  });

  clearButton.addEventListener("click", () => {
    clearedSelection = new Set(selected);
    selected.clear();
    undoButton.hidden = false;
    saveAndRender();
    undoButton.hidden = false;
    announce("Plan cleared. Recorded results were kept; use Undo clear to restore the plan.");
  });

  undoButton.addEventListener("click", () => {
    if (!clearedSelection) {
      return;
    }
    selected = new Set(clearedSelection);
    clearedSelection = null;
    undoButton.hidden = true;
    saveAndRender();
    announce("Cleared test plan restored.");
  });

  startTestingLink.addEventListener("click", (event) => {
    if (!selected.size) {
      event.preventDefault();
      announce("Choose at least one test before starting.");
    }
  });

  copyButton.addEventListener("click", copyPlan);
  exportButton.addEventListener("click", exportCsv);
  downloadReportButton.addEventListener("click", downloadEvaluationReport);
  downloadDataButton.addEventListener("click", downloadEvaluationData);
  importInput.addEventListener("change", async () => {
    const [file] = importInput.files;
    if (file) {
      await importCsv(file);
      importInput.value = "";
    }
  });

  document.querySelectorAll("[data-run-meta]").forEach((input) => {
    input.addEventListener("input", () => {
      runMeta[input.dataset.runMeta] = input.value.trim();
      safeWrite(RUN_META_STORAGE_KEY, runMeta);
      updateReportReadiness();
    });
  });

  currentRunTest.addEventListener("change", () => {
    currentTestId = currentRunTest.value;
    renderCurrentTest();
  });
  previousRunTest.addEventListener("click", () => moveCurrentTest(-1));
  nextRunTest.addEventListener("click", () => moveCurrentTest(1));

  runnerStatus.addEventListener("change", () => {
    const result = resultFor(currentTestId);
    const missingOutcomes = getCriteria(cardById.get(currentTestId)).filter(
      (criterion) => !result.outcomes[criterion],
    );
    if (runnerStatus.value === "complete" && missingOutcomes.length) {
      runnerStatus.value = result.status;
      runnerFeedback.textContent = `Choose an outcome for ${missingOutcomes.join(", ")} before marking this test complete.`;
      return;
    }
    result.status = runnerStatus.value;
    if (result.status === "complete") {
      result.testDate = localDate();
    }
    safeWrite(RUN_RESULTS_STORAGE_KEY, results);
    renderSelection();
  });

  criterionOutcomes.addEventListener("change", (event) => {
    const select = event.target.closest("[data-criterion-outcome]");
    if (!select) {
      return;
    }
    const result = resultFor(currentTestId);
    result.outcomes[select.dataset.criterionOutcome] = select.value;
    if (result.status === "not_started") {
      result.status = "in_progress";
    }
    safeWrite(RUN_RESULTS_STORAGE_KEY, results);
    renderSelection();
  });

  [runnerActualResult, runnerEvidenceReference, runnerIssueId, runnerLimitation].forEach(
    (field) => field.addEventListener("input", saveCurrentResult),
  );

  document.querySelectorAll("[data-disclosure-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const section = document.getElementById(button.dataset.disclosureSection);
      const shouldOpen = button.dataset.disclosureAction === "open";
      section?.querySelectorAll("details").forEach((details) => {
        details.open = shouldOpen;
      });
    });
  });

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) {
      return;
    }
    const link = event.target.closest("a[href^='#']");
    if (!link || !link.hash) {
      return;
    }
    if (link.hash === window.location.hash) {
      event.preventDefault();
      openDisclosureForHash(link.hash, { scroll: true, focus: true });
    } else {
      window.setTimeout(
        () => openDisclosureForHash(link.hash, { scroll: false, focus: false }),
        0,
      );
    }
  });

  window.addEventListener("hashchange", () => openDisclosureForHash());
  mobilePlanMedia.addEventListener("change", (event) => {
    if (selectionPanel instanceof HTMLDetailsElement && selected.size === 0) {
      selectionPanel.open = !event.matches;
    }
  });

  populateMetadata();
  setupStepDecks();
  setupCurrentSectionNavigation();
  renderSelection();
  openDisclosureForHash();
})();
