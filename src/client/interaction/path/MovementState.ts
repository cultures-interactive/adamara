import { Direction, DirectionHelper } from "../../../shared/resources/DirectionHelper";
import { PositionInterface, ReadonlyPosition } from "../../../shared/game/PositionModel";
import { Vector } from "vector2d";
import { DynamicMapElementAreaTriggerInterface } from "../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";

/**
 * This class contains information about a {@link Character}s movement state.
 * The {@see baseTileX} and {@see baseTileY} pointing to a tile which the {@link Character}
 * directly intersects (As if he would be a point).
 * The {@see secondaryTiles} pointing to tiles which the {@link Character} intersects
 * with his collision circle.
 */
export class MovementState {

    /**
     * Creates a new instance.
     * @param baseTileX The base tile position x
     * @param baseTileY The base tile position y
     * @param baseTilePlane The base tile plane
     * @param secondaryTiles The secondary tiles
     * @param collidingTriggers The area triggers the character is colliding with
     */
    public constructor(public baseTileX = 0, public baseTileY = 0,
        public baseTilePlane = 0, public readonly secondaryTiles: Array<Vector> = [],
        public collidingTriggers = Array<DynamicMapElementAreaTriggerInterface>()) { }

    /**
     * Sets the base position.
     * @param position The position to set.
     */
    public applyBasePosition(position: PositionInterface) {
        if (!position) return;
        this.baseTileX = position.x;
        this.baseTileY = position.y;
        this.baseTilePlane = position.plane;
    }

    /**
     * Returns true if this {@link MovementState} equals the assigned one.
     * @param tileIntersection The intersection to check.
     */
    public equals(tileIntersection: MovementState): boolean {
        if (!tileIntersection || tileIntersection.secondaryTiles.length != this.secondaryTiles.length) return false;
        for (let i = 0; i < this.secondaryTiles.length; i++) {
            if (!tileIntersection.secondaryTiles.some(n => n.x == this.secondaryTiles[i].x && n.y == this.secondaryTiles[i].y)) return false;
        }
        return this.baseTileX == tileIntersection.baseTileX && this.baseTileY == tileIntersection.baseTileY && this.baseTilePlane == tileIntersection.baseTilePlane;
    }

    /**
     * Returns true if the 'base' of this {@link MovementState} equals the assigned one.
     * @param tileIntersection The intersection to check.
     */
    public equalBaseTile(tileIntersection: MovementState): boolean {
        if (!tileIntersection) return false;
        return (this.baseTileX == tileIntersection.baseTileX && this.baseTileY == tileIntersection.baseTileY
            && this.baseTilePlane == tileIntersection.baseTilePlane);
    }

    /**
     * Creates a copy of this {@link MovementState}.
     */
    public copy(): MovementState {
        return new MovementState(this.baseTileX, this.baseTileY, this.baseTilePlane,
            [...this.secondaryTiles], [...this.collidingTriggers]);
    }

    /**
     * Creates a copy of the 'base' position.
     */
    public copyBasePosition(): PositionInterface {
        return new ReadonlyPosition({
            x: this.baseTileX,
            y: this.baseTileY,
            plane: this.baseTilePlane
        });
    }

    /**
     * Adds a secondary tile to the array.
     * @param direction The direction of the tile relative to the base.
     * @param baseTileX The base tile x.
     * @param baseTileY The base tile y.
     */
    public pushSecondaryTile(direction: Direction, baseTileX: number, baseTileY: number) {
        const offset = DirectionHelper.getTileOffset(direction);
        this.secondaryTiles.push(new Vector(baseTileX + offset.x, baseTileY + offset.y));
    }

    /**
     * Clears all secondary tiles.
     */
    public clearSecondaryTiles() {
        this.secondaryTiles.length = 0;
    }

    /**
     * Returns true if this contains a colliding trigger with the assigned id.
     * @param id The id to search for.
     */
    public containsCollidingTriggerWithId(id: string): boolean {
        return this.collidingTriggers.some(o => o.id == id);
    }

    public containsSecondaryTile(tileX: number, tileY: number): boolean {
        return this.secondaryTiles.some(tile => tile.x == tileX && tile.y == tileY);
    }
}
