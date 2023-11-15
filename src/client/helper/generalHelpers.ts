export function getURLParameterString(name: string, defaultValue: string) {
    const query = new URLSearchParams(location.search);
    return query.has(name) ? query.get(name) : defaultValue;
}

export function getURLParameterNumber(name: string, defaultValue: number) {
    const query = new URLSearchParams(location.search);
    return query.has(name) ? +query.get(name) : defaultValue;
}

export function hasURLParameter(name: string) {
    const query = new URLSearchParams(location.search);
    return query.has(name);
}

export function stringifyMapReplacer(_key: any, value: any) {
    if (value instanceof Map) {
        return Object.fromEntries(value);
    } else {
        return value;
    }
}

export function throttledDelayedCall(executor: () => void, callDelay: number) {
    let previousTimeout: any;

    const call = () => {
        if (previousTimeout) {
            clearTimeout(previousTimeout);
        }

        previousTimeout = setTimeout(() => {
            previousTimeout = null;
            executor();
        }, callDelay);
    };

    return call;
}