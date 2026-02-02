
// Elementos del DOM
const currencySelect = document.getElementById("currency-select");
const manualAmountInput = document.getElementById("manual-amount");
const manualFromSelect = document.getElementById("manual-from");
const manualToSelect = document.getElementById("manual-to");
const convertBtn = document.getElementById("convert-btn");
const resultDiv = document.getElementById("result");

// Utilidades de almacenamiento
function saveUserCurrency(currency) {
  chrome.storage.sync.set({ userCurrency: currency });
}
function loadUserCurrency() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["userCurrency"], (result) => {
      resolve(result.userCurrency || "USD");
    });
  });
}

// Poblar los selects de monedas
const currencyList = [
  "USD", "EUR", "JPY", "GBP", "BRL", "MXN", "COP", "CLP", "ARS", "SGD", "PYG", "RUB",
  "INR", "KRW", "NGN", "VND", "ILS", "THB"
];

function populateCurrencySelects() {
  [currencySelect, manualFromSelect, manualToSelect].forEach(select => {
    select.innerHTML = "";
    currencyList.forEach(curr => {
      const opt = document.createElement("option");
      opt.value = curr;
      opt.textContent = curr;
      select.appendChild(opt);
    });
  });
}

// Obtener tasas de cambio en tiempo real
async function fetchExchangeRates(base = "USD") {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    const data = await res.json();
    return data.rates || {};
  } catch (e) {
    resultDiv.textContent = "Error obteniendo tasas de cambio.";
    return {};
  }
}

// Conversión manual
async function convertManualAmount() {
  const amount = parseFloat(manualAmountInput.value.replace(/,/g, ""));
  const from = manualFromSelect.value;
  const to = manualToSelect.value;
  if (isNaN(amount)) {
    resultDiv.textContent = "Ingresa un monto válido.";
    return;
  }
  const rates = await fetchExchangeRates(from);
  if (!rates[to]) {
    resultDiv.textContent = "Moneda destino no disponible.";
    return;
  }
  const converted = amount * rates[to];
  resultDiv.textContent = `${amount} ${from} ≈ ${converted.toFixed(2)} ${to}`;
}

// Guardar preferencia de moneda local
currencySelect.addEventListener("change", (e) => {
  saveUserCurrency(e.target.value);
});

// Conversión manual
convertBtn.addEventListener("click", convertManualAmount);

// Inicialización del popup
(async function init() {
  populateCurrencySelects();
  // Cargar preferencia y seleccionar en el select
  const userCurrency = await loadUserCurrency();
  currencySelect.value = userCurrency;

})();
