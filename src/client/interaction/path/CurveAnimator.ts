import { PositionInterface } from "../../../shared/game/PositionModel";
import { CurveInterpolator2D } from "curve-interpolator";
import { Vector as CurveInterpolatorVector } from "curve-interpolator/dist/src/interfaces";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../helper/pixiHelpers";
import { DirectionHelper } from "../../../shared/resources/DirectionHelper";
import { Vector } from "vector2d";
import { TileVertices, ZeroVector } from "../../helper/intersectionHelper";

/**
 * This class can be used to move an object along a {@link CurveInterpolator2D} curve.
 * Call the {@see onTick} method on every animation frame.
 * Register to the animation callbacks {@see onStart}, {@see onUpdate}, {@see onEnd}.
 * For a details about the curve see: https://observablehq.com/@kjerandp
 */
export class CurveAnimator {

    private curve: CurveInterpolator2D;
    private readonly speed: number;
    private interpolationProgress = 0;
    private step = 0;
    private ended = true;

    /**
     * Gets called on the start of the animation.
     * @param positionX The x position of the curve at the current interpolation value.
     * @param positionY The y position of the curve at the current interpolation value.
     * @param curveAngleRad The angle in radiant of the curve at the current interpolation value.
     * @param curve The curve.
     */
    public onStart: { (positionX: number, positionY: number, curveAngleRad: number, curve: CurveInterpolator2D): void; };

    /**
     * Gets called on every animation update.
     * @param positionX The x position of the curve at the current interpolation value.
     * @param positionY The y position of the curve at the current interpolation value.
     * @param curveAngleRad The angle in radiant of the curve at the current interpolation value.
     * @param interpolationProgress The current interpolation value (between 0 and 1)
     */
    public onUpdate: { (positionX: number, positionY: number, curveAngleRad: number, interpolationProgress: number): void; };

    /**
     * Gets called on the end of the animation.
     * @param positionX The x position of the curve at the current interpolation value.
     * @param positionY The y position of the curve at the current interpolation value.
     * @param curveAngleRad The angle in radiant of the curve at the current interpolation value.
     */
    public onEnd: { (positionX: number, positionY: number, curveAngleRad: number): void; };

    /**
     * Creates a new instance.
     * @param speed The speed of the animation (higher is faster).
     */
    public constructor(speed: number) {
        this.speed = speed;
    }

    /**
     * Starts a new curve animation.
     * Gently ends the last animation if it did not end.
     * @param curve The curve to animate.
     */
    public start(curve: CurveInterpolator2D) {
        if (!this.ended) this.handleEnd(1);
        this.curve = curve;
        this.interpolationProgress = 0;
        const position = this.curve.getPointAt(this.interpolationProgress);
        const angle = this.curve.getAngleAt(this.interpolationProgress) * (180 / Math.PI);
        this.step = 1 / (curve.length / this.speed);
        this.ended = false;
        if (this.onStart) this.onStart(position[0], position[1], angle, curve);
    }

    /**
     * Immediately stops the curve animation.
     * Note: You might want to center the animated object at the tile center after calling this method.
     * @param triggerEndCallback Will trigger the {@see onEnd} callback if true.
     */
    public stopHard(triggerEndCallback = true) {
        if (triggerEndCallback) this.handleEnd(this.interpolationProgress, true);
        this.ended = true;
        this.interpolationProgress = 0;
    }

    /**
     * Call this method every animation frame.
     * @param deltaTimeTicks The delta time since the last frame.
     */
    public onTick(deltaTimeTicks: number) {
        if (!this.curve || this.ended) return;
        this.interpolationProgress = Math.min(1, this.interpolationProgress + (deltaTimeTicks * this.step));
        if (this.handleEnd(this.interpolationProgress)) return;
        this.handleUpdate();
    }

    private handleEnd(interpolation: number, forceEnd = false): boolean {
        if (interpolation >= 1 || forceEnd) {
            this.ended = true;
            if (this.curve) {
                const position = this.curve.getPointAt(this.interpolationProgress);
                const angle = this.curve.getAngleAt(this.interpolationProgress) * (180 / Math.PI);
                if (this.onEnd) this.onEnd(position[0], position[1], angle);
            }
            this.interpolationProgress = 0;
            return true;
        }
        return false;
    }

    private handleUpdate() {
        if (this.interpolationProgress > 0 && this.interpolationProgress < 1) {
            const position = this.curve.getPointAt(this.interpolationProgress);
            const angle = this.curve.getAngleAt(this.interpolationProgress) * (180 / Math.PI);
            if (this.onUpdate) this.onUpdate(position[0], position[1], angle, this.interpolationProgress);
        }
    }

    public static createCurveUsingBorderPoints(tilePositions: Array<PositionInterface>, playerPosition: Vector = null, tension = 0.1) {
        if (!tilePositions || !tilePositions.length) return new CurveInterpolator2D([], tension);
        const points: CurveInterpolatorVector[] = [];
        if (playerPosition) {
            points.push([playerPosition.x, playerPosition.y]); // start at character position..
        } else {
            points.push(CurveAnimator.toWorldPoint(tilePositions[0])); // start at tile center..
        }

        tilePositions.forEach((currentTile, index) => {
            if (index < tilePositions.length - 1) {
                // .. progress with points on the tile border ..
                points.push(CurveAnimator.getEdgePointBetween(currentTile, tilePositions[index + 1]));
            }
        });
        points.push(CurveAnimator.toWorldPoint(tilePositions[tilePositions.length - 1])); // ... end at center.
        return new CurveInterpolator2D(points, tension);
    }

    /**
     * Converts the assigned tile position into an array with the y and y position in world coordinates.
     * Uses the tile center.
     * @param tilePosition The tile position to convert.
     * @return An array with x and y in world coordinates.
     */
    private static toWorldPoint(tilePosition: PositionInterface) {
        const x = tileToWorldPositionX(tilePosition.x, tilePosition.y, true);
        const y = tileToWorldPositionY(tilePosition.x, tilePosition.y, true);
        return [x, y];
    }

    /**
     * Returns the point on the edge between the assigned tiles where the curve should go through.
     * @param startTilePosition The start tile position.
     * @param targetTilePosition The target tile position.
     * @return An array with x and in world coordinates.
     */
    private static getEdgePointBetween(startTilePosition: PositionInterface, targetTilePosition: PositionInterface) {
        const currentCenter = CurveAnimator.toWorldPoint(startTilePosition);
        const direction = DirectionHelper.getNeighbourDirection(startTilePosition.x, startTilePosition.y, targetTilePosition.x, targetTilePosition.y);
        let offset = TileVertices.get(direction);
        if (!offset) offset = ZeroVector;
        currentCenter[0] += offset[0];
        currentCenter[1] += offset[1];
        return currentCenter;
    }
}

