const API_URL = "https://api4.binance.com/api/v3/ticker/24hr";
const STORAGE_KEY = "oz_day3_crypto_favorites";
const REFRESH_INTERVAL_MS = 1000;

const elements = {
    totalCount: document.querySelector("[data-total-count]"),
    favoriteCount: document.querySelector("[data-favorite-count]"),
    topGainer: document.querySelector("[data-top-gainer]"),
    updatedAt: document.querySelector("[data-updated-at]"),
    searchInput: document.querySelector("[data-search-input]"),
    clearSearch: document.querySelector("[data-clear-search]"),
    tabButtons: document.querySelectorAll("[data-tab]"),
    status: document.querySelector("[data-status]"),
    marketList: document.querySelector("[data-market-list]"),
};

const state = {
    tickers: [],
    favorites: loadFavorites(),
    activeTab: "all",
    searchTerm: "",
    previousPrices: new Map(),
    isFetching: false,
};

function loadFavorites() {
    try {
        const savedFavorites = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        return new Set(savedFavorites);
    } catch {
        return new Set();
    }
}

function saveFavorites() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.favorites]));
}

function formatPrice(value) {
    const price = Number(value);

    if (!Number.isFinite(price)) {
        return "-";
    }

    if (price >= 1000) {
        return price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    if (price >= 1) {
        return price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        });
    }

    return price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
    });
}

function formatCompactNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "-";
    }

    return Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 2,
    }).format(number);
}

function formatPercent(value) {
    const percent = Number(value);

    if (!Number.isFinite(percent)) {
        return "0.00%";
    }

    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

function getChangeClass(percent) {
    if (percent > 0) {
        return "positive";
    }

    if (percent < 0) {
        return "negative";
    }

    return "neutral";
}

function getFilteredTickers() {
    const keyword = state.searchTerm.trim().toUpperCase();

    return state.tickers.filter((ticker) => {
        const matchesTab = state.activeTab === "all" || state.favorites.has(ticker.symbol);
        const matchesSearch = keyword === "" || ticker.symbol.includes(keyword) || ticker.asset.includes(keyword);

        return matchesTab && matchesSearch;
    });
}

function normalizeTicker(rawTicker) {
    const previousPrice = state.previousPrices.get(rawTicker.symbol);
    const currentPrice = Number(rawTicker.lastPrice);
    let trend = "flat";

    if (Number.isFinite(previousPrice) && Number.isFinite(currentPrice)) {
        if (currentPrice > previousPrice) {
            trend = "up";
        } else if (currentPrice < previousPrice) {
            trend = "down";
        }
    }

    state.previousPrices.set(rawTicker.symbol, currentPrice);

    return {
        symbol: rawTicker.symbol,
        asset: rawTicker.symbol.replace(/USDT$/, ""),
        lastPrice: currentPrice,
        priceChange: Number(rawTicker.priceChange),
        priceChangePercent: Number(rawTicker.priceChangePercent),
        highPrice: Number(rawTicker.highPrice),
        lowPrice: Number(rawTicker.lowPrice),
        quoteVolume: Number(rawTicker.quoteVolume),
        count: Number(rawTicker.count),
        trend,
    };
}

function renderSummary() {
    const topGainer = state.tickers.reduce((best, current) => {
        if (!best || current.priceChangePercent > best.priceChangePercent) {
            return current;
        }

        return best;
    }, null);

    elements.totalCount.textContent = state.tickers.length.toLocaleString("ko-KR");
    elements.favoriteCount.textContent = state.favorites.size.toLocaleString("ko-KR");
    elements.topGainer.textContent = topGainer
        ? `${topGainer.asset} ${formatPercent(topGainer.priceChangePercent)}`
        : "-";
    elements.updatedAt.textContent = new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function renderStatus(visibleCount) {
    elements.status.classList.remove("error");

    if (state.activeTab === "favorites" && state.favorites.size === 0) {
        elements.status.textContent = "관심 항목을 추가하면 이 탭에서 따로 확인할 수 있습니다.";
        return;
    }

    elements.status.textContent = `${visibleCount.toLocaleString("ko-KR")}개 종목을 표시 중입니다. 데이터는 1초마다 갱신됩니다.`;
}

function renderMarketList() {
    const filteredTickers = getFilteredTickers();
    renderSummary();
    renderStatus(filteredTickers.length);

    if (filteredTickers.length === 0) {
        elements.marketList.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">조건에 맞는 USDT 종목이 없습니다.</td>
            </tr>
        `;
        return;
    }

    elements.marketList.innerHTML = filteredTickers.map((ticker) => {
        const isFavorite = state.favorites.has(ticker.symbol);
        const changeClass = getChangeClass(ticker.priceChangePercent);
        const flashClass = ticker.trend === "up" ? "flash-up" : ticker.trend === "down" ? "flash-down" : "";

        return `
            <tr class="${flashClass}">
                <td>
                    <button
                        class="favorite-button ${isFavorite ? "active" : ""}"
                        type="button"
                        data-favorite-symbol="${ticker.symbol}"
                        aria-label="${ticker.symbol} 관심 항목 ${isFavorite ? "해제" : "추가"}"
                    >★</button>
                </td>
                <td class="symbol-cell">
                    <strong>${ticker.asset}</strong>
                    <span>${ticker.symbol}</span>
                </td>
                <td class="price-cell">
                    <strong>$${formatPrice(ticker.lastPrice)}</strong>
                    <span>${ticker.count.toLocaleString("ko-KR")} trades</span>
                </td>
                <td>
                    <span class="change-pill ${changeClass}">${formatPercent(ticker.priceChangePercent)}</span>
                </td>
                <td class="volume-cell">$${formatCompactNumber(ticker.quoteVolume)}</td>
                <td class="range-cell">$${formatPrice(ticker.highPrice)} / $${formatPrice(ticker.lowPrice)}</td>
            </tr>
        `;
    }).join("");
}

function renderFetchError(message) {
    elements.status.textContent = message;
    elements.status.classList.add("error");

    if (state.tickers.length === 0) {
        elements.marketList.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">데이터를 불러오지 못했습니다. 잠시 후 다시 시도합니다.</td>
            </tr>
        `;
    }
}

async function fetchTickerData() {
    if (state.isFetching) {
        return;
    }

    state.isFetching = true;

    try {
        const response = await fetch(API_URL, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`API 응답 오류: ${response.status}`);
        }

        const data = await response.json();

        state.tickers = data
            .filter((ticker) => ticker.symbol.endsWith("USDT"))
            .map(normalizeTicker)
            .sort((left, right) => right.quoteVolume - left.quoteVolume);

        renderMarketList();
    } catch (error) {
        renderFetchError(`실시간 데이터를 불러오지 못했습니다. ${error.message}`);
    } finally {
        state.isFetching = false;
    }
}

function toggleFavorite(symbol) {
    if (state.favorites.has(symbol)) {
        state.favorites.delete(symbol);
    } else {
        state.favorites.add(symbol);
    }

    saveFavorites();
    renderMarketList();
}

elements.marketList.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest("[data-favorite-symbol]");

    if (!favoriteButton) {
        return;
    }

    toggleFavorite(favoriteButton.dataset.favoriteSymbol);
});

elements.searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    renderMarketList();
});

elements.clearSearch.addEventListener("click", () => {
    elements.searchInput.value = "";
    state.searchTerm = "";
    elements.searchInput.focus();
    renderMarketList();
});

elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
        state.activeTab = button.dataset.tab;

        elements.tabButtons.forEach((tabButton) => {
            const isSelected = tabButton.dataset.tab === state.activeTab;
            tabButton.classList.toggle("active", isSelected);
            tabButton.setAttribute("aria-selected", String(isSelected));
        });

        renderMarketList();
    });
});

fetchTickerData();
setInterval(fetchTickerData, REFRESH_INTERVAL_MS);
