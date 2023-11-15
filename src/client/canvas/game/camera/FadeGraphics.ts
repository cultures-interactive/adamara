import { BLEND_MODES, Graphics } from "pixi.js";
import { gameCanvasSize } from "../../../data/gameConstants";
import { MathE } from "../../../../shared/helper/MathExtension";

/**
 * A simple {@link Graphics} to draw a rectangle in the assigned color and opacity.
 */
export class FadeGraphics extends Graphics {

    /**
     * Creates a new instance.
     * @param fadeWith The width of this graphic in pixel.
     * @param fadeHeight The height of this graphic in pixel.
     * @param color The color to draw.
     */
    public constructor(private color = 0x000000, private fadeWith = gameCanvasSize.width, private fadeHeight = gameCanvasSize.height) {
        super();
        this.blendMode = BLEND_MODES.OVERLAY;
        this.draw();
    }

    public setOpacity(opacity: number) {
        this.alpha = MathE.limit(0, 1, opacity);
    }

    /**
     * Draws the graphics.
     */
    private draw() {
        this.clear();
        this.beginFill(this.color);
        this.drawRect(0, 0, this.fadeWith, this.fadeHeight);
        this.endFill();
    }

}