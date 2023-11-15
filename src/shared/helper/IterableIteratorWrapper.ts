import { ArraySet } from "mobx-keystone";

class IterableIteratorWrapper<T> {
    private used = false;

    public constructor(
        private iterator: IterableIterator<T>
    ) {
    }

    private markUsed() {
        if (this.used)
            throw new Error("IterableIteratorWrapper can only be used once.");

        this.used = true;
    }

    /**
     * Determines whether the specified callback function returns true for any element of an iterator.
     * @param predicate A function that accepts up to two arguments. The some method calls
     * the predicate function for each element in the iterator until the predicate returns a value
     * which is coercible to the Boolean value true, or until the end of the iterator.
     * @param thisArg An object to which the this keyword can refer in the predicate function.
     * If thisArg is omitted, undefined is used as the this value.
     */
    public some(predicate: (value: T, index: number) => unknown, thisArg?: any): boolean {
        this.markUsed();

        if (thisArg) {
            predicate = predicate.bind(thisArg);
        }

        let i = 0;
        for (const element of this.iterator) {
            if (predicate(element, i))
                return true;

            i++;
        }

        return false;
    }

    /**
     * Calls a defined callback function on each element of an iterator, and returns an array that contains the results.
     * @param callbackfn A function that accepts up to two arguments. The map method calls the callbackfn function one time for each element in the iterator.
     * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
     */
    public map<U>(callbackfn: (value: T, index: number) => U, thisArg?: any): U[] {
        this.markUsed();

        if (thisArg) {
            callbackfn = callbackfn.bind(thisArg);
        }

        const result = new Array<U>();
        let i = 0;
        for (const element of this.iterator) {
            result.push(callbackfn(element, i));
            i++;
        }

        return result;
    }

    /**
     * Returns the elements of an iterator that meet the condition specified in a callback function.
     * @param predicate A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the iterator.
     * @param thisArg An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.
     */
    public filter(predicate: (value: T, index: number) => unknown, thisArg?: any): T[] {
        this.markUsed();

        if (thisArg) {
            predicate = predicate.bind(thisArg);
        }

        const result = new Array<T>();
        let i = 0;
        for (const element of this.iterator) {
            if (predicate(element, i)) {
                result.push(element);
            }

            i++;
        }

        return result;
    }

    /**
         * Returns the value of the first element in the iterator where predicate is true, and undefined
         * otherwise.
         * @param predicate find calls predicate once for each element of the iterator, in ascending
         * order, until it finds one where predicate returns true. If such an element is found, find
         * immediately returns that element value. Otherwise, find returns undefined.
         * @param thisArg If provided, it will be used as the this value for each invocation of
         * predicate. If it is not provided, undefined is used instead.
         */
    public find(predicate: (value: T, index: number) => unknown, thisArg?: any): T | undefined {
        this.markUsed();

        if (thisArg) {
            predicate = predicate.bind(thisArg);
        }

        let i = 0;
        for (const element of this.iterator) {
            if (predicate(element, i))
                return element;

            i++;
        }

        return undefined;
    }

    public indexOf(value: T): number {
        this.markUsed();

        let i = 0;
        for (const element of this.iterator) {
            if (element === value)
                return i;

            i++;
        }

        return -1;
    }
}

export function wrapIterator<T>(iterator: IterableIterator<T>) {
    return new IterableIteratorWrapper(iterator);
}

export function wrapArraySet<T>(arraySet: ArraySet<T>) {
    return new IterableIteratorWrapper(arraySet.values());
}