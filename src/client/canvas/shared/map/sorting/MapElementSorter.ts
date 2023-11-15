import { Container } from "pixi.js";
import { swapElements } from "../../../../../shared/helper/generalHelpers";
import { findAllStronglyConnectedMapElements } from "../../../../helper/mapElementSortingHelper";
import { ApplicationReference } from "../../ApplicationReference";
import { ElementOrder, MapElementContainer } from "./MapElementContainer";
import { SpatialGrid } from "./SpatialGrid";

export class MapElementSorter {
    private visibleElements = new Array<MapElementContainer>();
    private elementsToDraw = new Array<MapElementContainer>();
    private spatialGrid = new SpatialGrid<MapElementContainer>();

    public constructor(
        private appRef: ApplicationReference,
        private contentContainer: Container,
        private isEditor: boolean
    ) {
        this.appRef.required.renderer.on("prerender", this.onPrerender, this);
    }

    public destroy() {
        this.appRef.required.renderer.off("prerender", this.onPrerender, this);
    }

    private onPrerender() {
        const somethingBecameVisibleOrGridChanged = this.initialize();
        if (!somethingBecameVisibleOrGridChanged)
            return;

        // For each pair of blocks, determine which is in front and behind.
        this.compareElementsToDetermineOrder();

        this.initializeForSortingAndLoopDetection();

        if (this.isEditor) {
            // Mark loops visually
            this.markElementsThatAreOverlappingInALoop();
        }

        //this.debugLogVisibleElements();

        this.sortElementsAccordingToOrder();
    }

    private initialize() {
        const elements = this.contentContainer.children as MapElementContainer[];
        const { visibleElements, spatialGrid } = this;

        const previousVisibleElementsCount = visibleElements.length;

        visibleElements.length = 0;

        let somethingBecameVisibleOrGridChanged = false;

        for (const element of elements) {
            if (!element.visible) {
                element.elementVisibleLastFrameAndUnchanged = false;
                continue;
            }

            if (!element.elementVisibleLastFrameAndUnchanged) {
                element.elementVisibleLastFrameAndUnchanged = true;
                somethingBecameVisibleOrGridChanged = true;
            }

            const gridChanged = element.initializeForComparison(spatialGrid);
            if (gridChanged) {
                somethingBecameVisibleOrGridChanged = true;
            }

            visibleElements.push(element);
        }

        if (this.isEditor && (this.visibleElements.length < previousVisibleElementsCount)) {
            // In the editor only: We also want to react to deleted elements, even if nothing else changed,
            // to be sure that the loop warnings are refreshed correctly
            return true;
        }

        return somethingBecameVisibleOrGridChanged;
    }

    private compareElementsToDetermineOrder() {
        let checkedCells = 0;
        let hashLookups = 0;
        let comparisons = 0;
        let discarded = 0;
        for (const cells of this.spatialGrid.grid) {
            for (const elementsInCell of cells) {
                const elementsInCellCount = elementsInCell.length;
                if (elementsInCell.mapElementSorterVisitedVisibleElements === elementsInCellCount)
                    continue;

                elementsInCell.mapElementSorterVisitedVisibleElements = 0;

                checkedCells++;

                for (let i = 0; i < elementsInCellCount; i++) {
                    const a = elementsInCell[i];
                    if (!a.visible) {
                        a.spatialGridInfo.wasCountedAsVisibleElementDuringComparing = false;
                        discarded++;
                        continue;
                    }

                    a.spatialGridInfo.wasCountedAsVisibleElementDuringComparing = true;
                    elementsInCell.mapElementSorterVisitedVisibleElements++;

                    for (let j = i + 1; j < elementsInCellCount; j++) {
                        const b = elementsInCell[j];
                        if (!b.visible) {
                            discarded++;
                            continue;
                        }

                        hashLookups++;
                        if (a.alreadyComparedTo.has(b.elementIndex))
                            continue;

                        a.alreadyComparedTo.add(b.elementIndex);
                        b.alreadyComparedTo.add(a.elementIndex);

                        comparisons++;

                        const elementAOrder = a.compareOrderTo(b);
                        if (elementAOrder === ElementOrder.IsInFront) {
                            a.elementsBehindSaved.add(b);
                            b.elementsInFrontSaved.add(a);
                        }
                        else if (elementAOrder === ElementOrder.IsInBack) {
                            b.elementsBehindSaved.add(a);
                            a.elementsInFrontSaved.add(b);
                        }
                    }
                }
            }
        }

        //console.log({ comparisons, checkedCells, hashLookups, discarded });
    }

    private markElementsThatAreOverlappingInALoop() {
        const groups = findAllStronglyConnectedMapElements(this.visibleElements);
        for (const group of groups) {
            const isLoop = (group.length > 1);
            for (const element of group) {
                element.partOfLoop = isLoop;
            }
        }
    }

    private initializeForSortingAndLoopDetection() {
        for (const element of this.visibleElements) {
            element.initializeForSorting();
        }
    }

    private sortElementsAccordingToOrder() {
        const elements = this.contentContainer.children as MapElementContainer[];
        const elementCount = elements.length;

        const { visibleElements, elementsToDraw } = this;
        const visibleElementCount = visibleElements.length;

        // Get list of blocks we can safely draw right now.
        // These are the blocks with nothing behind them.
        for (const element of visibleElements) {
            if (element.elementsBehind.size === 0) {
                elementsToDraw.push(element);
            }
        }

        let nextElementIndex = 0;

        do {
            // While there are still blocks we can draw...
            while (elementsToDraw.length > 0) {

                // Draw block by removing one from "to draw" and adding
                // it to the end of our "drawn" list.
                const currentElement = elementsToDraw.shift();
                const currentIndex = elements.indexOf(currentElement);
                if (currentIndex < nextElementIndex)
                    throw new Error("currentIndex < nextElementIndex... element was tried to be drawn twice");

                swapElements(elements, currentIndex, nextElementIndex);
                nextElementIndex++;
                //currentElement.renderable = true;

                // Tell blocks in front of the one we just drew
                // that they can stop waiting on it.
                for (const elementInFront of currentElement.elementsInFront.sparseData) {
                    if (elementInFront === undefined)
                        continue;

                    elementInFront.elementsBehind.delete(currentElement);

                    // Add this front block to our "to draw" list if there's
                    // nothing else behind it waiting to be drawn.
                    if (elementInFront.elementsBehind.size === 0) {
                        elementsToDraw.push(elementInFront);
                    }
                }
                currentElement.elementsInFront.clear();
            }

            // When we have drawn everything we are done here
            if (nextElementIndex === visibleElementCount)
                break;

            if (nextElementIndex > visibleElementCount)
                throw new Error("nextElementIndex > visibleElementCount");

            // Find backmost element by conflict resolution order to break loop.
            // We are only using the conflict resolution order here because it is sure to produce
            // a stable result. That result might not be ideal, but using it will prevent flickering.
            let backmostElement: MapElementContainer = null;
            for (let i = nextElementIndex + 1; i < elementCount; i++) {
                const element = elements[i];
                if (!element.visible)
                    continue;

                if (!backmostElement || backmostElement.compareConflictResolutionOrderTo(element) === ElementOrder.IsInFront) {
                    backmostElement = element;
                }
            }

            for (const elementBehind of backmostElement.elementsBehind.sparseData) {
                if (elementBehind === undefined)
                    continue;

                elementBehind.elementsInFront.delete(backmostElement);
            }
            backmostElement.elementsBehind.clear();

            elementsToDraw.push(backmostElement);
        } while (true);
    }

    private debugLogVisibleElements() {
        console.log("---------");
        for (const element of this.visibleElements) {
            console.log(" - " + element.debugName, {
                inFront: [...element.elementsInFront.sparseData].filter(element => element !== undefined).map(element => element.debugName).join(","),
                behind: [...element.elementsBehind.sparseData].filter(element => element !== undefined).map(element => element.debugName).join(",")
            });
        }
    }
}
