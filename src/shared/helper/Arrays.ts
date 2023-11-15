export class Arrays {

    /**
     * A filter method for arrays to filter for unique entries.
     * myArray = myArray.filter(Arrays.uniqueEntries);
     */
    public static uniqueEntries<T>(value: T, index: number, self: T[]) {
        return self.indexOf(value) === index;
    }

    /**
     * Returns entries that are in both assigned arrays.
     */
    public static elementsInBoth(array1: Array<string>, array2: Array<string>): Array<string> {
        if (!array1 || !array2) return [];
        return array1.filter(e => array2.indexOf(e) > -1);
    }

    public static randomItem(array: Array<any>) {
        if (!array || !array.length) return null;
        return array[Math.floor(Math.random() * array.length)];
    }

}