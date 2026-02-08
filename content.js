(() => {
	if (window.Click2Cash && window.Click2Cash.__loaded) {
		return;
	}

	const symbolToCurrency = {
		"€": "EUR",
		"$": "USD",
		"£": "GBP",
		"¥": "JPY"
	};

	const pricePattern = /([€$£¥])\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)|(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)\s?([€$£¥])/g;

	function buildReplacement(text, targetCurrency, rates) {
		const fragment = document.createDocumentFragment();
		let lastIndex = 0;
		let match;
		let appended = false;

		while ((match = pricePattern.exec(text)) !== null) {
			const symbol = match[1] || match[4];
			const amountText = match[2] || match[3];
			const matchIndex = match.index;

			if (!symbol || !amountText) {
				continue;
			}

			const fromCurrency = symbolToCurrency[symbol];
			if (!fromCurrency || fromCurrency === targetCurrency) {
				continue;
			}

			const amount = window.Click2CashCurrency.parseAmount(amountText);
			if (amount === null) {
				continue;
			}

			const converted = window.Click2CashCurrency.convertAmount(
				amount,
				fromCurrency,
				targetCurrency,
				rates
			);

			if (converted === null) {
				continue;
			}

			const formatted = window.Click2CashCurrency.formatCurrency(converted, targetCurrency);
			const before = text.slice(lastIndex, matchIndex + match[0].length);
			fragment.appendChild(document.createTextNode(before));

			const annotation = document.createElement("span");
			annotation.setAttribute("data-c2c-added", "true");
			annotation.textContent = ` (${formatted})`;
			fragment.appendChild(annotation);

			lastIndex = matchIndex + match[0].length;
			appended = true;
		}

		if (!appended) {
			return null;
		}

		if (lastIndex < text.length) {
			fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
		}

		return fragment;
	}

	function processTextNode(node, targetCurrency, rates) {
		const text = node.nodeValue;
		if (!text || !text.trim()) {
			return;
		}

		const fragment = buildReplacement(text, targetCurrency, rates);
		if (!fragment) {
			return;
		}

		const wrapper = document.createElement("span");
		wrapper.setAttribute("data-c2c-processed", "true");
		wrapper.style.display = "inline";
		wrapper.style.whiteSpace = "inherit";
		wrapper.appendChild(fragment);

		node.parentNode.replaceChild(wrapper, node);
	}

	function convertPage({ targetCurrency, rates }) {
		if (!targetCurrency || !rates || !rates.rates) {
			return { ok: false, reason: "missing-data" };
		}

		window.Click2CashDomScanner.scanTextNodes(document.body, (node) => {
			processTextNode(node, targetCurrency, rates);
		});

		return { ok: true };
	}

	window.Click2Cash = {
		__loaded: true,
		convertPage
	};

	const api = typeof browser !== "undefined" ? browser : chrome;
	if (api && api.runtime && api.runtime.onMessage) {
		api.runtime.onMessage.addListener((message, sender, sendResponse) => {
			if (message && message.type === "c2c-convert") {
				const result = convertPage(message);
				sendResponse(result);
			}
		});
	}
})();
