import { Camera } from "./Camera";
import { MathE } from "../../../../shared/helper/MathExtension";

/**
 * A camera that can animate a shake effect.
 * The {@link onTick} method needs to be called every animation frame.
 */
export class AnimatedShakeCamera extends Camera {

    private static readonly MAX_SHAKE_OFFSET_POSITION = 60;
    private static readonly MAX_SHAKE_OFFSET_ZOOM = 0.05;

    private animationDurationMillis: number = -1;
    private animationStartMillis: number = -1;
    private fadeOut: boolean;

    private readonly startX: number;
    private readonly startY: number;
    private readonly startZoom: number;

    private intensityFactor: number;

    private endCallback: () => void;

    /**
     * Creates a new instance.
     * @param x The camera x position in world coordinates.
     * @param y The camera y position in world coordinates.
     * @param zoom The camera zoom.
     */
    public constructor(x: number = 0, y: number = 0, zoom = 0) {
        super(x, y, zoom);
        this.startX = x;
        this.startY = y;
        this.startZoom = zoom;
    }

    /**
     * Should be called every animation frame. Applies the shake animation.
     */
    public onTick() {
        const millisSinceAnimationStart = Date.now() - this.animationStartMillis;
        if (this.animationStartMillis < 0) return;
        const progress = Math.min(1, millisSinceAnimationStart / this.animationDurationMillis);

        let processedIntensity = this.intensityFactor;
        if (this.fadeOut) processedIntensity = processedIntensity * (1 - progress);

        this.setX(this.startX + Math.random() * processedIntensity * AnimatedShakeCamera.MAX_SHAKE_OFFSET_POSITION);
        this.setY(this.startY + Math.random() * processedIntensity * AnimatedShakeCamera.MAX_SHAKE_OFFSET_POSITION);
        this.setZoom(this.startZoom + Math.random() * processedIntensity * AnimatedShakeCamera.MAX_SHAKE_OFFSET_ZOOM);

        if (progress >= 1) {
            this.animationStartMillis = -1;
            if (this.endCallback) {
                const currentCallback = this.endCallback;
                this.endCallback = null;
                currentCallback();
            }
        }
    }

    /**
     * Starts the current initialized animation.
     * @param durationSeconds The duration of the share animation in seconds.
     * @param intensityFactor Factor for the intensity of the share (range [0:1] higher is more intense)
     * @param fadeOut Fades out the intensity if ture is assigned.
     * @param animationEndCallback Callback that will be called if the animation ended.
     */
    public startAnimation(durationSeconds: number, intensityFactor: number, fadeOut: boolean, animationEndCallback?: () => void) {
        this.intensityFactor = MathE.limit(0, 1, intensityFactor);
        this.animationDurationMillis = Math.max(0, durationSeconds * 1000);
        this.fadeOut = fadeOut;
        this.endCallback = animationEndCallback;
        this.animationStartMillis = Date.now();
    }
}