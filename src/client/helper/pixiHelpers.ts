import { Application } from "@pixi/app";
import { InteractionEvent } from "@pixi/interaction";
import { Container, DisplayObject, Graphics, InteractionManager, Point, Rectangle, Texture } from "pixi.js";
import { gameCanvasSize, gameConstants } from "../data/gameConstants";
import { ITypedArray } from "@pixi/core";
import { Color } from "@pixi-spine/all-4.1";
import { wrapIterator } from "../../shared/helper/IterableIteratorWrapper";
import { rotate } from "mathjs";
import { MathE } from "../../shared/helper/MathExtension";
import { MapElementContainer } from "../canvas/shared/map/sorting/MapElementContainer";

export const xAxis = [1, 0, 0];
export const yAxis = [0, 1, 0];
export const zAxis = [0, 0, 1];


export function typedArrayValuesEqual(a: ITypedArray, b: ITypedArray): boolean {
    if (a === b)
        return true;

    if (!a || !b)
        return false;

    const aLength = a.length;
    if (aLength !== b.length)
        return false;

    for (let i = 0; i < aLength; i++) {
        if (a[i] !== b[i])
            return false;
    }

    return true;
}

export const halfTileWidth = gameConstants.tileWidth / 2;
export const halfTileHeight = gameConstants.tileHeight / 2;

export enum MouseButton {
    LeftOrTouch,
    Middle,
    Right,
    Unknown
}

export function isMouseMove(e: InteractionEvent) {
    return e.data.originalEvent instanceof PointerEvent;
}

export function isRightButtonPressed(e: InteractionEvent) {
    const { originalEvent } = e.data;
    return originalEvent instanceof PointerEvent && originalEvent.buttons === 2;
}

export function isTwoFingerPan(e: InteractionEvent) {
    return getTouches(e)?.length === 2;
}

export function isTouchEvent(e: InteractionEvent) {
    return getTouches(e) != null;
}

export function getTouches(e: InteractionEvent) {
    const { originalEvent } = e.data;
    return window.TouchEvent && originalEvent instanceof TouchEvent ? originalEvent.touches : null;
}

export function getEventMouseButton(e: InteractionEvent) {
    const { originalEvent } = e.data;

    if (originalEvent instanceof PointerEvent) {
        const { button } = originalEvent;
        switch (button) {
            case 0:
                return MouseButton.LeftOrTouch;
            case 1:
                return MouseButton.Middle;
            case 2:
                return MouseButton.Right;
            default:
                return MouseButton.Unknown;
        }
    }
    const touches = getTouches(e);
    if (touches) {
        if (touches.length == 1) {
            return MouseButton.LeftOrTouch;
        }
    }
    return MouseButton.Unknown;
}

export function touchDistance(x0: number, y0: number, x2: number, y1: number) {
    return Math.hypot(x0 - x2, y0 - y1);
}

export function centerContainer(container: Container, center: Point, canvasWidth: number, canvasHeight: number) {
    const scaleFactor = container.scale.x;

    container.position.set(
        canvasWidth / 2 - center.x * scaleFactor,
        canvasHeight / 2 - center.y * scaleFactor
    );
}

export function getInteractionManagerFromApplication(app: Application) {
    return app.renderer.plugins.interaction as InteractionManager;
}

export function destroyDisplayObject<T extends DisplayObject>(displayObject: T) {
    displayObject.destroy({
        children: true,
        texture: false,
        baseTexture: false
    });
}

export function adjustMapElementContainerViewMap<Model, View extends MapElementContainer>(addToContainer: (view: View) => void, dataArray: ReadonlyArray<Model>, views: Map<Model, View>, createView: (data: Model) => View) {
    adjustViewMap(
        dataArray,
        views,
        createView,
        addToContainer,
        destroyDisplayObject
    );
}

export function adjustDisplayObjectViewMap<Model, View extends DisplayObject>(addToContainer: (view: View) => void, dataArray: ReadonlyArray<Model>, views: Map<Model, View>, createView: (data: Model) => View) {
    adjustViewMap(
        dataArray,
        views,
        createView,
        addToContainer,
        destroyDisplayObject
    );
}

export function adjustViewMap<Model, View>(dataArray: ReadonlyArray<Model>, views: Map<Model, View>, createView: (data: Model) => View, runAfterCreating: (data: View) => void, destroyView: (view: View, data: Model) => void) {
    const viewKeys = wrapIterator(views.keys());

    const dataToRemove = viewKeys.filter(key => !dataArray.includes(key));
    for (const data of dataToRemove) {
        const view = views.get(data);
        destroyView(view, data);
        views.delete(data);
    }

    const dataToAdd = dataArray.filter(key => !views.has(key));
    for (const data of dataToAdd) {
        const view = createView(data);
        runAfterCreating(view);
        views.set(data, view);
    }
}

export function tileToWorldPositionX(tilePositionX: number, tilePositionY: number, forTileCenter = false) {
    const anchorX = (tilePositionX - tilePositionY) * halfTileWidth;
    return forTileCenter ? anchorX + (halfTileWidth) : anchorX;
}

export function tileToWorldPositionY(tilePositionX: number, tilePositionY: number, forTileCenter = false) {
    const anchorY = (tilePositionX + tilePositionY) * halfTileHeight;
    return forTileCenter ? anchorY + (halfTileHeight) : anchorY;
}

export function worldToTilePositionX(worldPositionX: number, worldPositionY: number, round = true) {
    const x = (worldPositionX / halfTileWidth + worldPositionY / halfTileHeight) / 2 - 1;
    if (!round)
        return x;

    return Math.floor(x + 0.5);
}

export function worldToTilePositionY(screenPositionX: number, screenPositionY: number, round = true) {
    const y = (screenPositionY / halfTileHeight - screenPositionX / halfTileWidth) / 2;
    if (!round)
        return y;

    return Math.floor(y + 0.5);
}

export function worldToTilePosition(worldPosition: Point): Point {
    return new Point(worldToTilePositionX(worldPosition.x, worldPosition.y), worldToTilePositionY(worldPosition.x, worldPosition.y));
}

export function createTextureFromBuffer(imageBuffer: ArrayBuffer): Promise<Texture> {
    return Texture.fromURL(URL.createObjectURL(new Blob([imageBuffer])));
}

export function hexToColor(hex: string): Color {
    if (!hex) return null;
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? new Color(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 1) : null;
}

/**
 * Draws an arrow width a 'projected' tip to the assigned {@link Graphics} with the assigned start and end positions.
 * @param graphics The graphics to draw on.
 * @param startX The start x position of the arrow.
 * @param startY The start y position of the arrow.
 * @param endX The end x position of the arrow.
 * @param endY The end y position of the arrow.
 * @param tipSize The tip size.
 */
export function drawProjectedArrow(graphics: Graphics, startX: number, startY: number, endX: number, endY: number, tipSize = 15) {
    graphics.moveTo(startX, startY);
    graphics.lineTo(endX, endY);
    const angle = unProjectAngle(MathE.angleBetween(startX, startY, endX, endY));
    const p1x = Math.cos(angle + Math.PI * 1.2) * tipSize;
    const p1y = Math.sin(angle + Math.PI * 1.2) * tipSize;
    const p2x = Math.cos(angle - Math.PI * 1.2) * tipSize;
    const p2y = Math.sin(angle - Math.PI * 1.2) * tipSize;
    const p1 = projectPosition([p1x, p1y, 0]);
    const p2 = projectPosition([p2x, p2y, 0]);
    graphics.moveTo(endX, endY);
    graphics.lineTo(p1[0] + endX, p1[1] + endY);
    graphics.moveTo(endX, endY);
    graphics.lineTo(p2[0] + endX, p2[1] + endY);
}

/**
 * Projects the assigned point to the perspective of the map.
 *
 *   Grid with no perspective      Tiles in map perspective
 *   ____ ____ ____                    ⟋ ⟍
 *  | 0  | 1  | 2  |       =>       ⟋       ⟍
 *  |____|____|____|                ⟍   0  ⟋  ⟍
 *                                     ⟍⟋        ⟍
 *                                        ⟍   1  ⟋  ⟍
 *                                           ⟍⟋        ⟍
 *                                              ⟍   2  ⟋
 *                                                 ⟍⟋
 *
 * @param point An array of 3D world coordinates [x, y, z]
 * @return An array of 3D world coordinates [x, y, z] that are projected to the map.
 */
export function projectPosition(point: number[]) {
    const a = rotate(point, gameConstants.projectionRotationZ, zAxis);
    return rotate(a, gameConstants.projectionRotationX, xAxis);
}

/**
 * Projects the assigned point to form the perspective of the map to world coordinates.
 * @param point An array of 3D map projected world coordinates [x, y, z]
 * @return An array of 3D world coordinates [x, y, z].
 */
export function unProjectPosition(point: number[]) {
    point[2] = point[1] * 1.438356164383562;
    const a = rotate(point, -gameConstants.projectionRotationX, xAxis);
    return rotate(a, -gameConstants.projectionRotationZ, zAxis);
}

/**
 * Projects an angle to the map perspective.
 * @param angle The angle to project.
 */
export function projectAngle(angle: number) {
    let directionVector = [Math.cos(angle), Math.sin(angle), 0];
    directionVector = projectPosition(directionVector);
    return MathE.angleBetween(0, 0, directionVector[0], directionVector[1]);
}

/**
 * Calculates the scale to fit the assigned {@link Rectangle} to a rectangle with the assigned width and height.
 * @param rectangleToFit The rectangle that should fit.
 * @param maxWidth The width to fit the rectangle in.
 * @param maxHeight The height to fit the rectangle in.
 * @return The calculated scale.
 */
export function calcScaleToFit(rectangleToFit: Rectangle, maxWidth: number, maxHeight: number): number {
    const maxScaleFactorHeight = maxHeight / (rectangleToFit.height ? rectangleToFit.height : 1);
    const maxScaleFactorWidth = maxWidth / (rectangleToFit.width ? rectangleToFit.width : 1);
    return Math.min(maxScaleFactorHeight, maxScaleFactorWidth);
}

/**
 * Logs the properties of the assigned {@link Rectangle} to the console.
 * @param rect The rectangle to use.
 */
export function debugLogRectangle(rect: Rectangle) {
    if (!rect) console.log("Rectangle is not set");
    console.log("Rectangle properties");
    console.log("x: " + Math.round(rect.x) + " y: " + Math.round(rect.y));
    console.log("width: " + Math.round(rect.width) + " height: " + Math.round(rect.height));
    console.log("top: " + Math.round(rect.top) + " bottom: " + Math.round(rect.bottom));
    console.log("left: " + Math.round(rect.left) + " right: " + Math.round(rect.right));
    const offset = calcOriginToCenterOffset(rect);
    console.log("center offset X: " + Math.round(offset.x) + " center offset Y: " + Math.round(offset.y));
}

/**
 * Calculates the offset of the {@link Rectangle}s origin to its center.
 * @param rect The rectangle to use.
 * @return The offset as a point.
 */
export function calcOriginToCenterOffset(rect: Rectangle): Point {
    const x = rect.width / 2 + rect.x;
    const y = rect.height / 2 + rect.y;
    return new Point(-x, -y);
}

/**
 * Projects a map perspective angle back.
 * @param angle The angle to project.
 */
export function unProjectAngle(angle: number) {
    let directionVector = [Math.cos(angle), Math.sin(angle), 0];
    directionVector = unProjectPosition(directionVector);
    return MathE.angleBetween(0, 0, directionVector[0], directionVector[1]);
}

export function rectanglesEqual(a: Rectangle, b: Rectangle) {
    return (
        a.x === b.x &&
        a.y === b.y &&
        a.width === b.width &&
        a.height === b.height
    );
}

export function rectanglesIntersect(a: Rectangle, b: Rectangle) {
    return (
        a.left <= b.right &&
        b.left <= a.right &&
        a.top <= b.bottom &&
        b.top <= a.bottom
    );
}

export function toLocalRectangle(displayObject: DisplayObject, rectangle: Rectangle) {
    const localTopLeft = displayObject.toLocal(new Point(rectangle.x, rectangle.y));
    const localBottomRight = displayObject.toLocal(new Point(rectangle.width, rectangle.height));
    return new Rectangle(
        localTopLeft.x,
        localTopLeft.y,
        localBottomRight.x - localTopLeft.x,
        localBottomRight.y - localTopLeft.y
    );
}

export function simulateWebGLContextLoss(canvas: HTMLCanvasElement) {
    const webgl2Context = canvas.getContext("webgl2", {});
    if (webgl2Context) {
        console.log(`losing webgl2 context...`);
        webgl2Context.getExtension('WEBGL_lose_context').loseContext();
    } else {
        const webglContext = canvas.getContext("webgl", {});
        if (webglContext) {
            console.log(`losing webgl context...`);
            webglContext.getExtension('WEBGL_lose_context').loseContext();
        }
    }
}

export function calcDefaultZoom(): number {
    return (gameConstants.map.minZoomGame + gameConstants.map.maxZoom) / 2;
}

/**
 * Calculates the map zoom by the assigned factor.
 * @param zoomFactor The zoom factor (range [0:1] lower is nearer)
 * @param forAnimatedCamera if true: uses max and min zoom levels for the animated camera.
 */
export function calcZoomByFactor(zoomFactor: number, forAnimatedCamera = true): number {
    zoomFactor = MathE.limit(0, 1, zoomFactor);
    zoomFactor = Math.pow(zoomFactor, 0.211); // exponential grow of the factor feels more intuitive to set for the user.
    let zoomRange = gameConstants.map.maxZoom - gameConstants.map.minZoomGame;
    let minZoom = gameConstants.map.minZoomGame;
    if (forAnimatedCamera) {
        zoomRange = gameConstants.map.maxZoomAnimatedCamera - gameConstants.map.minZoomAnimatedCamera;
        minZoom = gameConstants.map.minZoomAnimatedCamera;
    }
    return minZoom + zoomRange * (1 - zoomFactor);
}

export function calcCanvasCenteredPosition(position: { x: number; y: number; }, zoom: number): Point {
    const x = gameCanvasSize.width / 2 - position.x * zoom;
    const y = gameCanvasSize.height / 2 - position.y * zoom;
    return new Point(x, y);
}

export function calcInverseCanvasCenteredPosition(position: { x: number; y: number; }, zoom: number): Point {
    const x = (gameCanvasSize.width / 2 - position.x) / zoom;
    const y = (gameCanvasSize.height / 2 - position.y) / zoom;
    return new Point(x, y);
}
