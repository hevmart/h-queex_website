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
    sectionAnchors: [],
    isDirty: false
  };

  function isBindablePage(page) {
    return page === "index.html" || page === "portal.html";
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
          if (property === "placeholder" || property === "content" || property === "value") {
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
        });

        state.descriptorsByKey.forEach(function (descriptor, key) {
          const value = state.values[key] || "";
          descriptor.elements.forEach(function (element) {
            element.textContent = value;
            setEditableVisualState(element);
          });
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
    });

    state.descriptorsByKey.forEach(function (descriptor, key) {
      const value = state.values[key] || "";
      descriptor.elements.forEach(function (element) {
        element.textContent = value;
        setEditableVisualState(element);
      });
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
