export let getSharedCurrentLanguageKey = (): string => { throw new Error("sharedCurrentLanguageKey not set"); };

export function setSharedCurrentLanguageKeyCallback(callback: () => string) {
    getSharedCurrentLanguageKey = callback;
}