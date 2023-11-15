import { Graphics } from "pixi.js";

/**
 * Helper class that prints a coordinate origin graphic that
 * can be used for debugging.
 */
export class CoordinateOriginGraphic extends Graphics {

    /**
     * Creates a new instance.
     * @param arrowLength The length of the coordinate arrows.
     * @param arrowTipSize The size of the arrow tips.
     * @param colorX The color of the x-axis.
     * @param colorY The color of the y-axis.
     */
    public constructor(arrowLength = 20, arrowTipSize = 5, colorX = 0x0000FF, colorY = 0x00FF00) {
        super();
        this.lineStyle(1, colorX);
        // x arrow line
        this.moveTo(-arrowLength, 0);
        this.lineTo(arrowLength, 0);
        // x arrow tip
        this.beginFill();
        this.lineTo(arrowLength - arrowTipSize, -arrowTipSize);
        this.lineTo(arrowLength - arrowTipSize, arrowTipSize);
        this.lineTo(arrowLength, 0);
        this.endFill();
        // y arrow line
        this.lineStyle(1, colorY);
        this.moveTo(0, -arrowLength);
        this.lineTo(0, arrowLength);
        // y arrow tip
        this.beginFill();
        this.lineTo(-arrowTipSize, arrowLength - arrowTipSize);
        this.lineTo(arrowTipSize, arrowLength - arrowTipSize);
        this.lineTo(0, arrowLength);
        this.endFill();
    }

}
