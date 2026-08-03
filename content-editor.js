(function () {
  const STORAGE_KEY = "hqueex_content_values_v1";
  const GROUPS = [
    { id: "home", title: "Home" },
    { id: "homeAbout", title: "About" },
    { id: "homeServices", title: "Services" },
    { id: "homeMethod", title: "Methodology" },
    { id: "homeWorkflow", title: "Workflow" },
    { id: "homeFit", title: "Qualification / Fit" },
    { id: "homeProof", title: "Proof and Maturity" },
    { id: "homeIntake", title: "Intake" },
    { id: "homeSecondary", title: "Secondary Conversion" },
    { id: "homeFooter", title: "Footer" },
    { id: "portal", title: "Portal" },
    { id: "portalRuntime", title: "Portal Runtime" },
    { id: "legal", title: "Legal Pages" },
    { id: "other", title: "Other" }
  ];

  const FALLBACK_VALUES = {
    homeMetaDescription:
      "H-Queex is a remote-first process improvement and operational engineering consultancy. Delivery is structured, asynchronous, and accountability-led from intake through implementation.",
    homeHeroCopy:
      "H-Queex is a remote-first process improvement and operational engineering consultancy. Delivery is structured, asynchronous, and accountability-led from intake through implementation."
  };

  const state = {
    baseModel: null,
    fieldSpecs: [],
    groupedSpecs: {},
    valuesByKey: {},
    activeGroupId: null
  };

  function getFallbackModel() {
    return {
      values: Object.assign({}, FALLBACK_VALUES)
    };
  }

  function getGroupMeta(groupId) {
    return (
      GROUPS.find(function (group) {
        return group.id === groupId;
      }) || GROUPS[GROUPS.length - 1]
    );
  }

  function getGroupIdForKey(key) {
    if (key.startsWith("portalRuntime")) {
      return "portalRuntime";
    }
    if (key.startsWith("portal")) {
      return "portal";
    }
    if (key.startsWith("privacy") || key.startsWith("terms")) {
      return "legal";
    }
    if (key.startsWith("homeAbout")) {
      return "homeAbout";
    }
    if (key.startsWith("homeServices") || key.startsWith("homeTier")) {
      return "homeServices";
    }
    if (key.startsWith("homeMethod") || key.startsWith("homeStep")) {
      return "homeMethod";
    }
    if (key.startsWith("homeWorkflow")) {
      return "homeWorkflow";
    }
    if (key.startsWith("homeFit")) {
      return "homeFit";
    }
    if (
      key.startsWith("homeProof") ||
      key.startsWith("homeRoadmap") ||
      key.startsWith("homeFutureProof")
    ) {
      return "homeProof";
    }
    if (key.startsWith("homeIntake")) {
      return "homeIntake";
    }
    if (key.startsWith("homeSecondary") || key.startsWith("homeUpdate")) {
      return "homeSecondary";
    }
    if (key.startsWith("homeFooter")) {
      return "homeFooter";
    }
    if (key.startsWith("home")) {
      return "home";
    }
    return "other";
  }

  function getSubgroupLabel(groupId, key) {
    if (groupId === "home") {
      if (/^homeMetaDescription$|^homeTitle$/.test(key)) {
        return "SEO and Page Meta";
      }
      if (key.startsWith("homeNav")) {
        return "Navigation";
      }
      if (key.startsWith("homeHero") || key.startsWith("homeTagline") || key.startsWith("homeMetric")) {
        return "Hero";
      }
      if (key.startsWith("homePromise")) {
        return "Value Proposition";
      }
      if (key.startsWith("homeTicker")) {
        return "Ticker";
      }
      return "Home";
    }

    if (groupId === "homeAbout") {
      return key === "homeAboutEyebrow" || key === "homeAboutHeading"
        ? "Section Header"
        : "About Cards";
    }

    if (groupId === "homeServices") {
      if (key === "homeServicesEyebrow" || key === "homeServicesHeading") {
        return "Section Header";
      }
      if (key.startsWith("homeTier1")) {
        return "Clarity Base";
      }
      if (key.startsWith("homeTier2")) {
        return "Clarity Plus";
      }
      if (key.startsWith("homeTier3")) {
        return "Clarity Partner";
      }
      return "Services";
    }

    if (groupId === "homeMethod") {
      return key === "homeMethodEyebrow" || key === "homeMethodHeading"
        ? "Section Header"
        : "Six-Stage Method";
    }

    if (groupId === "homeWorkflow") {
      return key === "homeWorkflowEyebrow" || key === "homeWorkflowHeading"
        ? "Section Header"
        : "Workflow Steps";
    }

    if (groupId === "homeFit") {
      if (key === "homeFitEyebrow" || key === "homeFitHeading") {
        return "Section Header";
      }
      if (key.startsWith("homeFitDesigned")) {
        return "Designed For";
      }
      if (key.startsWith("homeFitOutside")) {
        return "Outside Scope";
      }
      return "Qualification";
    }

    if (groupId === "homeProof") {
      if (key === "homeProofEyebrow" || key === "homeProofHeading") {
        return "Section Header";
      }
      if (key.startsWith("homeRoadmap")) {
        return "Roadmap";
      }
      if (key.startsWith("homeFutureProof")) {
        return "Future Proof";
      }
      return "Proof";
    }

    if (groupId === "homeIntake") {
      if (key === "homeIntakeEyebrow" || key === "homeIntakeHeading" || key === "homeIntakeIntro") {
        return "Intro";
      }
      if (
        key.startsWith("homeIntakeLabel") ||
        key.startsWith("homeIntakeSize") ||
        key === "homeIntakeButton"
      ) {
        return "Form Fields";
      }
      if (key.startsWith("homeIntakeFormNote") || key.startsWith("homeIntakeSuccessMessage")) {
        return "Form Messages";
      }
      return "Intake Details";
    }

    if (groupId === "homeSecondary") {
      if (key === "homeSecondaryEyebrow" || key === "homeSecondaryHeading" || key === "homeSecondaryIntro") {
        return "Section Copy";
      }
      return "Form and Message";
    }

    if (groupId === "homeFooter") {
      return "Footer Links and Copy";
    }

    if (groupId === "portal") {
      if (/^portalTitle$|^portalHeader/.test(key)) {
        return "Client-Facing Header";
      }
      if (/^portalLogin|^portalLabel|^portalRole|^portalEnterButton/.test(key)) {
        return "Client Login";
      }
      if (/^portalOverview|^portalStatus/.test(key)) {
        return "Client Workspace Overview";
      }
      if (/^portalFiles/.test(key)) {
        return "Client Workspace Files";
      }
      if (/^portalDeliverables/.test(key)) {
        return "Client Workspace Deliverables";
      }
      if (/^portalMessages/.test(key)) {
        return "Client Workspace Messages";
      }
      if (/^portalControl|^portalSessionEyebrow|^portalNav|^portalBilling/.test(key)) {
        return "Operator / Admin Sidebar";
      }
      if (/^portalGovernance/.test(key)) {
        return "Operator / Admin Governance";
      }
      return "Portal";
    }

    if (groupId === "portalRuntime") {
      if (
        /^portalRuntimeDefault|^portalRuntimeSample|^portalRuntimeRole|^portalRuntimeWorkspaceLabelFormat/.test(
          key
        )
      ) {
        return "Defaults and Session";
      }
      if (/^portalRuntimeButton|^portalRuntimeConfirm/.test(key)) {
        return "Buttons and Prompts";
      }
      if (/^portalRuntimeActivity/.test(key)) {
        return "Activity Log Templates";
      }
      if (/^portalRuntimeNotification/.test(key)) {
        return "Notification Templates";
      }
      if (/^portalRuntimeNote|^portalRuntimeStatusTimestamp|^portalRuntimeOverview/.test(key)) {
        return "Admin / System UI Notes and Status";
      }
      return "Runtime";
    }

    if (groupId === "legal") {
      if (key.startsWith("privacy")) {
        return "Privacy Policy";
      }
      if (key.startsWith("terms")) {
        return "Terms";
      }
      return "Legal";
    }

    return "Other";
  }

  function toDisplayLabel(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, function (char) {
        return char.toUpperCase();
      })
      .trim();
  }

  function readOverrides() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function getFieldSpecs(model) {
    const values = (model && model.values) || {};
    return Object.keys(values).map(function (key) {
      const groupId = getGroupIdForKey(key);
      const value = String(values[key] || "");
      return {
        key: key,
        label: toDisplayLabel(key),
        groupId: groupId,
        subgroupLabel: getSubgroupLabel(groupId, key),
        type:
          value.length > 90 ||
          /Body|Description|Intro|Message|Note|Summary|Paragraph|Copy|Disclaimer/i.test(key)
            ? "textarea"
            : "input"
      };
    });
  }

  function extractBindingValue(doc, binding) {
    if (!doc || !binding || !binding.selector) {
      return null;
    }

    const node = doc.querySelector(binding.selector);
    if (!node) {
      return null;
    }

    const property = binding.property || "textContent";

    if (property === "content" || property === "placeholder" || property === "value") {
      return node.getAttribute(property);
    }

    if (property === "firstTextNode") {
      const textNodes = Array.from(node.childNodes).filter(function (child) {
        return child.nodeType === Node.TEXT_NODE;
      });
      const target = textNodes.find(function (child) {
        return child.nodeValue && child.nodeValue.trim().length > 0;
      }) || textNodes[0];
      return target ? target.nodeValue.trim() : null;
    }

    if (property === "innerHTML") {
      return node.innerHTML;
    }

    if (property === "innerText" && typeof node.innerText === "string") {
      return node.innerText.trim();
    }

    return typeof node.textContent === "string" ? node.textContent.trim() : null;
  }

  function deriveLatestValuesFromPages(model) {
    if (!model || !Array.isArray(model.bindings)) {
      return Promise.resolve({});
    }

    const pages = Array.from(
      new Set(
        model.bindings
          .map(function (binding) {
            return binding && binding.page;
          })
          .filter(Boolean)
      )
    );

    return Promise.all(
      pages.map(function (page) {
        return fetch(page, { cache: "no-store" })
          .then(function (response) {
            if (!response.ok) {
              throw new Error(`Unable to load ${page}`);
            }
            return response.text();
          })
          .then(function (html) {
            const parser = new DOMParser();
            return {
              page: page,
              doc: parser.parseFromString(html, "text/html")
            };
          })
          .catch(function () {
            return null;
          });
      })
    ).then(function (results) {
      const docsByPage = {};
      results.forEach(function (entry) {
        if (entry && entry.page && entry.doc) {
          docsByPage[entry.page] = entry.doc;
        }
      });

      const latestValues = {};
      model.bindings.forEach(function (binding) {
        if (!binding || !binding.page || !binding.valueKey || latestValues[binding.valueKey] != null) {
          return;
        }

        const doc = docsByPage[binding.page];
        const value = extractBindingValue(doc, binding);
        if (typeof value === "string" && value.length > 0) {
          latestValues[binding.valueKey] = value;
        }
      });

      return latestValues;
    });
  }

  function initializeEditorState(model, latestValues) {
    const values = Object.assign({}, (model && model.values) || {}, latestValues || {});
    const overrides = readOverrides();

    state.baseModel = model;
    state.fieldSpecs = getFieldSpecs(model);
    state.groupedSpecs = {};
    state.valuesByKey = {};

    state.fieldSpecs.forEach(function (spec) {
      state.valuesByKey[spec.key] =
        typeof overrides[spec.key] === "string"
          ? overrides[spec.key]
          : typeof values[spec.key] === "string"
            ? values[spec.key]
            : "";

      if (!state.groupedSpecs[spec.groupId]) {
        state.groupedSpecs[spec.groupId] = [];
      }
      state.groupedSpecs[spec.groupId].push(spec);
    });

    const portalGroup = GROUPS.find(function (group) {
      return group.id === "portal" && Array.isArray(state.groupedSpecs[group.id]) && state.groupedSpecs[group.id].length > 0;
    });
    const firstGroup = GROUPS.find(function (group) {
      return Array.isArray(state.groupedSpecs[group.id]) && state.groupedSpecs[group.id].length > 0;
    });
    state.activeGroupId = portalGroup ? portalGroup.id : firstGroup ? firstGroup.id : "other";
  }

  function getCurrentQuery() {
    const search = document.getElementById("editor-search");
    return String((search && search.value) || "").trim().toLowerCase();
  }

  function getFilteredSpecsForActiveGroup() {
    const specs = state.groupedSpecs[state.activeGroupId] || [];
    const query = getCurrentQuery();
    if (!query) {
      return specs;
    }

    return specs.filter(function (spec) {
      const haystack = `${spec.label} ${spec.key} ${spec.subgroupLabel}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  function mapSpecsByKey(specs) {
    const byKey = {};
    specs.forEach(function (spec) {
      byKey[spec.key] = spec;
    });
    return byKey;
  }

  function createField(spec) {
    const row = document.createElement("div");
    row.className = "editor-row";

    const label = document.createElement("label");
    label.textContent = spec.label;

    const keyNote = document.createElement("span");
    keyNote.className = "editor-key";
    keyNote.textContent = spec.key;

    let input;
    if (spec.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 4;
    } else {
      input = document.createElement("input");
      input.type = "text";
    }

    input.value = state.valuesByKey[spec.key] || "";
    input.dataset.key = spec.key;
    input.addEventListener("input", function () {
      state.valuesByKey[spec.key] = input.value;
    });

    row.appendChild(label);
    row.appendChild(keyNote);
    row.appendChild(input);
    return row;
  }

  function createBlock(title, className) {
    const block = document.createElement("section");
    block.className = `editor-block ${className || ""}`.trim();

    if (title) {
      const heading = document.createElement("h3");
      heading.className = "editor-block-title";
      heading.textContent = title;
      block.appendChild(heading);
    }

    const body = document.createElement("div");
    body.className = "editor-block-fields";
    block.appendChild(body);
    return { block, body };
  }

  function appendFields(body, specsByKey, keys) {
    let count = 0;
    keys.forEach(function (key) {
      const spec = specsByKey[key];
      if (!spec) {
        return;
      }
      body.appendChild(createField(spec));
      count += 1;
    });
    return count;
  }

  function appendBlock(container, specsByKey, options) {
    const result = createBlock(options.title, options.className);
    const count = appendFields(result.body, specsByKey, options.keys || []);
    if (!count) {
      return null;
    }
    container.appendChild(result.block);
    return result.block;
  }

  function createGrid(className) {
    const grid = document.createElement("div");
    grid.className = className;
    return grid;
  }

  function renderHomeLayout(host, specsByKey) {
    const topGrid = createGrid("editor-two-col");
    appendBlock(topGrid, specsByKey, {
      title: "SEO and Page Meta",
      className: "editor-site-surface",
      keys: ["homeMetaDescription", "homeTitle"]
    });
    appendBlock(topGrid, specsByKey, {
      title: "Navigation",
      className: "editor-site-surface",
      keys: [
        "homeNavHome",
        "homeNavAbout",
        "homeNavServices",
        "homeNavMethodology",
        "homeNavIntake",
        "homeNavPortal",
        "homeNavSubmit"
      ]
    });
    if (topGrid.childElementCount) {
      host.appendChild(topGrid);
    }

    const heroGrid = createGrid("hero-grid");
    appendBlock(heroGrid, specsByKey, {
      title: "Hero",
      className: "editor-site-surface",
      keys: [
        "homeHeroEyebrow",
        "homeHeroHeading",
        "homeTagline",
        "homeHeroCopy",
        "homeHeroPrimaryCta",
        "homeHeroSecondaryCta",
        "homeMetricLabelOne",
        "homeMetricLabelTwo",
        "homeMetricLabelThree"
      ]
    });
    appendBlock(heroGrid, specsByKey, {
      title: "Value Proposition",
      className: "command-card",
      keys: [
        "homePromiseKicker",
        "homePromiseHeading",
        "homePromiseBody",
        "homePromiseApproachLabel",
        "homePromiseApproachValue",
        "homePromiseDeliveryLabel",
        "homePromiseDeliveryValue",
        "homePromiseControlLabel",
        "homePromiseControlValue",
        "homePromiseStatusLabel",
        "homePromiseStatusValue"
      ]
    });
    if (heroGrid.childElementCount) {
      host.appendChild(heroGrid);
    }

    appendBlock(host, specsByKey, {
      title: "Ticker",
      className: "ticker editor-block-ticker",
      keys: [
        "homeTickerItem1",
        "homeTickerItem2",
        "homeTickerItem3",
        "homeTickerItem4",
        "homeTickerItem5",
        "homeTickerItem6",
        "homeTickerItem7",
        "homeTickerItem8"
      ]
    });
  }

  function renderAboutLayout(host, specsByKey) {
    appendBlock(host, specsByKey, {
      title: "Section Header",
      className: "editor-site-surface",
      keys: ["homeAboutEyebrow", "homeAboutHeading"]
    });

    const grid = createGrid("about-grid");
    appendBlock(grid, specsByKey, {
      title: "Card One",
      className: "about-card",
      keys: ["homeAboutCard1Title", "homeAboutCard1Body"]
    });
    appendBlock(grid, specsByKey, {
      title: "Card Two",
      className: "about-card",
      keys: ["homeAboutCard2Title", "homeAboutCard2Body"]
    });
    appendBlock(grid, specsByKey, {
      title: "Card Three",
      className: "about-card",
      keys: ["homeAboutCard3Title", "homeAboutCard3Body"]
    });
    if (grid.childElementCount) {
      host.appendChild(grid);
    }
  }

  function renderServicesLayout(host, specsByKey) {
    appendBlock(host, specsByKey, {
      title: "Section Header",
      className: "editor-site-surface",
      keys: ["homeServicesEyebrow", "homeServicesHeading"]
    });

    const grid = createGrid("tier-grid");
    appendBlock(grid, specsByKey, {
      title: "Clarity Base",
      className: "tier-card",
      keys: [
        "homeTier1Title",
        "homeTier1Body",
        "homeTier1Item1",
        "homeTier1Item2",
        "homeTier1Item3",
        "homeTier1Note"
      ]
    });
    appendBlock(grid, specsByKey, {
      title: "Clarity Plus",
      className: "tier-card tier-card-featured",
      keys: [
        "homeTier2Badge",
        "homeTier2Title",
        "homeTier2Body",
        "homeTier2Item1",
        "homeTier2Item2",
        "homeTier2Item3",
        "homeTier2Note"
      ]
    });
    appendBlock(grid, specsByKey, {
      title: "Clarity Partner",
      className: "tier-card",
      keys: [
        "homeTier3Title",
        "homeTier3Body",
        "homeTier3Item1",
        "homeTier3Item2",
        "homeTier3Item3",
        "homeTier3Note"
      ]
    });
    if (grid.childElementCount) {
      host.appendChild(grid);
    }
  }

  function renderMethodLayout(host, specsByKey) {
    appendBlock(host, specsByKey, {
      title: "Section Header",
      className: "editor-site-surface",
      keys: ["homeMethodEyebrow", "homeMethodHeading"]
    });

    const grid = createGrid("step-grid");
    [1, 2, 3, 4, 5, 6].forEach(function (index) {
      appendBlock(grid, specsByKey, {
        title: `Step ${String(index).padStart(2, "0")}`,
        className: "step-card",
        keys: [`homeStep${index}Title`, `homeStep${index}Body`]
      });
    });
    if (grid.childElementCount) {
      host.appendChild(grid);
    }
  }

  function renderWorkflowLayout(host, specsByKey) {
    appendBlock(host, specsByKey, {
      title: "Section Header",
      className: "editor-site-surface",
      keys: ["homeWorkflowEyebrow", "homeWorkflowHeading"]
    });

    const grid = createGrid("workflow-list");
    [1, 2, 3, 4, 5, 6].forEach(function (index) {
      appendBlock(grid, specsByKey, {
        title: `Step ${String(index).padStart(2, "0")}`,
        className: "editor-block-step",
        keys: [`homeWorkflow${index}Title`, `homeWorkflow${index}Body`]
      });
    });
    if (grid.childElementCount) {
      host.appendChild(grid);
    }
  }

  function renderFitLayout(host, specsByKey) {
    appendBlock(host, specsByKey, {
      title: "Section Header",
      className: "editor-site-surface",
      keys: ["homeFitEyebrow", "homeFitHeading"]
    });

    const grid = createGrid("fit-grid");
    appendBlock(grid, specsByKey, {
      title: "Designed For",
      className: "fit-card",
      keys: [
        "homeFitDesignedTitle",
        "homeFitDesignedItem1",
        "homeFitDesignedItem2",
        "homeFitDesignedItem3"
      ]
    });
    appendBlock(grid, specsByKey, {
      title: "Outside Scope",
      className: "fit-card fit-card-outline",
      keys: [
        "homeFitOutsideTitle",
        "homeFitOutsideItem1",
        "homeFitOutsideItem2",
        "homeFitOutsideItem3"
      ]
    });
    if (grid.childElementCount) {
      host.appendChild(grid);
    }
  }

  function renderProofLayout(host, specsByKey) {
    appendBlock(host, specsByKey, {
      title: "Section Header",
      className: "editor-site-surface",
      keys: ["homeProofEyebrow", "homeProofHeading"]
    });

    const roadmap = createGrid("status-board");
    [
      ["homeRoadmapMissionTitle", "homeRoadmapMissionStatus"],
      ["homeRoadmapSwotTitle", "homeRoadmapSwotStatus"],
      ["homeRoadmapContextTitle", "homeRoadmapContextStatus"],
      ["homeRoadmapScopeTitle", "homeRoadmapScopeStatus"],
      ["homeRoadmapGrowthTitle", "homeRoadmapGrowthStatus"],
      ["homeRoadmapMaturityTitle", "homeRoadmapMaturityStatus"]
    ].forEach(function (keys, index) {
      appendBlock(roadmap, specsByKey, {
        title: `Roadmap ${index + 1}`,
        className: "status-item",
        keys: keys
      });
    });
    if (roadmap.childElementCount) {
      host.appendChild(roadmap);
    }

    appendBlock(host, specsByKey, {
      title: "Future Proof",
      className: "future-proof",
      keys: ["homeFutureProofTitle", "homeFutureProofBody"]
    });
  }

  function renderIntakeLayout(host, specsByKey) {
    const grid = createGrid("intake-shell");
    appendBlock(grid, specsByKey, {
      title: "Intro and Notes",
      className: "intake-copy",
      keys: [
        "homeIntakeEyebrow",
        "homeIntakeHeading",
        "homeIntakeIntro",
        "homeIntakeNotePolicy",
        "homeIntakeNoteAgreement"
      ]
    });
    appendBlock(grid, specsByKey, {
      title: "Form Fields",
      className: "intake-form",
      keys: [
        "homeIntakeLabelCompany",
        "homeIntakeLabelContact",
        "homeIntakeLabelSector",
        "homeIntakeLabelSize",
        "homeIntakeSizePlaceholder",
        "homeIntakeSize1",
        "homeIntakeSize2",
        "homeIntakeSize3",
        "homeIntakeSize4",
        "homeIntakeSize5",
        "homeIntakeLabelChallenge",
        "homeIntakeLabelFiles",
        "homeIntakeButton",
        "homeIntakeFormNote",
        "homeIntakeSuccessMessage"
      ]
    });
    if (grid.childElementCount) {
      host.appendChild(grid);
    }
  }

  function renderSecondaryLayout(host, specsByKey) {
    const grid = createGrid("secondary-card");
    appendBlock(grid, specsByKey, {
      title: "Section Copy",
      className: "editor-site-surface",
      keys: ["homeSecondaryEyebrow", "homeSecondaryHeading", "homeSecondaryIntro"]
    });
    appendBlock(grid, specsByKey, {
      title: "Form and Message",
      className: "secondary-form",
      keys: [
        "homeSecondaryEmailLabel",
        "homeSecondaryButton",
        "homeUpdateSuccessMessage"
      ]
    });
    if (grid.childElementCount) {
      host.appendChild(grid);
    }
  }

  function renderFooterLayout(host, specsByKey) {
    const grid = createGrid("footer-wrap");
    appendBlock(grid, specsByKey, {
      title: "Brand Copy",
      className: "editor-site-surface",
      keys: ["homeFooterTagline", "homeFooterCopyright"]
    });
    appendBlock(grid, specsByKey, {
      title: "Footer Links",
      className: "editor-site-surface",
      keys: [
        "homeFooterPortal",
        "homeFooterLinkedIn",
        "homeFooterPrivacy",
        "homeFooterTerms",
        "homeFooterEditContent",
        "homeFooterBackTop"
      ]
    });
    if (grid.childElementCount) {
      host.appendChild(grid);
    }
  }

  function renderPortalLayout(host, specsByKey) {
    const topGrid = createGrid("editor-two-col");
    appendBlock(topGrid, specsByKey, {
      title: "Header",
      className: "auth-card",
      keys: ["portalTitle", "portalHeaderWebsite", "portalHeaderSignOut"]
    });
    appendBlock(topGrid, specsByKey, {
      title: "Login Entry",
      className: "auth-card",
      keys: [
        "portalLoginEyebrow",
        "portalLoginHeading",
        "portalLoginIntro",
        "portalLabelDisplayName",
        "portalLabelEmail",
        "portalLabelAccessRole",
        "portalRoleClient",
        "portalRoleOperator",
        "portalLabelWorkspace",
        "portalWorkspacePlaceholder",
        "portalLabelPassphrase",
        "portalEnterButton"
      ]
    });
    if (topGrid.childElementCount) {
      host.appendChild(topGrid);
    }

    const portalGrid = createGrid("app-shell");
    appendBlock(portalGrid, specsByKey, {
      title: "Sidebar",
      className: "portal-sidebar",
      keys: [
        "portalSessionEyebrow",
        "portalControlEyebrow",
        "portalControlActiveWorkspace",
        "portalControlActiveLogo",
        "portalControlLogoPlaceholder",
        "portalControlUpdateLogo",
        "portalControlAddWorkspace",
        "portalControlAddWorkspacePlaceholder",
        "portalControlLogoUrl",
        "portalControlLogoUrlPlaceholder",
        "portalControlInitialStatus",
        "portalControlStatusActive",
        "portalControlStatusCompleted",
        "portalControlStatusArchived",
        "portalControlCreateWorkspace",
        "portalNavOverview",
        "portalNavFiles",
        "portalNavDeliverables",
        "portalNavMessages",
        "portalNavGovernance",
        "portalBillingEyebrow",
        "portalBillingBody",
        "portalBillingPill"
      ]
    });
    appendBlock(portalGrid, specsByKey, {
      title: "Overview",
      className: "panel active",
      keys: [
        "portalOverviewTitle",
        "portalOverviewBackPortfolio",
        "portalOverviewIdentityLabel",
        "portalOverviewSearchLabel",
        "portalOverviewSearchPlaceholder",
        "portalOverviewFilterLabel",
        "portalOverviewFilterAll",
        "portalOverviewFilterActive",
        "portalOverviewFilterCompleted",
        "portalOverviewFilterArchived",
        "portalOverviewTrendLabel",
        "portalOverviewTrend7",
        "portalOverviewTrend30",
        "portalOverviewTrend90",
        "portalOverviewKpiActive",
        "portalOverviewKpiCompleted",
        "portalOverviewKpiArchived",
        "portalOverviewGroupActive",
        "portalOverviewGroupCompleted",
        "portalOverviewGroupArchived",
        "portalStatusLabel1",
        "portalStatusValue1",
        "portalStatusLabel2",
        "portalStatusValue2",
        "portalStatusLabel3",
        "portalStatusValue3",
        "portalStatusLabel4",
        "portalStatusValue4",
        "portalStatusLabel5",
        "portalStatusValue5",
        "portalOverviewNextActionLabel",
        "portalOverviewNextActionValue",
        "portalOverviewLatestLabel",
        "portalOverviewLatestValue",
        "portalOverviewUnreadLabel",
        "portalOverviewUnreadValue",
        "portalOverviewNotificationsHeading"
      ]
    });
    if (portalGrid.childElementCount) {
      host.appendChild(portalGrid);
    }

    const lowerGrid = createGrid("governance-grid");
    appendBlock(lowerGrid, specsByKey, {
      title: "Files",
      className: "panel active",
      keys: [
        "portalFilesHeading",
        "portalFilesIntro",
        "portalFilesLabelName",
        "portalFilesLabelType",
        "portalFilesTypeDocument",
        "portalFilesTypeSpreadsheet",
        "portalFilesTypeVideo",
        "portalFilesLabelNotes",
        "portalFilesNotesPlaceholder",
        "portalFilesButton",
        "portalFilesTableName",
        "portalFilesTableType",
        "portalFilesTableNotes",
        "portalFilesTableBy",
        "portalFilesTableTime"
      ]
    });
    appendBlock(lowerGrid, specsByKey, {
      title: "Deliverables",
      className: "panel active",
      keys: [
        "portalDeliverablesHeading",
        "portalDeliverablesIntro",
        "portalDeliverablesLabelTitle",
        "portalDeliverablesLabelVersion",
        "portalDeliverablesVersionPlaceholder",
        "portalDeliverablesLabelSummary",
        "portalDeliverablesButton"
      ]
    });
    appendBlock(lowerGrid, specsByKey, {
      title: "Messages and Governance",
      className: "panel active",
      keys: [
        "portalMessagesHeading",
        "portalMessagesIntro",
        "portalMessagesLabel",
        "portalMessagesButton",
        "portalGovernanceHeading",
        "portalGovernanceIntro",
        "portalGovernancePhaseHeading",
        "portalGovernancePhaseIntake",
        "portalGovernancePhaseQualification",
        "portalGovernancePhaseEvidence",
        "portalGovernancePhaseDesign",
        "portalGovernancePhaseDelivery",
        "portalGovernancePhaseMonitoring",
        "portalGovernancePermissionsHeading",
        "portalGovernanceClientPermission",
        "portalGovernanceOperatorPermission",
        "portalGovernanceSecurityHeading",
        "portalGovernanceSecurityBody",
        "portalGovernanceActivityHeading"
      ]
    });
    if (lowerGrid.childElementCount) {
      host.appendChild(lowerGrid);
    }
  }

  function renderSequentialBySubgroup(host, specs) {
    let previousSubgroup = "";
    specs.forEach(function (spec) {
      if (spec.subgroupLabel && spec.subgroupLabel !== previousSubgroup) {
        const divider = document.createElement("div");
        divider.className = "editor-subgroup";
        divider.textContent = spec.subgroupLabel;
        host.appendChild(divider);
        previousSubgroup = spec.subgroupLabel;
      }
      host.appendChild(createField(spec));
    });
  }

  function renderLegalLayout(host, specsByKey) {
    const grid = createGrid("editor-two-col");
    appendBlock(grid, specsByKey, {
      title: "Privacy Policy",
      keys: [
        "privacyTitle",
        "privacyEyebrow",
        "privacyHeading",
        "privacyIntro",
        "privacyScopeHeading",
        "privacyScopeBody",
        "privacyCoverageHeading",
        "privacyCoverageItem1",
        "privacyCoverageItem2",
        "privacyCoverageItem3",
        "privacyCoverageItem4",
        "privacyCoverageItem5",
        "privacyReturnHome"
      ]
    });
    appendBlock(grid, specsByKey, {
      title: "Terms",
      keys: [
        "termsTitle",
        "termsEyebrow",
        "termsHeading",
        "termsIntro",
        "termsCoverageHeading",
        "termsCoverageItem1",
        "termsCoverageItem2",
        "termsCoverageItem3",
        "termsCoverageItem4",
        "termsCoverageItem5",
        "termsReturnHome"
      ]
    });
    if (grid.childElementCount) {
      host.appendChild(grid);
    }
  }

  function renderSectionLayout(host, specs) {
    const specsByKey = mapSpecsByKey(specs);

    switch (state.activeGroupId) {
      case "home":
        renderHomeLayout(host, specsByKey);
        break;
      case "homeAbout":
        renderAboutLayout(host, specsByKey);
        break;
      case "homeServices":
        renderServicesLayout(host, specsByKey);
        break;
      case "homeMethod":
        renderMethodLayout(host, specsByKey);
        break;
      case "homeWorkflow":
        renderWorkflowLayout(host, specsByKey);
        break;
      case "homeFit":
        renderFitLayout(host, specsByKey);
        break;
      case "homeProof":
        renderProofLayout(host, specsByKey);
        break;
      case "homeIntake":
        renderIntakeLayout(host, specsByKey);
        break;
      case "homeSecondary":
        renderSecondaryLayout(host, specsByKey);
        break;
      case "homeFooter":
        renderFooterLayout(host, specsByKey);
        break;
      case "portal":
        renderPortalLayout(host, specsByKey);
        break;
      case "legal":
        renderLegalLayout(host, specsByKey);
        break;
      default:
        renderSequentialBySubgroup(host, specs);
    }
  }

  function renderNav() {
    const nav = document.getElementById("editor-nav");
    if (!nav) {
      return;
    }

    nav.innerHTML = "";

    GROUPS.forEach(function (group) {
      const specs = state.groupedSpecs[group.id] || [];
      if (!specs.length) {
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "editor-nav-btn" + (group.id === state.activeGroupId ? " active" : "");

      const title = document.createElement("span");
      title.textContent = group.title;
      const count = document.createElement("div");
      count.className = "editor-nav-count";
      count.textContent = `${specs.length} fields`;

      button.appendChild(title);
      button.appendChild(count);
      button.addEventListener("click", function () {
        state.activeGroupId = group.id;
        renderNav();
        renderActiveSection();
      });

      nav.appendChild(button);
    });
  }

  function renderActiveSection() {
    const fieldsHost = document.getElementById("editor-fields");
    const title = document.getElementById("editor-section-title");
    const meta = document.getElementById("editor-section-meta");
    if (!fieldsHost || !title || !meta) {
      return;
    }

    const allSpecs = state.groupedSpecs[state.activeGroupId] || [];
    const filteredSpecs = getFilteredSpecsForActiveGroup();
    const groupMeta = getGroupMeta(state.activeGroupId);

    title.textContent = groupMeta.title;
    meta.textContent = `${filteredSpecs.length} of ${allSpecs.length} fields shown`;
    fieldsHost.innerHTML = "";

    if (!filteredSpecs.length) {
      const empty = document.createElement("div");
      empty.className = "editor-empty";
      empty.textContent = "No fields match your search in this section.";
      fieldsHost.appendChild(empty);
      return;
    }

    renderSectionLayout(fieldsHost, filteredSpecs);
  }

  function setStatus(message) {
    const status = document.getElementById("editor-status");
    if (status) {
      status.textContent = message;
    }
  }

  function saveOverrides() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.valuesByKey));
    setStatus("Saved. Refresh homepage or portal tabs to see updates.");
  }

  function resetToDefaults() {
    localStorage.removeItem(STORAGE_KEY);

    const defaults = (state.baseModel && state.baseModel.values) || {};
    state.fieldSpecs.forEach(function (spec) {
      state.valuesByKey[spec.key] = typeof defaults[spec.key] === "string" ? defaults[spec.key] : "";
    });

    renderActiveSection();
    setStatus("Reset complete. Default content values restored.");
  }

  function wireActions() {
    const saveBtn = document.getElementById("save-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", saveOverrides);
    }

    const resetBtn = document.getElementById("reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", resetToDefaults);
    }

    const search = document.getElementById("editor-search");
    if (search) {
      search.addEventListener("input", function () {
        renderActiveSection();
      });
    }
  }

  function renderAll() {
    renderNav();
    renderActiveSection();
  }

  function init() {
    fetch("content-model.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load content model");
        }
        return response.json();
      })
      .then(function (model) {
        return deriveLatestValuesFromPages(model).then(function (latestValues) {
          initializeEditorState(model, latestValues);
          wireActions();
          renderAll();
          setStatus("Loaded current website text. Unsaved editor typing still requires Save Changes.");
        });
      })
      .catch(function () {
        const fallbackModel = getFallbackModel();
        initializeEditorState(fallbackModel);
        wireActions();
        renderAll();
        setStatus("Loaded editor defaults. Save to apply your custom values.");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
