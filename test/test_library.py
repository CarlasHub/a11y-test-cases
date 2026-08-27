from __future__ import annotations

import copy
import importlib.util
import json
import re
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, path: Path):
    specification = importlib.util.spec_from_file_location(name, path)
    if specification is None or specification.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


validator = load_module("validate_library", ROOT / "scripts" / "validate_library.py")


def relative_luminance(hex_colour: str) -> float:
    channels = [int(hex_colour[index : index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in channels]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast_ratio(first: str, second: str) -> float:
    lighter, darker = sorted((relative_luminance(first), relative_luminance(second)), reverse=True)
    return (lighter + 0.05) / (darker + 0.05)


class LibraryValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.library = json.loads((ROOT / "content" / "test-cases.json").read_text(encoding="utf-8"))
        cls.component_library = json.loads(
            (ROOT / "content" / "component-procedures.json").read_text(encoding="utf-8")
        )
        cls.manual_check_library = json.loads(
            (ROOT / "content" / "criterion-manual-checks.json").read_text(encoding="utf-8")
        )

    def test_complete_wcag_a_aa_inventory(self) -> None:
        mapped = {
            criterion["id"]: criterion["level"]
            for test_case in self.library["test_cases"]
            for criterion in test_case["criteria"]
        }
        self.assertEqual(validator.EXPECTED_CRITERIA, mapped)
        self.assertEqual(55, len(mapped))
        self.assertNotIn("4.1.1", mapped)
        self.assertNotIn("AAA", mapped.values())

    def test_official_wcag_metadata_is_locked(self) -> None:
        mapped = {
            criterion["id"]: (
                criterion["title"],
                criterion["level"],
                criterion["anchor"],
            )
            for test_case in self.library["test_cases"]
            for criterion in test_case["criteria"]
        }
        self.assertEqual(validator.EXPECTED_CRITERION_METADATA, mapped)

    def test_validator_rejects_changed_official_wcag_metadata(self) -> None:
        changed_library = copy.deepcopy(self.library)
        changed_library["test_cases"][0]["criteria"][0]["title"] = "Changed title"
        errors = validator.validate_content(changed_library)
        self.assertTrue(
            any("does not match official WCAG metadata" in error for error in errors),
            errors,
        )

    def test_canonical_content_validation(self) -> None:
        self.assertEqual([], validator.validate_content(self.library))
        self.assertEqual([], validator.validate_component_procedures(self.component_library))
        self.assertEqual([], validator.validate_manual_checks(self.manual_check_library))

    def test_every_active_criterion_has_a_structured_manual_check(self) -> None:
        checks = {
            check["criterion_id"]: check for check in self.manual_check_library["checks"]
        }
        self.assertEqual(set(validator.EXPECTED_CRITERIA), set(checks))
        self.assertEqual(55, len(checks))
        self.assertEqual(165, sum(len(check["steps"]) for check in checks.values()))
        self.assertNotIn("4.1.1", checks)
        for criterion_id, check in checks.items():
            self.assertTrue(check["methods"], criterion_id)
            self.assertGreaterEqual(len(check["steps"]), 3, criterion_id)
            for step in check["steps"]:
                self.assertEqual({"action", "expected", "record"}, set(step), criterion_id)
                self.assertTrue(all(step.values()), criterion_id)

    def test_generated_output_is_current(self) -> None:
        completed = subprocess.run(
            [sys.executable, "scripts/build_site.py", "--check"],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(0, completed.returncode, completed.stderr)

    def test_local_links_resolve(self) -> None:
        self.assertEqual([], validator.validate_links())

    def test_static_html_baseline(self) -> None:
        self.assertEqual([], validator.validate_html())

    def test_no_prohibited_repository_references(self) -> None:
        self.assertEqual([], validator.validate_no_prohibited_references())

    def test_minimal_palette_text_pairs_meet_contrast(self) -> None:
        stylesheet = (ROOT / "assets" / "styles.css").read_text(encoding="utf-8")

        def colour(variable: str) -> str:
            match = re.search(rf"--{variable}:\s*(#[0-9a-fA-F]{{6}})", stylesheet)
            self.assertIsNotNone(match, f"Missing --{variable} colour variable")
            return match.group(1)

        paper = colour("paper")
        self.assertGreaterEqual(contrast_ratio(colour("accent"), paper), 4.5)
        self.assertGreaterEqual(contrast_ratio(colour("accent-strong"), paper), 4.5)
        self.assertGreaterEqual(contrast_ratio(colour("ink"), paper), 4.5)
        self.assertGreaterEqual(contrast_ratio(colour("muted"), paper), 4.5)
        self.assertGreaterEqual(contrast_ratio(colour("navy"), paper), 4.5)

        for theme in ("structure", "interaction", "forms", "visual", "media"):
            block = re.search(
                rf"\.theme-{theme}\s*\{{(?P<rules>[^}}]+)\}}",
                stylesheet,
            )
            self.assertIsNotNone(block, f"Missing {theme} theme")
            background = re.search(r"--theme-bg:\s*(#[0-9a-fA-F]{6})", block.group("rules"))
            text = re.search(r"--theme-ink:\s*(#[0-9a-fA-F]{6})", block.group("rules"))
            self.assertIsNotNone(background, f"Missing {theme} theme background")
            self.assertIsNotNone(text, f"Missing {theme} theme text")
            self.assertGreaterEqual(
                contrast_ratio(text.group(1), background.group(1)),
                4.5,
                theme,
            )

    def test_homepage_has_picker_and_focused_disclosures(self) -> None:
        homepage = (ROOT / "index.html").read_text(encoding="utf-8")
        stylesheet = (ROOT / "assets" / "styles.css").read_text(encoding="utf-8")
        self.assertIn('<h1 id="page-title">Accessibility test case manager</h1>', homepage)
        self.assertIn('class="app-frame"', homepage)
        self.assertIn('class="library-sidebar"', homepage)
        self.assertIn('class="library-workspace"', homepage)
        self.assertIn('id="plan-progress" max="31" value="0"', homepage)
        self.assertIn('<details class="selection-panel" aria-labelledby="selection-title" open>', homepage)
        self.assertIn('href="assets/styles.css?v=20260827-content-review"', homepage)
        self.assertIn('src="assets/app.js?v=20260827-content-review"', homepage)
        self.assertIn("WCAG 2.2</a> contains the normative requirements", homepage)
        self.assertEqual(31, homepage.count("data-test-card"))
        self.assertEqual(14, homepage.count('data-test-kind="component"'))
        self.assertEqual(17, homepage.count('data-test-kind="wcag"'))
        self.assertEqual(31, homepage.count('name="selected-tests"'))
        self.assertEqual(31, homepage.count('class="open-test"'))
        self.assertEqual(31, homepage.count('class="picker-card-identity"'))
        self.assertEqual(31, homepage.count('<details class="test-disclosure'))
        self.assertEqual(62, homepage.count('class="theme-chip'))
        self.assertIn('id="test-search"', homepage)
        self.assertIn('id="selection-list"', homepage)
        self.assertIn('id="selection-count"', homepage)
        self.assertIn('data-filter-theme="forms"', homepage)
        self.assertIn('data-filter-theme="media"', homepage)
        self.assertIn("Forms &amp; journeys", homepage)
        self.assertIn("Media &amp; motion", homepage)
        self.assertEqual(14, homepage.count('class="component-procedure"'))
        component_section = homepage.split('<section class="component-procedures"', 1)[1].split(
            '<section class="wcag-test-groups"', 1
        )[0]
        self.assertEqual(14, component_section.count("How to test it — follow these steps in order"))
        self.assertEqual(31, homepage.count("How to test it — follow these steps in order"))
        self.assertIn("Page structure, headings, landmarks and language", homepage)
        self.assertIn("Tables, lists and grouped content", homepage)
        self.assertIn("Dialogs, modals, popovers and tooltips", homepage)
        self.assertIn("continue after the final control", homepage)
        self.assertEqual(17, homepage.count('class="wcag-test-group"'))
        self.assertEqual(55, homepage.count('class="criterion"'))
        self.assertEqual(55, len(re.findall(r'id="wcag-[\d-]+"', homepage)))
        self.assertEqual(55, homepage.count("Read the normative WCAG"))
        self.assertEqual(55, homepage.count('class="criterion-manual-check"'))
        self.assertEqual(86, homepage.count("data-step-deck"))
        self.assertEqual(300, homepage.count("data-step-tab"))
        self.assertEqual(300, homepage.count("data-step-panel"))
        self.assertEqual(300, homepage.count('class="step-card-detail"'))
        manual_sections = homepage.split('class="criterion-manual-check"')[1:]
        self.assertEqual(55, len(manual_sections))
        self.assertEqual(
            165,
            len(re.findall(r'id="manual-wcag-[\d-]+-step-\d+"', homepage)),
        )
        self.assertIn("Manual check — follow these steps in order", homepage)
        self.assertIn("press down inside the target, move outside it and release", homepage)
        self.assertNotRegex(homepage, r'href="[^"]+\.html')
        self.assertNotIn("linear-gradient", stylesheet)
        self.assertIn("box-shadow", stylesheet)

        script = (ROOT / "assets" / "app.js").read_text(encoding="utf-8")
        self.assertIn('tabList.setAttribute("role", "tablist")', script)
        self.assertIn('tab.setAttribute("role", "tab")', script)
        self.assertIn('panels[index].setAttribute("role", "tabpanel")', script)
        self.assertIn('event.key === "ArrowRight"', script)
        self.assertIn('planProgress.value = count', script)
        self.assertIn('link.setAttribute("aria-current", "location")', script)

    def test_all_catalogue_items_have_a_supported_theme(self) -> None:
        builder = load_module("build_site", ROOT / "scripts" / "build_site.py")
        component_slugs = {item["slug"] for item in self.component_library["procedures"]}
        wcag_slugs = {item["slug"] for item in self.library["test_cases"]}
        self.assertEqual(component_slugs, set(builder.COMPONENT_THEMES))
        self.assertEqual(wcag_slugs, set(builder.WCAG_THEMES))
        self.assertLessEqual(set(builder.COMPONENT_THEMES.values()), set(builder.THEMES))
        self.assertLessEqual(set(builder.WCAG_THEMES.values()), set(builder.THEMES))

    def test_site_has_one_generated_html_page(self) -> None:
        html_files = sorted(
            path.relative_to(ROOT)
            for path in ROOT.rglob("*.html")
            if "node_modules" not in path.parts and ".git" not in path.parts
        )
        self.assertEqual([Path("index.html")], html_files)

    def test_pages_workflow_and_readme_are_publish_ready(self) -> None:
        workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(
            encoding="utf-8"
        )
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("name: Publish GitHub Pages", workflow)
        self.assertIn("pages: write", workflow)
        self.assertIn("id-token: write", workflow)
        self.assertIn("uses: actions/configure-pages@v6", workflow)
        self.assertIn("uses: actions/upload-pages-artifact@v5", workflow)
        self.assertIn("uses: actions/deploy-pages@v5", workflow)
        self.assertIn("path: _site", workflow)
        self.assertIn("https://cuddly-happiness-wny73jk.pages.github.io/", readme)
        self.assertTrue(
            readme.rstrip().endswith(
                "**Main contact for questions:** [Carla Gonçalves](mailto:carla.goncalves@radancy.com)"
            )
        )

    def test_component_procedure_references_are_valid(self) -> None:
        criteria = {
            criterion["id"]
            for test_case in self.library["test_cases"]
            for criterion in test_case["criteria"]
        }
        for procedure in self.component_library["procedures"]:
            self.assertGreaterEqual(len(procedure["what_should_happen"]), 5)
            self.assertGreaterEqual(len(procedure["how_to_test"]), 6)
            for step in procedure["how_to_test"]:
                self.assertEqual({"action", "expected", "record"}, set(step))
            self.assertLessEqual(set(procedure["criteria"]), criteria)


if __name__ == "__main__":
    unittest.main()
