(function () {
  const STORAGE_KEY = "hqueex_content_values_v1";
  const EDITABLE_PROPERTIES = new Set(["textContent", "innerText", "firstTextNode"]);

  const state = {
    model: null,
    values: {},
    version: 0,
    dirtyKeys: new Set(),
    pageKeys: new Set(),
    descriptorsByKey: new Map(),
    otherFieldElements: new Map(),
    sectionAnchors: [],
    isDirty: false
  };

  function isBindablePage(page) {
    return page === "index.html" || page === "portal.html";
  }

  // Groups/labels for the "Other Content Fields" panel below - values that
  // aren't bound to any visible page text (meta tags, input placeholders,
  // or portal runtime strings used directly in JS rather than swapped into
  // static HTML). Ported from content-editor.js so labels stay familiar.

  // Link destinations (hrefs) that have their own content-model keys,
  // separate from their (already-editable) label text. Called out into
  // their own group rather than falling under whichever text group their
  // key prefix would otherwise match (e.g. homeFooterPrivacyUrl would
  // otherwise land in "Footer"), since these are functionally different
  // from body copy - get one wrong and a link points somewhere broken.
  const LINK_URL_LABELS = {
    homePortalUrl: "Client Portal URL",
    homeFooterPrivacyUrl: "Privacy Policy URL",
    homeFooterTermsUrl: "Terms URL",
    homeFooterLinkedInUrl: "LinkedIn URL",
    portalHeaderWebsiteUrl: "Portal Website URL"
  };
  const LINK_URL_KEYS = new Set(Object.keys(LINK_URL_LABELS));

  const OTHER_FIELD_GROUPS = [
    { id: "links", title: "Links", prefixes: [] },
    { id: "home", title: "Home", prefixes: ["home"] },
    { id: "homeAbout", title: "About", prefixes: ["homeAbout"] },
    { id: "homeServices", title: "Services", prefixes: ["homeServices", "homeTier"] },
    { id: "homeMethod", title: "Methodology", prefixes: ["homeMethod", "homeStep"] },
    { id: "homeWorkflow", title: "Workflow", prefixes: ["homeWorkflow"] },
    { id: "homeFit", title: "Qualification / Fit", prefixes: ["homeFit"] },
    { id: "homeProof", title: "Proof and Maturity", prefixes: ["homeProof", "homeRoadmap", "homeFutureProof"] },
    { id: "homeIntake", title: "Intake", prefixes: ["homeIntake"] },
    { id: "homeSecondary", title: "Secondary Conversion", prefixes: ["homeSecondary", "homeUpdate"] },
    { id: "homeFooter", title: "Footer", prefixes: ["homeFooter"] },
    { id: "portal", title: "Portal", prefixes: ["portal"] },
    { id: "portalRuntime", title: "Portal Runtime", prefixes: ["portalRuntime"] },
    { id: "legal", title: "Legal Pages", prefixes: ["privacy", "terms"] },
    { id: "other", title: "Other", prefixes: [] }
  ];

  // Fields below the "portalRuntime" prefix minority (count < 2) are folded
  // into a shared "Other" subgroup instead of getting their own single-item
  // <details> - not worth a whole disclosure widget for one field.
  const PORTAL_RUNTIME_MIN_SUBGROUP_SIZE = 2;

  function getOtherFieldGroupId(key) {
    if (LINK_URL_KEYS.has(key)) {
      return "links";
    }
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
    if (key.startsWith("homeProof") || key.startsWith("homeRoadmap") || key.startsWith("homeFutureProof")) {
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

  function toDisplayLabel(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, function (char) {
        return char.toUpperCase();
      })
      .trim();
  }

  // Strips the group's key prefix before formatting a label, since the
  // enclosing <details>/<summary> already names the group - repeating it in
  // every one of a group's field labels (e.g. "Portal Runtime Activity Logo
  // Cleared" x82) just adds noise to scan past. Falls back to the full
  // label if nothing remains after stripping (shouldn't normally happen).
  function toGroupedDisplayLabel(key, prefixes) {
    let longestMatch = "";
    (prefixes || []).forEach(function (prefix) {
      if (key.startsWith(prefix) && prefix.length > longestMatch.length) {
        longestMatch = prefix;
      }
    });
    const remainder = longestMatch ? key.slice(longestMatch.length) : key;
    const label = toDisplayLabel(remainder || key);
    return label || toDisplayLabel(key);
  }

  // Splits a PascalCase remainder (e.g. "ActivityLogoCleared") into its
  // capitalized word chunks (["Activity", "Logo", "Cleared"]).
  function splitPascalWords(str) {
    return str.match(/[A-Z][a-z0-9]*|[0-9]+/g) || [];
  }

  // Portal Runtime alone is 65% of the "Other Content Fields" panel. Its
  // keys already follow other-field-portalRuntime<SubGroup><Rest>, so the
  // second camelCase word is a free, natural sub-grouping - this splits it
  // out instead of leaving 82 fields in one flat list.
  function getPortalRuntimeSubgroup(key) {
    const remainder = key.slice("portalRuntime".length);
    const words = splitPascalWords(remainder);
    if (!words.length) {
      return { subKey: "other", label: toDisplayLabel(remainder) };
    }
    const subKey = words[0];
    const labelWords = words.length > 1 ? words.slice(1) : words;
    return { subKey: subKey, label: labelWords.join(" ") };
  }

  const SECTION_PRESETS = [
    { id: "home", label: "Homepage", selector: "section.hero" },
    { id: "about", label: "About", selector: "#about" },
    { id: "services", label: "Services", selector: "#services" },
    { id: "methodology", label: "Methodology", selector: "#methodology" },
    { id: "workflow", label: "Workflow", selector: "section.section-soft" },
    { id: "fit", label: "Fit", selector: "#fit" },
    { id: "proof", label: "Proof", selector: "#roadmap", closestSection: true },
    { id: "intake", label: "Intake", selector: "#intake" },
    { id: "secondary", label: "Secondary", selector: "section.secondary-conversion" },
    { id: "footer", label: "Footer", selector: "footer.site-footer" },
    { id: "portal-login", label: "Portal Login", selector: "#login-shell" },
    { id: "portal-dashboard", label: "Portal Dashboard", selector: "#app-shell" },
    { id: "portal-overview", label: "Project Snapshot", selector: "#panel-overview" },
    { id: "portal-active", label: "Active Clients", selector: "#active-group" },
    { id: "portal-completed", label: "Completed Clients", selector: "#completed-group" },
    { id: "portal-archived", label: "Archived Clients", selector: "#archived-group" }
  ];

  function setStatus(message, kind) {
    const status = document.getElementById("replica-status");
    if (!status) {
      return;
    }

    status.textContent = message;
    status.classList.remove("is-success", "is-error");
    if (kind === "success") {
      status.classList.add("is-success");
    } else if (kind === "error") {
      status.classList.add("is-error");
    }
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

  function writeOverrides(nextOverrides) {
    const keys = Object.keys(nextOverrides);
    if (!keys.length) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextOverrides));
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getTextNodeTarget(node) {
    const textNodes = Array.from(node.childNodes).filter(function (child) {
      return child.nodeType === Node.TEXT_NODE;
    });

    let target = textNodes.find(function (child) {
      return child.nodeValue && child.nodeValue.trim().length > 0;
    });

    if (!target) {
      target = textNodes[0] || document.createTextNode("");
      if (!target.parentNode) {
        node.insertBefore(target, node.firstChild || null);
      }
    }

    return target;
  }

  function setNodeValueFromBinding(node, binding, value) {
    const property = binding.property || "textContent";

    if (property === "firstTextNode") {
      const textNode = getTextNodeTarget(node);
      textNode.nodeValue = value;
      return;
    }

    if (property === "innerText") {
      node.innerText = value;
      return;
    }

    node.textContent = value;
  }

  function applyValuesToReplica(root, model, values) {
    model.bindings.forEach(function (binding) {
      if (!binding || !isBindablePage(binding.page)) {
        return;
      }

      const value = values[binding.valueKey];
      if (typeof value !== "string") {
        return;
      }

      const nodes = root.querySelectorAll(binding.selector);
      if (!nodes.length) {
        return;
      }

      const targets = binding.mode === "first" ? [nodes[0]] : Array.from(nodes);
      targets.forEach(function (node) {
        if (EDITABLE_PROPERTIES.has(binding.property || "textContent")) {
          setNodeValueFromBinding(node, binding, value);
        } else {
          const property = binding.property || "textContent";
          if (property === "placeholder" || property === "content" || property === "value" || property === "href") {
            node.setAttribute(property, value);
          }
        }
      });
    });
  }

  function getEditableElement(node, binding, key) {
    const property = binding.property || "textContent";

    if (property === "firstTextNode") {
      const textNode = getTextNodeTarget(node);
      const span = document.createElement("span");
      span.className = "replica-editable";
      span.contentEditable = "true";
      span.dataset.valueKey = key;
      span.textContent = normalizeText(textNode.nodeValue);
      textNode.parentNode.replaceChild(span, textNode);
      return span;
    }

    if (node.childElementCount === 0) {
      node.classList.add("replica-editable");
      node.contentEditable = "true";
      node.dataset.valueKey = key;
      return node;
    }

    const span = document.createElement("span");
    span.className = "replica-editable";
    span.contentEditable = "true";
    span.dataset.valueKey = key;
    span.textContent = normalizeText(node.textContent);
    node.innerHTML = "";
    node.appendChild(span);
    return span;
  }

  function setEditableVisualState(element) {
    if (!element) {
      return;
    }
    const text = normalizeText(element.textContent);
    element.dataset.empty = text ? "0" : "1";
  }

  function applyValueToDescriptor(descriptor, value, sourceElement) {
    descriptor.elements.forEach(function (element) {
      if (element === sourceElement) {
        return;
      }
      element.textContent = value;
      setEditableVisualState(element);
    });
  }

  function markDirty() {
    if (!state.isDirty) {
      state.isDirty = true;
      setStatus("Unsaved changes. Save to update local overrides.");
    }
  }

  function getToolbarHeight() {
    const toolbar = document.querySelector(".replica-toolbar");
    return toolbar ? toolbar.getBoundingClientRect().height : 0;
  }

  function ensureVisibleBelowToolbar(node, behavior) {
    if (!node) {
      return;
    }

    const toolbarHeight = getToolbarHeight();
    const safeTop = toolbarHeight + 14;
    const safeBottom = window.innerHeight - 14;
    const rect = node.getBoundingClientRect();

    if (rect.top < safeTop) {
      window.scrollBy({ top: rect.top - safeTop, behavior: behavior || "auto" });
      return;
    }

    if (rect.bottom > safeBottom) {
      window.scrollBy({ top: rect.bottom - safeBottom, behavior: behavior || "auto" });
    }
  }

  function resolveSectionAnchor(root, anchorId) {
    const anchor = SECTION_PRESETS.find(function (entry) {
      return entry.id === anchorId;
    });

    if (!anchor) {
      return null;
    }

    let node = root.querySelector(anchor.selector);
    if (anchor.closestSection && node) {
      node = node.closest("section");
    }

    return node;
  }

  function jumpToSection(sectionId) {
    if (!sectionId) {
      return;
    }

    const root = document.getElementById("replica-canvas");
    if (!root) {
      return;
    }

    const target = resolveSectionAnchor(root, sectionId);
    if (!target) {
      setStatus("Section not found in replica.");
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(function () {
      ensureVisibleBelowToolbar(target, "auto");
    }, 180);

    const firstEditable = target.querySelector(".replica-editable");
    if (firstEditable) {
      setTimeout(function () {
        firstEditable.focus({ preventScroll: true });
        ensureVisibleBelowToolbar(firstEditable, "auto");
      }, 260);
      setStatus("Jumped to " + sectionId + " and focused first editable text.");
    } else {
      setStatus("Jumped to " + sectionId + ". No editable text found in that section.");
    }
  }

  function populateSectionJump(root) {
    const jump = document.getElementById("replica-section-jump");
    if (!jump) {
      return;
    }

    jump.innerHTML = '<option value="">Jump to section</option>';

    SECTION_PRESETS.forEach(function (preset) {
      const node = resolveSectionAnchor(root, preset.id);
      if (!node) {
        return;
      }

      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.label;
      jump.appendChild(option);
    });

    if (!jump.dataset.wired) {
      jump.addEventListener("change", function () {
        jumpToSection(jump.value);
      });
      jump.dataset.wired = "1";
    }
  }

  function wireEditableElement(element, key) {
    element.addEventListener("input", function () {
      const value = normalizeText(element.textContent);
      state.values[key] = value;
      state.dirtyKeys.add(key);

      const descriptor = state.descriptorsByKey.get(key);
      if (descriptor) {
        applyValueToDescriptor(descriptor, value, element);
      }

      setEditableVisualState(element);
      markDirty();
    });

    element.addEventListener("focus", function () {
      element.classList.add("replica-highlight");
    });

    element.addEventListener("blur", function () {
      const value = normalizeText(element.textContent);
      element.textContent = value;
      setEditableVisualState(element);
      element.classList.remove("replica-highlight");
    });

    setEditableVisualState(element);
  }

  function buildDescriptors(root, model) {
    const byKey = new Map();

    model.bindings.forEach(function (binding) {
      if (!binding || !isBindablePage(binding.page)) {
        return;
      }

      const property = binding.property || "textContent";
      if (!EDITABLE_PROPERTIES.has(property)) {
        return;
      }

      const nodes = root.querySelectorAll(binding.selector);
      if (!nodes.length) {
        return;
      }

      const targets = binding.mode === "first" ? [nodes[0]] : Array.from(nodes);
      targets.forEach(function (node) {
        if (!node || node.tagName === "SCRIPT" || node.tagName === "STYLE") {
          return;
        }

        const key = binding.valueKey;
        const editableElement = getEditableElement(node, binding, key);

        if (!byKey.has(key)) {
          byKey.set(key, {
            key: key,
            elements: []
          });
        }

        byKey.get(key).elements.push(editableElement);
      });
    });

    byKey.forEach(function (descriptor) {
      descriptor.elements.forEach(function (element) {
        wireEditableElement(element, descriptor.key);
      });
    });

    state.descriptorsByKey = byKey;
    state.pageKeys = new Set(byKey.keys());
  }

  function disableLiveInteractions(root) {
    root.addEventListener("click", function (event) {
      const editableTarget = event.target.closest(".replica-editable");
      if (editableTarget) {
        return;
      }

      const anchor = event.target.closest("a");
      if (anchor) {
        event.preventDefault();
      }

      const button = event.target.closest("button");
      if (button && !button.classList.contains("replica-editable")) {
        event.preventDefault();
      }
    });

    root.addEventListener("submit", function (event) {
      event.preventDefault();
    });
  }

  function syncFieldDisplay(key) {
    const value = state.values[key] || "";

    const descriptor = state.descriptorsByKey.get(key);
    if (descriptor) {
      descriptor.elements.forEach(function (element) {
        element.textContent = value;
        setEditableVisualState(element);
      });
    }

    const otherEl = state.otherFieldElements.get(key);
    if (otherEl) {
      otherEl.value = value;
    }
  }

  function buildOtherFieldsPanel(model) {
    const container = document.getElementById("replica-other-fields");
    if (!container) {
      return;
    }

    container.innerHTML = "";
    state.otherFieldElements = new Map();

    const values = (model && model.values) || {};
    const orphanKeys = Object.keys(values).filter(function (key) {
      return !state.descriptorsByKey.has(key);
    });

    if (!orphanKeys.length) {
      return;
    }

    const heading = document.createElement("h2");
    heading.className = "replica-other-fields-heading";
    heading.textContent = "Other Content Fields";
    container.appendChild(heading);

    const hint = document.createElement("p");
    hint.className = "replica-other-fields-hint";
    hint.textContent =
      "Not shown as page text above - meta tags, input placeholders, and portal runtime messages. Still part of the site's content and included in Save/Publish.";
    container.appendChild(hint);

    const searchWrap = document.createElement("div");
    searchWrap.className = "replica-other-search-wrap";
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.id = "replica-other-search";
    searchInput.placeholder = "Search other content fields by label or key...";
    searchInput.setAttribute("aria-label", "Search other content fields");
    searchWrap.appendChild(searchInput);
    container.appendChild(searchWrap);

    const fieldsHost = document.createElement("div");
    fieldsHost.className = "replica-other-fields-host";
    container.appendChild(fieldsHost);

    const byGroup = new Map();
    orphanKeys.forEach(function (key) {
      const groupId = getOtherFieldGroupId(key);
      if (!byGroup.has(groupId)) {
        byGroup.set(groupId, []);
      }
      byGroup.get(groupId).push(key);
    });

    // Every searchable field's <div class="replica-other-field"> plus the
    // chain of <details> it lives inside, so the search box can toggle
    // visibility and auto-expand ancestors on a match.
    const searchableFields = [];

    function makeField(key) {
      const field = document.createElement("div");
      field.className = "replica-other-field";

      const label = document.createElement("label");
      label.setAttribute("for", "other-field-" + key);
      field.appendChild(label);

      const rawValue = String(values[key] || "");
      const useTextarea =
        rawValue.length > 90 || /Body|Description|Intro|Message|Note|Summary|Paragraph|Copy|Disclaimer/i.test(key);
      const input = document.createElement(useTextarea ? "textarea" : "input");
      input.id = "other-field-" + key;
      input.value = state.values[key] || "";
      if (useTextarea) {
        input.rows = 3;
      } else {
        input.type = "text";
      }

      input.addEventListener("input", function () {
        state.values[key] = input.value;
        state.dirtyKeys.add(key);
        markDirty();
      });

      field.appendChild(input);

      state.otherFieldElements.set(key, input);
      state.pageKeys.add(key);

      return { field: field, label: label, key: key };
    }

    OTHER_FIELD_GROUPS.forEach(function (group) {
      const keys = byGroup.get(group.id);
      if (!keys || !keys.length) {
        return;
      }
      keys.sort();

      const details = document.createElement("details");
      details.className = "replica-other-group";
      const summary = document.createElement("summary");
      summary.textContent = group.title + " (" + keys.length + ")";
      details.appendChild(summary);

      if (group.id === "portalRuntime") {
        const bySub = new Map();
        keys.forEach(function (key) {
          const sub = getPortalRuntimeSubgroup(key);
          if (!bySub.has(sub.subKey)) {
            bySub.set(sub.subKey, []);
          }
          bySub.get(sub.subKey).push({ key: key, label: sub.label });
        });

        // Fold subgroups too small to be worth their own disclosure widget
        // into a shared "Other" bucket.
        const otherBucket = bySub.get("other") || [];
        bySub.delete("other");
        const finalSubs = [];
        bySub.forEach(function (items, subKey) {
          if (items.length < PORTAL_RUNTIME_MIN_SUBGROUP_SIZE) {
            otherBucket.push.apply(otherBucket, items);
          } else {
            finalSubs.push({ subKey: subKey, items: items });
          }
        });
        finalSubs.sort(function (a, b) {
          return a.subKey.localeCompare(b.subKey);
        });
        if (otherBucket.length) {
          finalSubs.push({ subKey: "Other", items: otherBucket });
        }

        finalSubs.forEach(function (sub) {
          sub.items.sort(function (a, b) {
            return a.key.localeCompare(b.key);
          });

          const subDetails = document.createElement("details");
          subDetails.className = "replica-other-subgroup";
          const subSummary = document.createElement("summary");
          subSummary.textContent = sub.subKey + " (" + sub.items.length + ")";
          subDetails.appendChild(subSummary);

          sub.items.forEach(function (item) {
            const built = makeField(item.key);
            built.label.textContent = item.label;
            subDetails.appendChild(built.field);
            searchableFields.push({ field: built.field, key: item.key, label: item.label, ancestors: [subDetails, details] });
          });

          details.appendChild(subDetails);
        });
      } else {
        keys.forEach(function (key) {
          const built = makeField(key);
          built.label.textContent = LINK_URL_LABELS[key] || toGroupedDisplayLabel(key, group.prefixes);
          if (group.id === "links") {
            built.field.querySelector("input, textarea").type = "url";
          }
          details.appendChild(built.field);
          searchableFields.push({ field: built.field, key: key, label: built.label.textContent, ancestors: [details] });
        });
      }

      fieldsHost.appendChild(details);
    });

    searchInput.addEventListener("input", function () {
      const query = searchInput.value.trim().toLowerCase();

      if (!query) {
        searchableFields.forEach(function (entry) {
          entry.field.hidden = false;
        });
        fieldsHost.querySelectorAll("details").forEach(function (d) {
          d.open = false;
        });
        return;
      }

      const openDetails = new Set();
      searchableFields.forEach(function (entry) {
        const matches = entry.label.toLowerCase().includes(query) || entry.key.toLowerCase().includes(query);
        entry.field.hidden = !matches;
        if (matches) {
          entry.ancestors.forEach(function (d) {
            openDetails.add(d);
          });
        }
      });

      fieldsHost.querySelectorAll("details").forEach(function (d) {
        d.open = openDetails.has(d);
      });
    });
  }

  function setReloadButtonVisible(visible) {
    const reloadBtn = document.getElementById("replica-reload-btn");
    if (reloadBtn) {
      reloadBtn.hidden = !visible;
    }
  }

  function handleSaveConflict() {
    const overrides = readOverrides();
    state.pageKeys.forEach(function (key) {
      if (typeof state.values[key] === "string") {
        overrides[key] = state.values[key];
      }
    });
    writeOverrides(overrides);

    setReloadButtonVisible(true);
    setStatus(
      "This content has changed elsewhere since you opened this page. Your edits here have not been saved. " +
        'Click "Reload Latest" to bring in the newest content without losing what you typed, then try saving again.',
      "error"
    );
  }

  function reloadLatestContent() {
    setStatus("Reloading latest content...");

    fetch("content-model.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to reload content model");
        }
        return response.json();
      })
      .then(function (model) {
        const freshValues = (model && model.values) || {};
        state.model = model;
        state.version = typeof model._version === "number" ? model._version : 0;

        // Keep whatever the user actually typed this session (dirtyKeys);
        // take the fresh server value for every other field. That way a
        // conflict never requires retyping edits that are still valid.
        state.pageKeys.forEach(function (key) {
          if (!state.dirtyKeys.has(key)) {
            state.values[key] = typeof freshValues[key] === "string" ? freshValues[key] : "";
          }
          syncFieldDisplay(key);
        });

        setReloadButtonVisible(false);
        setStatus(
          "Reloaded latest content. Your unsaved edits on this page were kept — click Save to try again.",
          "success"
        );
      })
      .catch(function (error) {
        console.error(error);
        setStatus("Could not reload latest content. Try refreshing the page.", "error");
      });
  }

  function saveHomeOverrides() {
    const payload = Object.assign({}, state.values);

    fetch("/api/save-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: payload, _version: state.version })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (result.status === 409) {
          handleSaveConflict();
          return;
        }
        if (result.status !== 200 || !result.data || result.data.ok !== true) {
          throw new Error((result.data && result.data.error) || "Unable to save replica content to the project file.");
        }

        if (typeof result.data._version === "number") {
          state.version = result.data._version;
        }
        state.dirtyKeys.clear();
        writeOverrides({});
        state.isDirty = false;
        setStatus("Saved replica edits to the project content file.", "success");
      })
      .catch(function (error) {
        console.error(error);
        const overrides = readOverrides();
        state.pageKeys.forEach(function (key) {
          if (typeof state.values[key] === "string") {
            overrides[key] = state.values[key];
          }
        });
        writeOverrides(overrides);
        setStatus("Replica save failed. Your changes remain in local overrides.", "error");
      });
  }

  function cancelReplicaEdits() {
    const savedValues = Object.assign({}, state.model && state.model.values ? state.model.values : {}, readOverrides());

    state.pageKeys.forEach(function (key) {
      state.values[key] = String(typeof savedValues[key] === "string" ? savedValues[key] : "");
      syncFieldDisplay(key);
    });

    state.isDirty = false;
    state.dirtyKeys.clear();
    setReloadButtonVisible(false);
    setStatus("Canceled unsaved changes and restored the last saved replica state.");
  }

  function publishReplicaToGitHub() {
    setStatus("Saving then publishing to GitHub...");

    const payload = Object.assign({}, state.values);
    let conflicted = false;

    // Always save first so content-model.json is up to date before the git commit.
    fetch("/api/save-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: payload, _version: state.version })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (result.status === 409) {
          conflicted = true;
          handleSaveConflict();
          return null;
        }
        if (result.status !== 200 || !result.data || result.data.ok !== true) {
          throw new Error((result.data && result.data.error) || "Save before publish failed.");
        }

        if (typeof result.data._version === "number") {
          state.version = result.data._version;
        }
        state.dirtyKeys.clear();
        writeOverrides({});
        state.isDirty = false;
        return fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
      })
      .then(function (response) {
        if (conflicted || response === null) {
          return null;
        }
        if (!response.ok) throw new Error("Unable to publish to GitHub.");
        return response.json();
      })
      .then(function (result) {
        if (conflicted || result === null) {
          return;
        }
        const message = result && result.message ? result.message : "Published to GitHub.";
        setStatus(message, result && result.published ? "success" : undefined);
      })
      .catch(function (error) {
        console.error(error);
        setStatus("Publish failed: " + error.message, "error");
      });
  }

  function wireToolbar() {
    const saveBtn = document.getElementById("replica-save-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", saveHomeOverrides);
    }

    const publishBtn = document.getElementById("replica-publish-btn");
    if (publishBtn) {
      publishBtn.addEventListener("click", publishReplicaToGitHub);
    }

    const cancelBtn = document.getElementById("replica-cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", cancelReplicaEdits);
    }

    const reloadBtn = document.getElementById("replica-reload-btn");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", reloadLatestContent);
    }
  }

  function mountReplica(html, options) {
    const settings = options || {};
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const canvas = document.getElementById("replica-canvas");

    if (!canvas) {
      throw new Error("Replica canvas not found");
    }

    if (!settings.append) {
      canvas.innerHTML = "";
    }

    Array.from(doc.body.children).forEach(function (child) {
      if (child.tagName === "SCRIPT") {
        return;
      }

      const clone = child.cloneNode(true);
      if (settings.revealHidden) {
        if (clone.classList && clone.classList.contains("hidden")) {
          clone.classList.remove("hidden");
        }
        clone.querySelectorAll(".hidden").forEach(function (node) {
          node.classList.remove("hidden");
        });
      }
      canvas.appendChild(clone);
    });

    disableLiveInteractions(canvas);
    return canvas;
  }

  function appendDivider(canvas, label) {
    const divider = document.createElement("section");
    divider.className = "replica-page-divider";
    divider.setAttribute("aria-label", label);

    const pill = document.createElement("span");
    pill.textContent = label;
    divider.appendChild(pill);
    canvas.appendChild(divider);
  }

  function init() {
    Promise.all([
      fetch("content-model.json", { cache: "no-store" }).then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load content model");
        }
        return response.json();
      }),
      fetch("index.html", { cache: "no-store" }).then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load homepage");
        }
        return response.text();
      }),
      fetch("portal.html", { cache: "no-store" }).then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load portal");
        }
        return response.text();
      })
    ])
      .then(function (results) {
        const model = results[0];
        const homepageHtml = results[1];
        const portalHtml = results[2];

        state.model = model;
        state.version = typeof model._version === "number" ? model._version : 0;
        state.values = Object.assign({}, model.values || {}, readOverrides());

        const canvas = mountReplica(homepageHtml);
        appendDivider(canvas, "Client Portal");
        mountReplica(portalHtml, { append: true, revealHidden: true });

        applyValuesToReplica(canvas, model, state.values);
        buildDescriptors(canvas, model);
        buildOtherFieldsPanel(model);
        populateSectionJump(canvas);
        wireToolbar();

        setStatus(
          "Replica ready. Inline edits are local until you click Save. Editable keys: " + state.pageKeys.size
        );
      })
      .catch(function (error) {
        console.error(error);
        setStatus("Replica failed to load. Check content-model.json, index.html, and portal.html.");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
