import { Container, IDestroyOptions, Rectangle } from "pixi.js";
import { getBoundsFromBox, MapElementBox } from "../../../../helper/mapElementSortingHelper";
import { rectanglesEqual, rectanglesIntersect } from "../../../../helper/pixiHelpers";
import { SparseArray } from "./SparseArray";
import { SpatialGrid } from "./SpatialGrid";
import { SpatialGridInfo } from "./SpatialGridInfo";

export enum ElementOrder {
    IsInFront,
    IsInBack,
    CannotSort
}

let runningIndex = 0;
const elementMap = new Map<number, MapElementContainer>();

export enum BoundsUpdateMode {
    UpdateFromGetLocalBoundsEveryFrame,
    UpdateFromGetLocalBoundsWhenDirty,
    UpdateFromBox
}

export class MapElementContainer extends Container {
    public readonly elementIndex: number;

    public readonly elementsBehind = new SparseArray<MapElementContainer>();
    public readonly elementsInFront = new SparseArray<MapElementContainer>();
    public readonly elementsBehindSaved = new SparseArray<MapElementContainer>();
    public readonly elementsInFrontSaved = new SparseArray<MapElementContainer>();
    public readonly boundsForComparison = new Rectangle();

    public readonly alreadyComparedTo = new Set<number>();

    public elementVisibleLastFrameAndUnchanged = false;

    private spatialGrid: SpatialGrid<MapElementContainer>;
    public spatialGridInfo = new SpatialGridInfo();

    private _partOfLoop = false;

    public loopCheckIndex: number;
    public loopCheckLowLink: number;
    public loopCheckIsOnStack: boolean;

    protected box: MapElementBox;

    /*
    protected boundsGraphic = new Graphics();
    protected boundsGraphicName = new Text("");
    */

    private boundsDirty = true;

    public constructor(
        private boundsUpdateMode: BoundsUpdateMode
    ) {
        super();

        this.elementIndex = runningIndex++;
        elementMap.set(this.elementIndex, this);

        this.on("removed", this.onRemoved, this);
    }

    private onRemoved() {
        this.clearSavedOrderData();
        this.detachFromSpatialGrid();
    }

    public destroy(options?: boolean | IDestroyOptions): void {
        super.destroy(options);

        elementMap.delete(this.elementIndex);
    }

    public detachFromSpatialGrid() {
        if (this.spatialGrid) {
            this.spatialGrid.remove(this, this.spatialGridInfo);
            this.spatialGrid = null;
        }

        this.spatialGridInfo.reset();
    }

    public get debugName() {
        if (this.box) {
            return `${this.box.conflictResolutionName} (${this.box.xMin}|${this.box.yMin}|${this.box.zMin} - ${this.box.xMax}|${this.box.yMax}|${this.box.zMax})`;
        } else {
            return "[unknown: no box]";
        }
    }

    protected setBox(box: MapElementBox) {
        this.box = box;

        if (box && (this.boundsUpdateMode === BoundsUpdateMode.UpdateFromBox)) {
            getBoundsFromBox(this.box, this.boundsForComparison);
        }

        this.elementVisibleLastFrameAndUnchanged = false;

        // Position might be dirty
        this.setMapElementContainerBoundsDirty();

        this.setDirty();
    }

    private setDirty() {
        this.spatialGridInfo.isDirty = true;
        this.clearSavedOrderData();
    }

    protected setMapElementContainerBoundsDirty() {
        this.boundsDirty = true;
    }

    private clearSavedOrderData() {
        for (const element of this.elementsBehindSaved.sparseData) {
            if (element === undefined)
                continue;

            element.elementsInFrontSaved.delete(this);
        }
        this.elementsBehindSaved.clear();

        for (const element of this.elementsInFrontSaved.sparseData) {
            if (element === undefined)
                continue;

            element.elementsBehindSaved.delete(this);
        }
        this.elementsInFrontSaved.clear();

        for (const otherElementIndex of this.alreadyComparedTo) {
            const element = elementMap.get(otherElementIndex);
            element.alreadyComparedTo.delete(this.elementIndex);
        }
        this.alreadyComparedTo.clear();
    }

    public initializeForComparison(spatialGrid: SpatialGrid<MapElementContainer>) {
        if (this.elementsBehind.size !== 0)
            throw new Error("elementsBehind should have been cleared by the sorting algorithm.");

        if (this.elementsInFront.size !== 0)
            throw new Error("elementsInFront should have been cleared by the sorting algorithm.");

        //this.removeChild(this.boundsGraphic);

        if ((this.boundsUpdateMode === BoundsUpdateMode.UpdateFromGetLocalBoundsEveryFrame) ||
            ((this.boundsUpdateMode === BoundsUpdateMode.UpdateFromGetLocalBoundsWhenDirty) && this.boundsDirty)) {
            this.boundsDirty = false;

            this.getLocalBounds(this.boundsForComparison);
            this.boundsForComparison.x += this.x;
            this.boundsForComparison.y += this.y;

            if (!this.spatialGridInfo.isDirty && this.spatialGridInfo.currentBounds) {
                if (!rectanglesEqual(this.boundsForComparison, this.spatialGridInfo.currentBounds)) {
                    this.setDirty();
                }
            }
        }

        /*
        this.boundsGraphic.clear();
        this.boundsGraphic.lineStyle(5, 0xFFFFFF);
        this.boundsGraphic.drawRect(this.boundsForComparison.x, this.boundsForComparison.y, this.boundsForComparison.width, this.boundsForComparison.height);
        this.boundsGraphicName.text = this.debugName;
        this.boundsGraphicName.style.wordWrap = false;
        this.boundsGraphicName.style.fontSize = 32;
        this.boundsGraphicName.style.fill = 0xFFFFFF;
        this.boundsGraphicName.x = this.boundsForComparison.x;
        this.boundsGraphicName.y = this.boundsForComparison.y;
        this.boundsGraphic.addChild(this.boundsGraphicName);
        this.boundsGraphic.x = -this.x;
        this.boundsGraphic.y = -this.y;
        this.addChildAt(this.boundsGraphic, this.children.length);
        */

        if (this.spatialGrid && (this.spatialGrid !== spatialGrid)) {
            throw Error("MapElementContainer was already assigned to a different spatial grid: " + this.debugName);
        }

        this.spatialGrid = spatialGrid;
        try {
            return spatialGrid.insertOrUpdate(this, this.boundsForComparison, this.spatialGridInfo);
        } catch (e) {
            console.error(this.debugName, e);
            throw e;
        }
    }

    public initializeForSorting() {
        for (const element of this.elementsBehindSaved.sparseData) {
            if (element === undefined)
                continue;

            if (element.visible) {
                this.elementsBehind.add(element);
            }
        }

        for (const element of this.elementsInFrontSaved.sparseData) {
            if (element === undefined)
                continue;

            if (element.visible) {
                this.elementsInFront.add(element);
            }
        }
    }

    public compareOrderTo(other: MapElementContainer): ElementOrder {
        const box1 = this.box;
        const box2 = other.box;

        if (!box1 || !box2)
            return ElementOrder.CannotSort;

        if (!rectanglesIntersect(this.boundsForComparison, other.boundsForComparison))
            return ElementOrder.CannotSort;

        let isInFront = 0;
        let isInBack = 0;

        // Are both elements flat and on the same layer?
        if (areBoxesFlatAndOnSameGeometricPlane(box1, box2)) {
            return MapElementContainer.compareConflictResolutionOrder(box1, box2, true);
        }

        // test for intersection x-axis
        // (higher x value is in front)
        if (box1.xMin >= box2.xMax) { isInFront++; }
        if (box2.xMin >= box1.xMax) { isInBack++; }

        // test for intersection y-axis
        // (higher y value is in front)
        if (box1.yMin >= box2.yMax) { isInFront++; }
        if (box2.yMin >= box1.yMax) { isInBack++; }

        // test for intersection z-axis
        // (higher z value is in front)
        if (box1.zMin >= box2.zMax) { isInFront++; }
        if (box2.zMin >= box1.zMax) { isInBack++; }

        /*
        console.log({
            a: this.debugName,
            b: other.debugName,
            isInFront,
            isInBack
        });
        */

        // If we cannot clearly decide whether an object is in the front or the back, we cannot sort or risk loops.
        if (isInFront && isInBack)
            return ElementOrder.CannotSort;

        if (isInFront)
            return ElementOrder.IsInFront;

        if (isInBack)
            return ElementOrder.IsInBack;

        // Overlap
        return MapElementContainer.compareConflictResolutionOrder(box1, box2, false);
    }

    public compareConflictResolutionOrderTo(other: MapElementContainer) {
        const box1 = this.box;
        const box2 = other.box;
        const flatAndOnSameGeometricPlane = areBoxesFlatAndOnSameGeometricPlane(box1, box2);
        return MapElementContainer.compareConflictResolutionOrder(box1, box2, flatAndOnSameGeometricPlane);
    }

    public static compareConflictResolutionOrder(box1: MapElementBox, box2: MapElementBox, flatAndOnSameGeometricPlane: boolean) {
        if (flatAndOnSameGeometricPlane) {
            if (box1.conflictResolutionFlatOrder < box2.conflictResolutionFlatOrder) {
                return ElementOrder.IsInBack;
            } else if (box1.conflictResolutionFlatOrder > box2.conflictResolutionFlatOrder) {
                return ElementOrder.IsInFront;
            }

            if (box1.conflictResolutionFlatZIndex < box2.conflictResolutionFlatZIndex) {
                return ElementOrder.IsInBack;
            } else if (box1.conflictResolutionFlatZIndex > box2.conflictResolutionFlatZIndex) {
                return ElementOrder.IsInFront;
            }
        }

        if (box1.zMin < box2.zMin) {
            return ElementOrder.IsInBack;
        } else if (box2.zMin < box1.zMin) {
            return ElementOrder.IsInFront;
        }

        if (box1.isTransit && box2.canTakeTransit) {
            return ElementOrder.IsInBack;
        } else if (box2.isTransit && box1.canTakeTransit) {
            return ElementOrder.IsInFront;
        }

        if (box1.isGroundMinus1 && box2.isGround) {
            return ElementOrder.IsInBack;
        } else if (box2.isGroundMinus1 && box1.isGround) {
            return ElementOrder.IsInFront;
        }

        if (box1.conflictResolutionOriginValue < box2.conflictResolutionOriginValue) {
            return ElementOrder.IsInBack;
        } else if (box1.conflictResolutionOriginValue > box2.conflictResolutionOriginValue) {
            return ElementOrder.IsInFront;
        }

        return (box1.conflictResolutionName.localeCompare(box2.conflictResolutionName) > 0)
            ? ElementOrder.IsInFront
            : ElementOrder.IsInBack;
    }

    public get partOfLoop() {
        return this._partOfLoop;
    }

    public set partOfLoop(value: boolean) {
        if (this._partOfLoop == value)
            return;

        this._partOfLoop = value;
        this.refreshPartOfLoop();
    }

    protected refreshPartOfLoop() {
    }

    public outputDebugData() {
        console.log(" - " + this.debugName, {
            inFrontSaved: [...this.elementsInFrontSaved.sparseData].filter(element => element !== undefined).map(element => element.debugName),
            behindSaved: [...this.elementsBehindSaved.sparseData].filter(element => element !== undefined).map(element => element.debugName),
            box: this.box
        });
    }
}

/**
 * Returns true if both boxes are flat and share a geometric plane (namely the XY, XZ or YZ planes)
 */
function areBoxesFlatAndOnSameGeometricPlane(box1: MapElementBox, box2: MapElementBox) {
    return ((box1.xMin === box1.xMax) && (box2.xMin === box2.xMax) && (box1.xMin === box2.xMin)) ||
        ((box1.yMin === box1.yMax) && (box2.yMin === box2.yMax) && (box1.yMin === box2.yMin)) ||
        ((box1.zMin === box1.zMax) && (box2.zMin === box2.zMax) && (box1.zMin === box2.zMin));
}