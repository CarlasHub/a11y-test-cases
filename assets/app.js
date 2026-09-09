(() => {
  "use strict";

  const STORAGE_KEY = "carlashub-a11y-selected-tests";
  const picker = document.querySelector("#test-picker-form");
  const cards = picker ? Array.from(picker.querySelectorAll("[data-test-card]")) : [];
  const search = document.querySelector("#test-search");
  const status = document.querySelector("#test-picker-status");
  const emptyState = document.querySelector("#test-picker-empty");
  const selectionList = document.querySelector("#selection-list");
  const selectionPanel = document.querySelector(".selection-panel");
  const selectionCount = document.querySelector("#selection-count");
  const planProgress = document.querySelector("#plan-progress");
  const planProgressText = document.querySelector("#plan-progress-text");
  const selectionEmpty = document.querySelector("#selection-empty");
  const selectionFeedback = document.querySelector("#selection-feedback");
  const copyButton = document.querySelector("#copy-test-plan");
  const clearButton = document.querySelector("#clear-test-plan");
  const selectVisibleButton = document.querySelector("#select-visible-tests");
  const selectedTests = new Set();
  const filters = { kind: "all", theme: "all" };
  const mobilePlanMedia = window.matchMedia("(max-width: 36rem)");

  const normalize = (value) => value.trim().toLocaleLowerCase();
  const getCardTitle = (card) => card.querySelector("[data-test-title]")?.textContent.trim() || "";

  const activateStepTab = (deck, nextTab, { focus = false } = {}) => {
    const tabs = Array.from(deck.querySelectorAll("[data-step-tab]"));
    const panels = Array.from(deck.querySelectorAll("[data-step-panel]"));
    tabs.forEach((tab) => {
      const selected = tab === nextTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => {
      const selected = nextTab.getAttribute("href") === `#${panel.id}`;
      panel.hidden = !selected;
    });
    if (focus) nextTab.focus();
  };

  const setupStepDecks = () => {
    document.querySelectorAll("[data-step-deck]").forEach((deck) => {
      const tabList = deck.querySelector(".step-tabs");
      const tabs = Array.from(deck.querySelectorAll("[data-step-tab]"));
      const panels = Array.from(deck.querySelectorAll("[data-step-panel]"));
      if (!tabList || tabs.length === 0 || tabs.length !== panels.length) return;

      tabList.setAttribute("role", "tablist");
      tabList.setAttribute("aria-label", tabList.dataset.stepLabel || "Test steps");
      tabs.forEach((tab, index) => {
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", panels[index].id);
        panels[index].setAttribute("role", "tabpanel");
        panels[index].setAttribute("aria-labelledby", tab.id);

        tab.addEventListener("click", (event) => {
          event.preventDefault();
          activateStepTab(deck, tab);
        });

        tab.addEventListener("keydown", (event) => {
          const currentIndex = tabs.indexOf(tab);
          let nextIndex;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            nextIndex = (currentIndex + 1) % tabs.length;
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          } else if (event.key === "Home") {
            nextIndex = 0;
          } else if (event.key === "End") {
            nextIndex = tabs.length - 1;
          } else {
            return;
          }
          event.preventDefault();
          activateStepTab(deck, tabs[nextIndex], { focus: true });
        });
      });

      deck.querySelectorAll("[data-step-previous], [data-step-next]").forEach((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          const targetTab = tabs.find((tab) => tab.getAttribute("href") === link.getAttribute("href"));
          if (targetTab) activateStepTab(deck, targetTab, { focus: true });
        });
      });

      const hashTarget = window.location.hash
        ? document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
        : null;
      const initialTab = hashTarget && deck.contains(hashTarget)
        ? tabs.find((tab) => tab.getAttribute("href") === `#${hashTarget.id}`)
        : tabs[0];
      activateStepTab(deck, initialTab || tabs[0]);
      deck.dataset.stepDeckReady = "true";
    });
  };

  const saveSelection = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedTests)));
    } catch (_error) {
      // The picker remains usable when storage is unavailable or blocked.
    }
  };

  const readSelection = () => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(stored) ? stored.filter((item) => typeof item === "string") : [];
    } catch (_error) {
      return [];
    }
  };

  const openDisclosureForHash = () => {
    if (!window.location.hash) return;
    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (!target) return;
    const stepPanel = target.closest("[data-step-panel]");
    const stepDeck = stepPanel?.closest("[data-step-deck]");
    const stepTab = stepDeck
      ? Array.from(stepDeck.querySelectorAll("[data-step-tab]")).find(
        (tab) => tab.getAttribute("href") === `#${stepPanel.id}`,
      )
      : null;
    if (stepDeck && stepTab) activateStepTab(stepDeck, stepTab);
    let disclosure = target.matches("details") ? target : target.closest("details");
    while (disclosure) {
      disclosure.open = true;
      disclosure = disclosure.parentElement?.closest("details") || null;
    }
  };

  const buildPlanText = () => cards
    .filter((card) => selectedTests.has(card.dataset.testId))
    .map((card) => `${card.dataset.testId} — ${getCardTitle(card)}`)
    .join("\n");

  const updateSelection = ({ announce = false } = {}) => {
    if (!selectionList || !selectionCount || !selectionEmpty || !copyButton || !clearButton) return;

    selectionList.replaceChildren();
    const selectedCards = cards.filter((card) => selectedTests.has(card.dataset.testId));
    selectedCards.forEach((card) => {
      const identifier = card.dataset.testId;
      const title = getCardTitle(card);
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = card.dataset.testTarget;
      link.textContent = `${identifier} — ${title}`;
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "plan-remove-button";
      removeButton.dataset.removeTest = identifier;
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove ${identifier} — ${title} from test plan`);
      item.append(link, removeButton);
      selectionList.append(item);
    });

    cards.forEach((card) => {
      const isSelected = selectedTests.has(card.dataset.testId);
      card.classList.toggle("is-selected", isSelected);
      const checkbox = card.querySelector("[data-test-select]");
      if (checkbox) checkbox.checked = isSelected;
    });

    const count = selectedCards.length;
    if (selectionPanel instanceof HTMLDetailsElement) {
      if (count > 0) selectionPanel.open = true;
      else if (mobilePlanMedia.matches) selectionPanel.open = false;
    }
    selectionCount.textContent = String(count);
    selectionCount.setAttribute("aria-label", `${count} ${count === 1 ? "test" : "tests"} selected`);
    if (planProgress) {
      planProgress.value = count;
      planProgress.textContent = `${count} of ${cards.length} selected`;
    }
    if (planProgressText) planProgressText.textContent = `${count} of ${cards.length} selected`;
    selectionEmpty.hidden = count > 0;
    copyButton.disabled = count === 0;
    clearButton.disabled = count === 0;
    if (announce && selectionFeedback) {
      selectionFeedback.textContent = `${count} ${count === 1 ? "test" : "tests"} in your plan.`;
    }
    saveSelection();
  };

  const updateResults = () => {
    const query = normalize(search?.value || "");
    let visibleCount = 0;
    cards.forEach((card) => {
      const matchesKind = filters.kind === "all" || card.dataset.testKind === filters.kind;
      const matchesTheme = filters.theme === "all" || card.dataset.testTheme === filters.theme;
      const matchesSearch = !query || (card.dataset.searchText || "").includes(query);
      const isVisible = matchesKind && matchesTheme && matchesSearch;
      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });
    if (status) status.textContent = `${visibleCount} ${visibleCount === 1 ? "test" : "tests"} shown`;
    if (emptyState) emptyState.hidden = visibleCount !== 0;
    if (selectVisibleButton) selectVisibleButton.disabled = visibleCount === 0;
  };

  const copyPlan = async () => {
    const plan = buildPlanText();
    if (!plan || !selectionFeedback) return;
    try {
      await navigator.clipboard.writeText(plan);
      selectionFeedback.textContent = "Test IDs and names copied.";
    } catch (_error) {
      const fallback = document.createElement("textarea");
      fallback.value = plan;
      fallback.setAttribute("readonly", "");
      fallback.className = "clipboard-fallback";
      document.body.append(fallback);
      fallback.select();
      const copied = document.execCommand("copy");
      fallback.remove();
      selectionFeedback.textContent = copied
        ? "Test IDs and names copied."
        : "Copy was unavailable. Select the tests again and record their IDs manually.";
    }
  };

  if (picker) {
    readSelection().forEach((identifier) => {
      if (cards.some((card) => card.dataset.testId === identifier)) selectedTests.add(identifier);
    });

    picker.addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-test-select]");
      if (!checkbox) return;
      if (checkbox.checked) selectedTests.add(checkbox.value);
      else selectedTests.delete(checkbox.value);
      updateSelection({ announce: true });
    });

    picker.querySelectorAll("[data-filter-kind], [data-filter-theme]").forEach((button) => {
      button.addEventListener("click", () => {
        const filterName = button.hasAttribute("data-filter-kind") ? "kind" : "theme";
        const dataName = filterName === "kind" ? "filterKind" : "filterTheme";
        filters[filterName] = button.dataset[dataName];
        button.closest("[data-filter-group]")?.querySelectorAll("button").forEach((peer) => {
          peer.setAttribute("aria-pressed", String(peer === button));
        });
        updateResults();
      });
    });

    search?.addEventListener("input", updateResults);

    selectVisibleButton?.addEventListener("click", () => {
      cards.filter((card) => !card.hidden).forEach((card) => selectedTests.add(card.dataset.testId));
      updateSelection({ announce: true });
    });

    selectionList?.addEventListener("click", (event) => {
      const removeButton = event.target.closest?.("[data-remove-test]");
      if (!removeButton) return;
      const removeButtons = Array.from(selectionList.querySelectorAll("[data-remove-test]"));
      const buttonIndex = removeButtons.indexOf(removeButton);
      selectedTests.delete(removeButton.dataset.removeTest);
      updateSelection({ announce: true });
      const remainingButtons = Array.from(selectionList.querySelectorAll("[data-remove-test]"));
      if (remainingButtons.length > 0) {
        remainingButtons[Math.min(buttonIndex, remainingButtons.length - 1)].focus();
      } else {
        selectionPanel?.querySelector("summary")?.focus();
      }
    });

    clearButton?.addEventListener("click", () => {
      selectedTests.clear();
      updateSelection({ announce: true });
    });

    copyButton?.addEventListener("click", copyPlan);
    updateResults();
    updateSelection();
    mobilePlanMedia.addEventListener("change", (event) => {
      if (selectionPanel instanceof HTMLDetailsElement && selectedTests.size === 0) {
        selectionPanel.open = !event.matches;
      }
    });
  }

  document.querySelectorAll("[data-disclosure-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const section = document.getElementById(button.dataset.disclosureSection);
      const shouldOpen = button.dataset.disclosureAction === "open";
      section?.querySelectorAll(":scope > .test-disclosure").forEach((disclosure) => {
        disclosure.open = shouldOpen;
      });
      if (!shouldOpen) section?.scrollIntoView({ block: "start" });
    });
  });

  document.querySelectorAll("[data-print]").forEach((button) => {
    button.addEventListener("click", () => window.print());
  });

  const sidebarLinks = Array.from(
    document.querySelectorAll('.library-sidebar .site-nav a[href^="#"]'),
  );
  const updateCurrentSection = () => {
    const position = window.scrollY + 140;
    let currentLink = sidebarLinks[0] || null;
    sidebarLinks.forEach((link) => {
      const target = document.getElementById(link.hash.slice(1));
      if (target && target.offsetTop <= position) currentLink = link;
    });
    sidebarLinks.forEach((link) => {
      if (link === currentLink) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  if (sidebarLinks.length > 0) {
    window.addEventListener("scroll", updateCurrentSection, { passive: true });
    updateCurrentSection();
  }

  setupStepDecks();
  window.addEventListener("hashchange", openDisclosureForHash);
  openDisclosureForHash();
})();
