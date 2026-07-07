(() => {
    "use strict";

    const operators = {
        "+": {
            precedence: 1,
            apply: (left, right) => left + right,
        },
        "-": {
            precedence: 1,
            apply: (left, right) => left - right,
        },
        "*": {
            precedence: 2,
            apply: (left, right) => left * right,
        },
        "/": {
            precedence: 2,
            apply: (left, right) => {
                if (right === 0) {
                    throw new Error("0으로 나눌 수 없습니다.");
                }

                return left / right;
            },
        },
    };

    const isDigit = (text) => text >= "0" && text <= "9";
    const isOperator = (text) => Object.hasOwn(operators, text);
    const isNumberStart = (expression, index) => {
        const current = expression[index];
        const next = expression[index + 1];

        return isDigit(current) || current === "." || ((current === "-" || current === "+") && (isDigit(next) || next === "."));
    };

    function readNumber(expression, startIndex) {
        let index = startIndex;
        let numberText = "";
        let dotCount = 0;

        if (expression[index] === "-" || expression[index] === "+") {
            numberText += expression[index];
            index += 1;
        }

        while (index < expression.length) {
            const current = expression[index];

            if (current === ".") {
                dotCount += 1;

                if (dotCount > 1) {
                    throw new Error("소수점은 숫자 하나에 한 번만 사용할 수 있습니다.");
                }

                numberText += current;
                index += 1;
                continue;
            }

            if (!isDigit(current)) {
                break;
            }

            numberText += current;
            index += 1;
        }

        const value = Number(numberText);

        if (!Number.isFinite(value)) {
            throw new Error(`올바른 숫자가 아닙니다: ${numberText}`);
        }

        return {
            token: { type: "number", value },
            nextIndex: index,
        };
    }

    function tokenize(expression) {
        if (typeof expression !== "string") {
            throw new Error("계산식은 문자열로 입력해주세요. 예: calculator('10 + 2 * 3')");
        }

        const tokens = [];
        let index = 0;
        let expectingValue = true;

        while (index < expression.length) {
            const current = expression[index];

            if (current === " ") {
                index += 1;
                continue;
            }

            if (expectingValue && isNumberStart(expression, index)) {
                const result = readNumber(expression, index);
                tokens.push(result.token);
                index = result.nextIndex;
                expectingValue = false;
                continue;
            }

            if (current === "(") {
                if (!expectingValue) {
                    throw new Error("여는 괄호 앞에는 연산자가 필요합니다.");
                }

                tokens.push({ type: "leftParen" });
                index += 1;
                expectingValue = true;
                continue;
            }

            if (current === ")") {
                if (expectingValue) {
                    throw new Error("닫는 괄호 앞에는 숫자 또는 계산식이 필요합니다.");
                }

                tokens.push({ type: "rightParen" });
                index += 1;
                expectingValue = false;
                continue;
            }

            if (isOperator(current)) {
                if (expectingValue) {
                    if (current === "-" && expression[index + 1] === "(") {
                        tokens.push({ type: "number", value: 0 });
                    } else if (current === "+" && expression[index + 1] === "(") {
                        index += 1;
                        continue;
                    } else {
                        throw new Error("연산자 앞에는 숫자 또는 계산식이 필요합니다.");
                    }
                }

                tokens.push({ type: "operator", value: current });
                index += 1;
                expectingValue = true;
                continue;
            }

            throw new Error(`사용할 수 없는 문자입니다: ${current}`);
        }

        if (tokens.length === 0) {
            throw new Error("계산식을 입력해주세요.");
        }

        if (expectingValue) {
            throw new Error("계산식이 연산자로 끝났습니다.");
        }

        return tokens;
    }

    function toReversePolishNotation(tokens) {
        const output = [];
        const stack = [];

        tokens.forEach((token) => {
            if (token.type === "number") {
                output.push(token);
                return;
            }

            if (token.type === "operator") {
                while (stack.length > 0) {
                    const top = stack[stack.length - 1];

                    if (top.type !== "operator") {
                        break;
                    }

                    if (operators[top.value].precedence < operators[token.value].precedence) {
                        break;
                    }

                    output.push(stack.pop());
                }

                stack.push(token);
                return;
            }

            if (token.type === "leftParen") {
                stack.push(token);
                return;
            }

            if (token.type === "rightParen") {
                while (stack.length > 0 && stack[stack.length - 1].type !== "leftParen") {
                    output.push(stack.pop());
                }

                if (stack.length === 0) {
                    throw new Error("괄호의 짝이 맞지 않습니다.");
                }

                stack.pop();
            }
        });

        while (stack.length > 0) {
            const token = stack.pop();

            if (token.type === "leftParen") {
                throw new Error("괄호의 짝이 맞지 않습니다.");
            }

            output.push(token);
        }

        return output;
    }

    function evaluateReversePolishNotation(tokens) {
        const stack = [];

        tokens.forEach((token) => {
            if (token.type === "number") {
                stack.push(token.value);
                return;
            }

            const right = stack.pop();
            const left = stack.pop();

            if (left === undefined || right === undefined) {
                throw new Error("계산식 형식이 올바르지 않습니다.");
            }

            stack.push(operators[token.value].apply(left, right));
        });

        if (stack.length !== 1) {
            throw new Error("계산식 형식이 올바르지 않습니다.");
        }

        return stack[0];
    }

    function formatResult(value) {
        if (Number.isInteger(value)) {
            return String(value);
        }

        return String(Number(value.toFixed(12)));
    }

    function calculate(expression) {
        const normalizedExpression = typeof expression === "string" ? expression.replace(/\s+/g, " ") : expression;
        const tokens = tokenize(normalizedExpression);
        const reversePolishNotation = toReversePolishNotation(tokens);

        return evaluateReversePolishNotation(reversePolishNotation);
    }

    function calculator(expression) {
        try {
            const result = calculate(expression);
            console.log(`${expression} = ${formatResult(result)}`);
            return result;
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    globalThis.calculate = calculate;
    globalThis.calculator = calculator;

    console.log("JavaScript Day1 콘솔 계산기");
    console.log("사용법: calculator('10 + 2 * 3 - 4 / 2')");
    console.log("예시 결과:", calculator("10 + 2 * 3 - 4 / 2"));
})();
