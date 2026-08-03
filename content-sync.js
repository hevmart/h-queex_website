(function () {
  const STORAGE_KEY = "hqueex_content_values_v1";

  function getCurrentPageName() {
    const path = window.location.pathname || "";
    const page = path.split("/").pop();
    return page && page.length > 0 ? page : "index.html";
  }

  function getLocalOverrides() {
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

  function showAdminLinksIfAllowed() {
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("admin") !== "1") {
      return;
    }

    document.querySelectorAll("[data-admin-link]").forEach(function (node) {
      node.hidden = false;
    });
  }

  function applyBinding(binding, values) {
    const value = values[binding.valueKey];
    if (typeof value !== "string") {
      return;
    }

    const nodes = document.querySelectorAll(binding.selector);
    if (!nodes || nodes.length === 0) {
      return;
    }

    const targets = binding.mode === "first" ? [nodes[0]] : Array.from(nodes);
    const property = binding.property || "textContent";

    targets.forEach(function (node) {
      if (property === "firstTextNode") {
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

        const original = target.nodeValue || "";
        const leading = (original.match(/^\s*/) || [""])[0];
        const trailing = (original.match(/\s*$/) || [" "])[0] || " ";
        target.nodeValue = `${leading}${value}${trailing}`;
      } else if (property === "textContent" || property === "innerText" || property === "innerHTML") {
        node[property] = value;
      } else {
        node.setAttribute(property, value);
      }
    });
  }

  function applyModel(model) {
    if (!model || !Array.isArray(model.bindings) || !model.values) {
      return;
    }

    const currentPage = getCurrentPageName();

    model.bindings.forEach(function (binding) {
      if (!binding || !binding.page || !binding.selector || !binding.valueKey) {
        return;
      }

      if (binding.page !== currentPage) {
        return;
      }

      applyBinding(binding, model.values);
    });
  }

  function loadAndApply() {
    fetch("content-model.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Unable to load content model");
        }
        return response.json();
      })
      .then(function (model) {
        const overrides = getLocalOverrides();
        model.values = Object.assign({}, model.values || {}, overrides);
        window.__HQ_CONTENT_VALUES__ = model.values;
        applyModel(model);
      })
      .catch(function () {
        // Keep existing inline text if content model cannot be loaded.
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      showAdminLinksIfAllowed();
      loadAndApply();
    });
  } else {
    showAdminLinksIfAllowed();
    loadAndApply();
  }
})();
