(() => {
	if (window.Click2Cash && window.Click2Cash.__loaded) {
		return;
	}

	const symbolToCurrency = {
		"€": "EUR",
		"$": "USD",
		"£": "GBP",
		"¥": "JPY",
		"￥": "JPY",
		"円": "JPY"
	};

	const pricePattern = /(?:[A-Z]{2,3}\s?)?([€$£¥￥円])\s?([0-9\uFF10-\uFF19]{1,3}(?:[.,\uFF0C\uFF0E\u3001\u3002][0-9\uFF10-\uFF19]{3})*(?:[.,\uFF0C\uFF0E\u3001\u3002][0-9\uFF10-\uFF19]{2})?|[0-9\uFF10-\uFF19]+(?:[.,\uFF0C\uFF0E\u3001\u3002][0-9\uFF10-\uFF19]{2})?)|([0-9\uFF10-\uFF19]{1,3}(?:[.,\uFF0C\uFF0E\u3001\u3002][0-9\uFF10-\uFF19]{3})*(?:[.,\uFF0C\uFF0E\u3001\u3002][0-9\uFF10-\uFF19]{2})?|[0-9\uFF10-\uFF19]+(?:[.,\uFF0C\uFF0E\u3001\u3002][0-9\uFF10-\uFF19]{2})?)\s?(?:[A-Z]{2,3}\s?)?([€$£¥￥円])/g;
	const quickPattern = /[€$£¥￥円]\s*[0-9\uFF10-\uFF19]|[0-9\uFF10-\uFF19]\s*[€$£¥￥円]/;

	function buildReplacement(text, targetCurrency, rates) {
		pricePattern.lastIndex = 0;
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

	function extractSingleMatch(text) {
		pricePattern.lastIndex = 0;
		let count = 0;
		let match;
		let data = null;

		while ((match = pricePattern.exec(text)) !== null) {
			const symbol = match[1] || match[4];
			const amountText = match[2] || match[3];
			if (!symbol || !amountText) {
				continue;
			}
			count += 1;
			if (count > 1) {
				return null;
			}
			data = { symbol, amountText };
		}

		return data;
	}

	function processTextNode(node, targetCurrency, rates) {
		const text = node.nodeValue;
		if (!text || !text.trim()) {
			return;
		}

		if (!quickPattern.test(text)) {
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

	function processElementNode(element, targetCurrency, rates) {
		if (element.hasAttribute("data-c2c-processed")) {
			return;
		}
		if (element.querySelector("[data-c2c-added]")) {
			return;
		}
		if (element.children.length > 12) {
			return;
		}

		const text = element.textContent;
		if (!text || text.length > 160) {
			return;
		}
		if (!quickPattern.test(text)) {
			return;
		}

		const match = extractSingleMatch(text);
		if (!match) {
			return;
		}

		const fromCurrency = symbolToCurrency[match.symbol];
		if (!fromCurrency || fromCurrency === targetCurrency) {
			return;
		}

		const amount = window.Click2CashCurrency.parseAmount(match.amountText);
		if (amount === null) {
			return;
		}

		const converted = window.Click2CashCurrency.convertAmount(
			amount,
			fromCurrency,
			targetCurrency,
			rates
		);
		if (converted === null) {
			return;
		}

		const formatted = window.Click2CashCurrency.formatCurrency(converted, targetCurrency);
		const annotation = document.createElement("span");
		annotation.setAttribute("data-c2c-added", "true");
		annotation.textContent = ` (${formatted})`;
		element.appendChild(annotation);
		element.setAttribute("data-c2c-processed", "true");
	}

	function convertPage({ targetCurrency, rates }) {
		if (!targetCurrency || !rates || !rates.rates) {
			return { ok: false, reason: "missing-data" };
		}

		window.Click2CashDomScanner.scanTextNodes(document.body, (node) => {
			processTextNode(node, targetCurrency, rates);
		});

		window.Click2CashDomScanner.scanElements(document.body, (element) => {
			processElementNode(element, targetCurrency, rates);
		});

		return { ok: true };
	}

	function detectCurrencyOnPage() {
		const counts = new Map();

		function tallyFromText(text) {
			if (!text || !quickPattern.test(text)) {
				return;
			}
			pricePattern.lastIndex = 0;
			let match;
			while ((match = pricePattern.exec(text)) !== null) {
				const symbol = match[1] || match[4];
				if (!symbol) {
					continue;
				}
				const currency = symbolToCurrency[symbol];
				if (!currency) {
					continue;
				}
				counts.set(currency, (counts.get(currency) || 0) + 1);
			}
		}

		window.Click2CashDomScanner.scanTextNodes(document.body, (node) => {
			tallyFromText(node.nodeValue || "");
		});

		window.Click2CashDomScanner.scanElements(document.body, (element) => {
			tallyFromText(element.textContent || "");
		});

		let topCurrency = null;
		let topCount = 0;
		for (const [currency, count] of counts.entries()) {
			if (count > topCount) {
				topCurrency = currency;
				topCount = count;
			}
		}

		return topCurrency;
	}

	window.Click2Cash = {
		__loaded: true,
		convertPage,
		detectCurrencyOnPage
	};

	const api = typeof browser !== "undefined" ? browser : chrome;
	if (api && api.runtime && api.runtime.onMessage) {
		api.runtime.onMessage.addListener((message, sender, sendResponse) => {
			if (message && message.type === "c2c-convert") {
				const result = convertPage(message);
				sendResponse(result);
			}
			if (message && message.type === "c2c-detect") {
				const currency = detectCurrencyOnPage();
				sendResponse({ currency });
			}
		});
	}
})();
