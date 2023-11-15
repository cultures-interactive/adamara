import { Graphics } from "pixi.js";

/**
 * This class can be used as an animated {@link Graphics} to mark a path target.
 * Call the {@see update} method for every animation frame.
 */
export class PathTargetGraphic extends Graphics {

    private static readonly InitialRadius = 80;
    private static readonly LoopRadius = 25;

    private readonly color1 = 0xA18D41;
    private readonly color2 = 0xA1AD41;
    private hidden = true;

    private worldX: number;
    private worldY: number;
    private currentRadius = PathTargetGraphic.InitialRadius;

    /**
     * Creates a new instance.
     */
    public constructor() {
        super();
    }

    /**
     * Sets the position of this marker and shows it.
     * @param worldX The x position.
     * @param worldY The y position.
     */
    public setPosition(worldX: number, worldY: number) {
        this.worldX = worldX;
        this.worldY = worldY;
        this.hidden = false;
        this.currentRadius = PathTargetGraphic.InitialRadius;
    }

    /**
     * Updates the marker animation.
     * Needs to be called every animation frame.
     */
    public update() {
        if (this.hidden) return;
        this.clear();
        if (this.currentRadius > PathTargetGraphic.LoopRadius) {
            // fade in animation
            this.currentRadius = Math.max(this.currentRadius - 5, PathTargetGraphic.LoopRadius);
        }
        this.lineStyle(6, this.color1);
        this.drawCircle(this.worldX, this.worldY, this.currentRadius + (7 * Math.sin(Date.now() / 150)));
        this.lineStyle(3, this.color2);
        this.drawCircle(this.worldX, this.worldY, (this.currentRadius - 15) + (6 * Math.cos((Date.now()) / 150)));
    }

    /**
     * Hides this marker.
     */
    public hide() {
        this.clear();
        this.hidden = true;
    }

}
