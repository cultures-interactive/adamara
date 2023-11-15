import { Graphics } from "pixi.js";
import { drawProjectedArrow, projectPosition, unProjectAngle } from "../../../helper/pixiHelpers";
import { MathE } from "../../../../shared/helper/MathExtension";
import { ViewAreaTriggerModel } from "../../../../shared/game/ViewAreaTriggerModel";
import { ViewAreaPolygon } from "./ViewAreaPolygon";

/**
 * A view area representing a {@link ViewAreaTriggerModel}.
 */
export class ViewArea extends Graphics {

    private static readonly DirectionArrowLength = 60;
    private static readonly DirectionArrowColor = 0x3333FF;
    private static readonly FillOpacity = 0.3;
    private static readonly LineOpacity = 0.6;
    private static readonly IntersectionColor = 0xBBBB00;

    private viewAreaPolygons = new Array<ViewAreaPolygon>();

    public triggerName: string;
    public intersectionPolygonIndex = -1;
    private directionArrowAngle: number;

    /**
     * Creates a new instance by the assigned  {@link ViewAreaTriggerModel}.
     * @param model The model to create the instance from.
     */
    public static fromModel(model: ViewAreaTriggerModel): ViewArea {
        const graphic = new ViewArea();
        graphic.triggerName = model.name;
        if (model.directionForward) {
            graphic.directionArrowAngle = 0;
            graphic.viewAreaPolygons.push(new ViewAreaPolygon(graphic.directionArrowAngle, model.rangeOfSight, 0x3333FF));
        }
        if (model.directionRight) {
            graphic.directionArrowAngle = 90 * MathE.degToRad;
            graphic.viewAreaPolygons.push(new ViewAreaPolygon(graphic.directionArrowAngle, model.rangeOfSight, 0x5555FF));
        }
        if (model.directionBackward) {
            graphic.directionArrowAngle = 180 * MathE.degToRad;
            graphic.viewAreaPolygons.push(new ViewAreaPolygon(180 * MathE.degToRad, model.rangeOfSight, 0x7777FF));
        }
        if (model.directionLeft) {
            graphic.directionArrowAngle = 270 * MathE.degToRad;
            graphic.viewAreaPolygons.push(new ViewAreaPolygon(270 * MathE.degToRad, model.rangeOfSight, 0x5555FF));
        }
        return graphic;
    }

    /**
     * Updated the position and rotation if this area.
     * @param worldX The x world coordinate to set.
     * @param worldY The y world coordinate to set.
     * @param rotation The rotation to set in radiant.
     */
    public update(worldX: number, worldY: number, rotation: number) {
        this.x = worldX;
        this.y = worldY;
        this.directionArrowAngle = rotation;
        this.viewAreaPolygons.forEach(polygon => {
            polygon.setAngleRad(rotation);
        });
    }

    /**
     * Draws this area.
     */
    public draw() {
        this.clear();
        this.viewAreaPolygons.forEach(polygon => {
            this.drawViewAreaPolygon(polygon);
        });
        //this.drawDirectionArrow(this.directionArrowAngle);
    }

    /**
     * Checks for intersection of the assigned world coordinates with the
     * containing {@link ViewAreaPolygon}s. Updates the {@see this.intersectionPolygonIndex}.
     * @param worldX The world x coordinate to check.
     * @param worldY The world y coordinate to check.
     * @return True if there is an intersection.
     */
    public checkIntersection(worldX: number, worldY: number): boolean {
        const localX = worldX - this.x;
        const localY = worldY - this.y;

        for (let i = 0; i < this.viewAreaPolygons.length; i++) {
            if (this.viewAreaPolygons[i].intersects(localX, localY)) {
                this.intersectionPolygonIndex = i;
                return true;
            }
        }
        this.intersectionPolygonIndex = -1;
        return false;
    }

    /**
     * Draws the assigned {@link ViewAreaPolygon}.
     * Highlights the polygon if it is flagged as intersecting.
     * @param polygon The polygon to draw.
     */
    private drawViewAreaPolygon(polygon: ViewAreaPolygon) {
        if (!polygon) return;
        let drawColor = polygon.color;
        if (this.intersectionPolygonIndex >= 0 && this.viewAreaPolygons[this.intersectionPolygonIndex] == polygon) {
            drawColor = ViewArea.IntersectionColor;
        }
        this.lineStyle(2, drawColor, ViewArea.LineOpacity);
        this.beginFill(drawColor, ViewArea.FillOpacity);
        this.drawPolygon(polygon.getUpdatedVertices());
        this.endFill();
    }

    /**
     * Draws an arrow in the assigned direction.
     * @param directionAngle The direction to draw the arrow.
     */
    private drawDirectionArrow(directionAngle: number) {
        directionAngle = unProjectAngle(directionAngle);
        this.moveTo(0, 0);
        this.beginFill(ViewArea.DirectionArrowColor);
        this.drawCircle(0, 0, 10);
        this.endFill();
        this.lineStyle(4, ViewArea.DirectionArrowColor);
        const tipPosition = projectPosition([Math.cos(directionAngle) * ViewArea.DirectionArrowLength, Math.sin(directionAngle) * ViewArea.DirectionArrowLength, 0]);
        drawProjectedArrow(this, 0, 0, tipPosition[0], tipPosition[1], 25);
        this.moveTo(0, 0);

    }

    /**
     * Returns true if this area is flagged as intersecting.
     */
    public isIntersecting() {
        return this.intersectionPolygonIndex >= 0;
    }

    /**
     * Returns the index of the polygon that is flagged as intersecting.
     */
    public getIntersectingPolygonIndex() {
        return this.intersectionPolygonIndex;
    }

}