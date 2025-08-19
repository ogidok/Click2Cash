let localCurrency = "USD";
let exchangeRates = {};

async function detectLocalCurrency() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    localCurrency = data.currency || "USD";
    return localCurrency;
  } catch (e) {
    return "USD";
  }
}

async function fetchExchangeRates(base = "USD") {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    const data = await res.json();
    exchangeRates = data.rates || {};
    return exchangeRates;
  } catch (e) {
    exchangeRates = {};
    return {};
  }
}

function convertAmount(amount, from, to) {
  if (!exchangeRates[from] || !exchangeRates[to]) return null;
  let usdAmount = amount / exchangeRates[from];
  let converted = usdAmount * exchangeRates[to];
  return converted;
}


function findMoneyNodesDeep() {
  const regex = /((\$|€|¥|£|₽|₹|₺|₩|₦|₫|₪|R\$|MX\$|COP\$|CLP\$|ARS\$|S\$|₲|฿|₡|₵|₭|₮|₱|₲|₸|₺|₼)\s?([\d.,]+)|([\d.,]+)\s?(\$|€|¥|£|₽|₹|₺|₩|₦|₫|₪|R\$|MX\$|COP\$|CLP\$|ARS\$|S\$|₲|฿|₡|₵|₭|₮|₱|₲|₸|₺|₼))/g;
  const nodes = [];

 
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (regex.test(node.textContent)) {
      nodes.push({node, type: "text"});
    }
  }

  document.querySelectorAll('span, div, b, strong, p, td, th, li, a').forEach(el => {
    if (regex.test(el.innerHTML)) {
      nodes.push({node: el, type: "html"});
    }
  });
  return nodes;
}


function showConvertedDeep({node, type}, regex, userCurrency) {
 
  const alreadyConverted = /\(\s*[\d.,]+\s+[A-Z]{3}\s*\)/.test(
    type === "text" ? node.textContent : node.innerHTML
  );
  if (alreadyConverted) return;

  const replacer = (match, symBefore, symbol1, amount1, amount2, symbol2) => {
    let symbol = symbol1 || symbol2;
    let amountRaw = amount1 || amount2;
    let amountNum = null;
    if (amountRaw) {
     
      if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(amountRaw)) {
        amountNum = parseFloat(amountRaw.replace(/\./g, '').replace(/,/g, '.'));
      } else {
        amountNum = parseFloat(amountRaw.replace(/,/g, ''));
      }
    }
    const currencyMap = {
      "$": "USD", "€": "EUR", "¥": "JPY", "£": "GBP", "R$": "BRL", "MX$": "MXN",
      "COP$": "COP", "CLP$": "CLP", "ARS$": "ARS", "S$": "SGD", "₲": "PYG", "₽": "RUB",
      "₹": "INR", "₩": "KRW", "₦": "NGN", "₫": "VND", "₪": "ILS", "฿": "THB"
    };
    let fromCurrency = currencyMap[symbol] || "USD";
    let converted = convertAmount(amountNum, fromCurrency, userCurrency);
    if (converted && !isNaN(converted)) {
      return `${match} (${converted.toFixed(2)} ${userCurrency})`;
    }
    return match;
  };

  if (type === "text") {
    node.textContent = node.textContent.replace(regex, replacer);
  } else if (type === "html") {
    node.innerHTML = node.innerHTML.replace(regex, replacer);
  }
}


function enableDynamicConversion(regex, userCurrency) {
  const observer = new MutationObserver(() => {
    const nodes = findMoneyNodesDeep();
    nodes.forEach(n => showConvertedDeep(n, regex, userCurrency));
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

(async function main() {
  const userCurrency = await detectLocalCurrency();
  await fetchExchangeRates("USD");
  const regex = /((\$|€|¥|£|₽|₹|₺|₩|₦|₫|₪|R\$|MX\$|COP\$|CLP\$|ARS\$|S\$|₲|฿|₡|₵|₭|₮|₱|₲|₸|₺|₼)\s?([\d.,]+)|([\d.,]+)\s?(\$|€|¥|£|₽|₹|₺|₩|₦|₫|₪|R\$|MX\$|COP\$|CLP\$|ARS\$|S\$|₲|฿|₡|₵|₭|₮|₱|₲|₸|₺|₼))/g;


  const nodes = findMoneyNodesDeep();
  nodes.forEach(n => showConvertedDeep(n, regex, userCurrency));

  enableDynamicConversion(regex, userCurrency);
})();