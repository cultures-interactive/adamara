/**
 * A collection (add, delete, clear, size) made to
 * be relatively stable in memory if the amount of elements
 * after clearing/deleting and re-adding is usually stable.
 * 
 * This is achieved by never deleting elements from the array
 * and only setting them to `undefined`.
 * 
 * Iterating can be done by iterating over `sparseData` and
 * ignoring any elements that are `undefined`.
 */
export class SparseArray<T> {
    private _sparseData = new Array<T>();

    public readonly sparseData: ReadonlyArray<T>;

    private _size = 0;

    public constructor() {
        this.sparseData = this._sparseData;
    }

    public get size() {
        return this._size;
    }

    public add(value: T) {
        this._size++;
        if (this._size > this._sparseData.length) {
            this._sparseData.push(value);
        } else {
            for (let i = 0; i < this._sparseData.length; i++) {
                if (this._sparseData[i] === undefined) {
                    this._sparseData[i] = value;
                    break;
                }
            }
        }
    }

    public delete(value: T) {
        for (let i = 0; i < this._sparseData.length; i++) {
            if (this._sparseData[i] === value) {
                this._sparseData[i] = undefined;
                this._size--;
                return;
            }
        }

        throw new Error("Element not found: " + value);
    }

    public clear() {
        this._size = 0;
        this._sparseData.fill(undefined);
    }
}