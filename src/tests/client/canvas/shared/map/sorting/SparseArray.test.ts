import { SparseArray } from "../../../../../../client/canvas/shared/map/sorting/SparseArray";

test("add/delete/size/iterate", () => {
    const collection = new SparseArray<number>();

    expect(collection.size).toBe(0);
    expect(collection.sparseData).toEqual([]);

    collection.add(1);

    expect(collection.size).toBe(1);
    expect(collection.sparseData).toEqual([1]);

    collection.add(2);

    expect(collection.size).toBe(2);
    expect(collection.sparseData).toEqual([1, 2]);

    collection.add(3);

    expect(collection.size).toBe(3);
    expect(collection.sparseData).toEqual([1, 2, 3]);

    collection.delete(2);

    expect(collection.size).toBe(2);
    expect(collection.sparseData).toEqual([1, undefined, 3]);

    collection.add(4);

    expect(collection.size).toBe(3);
    expect(collection.sparseData).toEqual([1, 4, 3]);

    collection.add(5);

    expect(collection.size).toBe(4);
    expect(collection.sparseData).toEqual([1, 4, 3, 5]);

    collection.delete(1);

    expect(collection.size).toBe(3);
    expect(collection.sparseData).toEqual([undefined, 4, 3, 5]);

    collection.add(6);

    expect(collection.size).toBe(4);
    expect(collection.sparseData).toEqual([6, 4, 3, 5]);

    collection.delete(6);

    expect(collection.size).toBe(3);
    expect(collection.sparseData).toEqual([undefined, 4, 3, 5]);

    collection.delete(3);

    expect(collection.size).toBe(2);
    expect(collection.sparseData).toEqual([undefined, 4, undefined, 5]);

    collection.add(7);

    expect(collection.size).toBe(3);
    expect(collection.sparseData).toEqual([7, 4, undefined, 5]);

    collection.add(8);

    expect(collection.size).toBe(4);
    expect(collection.sparseData).toEqual([7, 4, 8, 5]);

    collection.add(9);

    expect(collection.size).toBe(5);
    expect(collection.sparseData).toEqual([7, 4, 8, 5, 9]);

    collection.clear();

    expect(collection.size).toBe(0);
    expect(collection.sparseData).toEqual([undefined, undefined, undefined, undefined, undefined]);

    collection.add(10);

    expect(collection.size).toBe(1);
    expect(collection.sparseData).toEqual([10, undefined, undefined, undefined, undefined]);

    collection.add(11);

    expect(collection.size).toBe(2);
    expect(collection.sparseData).toEqual([10, 11, undefined, undefined, undefined]);
});