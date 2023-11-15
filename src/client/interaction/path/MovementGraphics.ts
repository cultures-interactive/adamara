import { PathTargetGraphic } from "../../canvas/game/character/PathTargetGraphic";
import { CurveGraphic } from "../../canvas/game/character/CurveGraphic";
import { TileHighlight } from "../../canvas/editor/map/TileHighlight";
import { Container } from "pixi.js";
import { CurveInterpolator2D } from "curve-interpolator";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../helper/pixiHelpers";
import { MovementState } from "./MovementState";
import { repeat } from "../../../shared/helper/generalHelpers";
import { localSettingsStore } from "../../stores/LocalSettingsStore";

/**
 * A class to show movement related graphics.
 * Call the {@see onTick} method to update the graphics.
 */
export class MovementGraphics {

    private pathTargetIndicator = new PathTargetGraphic();
    private pathCurveGraphic = new CurveGraphic(true);
    private pathCurrentTileHighlight: Array<TileHighlight>;

    /**
     * Creates a new instance.
     */
    public constructor(private showDebugInfo = localSettingsStore.showDebugInfo) {
        this.pathCurrentTileHighlight = [new TileHighlight(4, 0x000000, 0xA18D00)];
        repeat(3)(() => this.pathCurrentTileHighlight.push(new TileHighlight(0, 0xA18D41, 0xA18D41)));
    }

    /**
     * Adds the graphic elements to the assigned container.
     * @param container The container to add the graphics to.
     */
    public init(container: Container, showTargetIndicator = true) {
        if (showTargetIndicator) container.addChild(this.pathTargetIndicator);
        if (this.showDebugInfo) {
            container.addChild(this.pathCurveGraphic);
            this.pathCurrentTileHighlight.forEach(highlight => {
                highlight.alpha = 0.5;
                container.addChild(highlight);
            });
        }
    }

    /**
     * Removes the graphic elements from the container.
     * @param container The container to remove the graphics from.
     */
    public detach(container: Container) {
        container.removeChild(this.pathTargetIndicator);
        container.removeChild(this.pathCurveGraphic);
        this.pathCurrentTileHighlight.forEach(highlight => {
            container.removeChild(highlight);
        });
    }

    public destroy() {
        this.pathTargetIndicator.destroy({ children: true });
        this.pathCurveGraphic.destroy({ children: true });
        this.pathCurrentTileHighlight.forEach(highlight => {
            highlight.destroy({ children: true });
        });
    }

    /**
     * Updates the graphics.
     */
    public onTick() {
        this.pathTargetIndicator.update();
    }

    /**
     * Starts to visualize a movement curve.
     * @param curve The curve to visualize.
     */
    public startCurve(curve: CurveInterpolator2D) {
        const endPoint = curve.getPointAt(1);
        this.pathTargetIndicator.setPosition(endPoint[0], endPoint[1]);
        if (this.showDebugInfo) {
            this.pathCurveGraphic.setCurve(curve);
            this.pathCurveGraphic.show();
        }
    }

    /**
     * Updates the movement curve.
     * @param progress The progress of the curve (between 0 and 1).
     */
    public updateCurve(progress = 0) {
        if (this.showDebugInfo) this.pathCurveGraphic.draw(progress);
    }

    /**
     * Highlights the assigned tile intersection.
     * @param intersection The intersection to highlight.
     */
    public highlight(intersection: MovementState) {
        if (!this.showDebugInfo) return;
        this.pathCurrentTileHighlight.forEach(graphic => graphic.hide());
        this.showHighlight(0, intersection.baseTileX, intersection.baseTileY);
        let highlightIndex = 1;
        for (let i = 0; i < intersection.secondaryTiles.length; i++) {
            if (highlightIndex < this.pathCurrentTileHighlight.length) {
                this.showHighlight(highlightIndex, intersection.secondaryTiles[i].x, intersection.secondaryTiles[i].y);
            }
            highlightIndex++;
        }
    }

    public showHighlight(index: number, tileX: number, tileY: number) {
        this.pathCurrentTileHighlight[index].show();
        this.pathCurrentTileHighlight[index].x = tileToWorldPositionX(tileX, tileY);
        this.pathCurrentTileHighlight[index].y = tileToWorldPositionY(tileX, tileY);
    }

    public hide() {
        this.pathTargetIndicator.hide();
        if (this.showDebugInfo) {
            this.pathCurrentTileHighlight.forEach(graphic => graphic.hide());
            this.pathCurveGraphic.hide();
        }
    }

}
