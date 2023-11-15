import { DynamicMapElementModel } from "../game/dynamicMapElements/DynamicMapElement";
import { DynamicMapElementAreaTriggerModel } from "../game/dynamicMapElements/DynamicMapElementAreaTriggerModel";

export function removeElement<T>(array: Array<T>, element: T): boolean {
    const index = array.indexOf(element);
    if (index === -1)
        return false;

    array.splice(index, 1);
    return true;
}

export function lastElement<T>(array: Array<T>): T {
    if (!array || array.length === 0)
        return null;

    return array[array.length - 1];
}

export function arrayEquals<T>(a1: Array<T>, a2: Array<T>) {
    if (!a1 && !a2)
        return true;

    if (!a1 || !a2)
        return false;

    if (a1.length !== a2.length)
        return false;

    return a1.every((e, i) => e === a2[i]);
}

export function shuffle<T>(array: Array<T>) {
    let currentIndex = array.length;
    while (currentIndex != 0) {
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

export function swapElements<T>(array: Array<T>, indexA: number, indexB: number) {
    if (indexA === indexB)
        return;

    const temp = array[indexA];
    array[indexA] = array[indexB];
    array[indexB] = temp;
}

export function wait(ms: number) {
    return new Promise<void>(resolve => {
        setTimeout(() => resolve(), ms);
    });
}

export function objectContentsEqual<T>(a: T, b: T) {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function getDynamicMapElementId(element: DynamicMapElementModel<any>) {
    return element instanceof DynamicMapElementAreaTriggerModel ? element.id : element.$modelId;
}

/**
 * Format bytes as human-readable text.
 * @param bytes Number of bytes.
 * @param dp Number of decimal places to display.
 * @return Formatted string.
 */
export function toHumanReadableFileSize(bytes: number, dp = 1) {
    const thresh = 1000;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let u = -1;
    const r = 10 ** dp;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
    return bytes.toFixed(dp) + ' ' + units[u];
}

/**
 * Shortcut to repeat logic x times.
 * Example: repeat (3) (() => console.log('hi'))
 * @param x The count for execution.
 */
export const repeat = (x: number) => (f: () => void) => {
    if (x > 0) {
        f();
        repeat(x - 1)(f);
    }
};

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns true if the assigned string is 'falsey' or is empty.
 * @param str The string to check.
 */
export function isBlank(str: string): boolean {
    return (!str || /^\s*$/.test(str));
}

export function getAllStringEnumValues<T>(enumType: any) {
    return Object.values(enumType) as T[];
}

export function getAllNumberEnumValues<T>(enumType: any) {
    return Object.keys(enumType).filter(value => !Number.isNaN(Number(value))).map(value => Number(value) as unknown as T);
}

// https://stackoverflow.com/a/1144788
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function replaceAll(str: string, find: string, replace: string) {
    if (!str)
        return str;

    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}