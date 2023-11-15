export class MathE {

    public static readonly degToRad = 0.01745329252;
    public static readonly radToDeg = 57.2958;
    public static readonly PI_DOUBLE = Math.PI * 2;
    public static readonly PI_HALF = Math.PI * 0.5;

    /**
     * Calculates the distance between the assigned coordinates.
     */
    public static distance(x1: number, y1: number, x2: number, y2: number): number {
        const y = x2 - x1;
        const x = y2 - y1;
        return Math.sqrt(x * x + y * y);
    }

    /**
     * Calculates the angle (radiant) between two points.
     */
    public static angleBetween(x1: number, y1: number, x2: number, y2: number): number {
        return MathE.modulo(Math.atan2(y2 - y1, x2 - x1), MathE.PI_DOUBLE);
    }

    /**
     * Returns true if the assigned midAngleRad is between the startAngleRad and endAngleRad.
     * @param startAngleRad The start.
     * @param endAngleRad The end.
     * @param midAngleRad The value to check.
     */
    public static isAngleBetween(startAngleRad: number, endAngleRad: number, midAngleRad: number) {
        const a = endAngleRad - startAngleRad;
        const b = midAngleRad - startAngleRad;
        return ((b < 0.0 ? b + MathE.PI_DOUBLE : b) < (a < 0.0 ? a + MathE.PI_DOUBLE : a));
    }

    /**
     * Returns the modulo of the assigned value. (Unlike javascripts % 'remainder operator')
     * @param n The value.
     * @param m The modulo value.
     */
    public static modulo(n: number, m: number) {
        return ((n % m) + m) % m;
    }

    /**
     * Returns true if two lines are intersecting.
     */
    public static linesIntersect(p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number): boolean {
        const a1x = p1x - p0x;
        const a1y = p1y - p0y;
        const a2x = p3x - p2x;
        const a2y = p3y - p2y;
        const a = (-a1y * (p0x - p2x) + a1x * (p0y - p2y)) / (-a2x * a1y + a1x * a2y);
        const t = (a2x * (p0y - p2y) - a2y * (p0x - p2x)) / (-a2x * a1y + a1x * a2y);
        return (a >= 0 && a <= 1 && t >= 0 && t <= 1);
    }

    /**
     * Returns true if
     * - a and b are both finite numbers and
     * - Math.abs(a - b) <= errorMarginInclusive.
     */
    public static equalsApproximately(a: number, b: number, errorMarginInclusive: number) {
        if (!Number.isFinite(a) || !Number.isFinite(b))
            return false;

        if (a === b)
            return true;

        return Math.abs(a - b) <= errorMarginInclusive;
    }

    /**
     * Returns true if the assigned string contains a number.
     * @param value the string to check.
     */
    public static containsNumber(value: string): boolean {
        return !isNaN(Number(value));
    }

    /**
     * Returns the middle point of the assigned line.
     */
    public static midpoint(x1: number, y1: number, x2: number, y2: number) {
        return [(x1 + x2) / 2, (y1 + y2) / 2];
    }

    public static inverseLerp(n1: number, n2: number, value: number) {
        return (value - n1) / (n2 - n1);
    }

    public static clamp(value: number, min: number, max: number) {
        return Math.max(min, Math.min(max, value));
    }

    public static adjustPrecision(value: number, precision: number) {
        return Math.round(value * precision) / precision;
    }

    /*
     * Interpolates between the assigned numbers n1 and n2 by the assigned progress (0 - 1).
     */
    public static lerp(n1: number, n2: number, progress: number) {
        return n1 * (1 - progress) + n2 * progress;
    }

    /**
     * Limits the assigned value to the assigned minimum and maximum.
     * @param min The minimum to limit.
     * @param max The maximum to limit.
     * @param value The valiue to limit.
     */
    public static limit(min: number, max: number, value: number) {
        return Math.max(min, Math.min(max, value));
    }
}

