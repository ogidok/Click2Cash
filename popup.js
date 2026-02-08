(() => {
	const api = typeof browser !== "undefined" ? browser : chrome;
	const currencySelect = document.getElementById("currencySelect");
	const detectedLabel = document.getElementById("detected");
	const statusEl = document.getElementById("status");
	const convertBtn = document.getElementById("convertBtn");

	const commonCurrencies = [
		"USD",
		"EUR",
		"GBP",
		"JPY",
		"CLP",
		"MXN",
		"BRL",
		"ARS",
		"COP",
		"PEN",
		"CNY",
		"KRW",
		"AUD",
		"CAD"
	];

	function setStatus(message) {
		statusEl.textContent = message || "";
	}

	function fillOptions(preferred, detected) {
		const set = new Set(commonCurrencies);
		if (detected) {
			set.add(detected);
		}
		if (preferred) {
			set.add(preferred);
		}
		const list = Array.from(set).sort();

		currencySelect.innerHTML = "";
		for (const code of list) {
			const opt = document.createElement("option");
			opt.value = code;
			opt.textContent = code;
			currencySelect.appendChild(opt);
		}

		currencySelect.value = preferred || detected || "USD";
	}

	async function getState() {
		return new Promise((resolve) => {
			api.runtime.sendMessage({ type: "c2c-get-state" }, (response) => {
				resolve(response || {});
			});
		});
	}

	async function setPreferredCurrency(code) {
		return new Promise((resolve) => {
			api.runtime.sendMessage({ type: "c2c-set-currency", currency: code }, () => {
				resolve();
			});
		});
	}

	async function convertCurrentPage() {
		const targetCurrency = currencySelect.value;
		setStatus("Converting...");
		return new Promise((resolve) => {
			api.runtime.sendMessage(
				{ type: "c2c-convert", currency: targetCurrency },
				(response) => {
					if (api.runtime.lastError) {
						setStatus("Unable to access the active tab.");
						resolve();
						return;
					}
					if (!response || response.ok !== true) {
						setStatus("Conversion failed. Try again.");
						resolve();
						return;
					}
					setStatus("Done.");
					resolve();
				}
			);
		});
	}

	currencySelect.addEventListener("change", async (event) => {
		const code = event.target.value;
		await setPreferredCurrency(code);
		setStatus("Preference saved.");
	});

	convertBtn.addEventListener("click", async () => {
		await convertCurrentPage();
	});

	(async () => {
		const state = await getState();
		detectedLabel.textContent = `Detected: ${state.detectedCurrency || "Unknown"}`;
		fillOptions(state.preferredCurrency, state.detectedCurrency);
		await convertCurrentPage();
	})();
})();
