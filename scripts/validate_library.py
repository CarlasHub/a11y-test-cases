#!/usr/bin/env python3
"""Validate accessibility library content, coverage, links and static HTML."""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "content" / "test-cases.json"
PROCEDURES_PATH = ROOT / "content" / "component-procedures.json"
MANUAL_CHECKS_PATH = ROOT / "content" / "criterion-manual-checks.json"

EXPECTED_CRITERION_METADATA = {
    "1.1.1": ("Non-text Content", "A", "non-text-content"),
    "1.2.1": ("Audio-only and Video-only (Prerecorded)", "A", "audio-only-and-video-only-prerecorded"),
    "1.2.2": ("Captions (Prerecorded)", "A", "captions-prerecorded"),
    "1.2.3": ("Audio Description or Media Alternative (Prerecorded)", "A", "audio-description-or-media-alternative-prerecorded"),
    "1.2.4": ("Captions (Live)", "AA", "captions-live"),
    "1.2.5": ("Audio Description (Prerecorded)", "AA", "audio-description-prerecorded"),
    "1.3.1": ("Info and Relationships", "A", "info-and-relationships"),
    "1.3.2": ("Meaningful Sequence", "A", "meaningful-sequence"),
    "1.3.3": ("Sensory Characteristics", "A", "sensory-characteristics"),
    "1.3.4": ("Orientation", "AA", "orientation"),
    "1.3.5": ("Identify Input Purpose", "AA", "identify-input-purpose"),
    "1.4.1": ("Use of Color", "A", "use-of-color"),
    "1.4.2": ("Audio Control", "A", "audio-control"),
    "1.4.3": ("Contrast (Minimum)", "AA", "contrast-minimum"),
    "1.4.4": ("Resize Text", "AA", "resize-text"),
    "1.4.5": ("Images of Text", "AA", "images-of-text"),
    "1.4.10": ("Reflow", "AA", "reflow"),
    "1.4.11": ("Non-text Contrast", "AA", "non-text-contrast"),
    "1.4.12": ("Text Spacing", "AA", "text-spacing"),
    "1.4.13": ("Content on Hover or Focus", "AA", "content-on-hover-or-focus"),
    "2.1.1": ("Keyboard", "A", "keyboard"),
    "2.1.2": ("No Keyboard Trap", "A", "no-keyboard-trap"),
    "2.1.4": ("Character Key Shortcuts", "A", "character-key-shortcuts"),
    "2.2.1": ("Timing Adjustable", "A", "timing-adjustable"),
    "2.2.2": ("Pause, Stop, Hide", "A", "pause-stop-hide"),
    "2.3.1": ("Three Flashes or Below Threshold", "A", "three-flashes-or-below-threshold"),
    "2.4.1": ("Bypass Blocks", "A", "bypass-blocks"),
    "2.4.2": ("Page Titled", "A", "page-titled"),
    "2.4.3": ("Focus Order", "A", "focus-order"),
    "2.4.4": ("Link Purpose (In Context)", "A", "link-purpose-in-context"),
    "2.4.5": ("Multiple Ways", "AA", "multiple-ways"),
    "2.4.6": ("Headings and Labels", "AA", "headings-and-labels"),
    "2.4.7": ("Focus Visible", "AA", "focus-visible"),
    "2.4.11": ("Focus Not Obscured (Minimum)", "AA", "focus-not-obscured-minimum"),
    "2.5.1": ("Pointer Gestures", "A", "pointer-gestures"),
    "2.5.2": ("Pointer Cancellation", "A", "pointer-cancellation"),
    "2.5.3": ("Label in Name", "A", "label-in-name"),
    "2.5.4": ("Motion Actuation", "A", "motion-actuation"),
    "2.5.7": ("Dragging Movements", "AA", "dragging-movements"),
    "2.5.8": ("Target Size (Minimum)", "AA", "target-size-minimum"),
    "3.1.1": ("Language of Page", "A", "language-of-page"),
    "3.1.2": ("Language of Parts", "AA", "language-of-parts"),
    "3.2.1": ("On Focus", "A", "on-focus"),
    "3.2.2": ("On Input", "A", "on-input"),
    "3.2.3": ("Consistent Navigation", "AA", "consistent-navigation"),
    "3.2.4": ("Consistent Identification", "AA", "consistent-identification"),
    "3.2.6": ("Consistent Help", "A", "consistent-help"),
    "3.3.1": ("Error Identification", "A", "error-identification"),
    "3.3.2": ("Labels or Instructions", "A", "labels-or-instructions"),
    "3.3.3": ("Error Suggestion", "AA", "error-suggestion"),
    "3.3.4": ("Error Prevention (Legal, Financial, Data)", "AA", "error-prevention-legal-financial-data"),
    "3.3.7": ("Redundant Entry", "A", "redundant-entry"),
    "3.3.8": ("Accessible Authentication (Minimum)", "AA", "accessible-authentication-minimum"),
    "4.1.2": ("Name, Role, Value", "A", "name-role-value"),
    "4.1.3": ("Status Messages", "AA", "status-messages"),
}

EXPECTED_CRITERIA = {
    criterion_id: metadata[1]
    for criterion_id, metadata in EXPECTED_CRITERION_METADATA.items()
}

REQUIRED_TEST_KEYS = {
    "id",
    "slug",
    "title",
    "summary",
    "affected_users",
    "use_when",
    "prerequisites",
    "steps",
    "criteria",
    "example_targets",
    "common_mistakes",
}

REQUIRED_CRITERION_KEYS = {
    "id",
    "title",
    "level",
    "anchor",
    "pass",
    "fail",
    "not_applicable",
    "specialist",
}

REQUIRED_PROCEDURE_KEYS = {
    "id",
    "slug",
    "title",
    "summary",
    "applies_to",
    "criteria",
    "what_should_happen",
    "how_to_test",
    "record",
    "common_failures",
    "specialist_review",
}

PROHIBITED_REFERENCES = (
    "/" + "Users" + "/",
    "Down" + "loads" + "/",
    "file" + "://",
    "." + "codex" + "/",
    "." + "agents" + "/",
)

PROHIBITED_CONTEXT_TERMS = tuple(
    first + second
    for first, second in (
        ("au", "dita"),
        ("au", "dit"),
        ("market", "ing"),
        ("car", "eer"),
        ("candi", "date"),
        ("em", "ployer"),
        ("re", "cruit"),
        ("cam", "paign"),
        ("pro", "duct"),
        ("j", "ob"),
    )
)


class StaticHTMLInspector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.hrefs: list[str] = []
        self.html_lang: str | None = None
        self.main_count = 0
        self.h1_count = 0
        self.title_count = 0
        self.images_without_alt = 0
        self.label_targets: set[str] = set()
        self.input_ids: set[str] = set()
        self.skip_links = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"] or "")
        if tag == "html":
            self.html_lang = values.get("lang")
        elif tag == "main":
            self.main_count += 1
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "title":
            self.title_count += 1
        elif tag == "img" and "alt" not in values:
            self.images_without_alt += 1
        elif tag == "label" and values.get("for"):
            self.label_targets.add(values["for"] or "")
        elif tag in {"input", "select", "textarea"} and values.get("id"):
            self.input_ids.add(values["id"] or "")
        if tag == "a" and values.get("href"):
            href = values["href"] or ""
            self.hrefs.append(href)
            if "skip-link" in (values.get("class") or "").split() and href == "#main-content":
                self.skip_links += 1


def load_library() -> dict:
    with DATA_PATH.open(encoding="utf-8") as source:
        return json.load(source)


def load_component_procedures() -> dict:
    with PROCEDURES_PATH.open(encoding="utf-8") as source:
        return json.load(source)


def load_manual_checks() -> dict:
    with MANUAL_CHECKS_PATH.open(encoding="utf-8") as source:
        return json.load(source)


def validate_manual_checks(manual_check_library: dict) -> list[str]:
    errors: list[str] = []
    checks = manual_check_library.get("checks")
    if not isinstance(checks, list) or len(checks) != len(EXPECTED_CRITERIA):
        return [
            f"Manual-check content must contain exactly {len(EXPECTED_CRITERIA)} checks."
        ]

    if manual_check_library.get("expected_criteria_count") != len(EXPECTED_CRITERIA):
        errors.append("Manual-check expected_criteria_count does not match the WCAG inventory")

    seen_criteria: set[str] = set()
    for check in checks:
        criterion_id = str(check.get("criterion_id", ""))
        if criterion_id in seen_criteria:
            errors.append(f"Duplicate manual check for criterion {criterion_id}")
        seen_criteria.add(criterion_id)

        if set(check) != {"criterion_id", "methods", "steps"}:
            errors.append(f"Manual check {criterion_id or 'unknown'} has unexpected or missing keys")

        methods = check.get("methods")
        if (
            not isinstance(methods, list)
            or not methods
            or any(not str(method).strip() for method in methods)
        ):
            errors.append(f"Manual check {criterion_id or 'unknown'} has invalid methods")

        steps = check.get("steps")
        if not isinstance(steps, list) or len(steps) < 3:
            errors.append(f"Manual check {criterion_id or 'unknown'} must have at least 3 steps")
            continue
        for step_number, step in enumerate(steps, start=1):
            if not isinstance(step, dict) or set(step) != {"action", "expected", "record"}:
                errors.append(
                    f"Manual check {criterion_id or 'unknown'} step {step_number} must contain only action, expected and record"
                )
                continue
            for key in ("action", "expected", "record"):
                if not str(step[key]).strip():
                    errors.append(
                        f"Manual check {criterion_id or 'unknown'} step {step_number} has no {key}"
                    )

    missing_criteria = set(EXPECTED_CRITERIA) - seen_criteria
    extra_criteria = seen_criteria - set(EXPECTED_CRITERIA)
    if missing_criteria:
        errors.append(f"Missing criterion manual checks: {sorted(missing_criteria)}")
    if extra_criteria:
        errors.append(f"Unexpected criterion manual checks: {sorted(extra_criteria)}")
    return errors


def validate_component_procedures(component_library: dict) -> list[str]:
    errors: list[str] = []
    procedures = component_library.get("procedures")
    if not isinstance(procedures, list) or len(procedures) != 14:
        return ["Component content must contain exactly 14 procedures."]

    expected_ids = [f"CP-{number:02d}" for number in range(1, 15)]
    actual_ids = [item.get("id") for item in procedures]
    if actual_ids != expected_ids:
        errors.append(f"Component-procedure IDs must be sequential: {actual_ids}")

    seen_slugs: set[str] = set()
    for procedure in procedures:
        procedure_id = procedure.get("id", "unknown")
        missing = REQUIRED_PROCEDURE_KEYS - set(procedure)
        if missing:
            errors.append(f"{procedure_id} is missing keys: {sorted(missing)}")
            continue
        slug = procedure["slug"]
        if slug in seen_slugs:
            errors.append(f"Duplicate component-procedure slug: {slug}")
        seen_slugs.add(slug)
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            errors.append(f"Invalid slug for {procedure_id}: {slug}")
        for key in ("applies_to", "criteria", "what_should_happen", "how_to_test", "record", "common_failures"):
            values = procedure[key]
            if not isinstance(values, list) or not values or any(not str(value).strip() for value in values):
                errors.append(f"{procedure_id} has invalid or empty {key}")
        if len(procedure["what_should_happen"]) < 5:
            errors.append(f"{procedure_id} must provide at least 5 expected outcomes")
        if len(procedure["how_to_test"]) < 6:
            errors.append(f"{procedure_id} must provide at least 6 test steps")
        for step_number, step in enumerate(procedure["how_to_test"], start=1):
            if not isinstance(step, dict):
                errors.append(f"{procedure_id} step {step_number} must be a structured object")
                continue
            for key in ("action", "expected", "record"):
                if not str(step.get(key, "")).strip():
                    errors.append(f"{procedure_id} step {step_number} has no {key}")
        unknown_criteria = sorted(set(procedure["criteria"]) - set(EXPECTED_CRITERIA))
        if unknown_criteria:
            errors.append(f"{procedure_id} references unknown criteria: {unknown_criteria}")
        if not str(procedure["specialist_review"]).strip():
            errors.append(f"{procedure_id} has no specialist-review guidance")
    return errors


def validate_content(library: dict) -> list[str]:
    errors: list[str] = []
    test_cases = library.get("test_cases")
    if not isinstance(test_cases, list) or len(test_cases) != 17:
        return ["Canonical content must contain exactly 17 test cases."]

    expected_ids = [f"TC-{number:02d}" for number in range(1, 18)]
    actual_ids = [item.get("id") for item in test_cases]
    if actual_ids != expected_ids:
        errors.append(f"Test-case IDs must be sequential: {actual_ids}")

    seen_criteria: dict[str, tuple[str, str, str, str]] = {}
    seen_slugs: set[str] = set()
    for test_case in test_cases:
        missing = REQUIRED_TEST_KEYS - set(test_case)
        if missing:
            errors.append(f"{test_case.get('id', 'unknown')} is missing keys: {sorted(missing)}")
            continue
        slug = test_case["slug"]
        if slug in seen_slugs:
            errors.append(f"Duplicate test-case slug: {slug}")
        seen_slugs.add(slug)
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            errors.append(f"Invalid slug for {test_case['id']}: {slug}")
        for key in ("use_when", "prerequisites", "steps", "criteria", "example_targets", "common_mistakes"):
            if not test_case[key]:
                errors.append(f"{test_case['id']} has an empty {key} list")
        for step_number, step in enumerate(test_case["steps"], start=1):
            for key in ("action", "expected", "evidence"):
                if not str(step.get(key, "")).strip():
                    errors.append(f"{test_case['id']} step {step_number} has no {key}")
        for criterion in test_case["criteria"]:
            missing = REQUIRED_CRITERION_KEYS - set(criterion)
            if missing:
                errors.append(f"{test_case['id']} criterion is missing keys: {sorted(missing)}")
                continue
            criterion_id = criterion["id"]
            if criterion_id in seen_criteria:
                errors.append(f"Criterion {criterion_id} is mapped more than once")
            seen_criteria[criterion_id] = (
                criterion["title"],
                criterion["level"],
                criterion["anchor"],
                test_case["id"],
            )
            for key in REQUIRED_CRITERION_KEYS - {"id", "level"}:
                if not str(criterion[key]).strip():
                    errors.append(f"{test_case['id']} criterion {criterion_id} has no {key}")

    actual_criteria = set(seen_criteria)
    missing_criteria = set(EXPECTED_CRITERIA) - actual_criteria
    extra_criteria = actual_criteria - set(EXPECTED_CRITERIA)
    if missing_criteria:
        errors.append(f"Missing WCAG A/AA criteria: {sorted(missing_criteria)}")
    if extra_criteria:
        errors.append(f"Unexpected WCAG criteria: {sorted(extra_criteria)}")
    for criterion_id, expected_metadata in EXPECTED_CRITERION_METADATA.items():
        if criterion_id not in seen_criteria:
            continue
        actual_metadata = seen_criteria[criterion_id][:3]
        if actual_metadata != expected_metadata:
            errors.append(
                f"Criterion {criterion_id} metadata {actual_metadata!r} does not match "
                f"official WCAG metadata {expected_metadata!r}"
            )
    if library.get("expected_criteria_count") != len(EXPECTED_CRITERIA):
        errors.append("expected_criteria_count does not match the required WCAG inventory")
    return errors


def is_external_link(target: str) -> bool:
    return bool(urlsplit(target).scheme) or target.startswith("//")


def local_link_target(source: Path, target: str) -> Path | None:
    if not target or target.startswith("#") or is_external_link(target):
        return None
    clean_target = target.split("#", 1)[0].split("?", 1)[0]
    if not clean_target:
        return None
    return (source.parent / clean_target).resolve()


def validate_links() -> list[str]:
    errors: list[str] = []
    markdown_link = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
    for source in ROOT.rglob("*.md"):
        if ".git" in source.parts or "node_modules" in source.parts:
            continue
        for target in markdown_link.findall(source.read_text(encoding="utf-8")):
            resolved = local_link_target(source, target)
            if resolved and not resolved.exists():
                errors.append(f"Broken Markdown link in {source.relative_to(ROOT)}: {target}")

    for source in ROOT.rglob("*.html"):
        if ".git" in source.parts or "node_modules" in source.parts:
            continue
        inspector = StaticHTMLInspector()
        inspector.feed(source.read_text(encoding="utf-8"))
        for target in inspector.hrefs:
            resolved = local_link_target(source, target)
            if resolved and not resolved.exists():
                errors.append(f"Broken HTML link in {source.relative_to(ROOT)}: {target}")
            if target.endswith(".md"):
                errors.append(f"Generated HTML links directly to Markdown in {source.relative_to(ROOT)}: {target}")
    return errors


def validate_html() -> list[str]:
    errors: list[str] = []
    html_files = sorted(
        path
        for path in ROOT.rglob("*.html")
        if ".git" not in path.parts and "node_modules" not in path.parts
    )
    if not html_files:
        return ["No generated HTML files found."]
    for source in html_files:
        inspector = StaticHTMLInspector()
        inspector.feed(source.read_text(encoding="utf-8"))
        relative = source.relative_to(ROOT)
        duplicate_ids = sorted({item for item in inspector.ids if inspector.ids.count(item) > 1})
        if duplicate_ids:
            errors.append(f"Duplicate IDs in {relative}: {duplicate_ids}")
        if inspector.html_lang != "en":
            errors.append(f"Missing or incorrect html lang in {relative}")
        if inspector.main_count != 1:
            errors.append(f"Expected one main element in {relative}, found {inspector.main_count}")
        if inspector.h1_count != 1:
            errors.append(f"Expected one h1 in {relative}, found {inspector.h1_count}")
        if inspector.title_count != 1:
            errors.append(f"Expected one title in {relative}, found {inspector.title_count}")
        if inspector.skip_links != 1:
            errors.append(f"Expected one skip link in {relative}, found {inspector.skip_links}")
        if inspector.images_without_alt:
            errors.append(f"Images without alt attributes in {relative}: {inspector.images_without_alt}")
        unlabelled_inputs = inspector.input_ids - inspector.label_targets
        if unlabelled_inputs:
            errors.append(f"Inputs without explicit labels in {relative}: {sorted(unlabelled_inputs)}")
        for target in inspector.hrefs:
            if target.startswith("#") and target[1:] not in inspector.ids:
                errors.append(f"Broken page anchor in {relative}: {target}")
    relative_html_files = [path.relative_to(ROOT) for path in html_files]
    if relative_html_files != [Path("index.html")]:
        errors.append(f"The website must contain only index.html, found: {relative_html_files}")
    return errors


def validate_no_prohibited_references() -> list[str]:
    errors: list[str] = []
    checked_extensions = {".md", ".json", ".html", ".css", ".js", ".py", ".csv", ".yml", ".yaml"}
    content_extensions = {".md", ".json", ".html", ".csv", ".yml", ".yaml"}
    ignored_directories = {
        ".git",
        "node_modules",
        "__pycache__",
        ".venv",
        "venv",
        ".voice-venv",
        "tutorial-video",
    }
    for source in ROOT.rglob("*"):
        if (
            not source.is_file()
            or any(part in ignored_directories for part in source.parts)
            or source.suffix.lower() not in checked_extensions
        ):
            continue
        content = source.read_text(encoding="utf-8")
        for prohibited in PROHIBITED_REFERENCES:
            if prohibited.lower() in content.lower():
                errors.append(f"Prohibited reference {prohibited!r} in {source.relative_to(ROOT)}")
        if (
            source.suffix.lower() in content_extensions
            and not ({".github", "workflows"} <= set(source.parts))
        ):
            for term in PROHIBITED_CONTEXT_TERMS:
                if re.search(rf"\b{re.escape(term)}(?:s|ing|ed|er|ers)?\b", content, re.IGNORECASE):
                    errors.append(
                        f"Out-of-scope contextual term {term!r} in {source.relative_to(ROOT)}"
                    )
    return errors


def validate() -> list[str]:
    library = load_library()
    component_library = load_component_procedures()
    manual_check_library = load_manual_checks()
    return [
        *validate_content(library),
        *validate_component_procedures(component_library),
        *validate_manual_checks(manual_check_library),
        *validate_links(),
        *validate_html(),
        *validate_no_prohibited_references(),
    ]


def main() -> int:
    errors = validate()
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"Validation failed with {len(errors)} error(s).", file=sys.stderr)
        return 1
    manual_check_library = load_manual_checks()
    manual_step_count = sum(
        len(check["steps"]) for check in manual_check_library["checks"]
    )
    print(
        "Validation passed: one HTML page, 14 component procedures, 17 WCAG test groups, "
        f"55 criterion-level manual checks, {manual_step_count} structured manual steps, "
        "55 unique WCAG 2.2 A/AA criteria, links and repository references checked."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
