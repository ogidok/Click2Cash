(() => {
  const EXCLUDED_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEXTAREA",
    "INPUT",
    "SELECT",
    "OPTION",
    "CODE",
    "PRE"
  ]);

  function hasFlaggedAncestor(element) {
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      if (current.hasAttribute("data-c2c-processed") || current.hasAttribute("data-c2c-added")) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    const rects = element.getClientRects();
    return rects.length > 0;
  }

  function scanTextNodes(root, handler) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          const parent = node.parentElement;
          if (!parent || EXCLUDED_TAGS.has(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (hasFlaggedAncestor(parent)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!isVisible(parent)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    let current;
    while ((current = walker.nextNode())) {
      handler(current);
    }
  }

  function scanElements(root, handler) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (!node || EXCLUDED_TAGS.has(node.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (hasFlaggedAncestor(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!isVisible(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.textContent || !node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    let current;
    while ((current = walker.nextNode())) {
      handler(current);
    }
  }

  window.Click2CashDomScanner = {
    scanTextNodes,
    scanElements
  };
})();
