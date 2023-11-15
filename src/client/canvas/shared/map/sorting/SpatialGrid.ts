import { Rectangle } from "pixi.js";
import { SpatialGridInfo } from "./SpatialGridInfo";

export class SpatialGridCell<T> extends Array<T> {
    public mapElementSorterVisitedVisibleElements = 0;
}

export class SpatialGrid<T> {
    public grid = new Array<Array<SpatialGridCell<T>>>();
    private gridSizeX = 0;
    private gridSizeY = 0;

    private cellSize = 500;
    private xOffset = 0;
    private yOffset = 0;

    public insertOrUpdate(object: T, bounds: Rectangle, info: SpatialGridInfo) {
        if (!info.isDirty)
            return false;

        info.isDirty = false;

        this.remove(object, info);

        if (!info.currentBounds) {
            info.currentBounds = new Rectangle();
        }

        info.currentBounds.copyFrom(bounds);

        let fromX = this.xOffset + this.worldCoordinateToCellCoordinate(info.currentBounds.left);
        let toX = this.xOffset + this.worldCoordinateToCellCoordinate(info.currentBounds.right);
        let fromY = this.yOffset + this.worldCoordinateToCellCoordinate(info.currentBounds.top);
        let toY = this.yOffset + this.worldCoordinateToCellCoordinate(info.currentBounds.bottom);

        while (fromX < 0) {
            this.grid.unshift(createArrayOfEmptySpatialGridCells(this.gridSizeY));
            this.gridSizeX++;
            this.xOffset++;
            fromX++;
            toX++;
        }

        while (toX >= this.gridSizeX) {
            this.grid.push(createArrayOfEmptySpatialGridCells(this.gridSizeY));
            this.gridSizeX++;
        }

        if (fromY < 0) {
            const missing = -fromY;
            for (let x = 0; x < this.gridSizeX; x++) {
                this.grid[x].unshift(...createArrayOfEmptySpatialGridCells<T>(missing));
            }
            this.gridSizeY += missing;
            this.yOffset += missing;
            fromY += missing;
            toY += missing;
        }

        if (toY >= this.gridSizeY) {
            const missing = toY - this.gridSizeY + 1;
            for (let x = 0; x < this.gridSizeX; x++) {
                this.grid[x].push(...createArrayOfEmptySpatialGridCells<T>(missing));
            }
            this.gridSizeY += missing;
        }

        for (let x = fromX; x <= toX; x++) {
            const column = this.grid[x];
            for (let y = fromY; y <= toY; y++) {
                const cell = column[y];
                cell.push(object);
            }
        }

        return true;
    }

    public remove(object: T, info: SpatialGridInfo) {
        if (!info.currentBounds)
            return;

        const fromX = this.xOffset + this.worldCoordinateToCellCoordinate(info.currentBounds.left);
        const toX = this.xOffset + this.worldCoordinateToCellCoordinate(info.currentBounds.right);
        const fromY = this.yOffset + this.worldCoordinateToCellCoordinate(info.currentBounds.top);
        const toY = this.yOffset + this.worldCoordinateToCellCoordinate(info.currentBounds.bottom);

        for (let x = fromX; x <= toX; x++) {
            const column = this.grid[x];
            for (let y = fromY; y <= toY; y++) {
                const cell = column[y];

                if (info.wasCountedAsVisibleElementDuringComparing) {
                    cell.mapElementSorterVisitedVisibleElements--;
                }

                cell.splice(cell.indexOf(object), 1);
            }
        }

        info.wasCountedAsVisibleElementDuringComparing = false;
    }

    public worldCoordinateToCellCoordinate(value: number) {
        return Math.floor(value / this.cellSize);
    }
}

function createArrayOfEmptySpatialGridCells<T>(length: number) {
    const array = new Array<SpatialGridCell<T>>();
    for (let i = 0; i < length; i++) {
        array.push(new SpatialGridCell<T>());
    }
    return array;
}