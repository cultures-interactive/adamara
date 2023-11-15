import { CurveInterpolator2D } from "curve-interpolator";
import { Graphics } from "pixi.js";

/**
 * Cen be used to draw a {@link CurveInterpolator2D} curve.
 */
export class CurveGraphic extends Graphics {

    private readonly color = 0xA1AD41;
    private hidden = true;
    private curve: CurveInterpolator2D;

    /**
     * Creates a new instance.
     */
    public constructor(private showCurvePoints = false) {
        super();
        this.alpha = 0.33;
    }

    /**
     * Sets the curve to draw.
     * @param curve
     */
    public setCurve(curve: CurveInterpolator2D) {
        this.curve = curve;
    }

    /**
     * Draws the curve starting at the assigned interpolation value.
     * @param startInterpolation The start value to draw the curve (between 0 and 1).
     */
    public draw(startInterpolation: number) {
        if (this.hidden || !this.curve) return;
        this.clear();
        startInterpolation = Math.max(0, Math.min(1, startInterpolation));
        this.lineStyle(6, this.color);
        const startPoint = this.curve.getPointAt(startInterpolation);
        this.moveTo(startPoint[0], startPoint[1]);
        for (let interpolation = startInterpolation; interpolation <= 1; interpolation += 0.01) {
            const currentPoint = this.curve.getPointAt(interpolation);
            this.lineTo(currentPoint[0], currentPoint[1]);
        }
        if (this.showCurvePoints) {
            this.lineStyle(6, 0xFFFFFF);
            this.curve.points.forEach(point => {
                this.moveTo(point[0], point[1]);
                this.drawCircle(point[0], point[1], 4);
            });
        }
    }

    /**
     * Hides this curve.
     */
    public hide() {
        this.hidden = true;
        this.clear();
    }

    /**
     * Shows this curve.
     */
    public show() {
        this.hidden = false;
    }
}
