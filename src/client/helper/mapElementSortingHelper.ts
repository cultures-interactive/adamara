import { Rectangle } from "pixi.js";
import { groundMinus1LayerIndex, groundLayerIndex } from "../../shared/data/layerConstants";
import { boxMathPrecision, convertToBoxMathInteger } from "../../shared/data/mapElementSorting";
import { TilePosition } from "../../shared/definitions/other/TilePosition";
import { TileDataInterface } from "../../shared/game/TileDataModel";
import { AnimationAssetModel } from "../../shared/resources/AnimationAssetModel";
import { Size3D } from "../../shared/resources/Size3DModel";
import { TileAssetModel } from "../../shared/resources/TileAssetModel";
import { MapElementContainer } from "../canvas/shared/map/sorting/MapElementContainer";
import { gameConstants } from "../data/gameConstants";
import { sharedStore } from "../stores/SharedStore";
import { tileToWorldPositionX, tileToWorldPositionY } from "./pixiHelpers";

interface StronglyConnectedComponentData {
    index: number;
    stack: MapElementContainer[];
    groups: MapElementContainer[][];
}

export function findAllStronglyConnectedMapElements(elements: MapElementContainer[]) {
    const data: StronglyConnectedComponentData = {
        index: 0,
        stack: [],
        groups: []
    };

    for (const element of elements) {
        element.loopCheckIndex = -1;
        element.loopCheckLowLink = -1;
        element.loopCheckIsOnStack = false;
    }

    for (const element of elements) {
        if (element.loopCheckIndex < 0) {
            findStronglyConnectedComponentsStartingFrom(data, element);
        }
    }

    return data.groups;
}

// Based on https://en.wikipedia.org/wiki/Tarjan's_strongly_connected_components_algorithm / https://gist.github.com/lencioni/835beff2b231b6ef7d1c070adb5e583e
function findStronglyConnectedComponentsStartingFrom(data: StronglyConnectedComponentData, element: MapElementContainer) {
    // Set the depth index for v to the smallest unused index
    element.loopCheckIndex = data.index;
    element.loopCheckLowLink = data.index;
    data.index++;
    data.stack.push(element);
    element.loopCheckIsOnStack = true;

    // Consider successors of v
    // aka... consider each vertex in vertex.connections
    for (const successor of element.elementsInFront.sparseData) {
        if (successor === undefined)
            continue;

        if (successor.loopCheckIndex < 0) {
            // Successor has not yet been visited; recurse on it
            findStronglyConnectedComponentsStartingFrom(data, successor);
            element.loopCheckLowLink = Math.min(element.loopCheckLowLink, successor.loopCheckLowLink);
        } else if (successor.loopCheckIsOnStack) {
            // Successor is in stack; thus, it is in the current SCC
            element.loopCheckLowLink = Math.min(element.loopCheckLowLink, successor.loopCheckIndex);
        }
    }

    // If v is a root node, pop the stack and generate an SCC
    if (element.loopCheckLowLink === element.loopCheckIndex) {
        // start a new strongly connected component
        const vertices = new Array<MapElementContainer>();
        let w: MapElementContainer;
        if (data.stack.length > 0) {
            do {
                w = data.stack.pop();
                w.loopCheckIsOnStack = false;
                if (w) {
                    // add to current strongly connected component
                    vertices.push(w);
                }
            } while (w && element !== w);
        }

        // output the current strongly connected component
        // ... i'm going to push the results to a member scc array variable
        if (vertices.length > 0) {
            data.groups.push(vertices);
        }
    }
}

export enum FlatOrder {
    NotFlat,
    GroundMinus1,
    Ground,
    DamageInAreaVisual,
    EditorElementUnderDecoration,
    DecorationOrAnimation,
    EditorElement
}

export interface MapElementBox {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
    conflictResolutionOriginValue: number;
    conflictResolutionName: string;
    conflictResolutionFlatOrder: FlatOrder;
    conflictResolutionFlatZIndex: number;
    isGroundMinus1: boolean;
    isGround: boolean;
    isTransit: boolean;
    canTakeTransit: boolean;
}

export function createOrUpdateBoxSimple(
    box: MapElementBox,
    position: TilePosition,
    size: Size3D,
    conflictResolutionOrigin: number,
    conflictResolutionName: string,
    conflictResolutionFlatOrder: FlatOrder
) {
    return createOrUpdateBox(box, position, size.x, size.y, size.z, 0, 0, 0, conflictResolutionOrigin, conflictResolutionName, conflictResolutionFlatOrder, 0, false, false, false, false);
}

export function createOrUpdateBox(
    box: MapElementBox,
    { x, y, plane }: TilePosition,
    sizeX: number,
    sizeY: number,
    sizeZ: number,
    offsetX: number,
    offsetY: number,
    offsetZ: number,
    conflictResolutionOrigin: number,
    conflictResolutionName: string,
    conflictResolutionFlatOrder: FlatOrder,
    conflictResolutionFlatZIndex: number,
    isGroundMinus1: boolean,
    isGround: boolean,
    isTransit: boolean,
    canTakeTransit: boolean
) {
    // Get the (arbitrarily scaled; conflictResolutionOriginValues only have to be relative to each other) vertical visual
    // position of the conflict resolution origin. This always uses the lower Z bounds - so for floor tiles, the bottom is used.
    // This should happen *before* the conversions below because size and conflictResolutionOrigin is multiplied.
    let conflictResolutionOriginValue = x + offsetX + sizeX * conflictResolutionOrigin + y + offsetY + sizeY * conflictResolutionOrigin - offsetZ * 2;
    conflictResolutionOriginValue = convertToBoxMathInteger(conflictResolutionOriginValue);

    // Convert all float numbers to integers to avoid small imprecisions like
    // -32.3 + 0.3 -> -31.999999999999996
    // which would be a problem later when comparing box positions.
    // The conversion is done by multiplying and rounding, leaving bigger numbers,
    // but since the conversion is linear and boxes are only compared to each other,
    // that works out well.
    x = convertToBoxMathInteger(x);
    y = convertToBoxMathInteger(y);
    plane = convertToBoxMathInteger(plane);
    sizeX = convertToBoxMathInteger(sizeX);
    sizeY = convertToBoxMathInteger(sizeY);
    sizeZ = convertToBoxMathInteger(sizeZ);
    offsetX = convertToBoxMathInteger(offsetX);
    offsetY = convertToBoxMathInteger(offsetY);
    offsetZ = convertToBoxMathInteger(offsetZ);
    //conflictResolutionOrigin = convertToBoxMathInteger(conflictResolutionOrigin); // already used, won't be used after this point
    // No need to convert conflictResolutionFlatZIndex because it is already an integer (and we don't do calculations with it anyway)

    // X/Y are in view space (where the same X/Y with a higher Z plane is on a different position on the screen).
    // We need the actual original X/Y positions, which we can reach by just adding the plane value to both X and Y.
    const adjustedX = x + plane + offsetX;
    const adjustedY = y + plane + offsetY;
    const adjustedZ = plane + offsetZ;

    if (box) {
        box.xMin = adjustedX;
        box.xMax = adjustedX + sizeX;
        box.yMin = adjustedY;
        box.yMax = adjustedY + sizeY;
        box.zMin = adjustedZ;
        box.zMax = adjustedZ + sizeZ;
        box.conflictResolutionOriginValue = conflictResolutionOriginValue;
        box.conflictResolutionName = conflictResolutionName;
        box.conflictResolutionFlatOrder = conflictResolutionFlatOrder;
        box.conflictResolutionFlatZIndex = conflictResolutionFlatZIndex;
        box.isGroundMinus1 = isGroundMinus1;
        box.isGround = isGround;
        box.isTransit = isTransit;
        box.canTakeTransit = canTakeTransit;
    } else {
        box = {
            xMin: adjustedX,
            xMax: adjustedX + sizeX,
            yMin: adjustedY,
            yMax: adjustedY + sizeY,
            zMin: adjustedZ,
            zMax: adjustedZ + sizeZ,
            conflictResolutionOriginValue,
            conflictResolutionName,
            conflictResolutionFlatOrder,
            conflictResolutionFlatZIndex,
            isGroundMinus1,
            isGround,
            isTransit,
            canTakeTransit
        };
    }

    return box;
}

export function createOrUpdateBoxFromTileData(box: MapElementBox, tileData: TileDataInterface) {
    const tileAsset = sharedStore.getTileAsset(tileData.tileAssetId);
    if (!tileAsset)
        return null;

    const { position, hasConflictResolutionOriginOverride, conflictResolutionFlatZIndex } = tileData;
    const { size, offsetZComputed } = tileAsset;

    const offsetX = getTileOffsetX(tileData, tileAsset);
    const offsetY = getTileOffsetY(tileData, tileAsset);
    const sizeZOffset = getTileSizeZOffset(tileData);

    const conflictResolutionOrigin = hasConflictResolutionOriginOverride
        ? tileData.conflictResolutionOriginOverride
        : tileAsset.conflictResolutionOrigin;

    const conflictResolutionName = tileData.tileAssetId;

    const { layer } = position;

    const isGroundMinus1 = layer === groundMinus1LayerIndex;
    const isGround = layer === groundLayerIndex;
    const isTransit = tileAsset?.planeTransit?.isInitialized();
    const canTakeTransit = false;

    let conflictResolutionFlatOrder = FlatOrder.NotFlat;
    if (isGroundMinus1) {
        conflictResolutionFlatOrder = FlatOrder.GroundMinus1;
    } else if (isGround) {
        conflictResolutionFlatOrder = FlatOrder.Ground;
    } else {
        conflictResolutionFlatOrder = FlatOrder.DecorationOrAnimation;
    }

    return createOrUpdateBox(box, position, size.x, size.y, size.z + sizeZOffset + tileAsset.internalOffsetZ, offsetX, offsetY, offsetZComputed, conflictResolutionOrigin, conflictResolutionName, conflictResolutionFlatOrder, conflictResolutionFlatZIndex, isGroundMinus1, isGround, isTransit, canTakeTransit);
}

export function createOrUpdateBoxFromAnimationData(box: MapElementBox, position: TilePosition, animationAsset: AnimationAssetModel) {
    if (!animationAsset)
        return null;

    const { size, offsetX, offsetY, internalOffsetZ } = animationAsset;
    const conflictResolutionOrigin = 0.5;
    const conflictResolutionName = animationAsset.name;
    const isGroundMinus1 = false;
    const isGround = false;
    const isTransit = false;
    const canTakeTransit = true;
    return createOrUpdateBox(box, position, size.x, size.y, size.z, offsetX, offsetY, internalOffsetZ, conflictResolutionOrigin, conflictResolutionName, FlatOrder.DecorationOrAnimation, 0, isGroundMinus1, isGround, isTransit, canTakeTransit);
}

export function getTileSizeZOffset(tileData: TileDataInterface) {
    return Math.max(tileData.additionalOffsetZ, 0);
}

export function getTileOffsetX(tileData: TileDataInterface, tileAsset: TileAssetModel) {
    if (!tileAsset)
        return 0;

    return tileAsset.offsetX + tileData.additionalOffsetX;
}

export function getTileOffsetY(tileData: TileDataInterface, tileAsset: TileAssetModel) {
    if (!tileAsset)
        return 0;

    return tileAsset.offsetY + tileData.additionalOffsetY;
}

export function getBoundsFromBox(box: MapElementBox, bounds: Rectangle) {
    let { xMin, xMax, yMin, yMax, zMin, zMax } = box;
    xMin /= boxMathPrecision;
    xMax /= boxMathPrecision;
    yMin /= boxMathPrecision;
    yMax /= boxMathPrecision;
    zMin /= boxMathPrecision;
    zMax /= boxMathPrecision;

    const left = tileToWorldPositionX(xMin, yMax, false) + gameConstants.tileWidth / 2;
    const right = tileToWorldPositionX(xMax, yMin, false) + gameConstants.tileWidth / 2;
    const top = tileToWorldPositionY(xMin - zMax, yMin - zMax, false);
    const bottom = tileToWorldPositionY(xMax - zMin, yMax - zMin, false);
    bounds.x = left;
    bounds.width = right - left;
    bounds.y = top;
    bounds.height = bottom - top;
}