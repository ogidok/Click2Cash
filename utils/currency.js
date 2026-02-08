(() => {
  const currencyFormats = new Map();

  function parseAmount(text) {
    if (!text) {
      return null;
    }

    const raw = String(text).trim();
    if (!raw) {
      return null;
    }

    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");
    let normalized = raw;

    if (hasComma && hasDot) {
      const lastComma = raw.lastIndexOf(",");
      const lastDot = raw.lastIndexOf(".");
      const decimalSeparator = lastComma > lastDot ? "," : ".";
      const thousandsSeparator = decimalSeparator === "," ? "." : ",";
      normalized = raw.split(thousandsSeparator).join("");
      normalized = normalized.replace(decimalSeparator, ".");
    } else if (hasComma) {
      const parts = raw.split(",");
      if (parts.length === 2 && parts[1].length <= 2) {
        normalized = raw.replace(",", ".");
      } else {
        normalized = raw.replace(/,/g, "");
      }
    } else if (hasDot) {
      const parts = raw.split(".");
      if (parts.length === 2 && parts[1].length > 2) {
        normalized = raw.replace(/\./g, "");
      }
    }

    const value = Number.parseFloat(normalized);
    if (Number.isNaN(value)) {
      return null;
    }

    return value;
  }

  function convertAmount(amount, fromCurrency, toCurrency, ratesData) {
    if (!ratesData || !ratesData.rates) {
      return null;
    }

    const base = ratesData.base || "USD";
    const rates = ratesData.rates;
    if (!rates[fromCurrency] && fromCurrency !== base) {
      return null;
    }
    if (!rates[toCurrency] && toCurrency !== base) {
      return null;
    }

    const amountInBase = fromCurrency === base ? amount : amount / rates[fromCurrency];
    const converted = toCurrency === base ? amountInBase : amountInBase * rates[toCurrency];
    return converted;
  }

  function formatCurrency(amount, currency) {
    const key = `${currency}-${navigator.language}`;
    if (!currencyFormats.has(key)) {
      currencyFormats.set(
        key,
        new Intl.NumberFormat(navigator.language, {
          style: "currency",
          currency,
          maximumFractionDigits: 2
        })
      );
    }

    return currencyFormats.get(key).format(amount);
  }

  window.Click2CashCurrency = {
    parseAmount,
    convertAmount,
    formatCurrency
  };
})();
