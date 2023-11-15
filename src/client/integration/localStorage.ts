export class LocalStorageObject<T> {
    public constructor(
        private key: string,
        private defaultValue: T,
        private stringToValue: (str: string) => T,
        private valueToString: (value: T) => string
    ) {
        if (localStorage.getItem(this.key) === null) {
            this.set(defaultValue);
        }
    }

    public get(): T {
        const str = localStorage.getItem(this.key);
        if (str === null)
            return this.defaultValue;

        return this.stringToValue(str);
    }

    public set(value: T) {
        const str = this.valueToString(value);
        localStorage.setItem(this.key, str);
    }

    public clear() {
        localStorage.removeItem(this.key);
    }
}

export function localStorageGetNumber(key: string, defaultValue: number) {
    const str = localStorage.getItem(key);
    if (str === null)
        return defaultValue;

    return +str;
}

export function localStorageSetNumber(key: string, value: number) {
    localStorage.setItem(key, value.toString());
}

export class LocalStorageObjectString extends LocalStorageObject<string> {
    public constructor(
        key: string,
        defaultValue: string
    ) {
        super(key, defaultValue, (str) => str, (value) => value);
    }
}

export class LocalStorageObjectNumber extends LocalStorageObject<number> {
    public constructor(
        key: string,
        defaultValue: number
    ) {
        super(key, defaultValue, (str) => +str, (value) => value.toString());
    }
}

export class LocalStorageObjectBoolean extends LocalStorageObject<boolean> {
    public constructor(
        key: string,
        defaultValue: boolean
    ) {
        super(key, defaultValue, (str) => str === "true", (value) => value ? "true" : "false");
    }
}