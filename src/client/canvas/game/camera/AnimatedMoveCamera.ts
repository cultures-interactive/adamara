import { Camera } from "./Camera";
import { MathE } from "../../../../shared/helper/MathExtension";
import { SetCameraActionModel } from "../../../../shared/action/ActionModel";
import { PositionInterface } from "../../../../shared/game/PositionModel";
import { calcCanvasCenteredPosition, calcDefaultZoom, calcInverseCanvasCenteredPosition, calcZoomByFactor, tileToWorldPositionX, tileToWorldPositionY, worldToTilePositionX, worldToTilePositionY } from "../../../helper/pixiHelpers";
import { Point } from "pixi.js";

/**
 * A camera that can animate moving to a target position and zoom using linear interpolation.
 * The {@link onTick} method needs to be called every animation frame.
 */
export class AnimatedMoveCamera extends Camera {

    private static readonly MOVEMENT_SPEED_MILLISECONDS_PER_DISTANCE = 25;
    private static readonly ZOOM_SPEED_MILLISECONDS_PER_LEVEL = 5000;

    private animationStartX: number;
    private animationStartY: number;
    private animationStartZoom: number;

    private animationTargetX: number;
    private animationTargetY: number;
    private animationTargetZoom: number;

    private animationDurationMillis: number = -1;
    private animationStartMillis: number = -1;

    private endCallback: () => void;

    /**
     * Creates a new instance.
     * @param x The camera x position in world coordinates.
     * @param y The camera y position in world coordinates.
     * @param zoom The camera zoom.
     */
    public constructor(x: number = 0, y: number = 0, zoom = 0) {
        super(x, y, zoom);
    }

    /**
     * Initializes the animation parameter.
     * @param targetWorldX The animation target x position in world coordinates.
     * @param targetWorldY The animation target y position in world coordinates.
     * @param targetZoom The animation target zoom.
     * @param durationMillis The animation duration in milliseconds.
     */
    public setAnimationTarget(targetWorldX: number, targetWorldY: number, targetZoom: number, durationMillis: number) {
        this.animationTargetX = targetWorldX;
        this.animationTargetY = targetWorldY;
        this.animationTargetZoom = targetZoom;
        this.animationStartX = this.getX();
        this.animationStartY = this.getY();
        this.animationStartZoom = this.getZoom();
        this.animationDurationMillis = durationMillis;
    }

    /**
     * Sets the animation target parameter as start parameter and vice versa.
     */
    public reverseAnimationTarget() {
        this.animationTargetX = this.animationStartX;
        this.animationTargetY = this.animationStartY;
        this.animationTargetZoom = this.animationStartZoom;
        this.animationStartX = this.getX();
        this.animationStartY = this.getY();
        this.animationStartZoom = this.getZoom();
    }

    /**
     * Starts the current initialized animation.
     * @param animationEndCallback Callback that will be called if the animation ended.
     */
    public startAnimation(animationEndCallback?: () => void) {
        this.endCallback = animationEndCallback;
        this.animationStartMillis = Date.now();
    }

    /**
     * Should be called on any animation frame. Applies the running animation. Calls the end callback.
     */
    public onTick() {
        const millisSinceAnimationStart = Date.now() - this.animationStartMillis;
        if (this.animationStartMillis < 0) return;
        const progress = Math.min(1, millisSinceAnimationStart / this.animationDurationMillis); // Math.min also fixes division by zero here
        this.x = (MathE.lerp(this.animationStartX, this.animationTargetX, progress));
        this.y = (MathE.lerp(this.animationStartY, this.animationTargetY, progress));
        this.zoom = (MathE.lerp(this.animationStartZoom, this.animationTargetZoom, progress));
        if (progress >= 1) {
            this.animationStartMillis = -1;
            if (this.endCallback) {
                const currentCallback = this.endCallback; // this is necessary because the next callback can be set in the callback
                this.endCallback = null;
                currentCallback();
            }
        }
    }

    //The position and zoom of the camera can not be set from 'outside'
    public setX(ignore: number) { }

    public setY(ignore: number) { }

    public setZoom(ignore: number) { }

    /**
     * Creates a new {@link AnimatedMoveCamera} and initializes the animation using the assigned {@link Camera}
     * as the start parameter. Uses the assigned target parameters as the target.
     * @param startCamera Uses the cameras properties as start parameter.
     * @param targetTilePosition The target position in tile coordinates.
     * @param targetZoomFactor The target zoom factor (range [0:1] lower is nearer)
     * @param movementSpeedFactor The animation speed factor (range [0:1] higher is faster)
     */
    public static createByTileTarget(startCamera: Camera, targetTilePosition: { x: number; y: number; }, targetZoomFactor: number, movementSpeedFactor: number): AnimatedMoveCamera {
        const camera = new AnimatedMoveCamera(startCamera.getX(), startCamera.getY(), startCamera.getZoom());
        const targetZoom = targetZoomFactor < 0 ? startCamera.getZoom() : calcZoomByFactor(targetZoomFactor);

        let targetWorldX: number;
        let targetWorldY: number;

        if (targetTilePosition) {
            targetWorldX = tileToWorldPositionX(targetTilePosition.x, targetTilePosition.y, true);
            targetWorldY = tileToWorldPositionY(targetTilePosition.x, targetTilePosition.y, true);
        } else {
            const startPositionBeforeZoom = calcInverseCanvasCenteredPosition({ x: startCamera.getX(), y: startCamera.getY() }, startCamera.getZoom());
            targetWorldX = startPositionBeforeZoom.x;
            targetWorldY = startPositionBeforeZoom.y;
        }

        const targetWorldPoint = calcCanvasCenteredPosition(new Point(targetWorldX, targetWorldY), targetZoom);

        const movementDurationMillis = AnimatedMoveCamera.calcDistanceDurationMillis(startCamera.getX(), startCamera.getY(),
            targetWorldPoint.x, targetWorldPoint.y, movementSpeedFactor);
        const zoomDurationMillis = AnimatedMoveCamera.calcZoomDurationMillis(startCamera.getZoom(), targetZoom, movementSpeedFactor);
        camera.setAnimationTarget(targetWorldPoint.x, targetWorldPoint.y, targetZoom, movementDurationMillis + zoomDurationMillis);
        return camera;
    }

    /**
     * Creates a new {@link AnimatedMoveCamera} and initializes the animation using the assigned {@link Camera}
     * as the start parameter. Uses the assigned target camera as the target.
     * @param startCamera Uses the cameras properties as start parameter.
     * @param targetCamera Uses the cameras properties as target parameter.
     * @param movementSpeedFactor The animation speed factor (range [0:1] higher is faster)
     */
    public static createByCameraTarget(startCamera: Camera, targetCamera: Camera, movementSpeedFactor: number): AnimatedMoveCamera {
        const camera = new AnimatedMoveCamera(startCamera.getX(), startCamera.getY(), startCamera.getZoom());
        const movementDurationMillis = AnimatedMoveCamera.calcDistanceDurationMillis(startCamera.getX(), startCamera.getY(),
            targetCamera.getX(), targetCamera.getY(), movementSpeedFactor);
        const zoomDurationMillis = AnimatedMoveCamera.calcZoomDurationMillis(startCamera.getZoom(), targetCamera.getZoom(), movementSpeedFactor);
        camera.setAnimationTarget(targetCamera.getX(), targetCamera.getY(), targetCamera.getZoom(), movementDurationMillis + zoomDurationMillis);
        return camera;
    }

    /**
     * Calculates the milliseconds needed to animate the distance between the assigned tile coordinates
     * using the assigned movement speed factor. (using tile distance because it is zoom independent)
     * @param startTileX The start x tile coordinate.
     * @param startTileY The start y tile coordinate.
     * @param targetTileX The target x tile coordinate.
     * @param targetTileY The target y tile coordinate.
     * @param movementSpeedFactor The seed factor (range [0:1] higher is faster)
     */
    public static calcDistanceDurationMillis(startTileX: number, startTileY: number, targetTileX: number, targetTileY: number, movementSpeedFactor: number) {
        const tileDistance = MathE.distance(startTileX, startTileY, targetTileX, targetTileY);
        movementSpeedFactor = AnimatedMoveCamera.calcExponentialSeedFactor(movementSpeedFactor);
        return Math.max(0, tileDistance * (1 - movementSpeedFactor) * AnimatedMoveCamera.MOVEMENT_SPEED_MILLISECONDS_PER_DISTANCE);
    }

    /**
     * Calculates the milliseconds needed to animate the distance between the assigned zoom levels.
     * @param startZoom The start zoom.
     * @param targetZoom The target zoom.
     * @param movementSpeedFactor The seed factor (range [0:1] higher is faster)
     */
    public static calcZoomDurationMillis(startZoom: number, targetZoom: number, movementSpeedFactor: number) {
        movementSpeedFactor = AnimatedMoveCamera.calcExponentialSeedFactor(movementSpeedFactor);
        return Math.abs(startZoom - targetZoom) * (1 - movementSpeedFactor) * AnimatedMoveCamera.ZOOM_SPEED_MILLISECONDS_PER_LEVEL;
    }

    // to increase lower speed factors (feels more natural)
    private static calcExponentialSeedFactor(movementSpeedFactor: number): number {
        const normalizedMovementFactor = MathE.limit(0, 1, movementSpeedFactor);
        return Math.pow(normalizedMovementFactor, 0.35);
    }
}