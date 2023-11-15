import { MathE } from "../../../shared/helper/MathExtension";

test("equalsApproximately", async () => {
    const a = 1.532;
    const b = 3.423;
    const difference = b - a; // 1,891

    expect(MathE.equalsApproximately(0, null, 0)).toEqual(false);
    expect(MathE.equalsApproximately(null, null, 0)).toEqual(false);
    expect(MathE.equalsApproximately(null, 0, 0)).toEqual(false);
    expect(MathE.equalsApproximately(null, null, 10000)).toEqual(false);

    expect(MathE.equalsApproximately(0, 0, 0)).toEqual(true);
    expect(MathE.equalsApproximately(0, 1, 0)).toEqual(false);
    expect(MathE.equalsApproximately(0, 1, 1)).toEqual(true);

    expect(MathE.equalsApproximately(a, a, 0)).toEqual(true);
    expect(MathE.equalsApproximately(b, b, 0)).toEqual(true);
    expect(MathE.equalsApproximately(b, b, 100000)).toEqual(true);

    expect(MathE.equalsApproximately(a, b, 0)).toEqual(false);
    expect(MathE.equalsApproximately(a, b, 1)).toEqual(false);
    expect(MathE.equalsApproximately(a, b, 2)).toEqual(true);
    expect(MathE.equalsApproximately(a, b, difference)).toEqual(true);
    expect(MathE.equalsApproximately(a, b, difference - 0.0001)).toEqual(false);
    expect(MathE.equalsApproximately(a, b, difference + 0.0001)).toEqual(true);

    expect(MathE.equalsApproximately(b, a, 0)).toEqual(false);
    expect(MathE.equalsApproximately(b, a, 1)).toEqual(false);
    expect(MathE.equalsApproximately(b, a, 2)).toEqual(true);
    expect(MathE.equalsApproximately(b, a, difference)).toEqual(true);
    expect(MathE.equalsApproximately(b, a, difference - 0.0001)).toEqual(false);
    expect(MathE.equalsApproximately(b, a, difference + 0.0001)).toEqual(true);
});
