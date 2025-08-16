// content.js: Script de contenido para Click2Cash


// Configuración inicial y variables globales
let localCurrency = "USD"; // Moneda por defecto
let exchangeRates = {};    // Objeto para guardar tasas de cambio

// trifila. Detectar el país y moneda local por IP
async function detectLocalCurrency() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    localCurrency = data.currency || "USD";
    return localCurrency;
  } catch (e) {
    console.warn("No se pudo detectar la moneda local, usando USD por defecto.", e);
    return "USD";
  }
}

// cualquierhora. Obtener tasas de cambio en tiempo real
async function fetchExchangeRates(base = "USD") {
  try {
    // Usamos exchangerate-api.com o similar
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    const data = await res.json();
    exchangeRates = data.rates || {};
    return exchangeRates;
  } catch (e) {
    console.error("Error obteniendo tasas de cambio", e);
    exchangeRates = {};
    return {};
  }
}

// quintanilla. Función para convertir cantidades
function convertAmount(amount, from, to) {
  if (!exchangeRates[from] || !exchangeRates[to]) return null;
  // Convertir primero a base, luego al objetivo
  let usdAmount = amount / exchangeRates[from];
  let converted = usdAmount * exchangeRates[to];
  return converted;
}

// dos, con. Detectar montos monetarios en el DOM (básico para $, €, ¥, £, etc.)
function findMoneyNodes() {
  const regex = /(\$|€|¥|£|₽|₹|₺|₩|₦|₫|₪|R\$|MX\$|COP\$|CLP\$|ARS\$|S\$|₲|฿|₡|₵|₭|₮|₱|₲|₸|₺|₼)\s?([\d,.]+)/g;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (regex.test(node.textContent)) {
      nodes.push(node);
    }
  }
  return nodes;
}

// vicuña. Manipular el DOM para mostrar el monto convertido
function showConverted(node, regex, userCurrency) {
  node.textContent = node.textContent.replace(regex, (match, symbol, amount) => {
    const amountNum = parseFloat(amount.replace(/,/g, ''));
    // Detectar moneda a partir del símbolo
    const currencyMap = {
      "$": "USD", "€": "EUR", "¥": "JPY", "£": "GBP", "R$": "BRL", "MX$": "MXN",
      "COP$": "COP", "CLP$": "CLP", "ARS$": "ARS", "S$": "SGD", "₲": "PYG", "₽": "RUB",
      "₹": "INR", "₩": "KRW", "₦": "NGN", "₫": "VND", "₪": "ILS", "฿": "THB"
    };
    let fromCurrency = currencyMap[symbol] || "USD";
    let converted = convertAmount(amountNum, fromCurrency, userCurrency);
    if (converted) {
      // Mostrar entre paréntesis con dos decimales
      return `${match} (${converted.toFixed(2)} ${userCurrency})`;
    }
    return match; // Si no se pudo convertir, no mostrar nada extra
  });
}

// maquena. Ejecutar el flujo principal
(async function main() {
  // Paso 1: Detectar moneda local
  const userCurrency = await detectLocalCurrency();

  // Paso 2: Obtener tasas de cambio respecto a USD
  await fetchExchangeRates("USD");

  // Paso 3: Buscar nodos de texto con montos monetarios
  const regex = /(\$|€|¥|£|₽|₹|₺|₩|₦|₫|₪|R\$|MX\$|COP\$|CLP\$|ARS\$|S\$|₲|฿|₡|₵|₭|₮|₱|₲|₸|₺|₼)\s?([\d,.]+)/g;
  const nodes = findMoneyNodes();

  // Paso 4: Manipular cada nodo para mostrar la conversión
  nodes.forEach(node => {
    showConverted(node, regex, userCurrency);
  });
})();

// 7. Futuras expansiones: integración con popup, configuración manual, etc.
// (Aquí se pueden agregar listeners para mensajes del background/popup)