#!/usr/bin/env python3
"""Build the single-page accessibility test library from canonical JSON content."""

from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "content" / "test-cases.json"
PROCEDURES_PATH = ROOT / "content" / "component-procedures.json"
MANUAL_CHECKS_PATH = ROOT / "content" / "criterion-manual-checks.json"
INDEX_PATH = ROOT / "index.html"
ASSET_VERSION = "20260909-workflow"


THEMES = {
    "structure": {
        "label": "Structure & content",
        "description": "Page meaning, semantics, language and structured information",
    },
    "interaction": {
        "label": "Interaction",
        "description": "Keyboard, navigation, focus, pointer and dynamic controls",
    },
    "forms": {
        "label": "Forms & journeys",
        "description": "Inputs, errors, authentication and multi-step processes",
    },
    "visual": {
        "label": "Visual & layout",
        "description": "Images, colour, contrast, resizing and responsive layout",
    },
    "media": {
        "label": "Media & motion",
        "description": "Audio, video, animation, movement and flashing content",
    },
}

COMPONENT_THEMES = {
    "page-structure-headings-and-language": "structure",
    "navigation-menus-breadcrumbs-and-skip-links": "interaction",
    "links-buttons-icons-and-custom-controls": "interaction",
    "forms-labels-validation-and-submission": "forms",
    "dialogs-modals-popovers-and-tooltips": "interaction",
    "tabs-accordions-and-disclosures": "interaction",
    "tables-lists-and-grouped-content": "structure",
    "search-autocomplete-filters-and-results": "interaction",
    "images-icons-svg-charts-and-canvas": "visual",
    "carousels-animation-and-dynamic-updates": "media",
    "audio-video-captions-and-media-controls": "media",
    "pointer-touch-dragging-and-target-size": "interaction",
    "authentication-timeouts-and-multi-step-processes": "forms",
    "responsive-zoom-orientation-and-text-spacing": "visual",
}

WCAG_THEMES = {
    "page-structure-and-language": "structure",
    "images-and-visual-text": "visual",
    "instructions-and-colour": "visual",
    "responsive-layout-and-spacing": "visual",
    "contrast": "visual",
    "hover-and-focus-content": "interaction",
    "keyboard-and-focus": "interaction",
    "character-shortcuts": "interaction",
    "navigation-links-and-help": "interaction",
    "pointer-touch-and-motion": "interaction",
    "form-names-and-instructions": "forms",
    "form-errors-and-status": "forms",
    "timeouts-data-and-authentication": "forms",
    "automatic-audio-and-moving-content": "media",
    "prerecorded-media": "media",
    "live-media": "media",
    "flashing-content": "media",
}


def escape(value: object) -> str:
    return html.escape(str(value), quote=True)


def count_label(count: int, singular: str, plural: str | None = None) -> str:
    label = singular if count == 1 else (plural or f"{singular}s")
    return f"{count} {label}"


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def criterion_anchor(criterion_id: str) -> str:
    return f"wcag-{criterion_id.replace('.', '-')}"


def criterion_link(criterion: dict) -> str:
    return (
        f'<li><a class="criterion-link" href="#{criterion_anchor(criterion["id"])}">'
        f'<span class="criterion-number">SC {escape(criterion["id"])}</span>'
        f'<span class="criterion-title">{escape(criterion["title"])}</span>'
        f'<span class="criterion-level">Level {escape(criterion["level"])}</span>'
        f'</a></li>'
    )


def theme_chip(theme: str) -> str:
    return (
        f'<span class="theme-chip theme-{escape(theme)}">'
        f'{escape(THEMES[theme]["label"])}</span>'
    )


def render_picker_card(
    *,
    identifier: str,
    title: str,
    summary: str,
    target: str,
    kind: str,
    theme: str,
    step_count: int,
    criterion_count: int,
    criteria: list[str],
    search_text: str,
) -> str:
    control_id = f"pick-{identifier.lower()}"
    kind_label = "Component" if kind == "component" else "WCAG group"
    description_id = f"{control_id}-description"
    return f"""        <article class="test-picker-card theme-{escape(theme)}" data-test-card data-test-id="{escape(identifier)}" data-test-kind="{escape(kind)}" data-test-theme="{escape(theme)}" data-test-target="#{escape(target)}" data-test-criteria="{escape(','.join(criteria))}" data-search-text="{escape(search_text.lower())}">
          <div class="picker-card-identity">
            <span class="test-id" aria-hidden="true">{escape(identifier)}</span>
            <div>
              <h3 data-test-title><a href="#{escape(target)}">{escape(title)}</a></h3>
              <p id="{description_id}">{escape(summary)}</p>
            </div>
          </div>
          <div class="picker-card-details">
            {theme_chip(theme)}
            <span class="picker-card-meta">{escape(kind_label)} · {count_label(step_count, "step")} · {count_label(criterion_count, "criterion", "criteria")}</span>
          </div>
          <div class="picker-card-actions">
            <label class="picker-select" for="{control_id}">
              <input id="{control_id}" type="checkbox" name="selected-tests" value="{escape(identifier)}" aria-describedby="{description_id}" data-test-select>
              <span>Add<span class="visually-hidden"> {escape(identifier)} {escape(title)} to my test plan</span></span>
            </label>
            <a class="open-test" href="#{escape(target)}">Open test<span class="visually-hidden"> {escape(identifier)} {escape(title)}</span></a>
          </div>
        </article>"""


def render_test_picker(library: dict, component_library: dict) -> str:
    cards = []
    for procedure in component_library["procedures"]:
        theme = COMPONENT_THEMES[procedure["slug"]]
        searchable = " ".join(
            [
                procedure["id"],
                procedure["title"],
                procedure["summary"],
                *procedure["applies_to"],
                *procedure["criteria"],
            ]
        )
        cards.append(
            render_picker_card(
                identifier=procedure["id"],
                title=procedure["title"],
                summary=procedure["summary"],
                target=f'procedure-{procedure["slug"]}',
                kind="component",
                theme=theme,
                step_count=len(procedure["how_to_test"]),
                criterion_count=len(procedure["criteria"]),
                criteria=procedure["criteria"],
                search_text=searchable,
            )
        )
    for test_case in library["test_cases"]:
        theme = WCAG_THEMES[test_case["slug"]]
        searchable = " ".join(
            [
                test_case["id"],
                test_case["title"],
                test_case["summary"],
                test_case["affected_users"],
                *(criterion["id"] for criterion in test_case["criteria"]),
                *(criterion["title"] for criterion in test_case["criteria"]),
            ]
        )
        cards.append(
            render_picker_card(
                identifier=test_case["id"],
                title=test_case["title"],
                summary=test_case["summary"],
                target=f'test-{test_case["slug"]}',
                kind="wcag",
                theme=theme,
                step_count=len(test_case["steps"]),
                criterion_count=len(test_case["criteria"]),
                criteria=[criterion["id"] for criterion in test_case["criteria"]],
                search_text=searchable,
            )
        )

    theme_filters = "".join(
        f'<button class="filter-chip theme-{escape(theme)}" type="button" '
        f'data-filter-theme="{escape(theme)}" aria-pressed="false" '
        f'title="{escape(details["description"])}">{escape(details["label"])}</button>'
        for theme, details in THEMES.items()
    )
    return f"""    <section class="test-picker-shell" id="choose-tests" aria-labelledby="test-picker-title">
      <div class="picker-heading">
        <div>
          <p class="eyebrow">Test catalogue</p>
          <h2 id="test-picker-title">Choose a test</h2>
          <p>Search by component, task or WCAG criterion. Add relevant tests to the plan in the sidebar, or open one directly.</p>
        </div>
        <p class="picker-tip"><strong>Start with components:</strong> choose what is present on the page, then add WCAG groups to complete coverage.</p>
      </div>
      <form class="test-picker" id="test-picker-form">
        <div class="picker-toolbar">
          <div class="search-field">
            <label for="test-search">Search tests</label>
            <input id="test-search" type="search" autocomplete="off" placeholder="Try forms, keyboard, 1.4.3 or video" aria-describedby="test-search-hint">
            <span id="test-search-hint">Searches test names, summaries and covered WCAG criteria.</span>
          </div>
          <fieldset class="filter-fieldset">
            <legend>Test type</legend>
            <div class="filter-chips" data-filter-group="kind">
              <button class="filter-chip" type="button" data-filter-kind="all" aria-pressed="true">All <span>31</span></button>
              <button class="filter-chip" type="button" data-filter-kind="component" aria-pressed="false">Components <span>14</span></button>
              <button class="filter-chip" type="button" data-filter-kind="wcag" aria-pressed="false">WCAG groups <span>17</span></button>
            </div>
          </fieldset>
          <fieldset class="filter-fieldset theme-filter-fieldset">
            <legend>Theme</legend>
            <div class="filter-chips" data-filter-group="theme">
              <button class="filter-chip" type="button" data-filter-theme="all" aria-pressed="true">All themes</button>
              {theme_filters}
            </div>
          </fieldset>
        </div>
        <div class="picker-results">
          <div class="picker-results-header">
            <p class="results-status" id="test-picker-status" role="status" aria-live="polite">31 tests shown</p>
            <div class="visible-selection-actions">
              <button class="text-action" type="button" id="select-visible-tests">Add all shown</button>
              <button class="text-action" type="button" id="remove-visible-tests" disabled>Remove shown</button>
            </div>
          </div>
          <div class="test-picker-grid" id="test-picker-grid">
{chr(10).join(cards)}
          </div>
          <p class="no-results" id="test-picker-empty" hidden>No tests match those filters. Clear the search or choose another theme.</p>
        </div>
      </form>
      <noscript><p class="callout">Search and test-plan selection require JavaScript. The complete test catalogue remains available in the disclosure panels below.</p></noscript>
    </section>"""


def page_shell(content: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="CarlasHub accessibility test case manager for WCAG 2.2 Level A and Level AA testing.">
  <meta name="theme-color" content="#174ea6">
  <meta property="og:title" content="Accessibility test case manager | CarlasHub">
  <meta property="og:description" content="Choose, organise and run WCAG 2.2 Level A and Level AA accessibility test cases.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://carlashub.github.io/a11y-test-cases/">
  <meta name="twitter:card" content="summary">
  <link rel="canonical" href="https://carlashub.github.io/a11y-test-cases/">
  <title>Accessibility test case manager | CarlasHub</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/styles.css?v={ASSET_VERSION}">
  <script src="assets/app.js?v={ASSET_VERSION}" defer></script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <div class="site-shell">
    <div class="app-frame">
      <aside class="library-sidebar" aria-label="Test case navigation and test plan">
        <div class="sidebar-inner">
          <a class="brand" href="#page-title" aria-label="CarlasHub accessibility test case manager home">
            <span class="brand-name">CarlasHub</span>
            <span class="brand-subtitle">Accessibility test case manager</span>
          </a>
          <nav class="sidebar-group" aria-labelledby="library-nav-title">
            <h2 id="library-nav-title">Test case manager</h2>
            <ul class="site-nav">
              <li><a href="#before-testing">Before testing</a></li>
              <li><a href="#choose-tests">Choose tests <span>31</span></a></li>
              <li><a href="#run-test-plan">Run test plan</a></li>
              <li><a href="#component-procedures">Component procedures <span>14</span></a></li>
              <li><a href="#wcag-test-groups">WCAG test groups <span>17</span></a></li>
              <li><a href="04-templates/test-results.csv">Results CSV</a></li>
            </ul>
          </nav>
          <details class="selection-panel" aria-labelledby="selection-title" open>
            <summary class="selection-heading">
              <span class="selection-title" id="selection-title">My test plan</span>
              <span class="selection-count" id="selection-count" aria-label="Selected tests">0</span>
            </summary>
            <label class="progress-label" for="plan-progress">Selected tests</label>
            <progress id="plan-progress" max="31" value="0">0 of 31 selected</progress>
            <p class="progress-text" id="plan-progress-text">0 of 31 selected</p>
            <p id="selection-empty">Add tests from the catalogue. Your choices are saved in this browser.</p>
            <ol class="selection-list" id="selection-list"></ol>
            <p class="coverage-summary" id="coverage-summary">0 of 55 criteria represented</p>
            <details class="coverage-gaps">
              <summary id="coverage-gaps-summary">55 criteria not yet represented</summary>
              <ul id="coverage-gaps-list"></ul>
              <p>Representation is a planning aid, not proof of WCAG conformance.</p>
            </details>
            <div class="selection-actions">
              <a class="start-testing is-disabled" id="start-testing" href="#run-test-plan" aria-disabled="true">Start testing</a>
              <button type="button" id="copy-test-plan" disabled>Copy test plan</button>
              <button class="secondary-action" type="button" id="export-test-plan" disabled>Export CSV</button>
              <label class="import-test-plan" for="import-test-plan">Import CSV</label>
              <input class="visually-hidden" type="file" id="import-test-plan" accept=".csv,text/csv">
              <button class="secondary-action" type="button" id="clear-test-plan" disabled>Clear plan</button>
              <button class="text-action" type="button" id="undo-clear-test-plan" hidden>Undo clear</button>
            </div>
            <p class="selection-feedback" id="selection-feedback" role="status" aria-live="polite"></p>
          </details>
        </div>
      </aside>
      <div class="library-workspace">
        <main id="main-content" tabindex="-1">
{content}
        </main>
      </div>
    </div>
  </div>
</body>
</html>
"""


def render_step_deck(
    steps: list[dict],
    *,
    deck_id: str,
    record_key: str,
    record_label: str,
    label: str,
) -> str:
    tabs = []
    panels = []
    total_steps = len(steps)
    for index, step in enumerate(steps, start=1):
        tab_id = f"{deck_id}-tab-{index}"
        panel_id = f"{deck_id}-step-{index}"
        tabs.append(
            f'<a class="step-tab" id="{escape(tab_id)}" href="#{escape(panel_id)}" '
            f'data-step-tab><span>Step</span> {index}</a>'
        )
        panels.append(
            f"""<section class="step-panel" id="{escape(panel_id)}" data-step-panel tabindex="-1">
              <div class="step-card-heading">
                <p class="step-position">Step {index} of {total_steps}</p>
                <p class="step-action"><strong>Action</strong><span>{escape(step['action'])}</span></p>
              </div>
              <dl class="step-card-detail">
                <div class="expected-result"><dt>Expected result</dt><dd>{escape(step['expected'])}</dd></div>
                <div class="record-result"><dt>{escape(record_label)}</dt><dd>{escape(step[record_key])}</dd></div>
              </dl>
              <div class="step-panel-actions">
                {f'<a href="#{deck_id}-step-{index - 1}" data-step-previous>Previous step</a>' if index > 1 else '<span></span>'}
                {f'<a href="#{deck_id}-step-{index + 1}" data-step-next>Next step</a>' if index < total_steps else '<span class="step-complete">Final step</span>'}
              </div>
            </section>"""
        )
    return f"""<div class="step-deck" data-step-deck>
            <p class="step-deck-help">Choose a numbered step. Use Left and Right Arrow keys when the tabs have focus.</p>
            <div class="step-tabs" data-step-label="{escape(label)}">
              {''.join(tabs)}
            </div>
            <div class="step-panels">
              {''.join(panels)}
            </div>
          </div>"""


def render_component_procedures(library: dict, component_library: dict) -> str:
    criteria_by_id = {
        criterion["id"]: criterion
        for test_case in library["test_cases"]
        for criterion in test_case["criteria"]
    }
    articles = []
    for procedure in component_library["procedures"]:
        theme = COMPONENT_THEMES[procedure["slug"]]
        applies_to = "".join(f"<li>{escape(item)}</li>" for item in procedure["applies_to"])
        expectations = "".join(
            f"<li>{escape(item)}</li>" for item in procedure["what_should_happen"]
        )
        steps = render_step_deck(
            procedure["how_to_test"],
            deck_id=f'component-{procedure["slug"]}',
            record_key="record",
            record_label="Record",
            label=f'{procedure["id"]} test steps',
        )
        evidence = "".join(f"<li>{escape(item)}</li>" for item in procedure["record"])
        failures = "".join(
            f"<li>{escape(item)}</li>" for item in procedure["common_failures"]
        )
        criteria = "".join(
            criterion_link(criteria_by_id[criterion_id]) for criterion_id in procedure["criteria"]
        )
        articles.append(
            f"""      <details class="test-disclosure component-disclosure theme-{escape(theme)}" id="procedure-{escape(procedure['slug'])}">
        <summary>
          <span class="summary-identity">{escape(procedure['id'])}</span>
          <h3 class="summary-title">{escape(procedure['title'])}</h3>
          {theme_chip(theme)}
          <span class="summary-meta">{count_label(len(procedure['how_to_test']), "step")} · {count_label(len(procedure['criteria']), "criterion", "criteria")}</span>
        </summary>
        <article class="component-procedure">
        <div class="procedure-header">
          <p>{escape(procedure['summary'])}</p>
        </div>
        <div class="procedure-overview">
          <section>
            <h4>Use this for</h4>
            <ul>{applies_to}</ul>
          </section>
          <section>
            <h4>What should happen</h4>
            <ul>{expectations}</ul>
          </section>
        </div>
        <section class="procedure-content procedure-instructions">
          <h4>How to test it — follow these steps in order</h4>
          {steps}
        </section>
        <div class="procedure-follow-up">
          <section>
            <h4>What to record</h4>
            <ul>{evidence}</ul>
          </section>
          <section>
            <h4>Related success criteria</h4>
            <ul class="criterion-links">{criteria}</ul>
          </section>
        </div>
        <div class="procedure-follow-up">
          <section>
            <h4>Common failures</h4>
            <ul>{failures}</ul>
          </section>
          <aside class="specialist-note">
            <h4>When to ask for specialist review</h4>
            <p>{escape(procedure['specialist_review'])}</p>
          </aside>
        </div>
        <p class="back-to-index"><a href="#choose-tests">Back to test catalogue</a></p>
        </article>
      </details>"""
        )
    return "\n".join(articles)


def render_criterion_decision(criterion: dict, manual_check: dict) -> str:
    normative_url = f'https://www.w3.org/TR/WCAG22/#{criterion["anchor"]}'
    methods = ", ".join(escape(method) for method in manual_check["methods"])
    steps = render_step_deck(
        manual_check["steps"],
        deck_id=f'manual-{criterion_anchor(criterion["id"])}',
        record_key="record",
        record_label="Record",
        label=f'WCAG {criterion["id"]} manual-check steps',
    )
    manual_title_id = f"{criterion_anchor(criterion['id'])}-manual-title"
    return f"""          <article class="criterion" id="{criterion_anchor(criterion['id'])}">
            <header>
              <p class="eyebrow">WCAG {escape(criterion['id'])} · Level {escape(criterion['level'])}</p>
              <h5>{escape(criterion['title'])}</h5>
            </header>
            <section class="criterion-manual-check" aria-labelledby="{manual_title_id}">
              <h6 id="{manual_title_id}">Manual check — follow these steps in order</h6>
              <p class="criterion-methods"><strong>Test with:</strong> {methods}.</p>
              {steps}
            </section>
            <h6 class="decision-title">Decide the result</h6>
            <dl class="decision-grid">
              <div class="decision pass"><dt>Pass when</dt><dd>{escape(criterion['pass'])}</dd></div>
              <div class="decision fail"><dt>Fail when</dt><dd>{escape(criterion['fail'])}</dd></div>
              <div class="decision na"><dt>Not applicable</dt><dd>{escape(criterion['not_applicable'])}</dd></div>
              <div class="decision review"><dt>Needs specialist review — execution status</dt><dd>{escape(criterion['specialist'])} Do not assign a completed criterion outcome until the review is resolved.</dd></div>
            </dl>
            <p><a href="{escape(normative_url)}">Read the normative WCAG {escape(criterion['id'])} requirement</a></p>
          </article>"""


def render_wcag_test_group(test_case: dict, manual_checks: dict[str, dict]) -> str:
    theme = WCAG_THEMES[test_case["slug"]]
    criteria_links = "".join(criterion_link(item) for item in test_case["criteria"])
    expected_outcomes = "".join(
        f"<li>{escape(step['expected'])}</li>" for step in test_case["steps"]
    )
    evidence_items = "".join(
        f"<li>{escape(step['evidence'])}</li>" for step in test_case["steps"]
    )
    use_when = "".join(f"<li>{escape(item)}</li>" for item in test_case["use_when"])
    prerequisites = "".join(
        f"<li>{escape(item)}</li>" for item in test_case["prerequisites"]
    )
    examples = "".join(
        f"<li>{escape(item)}</li>" for item in test_case["example_targets"]
    )
    mistakes = "".join(
        f"<li>{escape(item)}</li>" for item in test_case["common_mistakes"]
    )
    steps = render_step_deck(
        test_case["steps"],
        deck_id=f'wcag-group-{test_case["slug"]}',
        record_key="evidence",
        record_label="Evidence to save",
        label=f'{test_case["id"]} guided test steps',
    )
    criteria = "\n".join(
        render_criterion_decision(item, manual_checks[item["id"]])
        for item in test_case["criteria"]
    )
    return f"""      <details class="test-disclosure wcag-disclosure theme-{escape(theme)}" id="test-{escape(test_case['slug'])}">
        <summary>
          <span class="summary-identity">{escape(test_case['id'])}</span>
          <h3 class="summary-title">{escape(test_case['title'])}</h3>
          {theme_chip(theme)}
          <span class="summary-meta">{count_label(len(test_case['steps']), "guided step")} · {count_label(len(test_case['criteria']), "criterion", "criteria")}</span>
        </summary>
        <article class="wcag-test-group">
        <div class="group-header">
          <p class="group-summary">{escape(test_case['summary'])}</p>
          <p><strong>Who this affects:</strong> {escape(test_case['affected_users'])}</p>
          <h4>Covered success criteria</h4>
          <ul class="criterion-links">{criteria_links}</ul>
        </div>
        <div class="callout important">
          <h4>Record every criterion separately</h4>
          <p>A grouped test does not have one overall result. Record Pass, Fail or Not applicable for each completed criterion. If testing is incomplete, record its execution status without assigning a criterion outcome.</p>
        </div>
        <div class="group-overview">
          <section>
            <h4>When to use this test</h4>
            <ul>{use_when}</ul>
          </section>
          <section>
            <h4>What you need</h4>
            <ul>{prerequisites}</ul>
          </section>
        </div>
        <section class="group-section">
          <h4>What should happen</h4>
          <ul>{expected_outcomes}</ul>
        </section>
        <section class="group-section">
          <h4>How to test it — follow these steps in order</h4>
          {steps}
        </section>
        <section class="group-section">
          <h4>What to record</h4>
          <ul>{evidence_items}</ul>
        </section>
        <section class="criterion-decisions">
          <h4>Decide each WCAG result</h4>
          <p>Use the completed target inventory and evidence. A failure on one applicable target prevents a pass for that criterion in the tested sample.</p>
{criteria}
        </section>
        <div class="group-overview examples-and-mistakes">
          <section>
            <h4>Example targets</h4>
            <ul>{examples}</ul>
          </section>
          <section>
            <h4>Common mistakes</h4>
            <ul>{mistakes}</ul>
          </section>
        </div>
        <p class="back-to-index"><a href="#choose-tests">Back to test catalogue</a></p>
        </article>
      </details>"""


def render_index(library: dict, component_library: dict, manual_check_library: dict) -> str:
    manual_checks = {
        check["criterion_id"]: check for check in manual_check_library["checks"]
    }
    wcag_groups = "\n".join(
        render_wcag_test_group(test_case, manual_checks)
        for test_case in library["test_cases"]
    )
    content = f"""    <section class="library-introduction" aria-labelledby="page-title">
      <div>
        <p class="eyebrow">CarlasHub QA</p>
        <h1 id="page-title">Accessibility test case manager</h1>
        <p class="lede">WCAG 2.2 Level A and Level AA test cases for websites and web applications.</p>
      </div>
      <ul class="coverage-stats" aria-label="Test manager coverage">
        <li><strong>14</strong><span>component procedures</span></li>
        <li><strong>17</strong><span>WCAG test groups</span></li>
        <li><strong>55</strong><span>Level A and AA criteria</span></li>
      </ul>
      <p class="scope-note"><strong>Scope:</strong> all active WCAG 2.2 Level A and Level AA success criteria. Level AAA is outside this manager.</p>
    </section>

    <section class="before-testing" id="before-testing" aria-labelledby="before-testing-title">
      <h2 id="before-testing-title">Before testing</h2>
      <ol>
        <li>Agree the website or web application, release, languages, pages, components, states and user journeys in scope.</li>
        <li>Record the real browsers, devices, viewport sizes, input methods and assistive technologies available.</li>
        <li>Use safe test data. Do not put real user information, credentials or unnecessary personal data in evidence.</li>
        <li>Run an automated pre-check, then complete every applicable manual procedure below.</li>
        <li>Save enough evidence for another tester to identify the target and repeat the result.</li>
      </ol>
      <div class="source-guidance">
        <h3>Requirements and guidance</h3>
        <p><a href="https://www.w3.org/TR/WCAG22/">WCAG 2.2</a> contains the normative requirements. W3C <a href="https://www.w3.org/WAI/WCAG22/Understanding/">Understanding documents</a>, <a href="https://www.w3.org/WAI/WCAG22/quickref/">How to Meet WCAG</a> and the <a href="https://www.w3.org/WAI/ARIA/apg/">ARIA Authoring Practices Guide</a> are informative guidance.</p>
        <p>Use the actions in this manager to collect evidence. They are not the only valid test methods, and completing one technique does not by itself prove that a success criterion passes. Assign the result from the success criterion's requirement and all applicable content in the recorded test scope.</p>
      </div>
      <form class="run-metadata" id="run-metadata">
        <h3>Set up this test run</h3>
        <p>These details are saved only in this browser and included in copied or exported results.</p>
        <div class="metadata-grid">
          <label>Test run ID<input type="text" data-run-meta="testRunId" autocomplete="off"></label>
          <label>Target ID or URL<input type="text" data-run-meta="targetId" autocomplete="url"></label>
          <label>Release, state or scope<input type="text" data-run-meta="state" autocomplete="off"></label>
          <label>Environment<input type="text" data-run-meta="environment" placeholder="Browser, device, input and assistive technology"></label>
          <label>Tester<input type="text" data-run-meta="tester" autocomplete="name"></label>
        </div>
      </form>
      <div class="result-guidance">
        <h3>Record outcome and progress separately</h3>
        <dl>
          <div><dt>Pass — criterion outcome</dt><dd>Every applicable target and state completed for that criterion met the requirement.</dd></div>
          <div><dt>Fail — criterion outcome</dt><dd>At least one applicable target failed. Record the exact target, state, action and result.</dd></div>
          <div><dt>Not applicable — criterion outcome</dt><dd>The completed inventory contains no content or function to which the criterion applies. Do not use this when testing was blocked or incomplete.</dd></div>
          <div><dt>Needs specialist review — execution status</dt><dd>Do not assign a completed criterion outcome until the evidence has been reviewed.</dd></div>
          <div><dt>Not started, in progress or blocked — execution status</dt><dd>Use the status that describes the unfinished work. Do not assign a criterion outcome.</dd></div>
        </dl>
        <p><a href="04-templates/test-results.csv">Open the results CSV template</a></p>
      </div>
    </section>

{render_test_picker(library, component_library)}

    <section class="test-runner" id="run-test-plan" aria-labelledby="run-test-plan-title">
      <header class="section-introduction">
        <p class="eyebrow">Selected test workflow</p>
        <h2 id="run-test-plan-title">Run your test plan</h2>
        <p id="run-plan-summary">Choose at least one test to start a guided run.</p>
      </header>
      <div class="runner-empty" id="runner-empty">
        <p>Your selected tests will appear here in a repeatable sequence.</p>
        <a class="secondary-action" href="#choose-tests">Choose tests</a>
      </div>
      <div class="runner-workspace" id="runner-workspace" hidden>
        <nav class="runner-navigation" aria-label="Test run navigation">
          <button class="secondary-action" type="button" id="previous-run-test">Previous</button>
          <label for="current-run-test">Current test</label>
          <select id="current-run-test"></select>
          <button class="secondary-action" type="button" id="next-run-test">Next</button>
        </nav>
        <article class="runner-card">
          <p class="runner-position" id="runner-position"></p>
          <h3 id="runner-test-title" tabindex="-1"></h3>
          <p><a id="runner-procedure-link" href="#page-title">Open the full procedure</a></p>
          <label for="runner-status">Execution status</label>
          <select id="runner-status">
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="blocked">Blocked</option>
            <option value="needs_review">Needs specialist review</option>
            <option value="complete">Complete</option>
          </select>
          <fieldset class="criterion-outcomes" id="criterion-outcomes">
            <legend>Criterion outcomes</legend>
          </fieldset>
          <div class="runner-fields">
            <label for="runner-actual-result">Actual result<textarea id="runner-actual-result" rows="4"></textarea></label>
            <label for="runner-evidence-reference">Evidence reference<input type="text" id="runner-evidence-reference"></label>
            <label for="runner-issue-id">Issue ID<input type="text" id="runner-issue-id"></label>
            <label for="runner-limitation">Limitation or blocker<textarea id="runner-limitation" rows="2"></textarea></label>
          </div>
          <p class="runner-feedback" id="runner-feedback" role="status" aria-live="polite"></p>
        </article>
      </div>
    </section>

    <section class="component-procedures" id="component-procedures" aria-labelledby="component-procedures-title">
      <header class="section-introduction">
        <p class="eyebrow">Detailed QA procedures</p>
        <h2 id="component-procedures-title">Test common web components</h2>
        <p>Open only the procedures you need. Follow each step in order, record the listed evidence and use the linked success-criterion decisions.</p>
        <div class="section-actions" aria-label="Component procedure display controls">
          <button class="secondary-action" type="button" data-disclosure-action="open" data-disclosure-section="component-procedures">Expand all components</button>
          <button class="text-action" type="button" data-disclosure-action="close" data-disclosure-section="component-procedures">Collapse all</button>
        </div>
      </header>
{render_component_procedures(library, component_library)}
    </section>

    <section class="wcag-test-groups" id="wcag-test-groups" aria-labelledby="wcag-test-groups-title">
      <header class="section-introduction">
        <p class="eyebrow">Complete WCAG coverage</p>
        <h2 id="wcag-test-groups-title">WCAG test groups and result decisions</h2>
        <p>Open each applicable group. Every group contains its guided steps, criterion-level manual checks and separate result decisions.</p>
        <div class="section-actions" aria-label="WCAG test-group display controls">
          <button class="secondary-action" type="button" data-disclosure-action="open" data-disclosure-section="wcag-test-groups">Expand all WCAG groups</button>
          <button class="text-action" type="button" data-disclosure-action="close" data-disclosure-section="wcag-test-groups">Collapse all</button>
        </div>
      </header>
{wcag_groups}
    </section>
"""
    return page_shell(content)


def expected_outputs(
    library: dict, component_library: dict, manual_check_library: dict
) -> dict[Path, str]:
    return {
        INDEX_PATH: render_index(library, component_library, manual_check_library)
    }


def build(*, check: bool) -> int:
    library = load_json(DATA_PATH)
    component_library = load_json(PROCEDURES_PATH)
    manual_check_library = load_json(MANUAL_CHECKS_PATH)
    outputs = expected_outputs(library, component_library, manual_check_library)
    stale = []
    for path, expected in outputs.items():
        if check:
            if not path.exists() or path.read_text(encoding="utf-8") != expected:
                stale.append(path.relative_to(ROOT))
            continue
        if not path.exists() or path.read_text(encoding="utf-8") != expected:
            path.write_text(expected, encoding="utf-8")

    if stale:
        for path in stale:
            print(f"stale generated file: {path}", file=sys.stderr)
        return 1
    action = "checked" if check else "built"
    print(f"Single-page test case manager {action}: {len(outputs)} generated file.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Check output without writing files")
    arguments = parser.parse_args()
    return build(check=arguments.check)


if __name__ == "__main__":
    raise SystemExit(main())
