const display = document.querySelector("[data-display]");
const expressionDisplay = document.querySelector("[data-expression]");
const statusMessage = document.querySelector("[data-status]");
const historyList = document.querySelector("[data-history]");
const buttons = document.querySelectorAll(".calc-key");

const state = {
    displayValue: "0",
    firstOperand: null,
    operator: null,
    waitingForSecondOperand: false,
    history: [],
};

const operatorLabels = {
    "+": "+",
    "-": "−",
    "*": "×",
    "/": "÷",
};

function formatNumber(value) {
    if (!Number.isFinite(value)) {
        return "오류";
    }

    const roundedValue = Number(value.toFixed(10));
    return new Intl.NumberFormat("ko-KR", {
        maximumFractionDigits: 10,
    }).format(roundedValue);
}

function getDisplayNumber() {
    return Number(state.displayValue.replaceAll(",", ""));
}

function setStatus(message = "\u00a0") {
    statusMessage.textContent = message;
}

function updateDisplay() {
    display.textContent = state.displayValue;

    if (state.firstOperand !== null && state.operator !== null) {
        expressionDisplay.textContent = `${formatNumber(state.firstOperand)} ${operatorLabels[state.operator]}`;
        return;
    }

    expressionDisplay.innerHTML = "&nbsp;";
}

function resetCalculator() {
    state.displayValue = "0";
    state.firstOperand = null;
    state.operator = null;
    state.waitingForSecondOperand = false;
    setStatus();
    updateDisplay();
}

function inputNumber(number) {
    setStatus();

    if (state.waitingForSecondOperand || state.displayValue === "오류") {
        state.displayValue = number;
        state.waitingForSecondOperand = false;
        updateDisplay();
        return;
    }

    state.displayValue = state.displayValue === "0" ? number : state.displayValue + number;
    updateDisplay();
}

function inputDecimal() {
    setStatus();

    if (state.waitingForSecondOperand || state.displayValue === "오류") {
        state.displayValue = "0.";
        state.waitingForSecondOperand = false;
        updateDisplay();
        return;
    }

    if (!state.displayValue.includes(".")) {
        state.displayValue += ".";
    }

    updateDisplay();
}

function deleteLastInput() {
    setStatus();

    if (state.waitingForSecondOperand || state.displayValue === "오류") {
        return;
    }

    state.displayValue = state.displayValue.length > 1 ? state.displayValue.slice(0, -1) : "0";
    updateDisplay();
}

function toggleSign() {
    setStatus();

    if (state.displayValue === "0" || state.displayValue === "오류") {
        return;
    }

    state.displayValue = state.displayValue.startsWith("-")
        ? state.displayValue.slice(1)
        : `-${state.displayValue}`;
    updateDisplay();
}

function convertPercent() {
    setStatus();

    const currentValue = getDisplayNumber();

    if (!Number.isFinite(currentValue)) {
        return;
    }

    state.displayValue = String(currentValue / 100);
    updateDisplay();
}

function calculate(left, right, operator) {
    switch (operator) {
        case "+":
            return left + right;
        case "-":
            return left - right;
        case "*":
            return left * right;
        case "/":
            if (right === 0) {
                throw new Error("0으로 나눌 수 없습니다.");
            }
            return left / right;
        default:
            return right;
    }
}

function renderHistory() {
    historyList.innerHTML = "";

    if (state.history.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "empty-history";
        emptyItem.textContent = "아직 계산 내역이 없습니다.";
        historyList.append(emptyItem);
        return;
    }

    state.history.forEach((item) => {
        const historyItem = document.createElement("li");
        historyItem.innerHTML = `
            <span class="history-expression">${item.expression}</span>
            <span class="history-result">${item.result}</span>
        `;
        historyList.append(historyItem);
    });
}

function addHistory(expression, result) {
    state.history.unshift({ expression, result });
    state.history = state.history.slice(0, 5);
    renderHistory();
}

function chooseOperator(nextOperator) {
    setStatus();

    const inputValue = getDisplayNumber();

    if (!Number.isFinite(inputValue)) {
        resetCalculator();
        return;
    }

    if (state.operator && state.waitingForSecondOperand) {
        state.operator = nextOperator;
        updateDisplay();
        return;
    }

    if (state.firstOperand === null) {
        state.firstOperand = inputValue;
    } else if (state.operator) {
        try {
            const result = calculate(state.firstOperand, inputValue, state.operator);
            state.displayValue = formatNumber(result);
            state.firstOperand = result;
        } catch (error) {
            state.displayValue = "오류";
            state.firstOperand = null;
            state.operator = null;
            state.waitingForSecondOperand = true;
            setStatus(error.message);
            updateDisplay();
            return;
        }
    }

    state.operator = nextOperator;
    state.waitingForSecondOperand = true;
    updateDisplay();
}

function performCalculation() {
    if (state.operator === null || state.firstOperand === null) {
        return;
    }

    const secondOperand = getDisplayNumber();
    const expression = `${formatNumber(state.firstOperand)} ${operatorLabels[state.operator]} ${formatNumber(secondOperand)}`;

    try {
        const result = calculate(state.firstOperand, secondOperand, state.operator);
        const formattedResult = formatNumber(result);

        state.displayValue = formattedResult;
        state.firstOperand = null;
        state.operator = null;
        state.waitingForSecondOperand = true;
        expressionDisplay.textContent = `${expression} =`;
        addHistory(`${expression} =`, formattedResult);
        setStatus();
    } catch (error) {
        state.displayValue = "오류";
        state.firstOperand = null;
        state.operator = null;
        state.waitingForSecondOperand = true;
        setStatus(error.message);
    }

    display.textContent = state.displayValue;
}

function handleAction(action, value) {
    if (action === "number") {
        inputNumber(value);
        return;
    }

    if (action === "decimal") {
        inputDecimal();
        return;
    }

    if (action === "operator") {
        chooseOperator(value);
        return;
    }

    if (action === "equals") {
        performCalculation();
        return;
    }

    if (action === "clear") {
        resetCalculator();
        return;
    }

    if (action === "delete") {
        deleteLastInput();
        return;
    }

    if (action === "toggle-sign") {
        toggleSign();
        return;
    }

    if (action === "percent") {
        convertPercent();
    }
}

buttons.forEach((button) => {
    button.addEventListener("click", () => {
        handleAction(button.dataset.action, button.dataset.value);
    });
});

document.addEventListener("keydown", (event) => {
    if (event.key >= "0" && event.key <= "9") {
        inputNumber(event.key);
        return;
    }

    if (event.key === ".") {
        inputDecimal();
        return;
    }

    if (["+", "-", "*", "/"].includes(event.key)) {
        chooseOperator(event.key);
        return;
    }

    if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        performCalculation();
        return;
    }

    if (event.key === "Backspace") {
        deleteLastInput();
        return;
    }

    if (event.key === "Escape") {
        resetCalculator();
    }
});

updateDisplay();
renderHistory();
