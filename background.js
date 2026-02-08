(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;

  const GEO_URL = "https://ipapi.co/json/";
  const RATES_URL = "https://open.er-api.com/v6/latest/USD";
  const CACHE_TTL_MS = 60 * 60 * 1000;

  const rateCache = {
    timestamp: 0,
    data: null
  };

  function queryActiveTab() {
    return new Promise((resolve) => {
      api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs && tabs[0] ? tabs[0] : null);
      });
    });
  }

  function getStorage(keys) {
    return new Promise((resolve) => {
      api.storage.local.get(keys, (items) => resolve(items || {}));
    });
  }

  function setStorage(items) {
    return new Promise((resolve) => {
      api.storage.local.set(items, () => resolve());
    });
  }

  function executeScript(tabId, files) {
    return new Promise((resolve, reject) => {
      api.scripting.executeScript(
        {
          target: { tabId },
          files
        },
        () => {
          if (api.runtime.lastError) {
            reject(api.runtime.lastError);
            return;
          }
          resolve();
        }
      );
    });
  }

  function sendMessage(tabId, message) {
    return new Promise((resolve) => {
      api.tabs.sendMessage(tabId, message, (response) => {
        if (api.runtime.lastError) {
          resolve({ error: api.runtime.lastError });
          return;
        }
        resolve({ response });
      });
    });
  }

  function getLocaleHints() {
    const uiLanguage = api.i18n && api.i18n.getUILanguage
      ? api.i18n.getUILanguage()
      : "";
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    return { uiLanguage, timeZone };
  }

  function guessCurrencyFromLocale() {
    const { uiLanguage, timeZone } = getLocaleHints();
    if (uiLanguage.toLowerCase().startsWith("ja") || timeZone === "Asia/Tokyo") {
      return "JPY";
    }
    if (uiLanguage.toLowerCase().startsWith("en-gb") || timeZone === "Europe/London") {
      return "GBP";
    }
    if (uiLanguage.toLowerCase().startsWith("de") || uiLanguage.toLowerCase().startsWith("fr")) {
      return "EUR";
    }
    return null;
  }

  async function detectCurrency() {
    const stored = await getStorage(["detectedCurrency"]);
    if (stored.detectedCurrency) {
      return stored.detectedCurrency;
    }

    try {
      const response = await fetch(GEO_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("geo-failed");
      }
      const data = await response.json();
      let currency = data && data.currency ? String(data.currency).toUpperCase() : "USD";
      if (currency === "USD") {
        const fallback = guessCurrencyFromLocale();
        if (fallback) {
          currency = fallback;
        }
      }
      await setStorage({ detectedCurrency: currency });
      return currency;
    } catch (error) {
      return guessCurrencyFromLocale() || "USD";
    }
  }

  async function getPreferredCurrency() {
    const stored = await getStorage(["preferredCurrency"]);
    if (stored.preferredCurrency) {
      return stored.preferredCurrency;
    }
    const detected = await detectCurrency();
    return detected;
  }

  async function getRates() {
    const now = Date.now();
    if (rateCache.data && now - rateCache.timestamp < CACHE_TTL_MS) {
      return rateCache.data;
    }

    const response = await fetch(RATES_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("rates-failed");
    }
    const data = await response.json();
    if (!data || !data.rates) {
      throw new Error("rates-invalid");
    }

    rateCache.timestamp = now;
    rateCache.data = {
      base: data.base_code || "USD",
      rates: data.rates
    };

    return rateCache.data;
  }

  async function ensureContentScript(tabId) {
    const probe = await sendMessage(tabId, { type: "c2c-ping" });
    if (!probe.error) {
      return;
    }

    await executeScript(tabId, [
      "utils/currency.js",
      "utils/domScanner.js",
      "content.js"
    ]);
  }

  async function handleConvert(targetCurrency) {
    const tab = await queryActiveTab();
    if (!tab || !tab.id) {
      return { ok: false, reason: "no-tab" };
    }

    const finalCurrency = targetCurrency || (await getPreferredCurrency());
    const rates = await getRates();

    await ensureContentScript(tab.id);
    const result = await sendMessage(tab.id, {
      type: "c2c-convert",
      targetCurrency: finalCurrency,
      rates
    });

    if (result.error) {
      return { ok: false, reason: "message-failed" };
    }

    return result.response || { ok: false };
  }

  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) {
      return;
    }

    if (message.type === "c2c-get-state") {
      (async () => {
        const preferredCurrency = await getPreferredCurrency();
        const detectedCurrency = await detectCurrency();
        sendResponse({ preferredCurrency, detectedCurrency });
      })();
      return true;
    }

    if (message.type === "c2c-set-currency") {
      (async () => {
        const currency = message.currency ? String(message.currency).toUpperCase() : "USD";
        await setStorage({ preferredCurrency: currency });
        sendResponse({ ok: true });
      })();
      return true;
    }

    if (message.type === "c2c-convert") {
      (async () => {
        try {
          const result = await handleConvert(message.currency);
          sendResponse({ ok: result.ok !== false });
        } catch (error) {
          sendResponse({ ok: false });
        }
      })();
      return true;
    }
  });
})();
