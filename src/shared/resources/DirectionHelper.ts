import { Vector } from "vector2d";
import { PositionModel } from "../game/PositionModel";
import { MathE } from "../helper/MathExtension";

/**
 * A direction that can be used in a tile grid.
 *
 *                  northwest
 *                      ︿
 *            west   ⟋     ⟍  north
 *                ⟋           ⟍
 *   southwest <                 > northeast
 *                ⟍           ⟋
 *           south   ⟍     ⟋   east
 *                      ﹀
 *                  southeast
 *
 */
export enum Direction {
    North, East, South, West,
    NorthEast, SouthEast, SouthWest, NorthWest
}

/**
 * This class contains static helper methods for {@link Direction}s.
 */
export class DirectionHelper {

    public static readonly allDirections = [Direction.North, Direction.West, Direction.East, Direction.South, Direction.NorthEast, Direction.SouthEast, Direction.SouthWest, Direction.NorthWest];

    public static readonly edgeDirections = [Direction.North, Direction.East, Direction.South, Direction.West];

    private static readonly directionToGridOffset: Map<Direction, Vector> = new Map([
        [Direction.North, new Vector(0, -1)],
        [Direction.East, new Vector(1, 0)],
        [Direction.South, new Vector(0, 1)],
        [Direction.West, new Vector(-1, 0)],
        [Direction.NorthEast, new Vector(1, -1)],
        [Direction.SouthEast, new Vector(1, 1)],
        [Direction.SouthWest, new Vector(-1, 1)],
        [Direction.NorthWest, new Vector(-1, -1)],
    ]);

    private static readonly directionToOpposite: Map<Direction, Direction> = new Map([
        [Direction.North, Direction.South],
        [Direction.East, Direction.West],
        [Direction.South, Direction.North],
        [Direction.West, Direction.East],
        [Direction.NorthEast, Direction.SouthWest],
        [Direction.SouthEast, Direction.NorthWest],
        [Direction.SouthWest, Direction.NorthEast],
        [Direction.NorthWest, Direction.SouthEast]
    ]);

    private static readonly cornerToEdges: Map<Direction, Direction[]> = new Map([
        [Direction.NorthEast, [Direction.North, Direction.East]],
        [Direction.SouthEast, [Direction.South, Direction.East]],
        [Direction.SouthWest, [Direction.South, Direction.West]],
        [Direction.NorthWest, [Direction.North, Direction.West]]
    ]);

    private static readonly directionToRad: Map<Direction, number> = new Map([
        [Direction.North, MathE.degToRad * 330.3],
        [Direction.East, MathE.degToRad * 29.7],
        [Direction.South, MathE.degToRad * 150.3],
        [Direction.West, MathE.degToRad * 209.7],
        [Direction.NorthEast, 0],
        [Direction.SouthEast, MathE.degToRad * 90],
        [Direction.SouthWest, MathE.degToRad * 180],
        [Direction.NorthWest, MathE.degToRad * 270]
    ]);

    private static readonly directionToName: Map<Direction, string> = new Map([
        [Direction.North, "North"],
        [Direction.East, "East"],
        [Direction.South, "South"],
        [Direction.West, "West"],
        [Direction.NorthEast, "NorthEast"],
        [Direction.SouthEast, "SouthEast"],
        [Direction.SouthWest, "SouthWest"],
        [Direction.NorthWest, "NorthWest"]
    ]);


    public static getOpposite(direction: Direction): Direction {
        return DirectionHelper.directionToOpposite.get(direction);
    }

    /**
     * Returns a {@link Vector} with an offset (in Tile positions) pointing to the assigned {@link Direction}
     * @param direction The direction for the offset.
     */
    public static getTileOffset(direction: Direction): Vector {
        return DirectionHelper.directionToGridOffset.get(direction);
    }

    /**
     * Returns the human readable name of the assigned {@link Direction}.
     * @param direction The direction to get the name from.
     */
    public static getName(direction: Direction): string {
        return DirectionHelper.directionToName.get(direction);
    }

    /**
     * Returns the radiant of the assigned {@link Direction}.
     * @param direction The direction to get the radiant from.
     */
    public static getAngleRad(direction: Direction) {
        return DirectionHelper.directionToRad.get(direction);
    }

    /**
     * Creates a {@link PositionModel} that is offset from the assigned position
     * in the assigned direction with the assigned tile count.
     * @param fromPosition The start position.
     * @param inDirection The target direction.
     * @param tileOffsetCount The tiles count to offset.
     */
    public static createOffsetPosition(fromPosition: PositionModel, inDirection: Direction, tileOffsetCount: number): PositionModel {
        const singleOffset = DirectionHelper.getTileOffset(inDirection);
        let x = fromPosition.x;
        let y = fromPosition.y;
        for (let i = 0; i < tileOffsetCount; i++) {
            x += singleOffset.x;
            y += singleOffset.y;
        }
        return new PositionModel({ x, y, layer: fromPosition.layer, plane: fromPosition.plane });
    }

    /**
     * Creates a string of human readable direction names by the assigned directions.
     * @param directions The directions to get the name string from.
     * @return A string of direction names.
     */
    public static directionsToNames(directions: Direction[]): string {
        let names = "";
        if (directions) {
            directions.forEach(dir => {
                names += DirectionHelper.getName(dir) + " ";
            });
        }
        return names;
    }

    public static turnClockwise(direction: Direction): Direction {
        if (direction == Direction.North) return Direction.East;
        if (direction == Direction.East) return Direction.South;
        if (direction == Direction.South) return Direction.West;
        return Direction.North;
    }

    public static turnCounterClockwise(direction: Direction): Direction {
        if (direction == Direction.North) return Direction.West;
        if (direction == Direction.West) return Direction.South;
        if (direction == Direction.South) return Direction.East;
        return Direction.North;
    }

    public static getFacingDirection(angleDeg: number): Direction {
        if (angleDeg < 0) angleDeg = 360 + angleDeg;
        const directionIndex = Math.round(angleDeg / 45);
        if (directionIndex == 0) return Direction.NorthEast;
        if (directionIndex == 1) return Direction.East;
        if (directionIndex == 2) return Direction.SouthEast;
        if (directionIndex == 3) return Direction.South;
        if (directionIndex == 4) return Direction.SouthWest;
        if (directionIndex == 5) return Direction.West;
        if (directionIndex == 6) return Direction.NorthWest;
        if (directionIndex == 7) return Direction.North;
        return Direction.East; // default
    }

    public static toAnimatableDirection(direction: Direction) {
        if (direction == Direction.NorthEast) return Direction.East;
        if (direction == Direction.SouthEast) return Direction.East;
        if (direction == Direction.SouthWest) return Direction.South;
        if (direction == Direction.NorthWest) return Direction.North;
        return direction;
    }

    public static isPointingUp(direction: Direction) {
        return direction == Direction.West || direction == Direction.North;
    }

    public static isPointingDown(direction: Direction) {
        return direction == Direction.South || direction == Direction.East;
    }

    public static isPointingLeft(direction: Direction) {
        return direction == Direction.West || direction == Direction.South;
    }

    public static isPointingRight(direction: Direction) {
        return direction == Direction.North || direction == Direction.East;
    }

    /**
     * Returns the direction of the neighbour relation. Returns null if the assigned positions have no neighbour relation.
     * @param fromTile The tile position.
     * @param toTile The tile position of the potential neighbour.
     */
    public static getNeighbourDirectionByVector(fromTile: Vector, toTile: Vector): Direction {
        return DirectionHelper.getNeighbourDirection(fromTile.x, fromTile.y, toTile.x, toTile.y);
    }

    public static getNeighbourDirection(fromTileX: number, fromTileY: number, toTileX: number, toTileY: number): Direction {
        const offsetX = toTileX - fromTileX;
        const offsetY = toTileY - fromTileY;
        for (const direction of DirectionHelper.allDirections) {
            const offset = this.getTileOffset(direction);
            if (offsetX == offset.x && offsetY == offset.y) return direction;
        }
        return null;
    }

    /**
     * Gets the border intersection point starting from the center of a tile into the assigned direction.
     * @param direction The direction to find the intersection.
     * @param tileWidth The tile width in pixel.
     * @param tileHeight The tile height in pixel.
     * @return An array containing x, and y offsets from the tile center.
     */
    public static getTileBorderIntersectionPoint(direction: Direction, tileWidth: number, tileHeight: number) {
        if (direction == Direction.NorthEast) return [tileWidth / 2, 0];
        if (direction == Direction.SouthWest) return [-tileWidth / 2, 0];
        if (direction == Direction.NorthWest) return [0, -tileHeight / 2];
        if (direction == Direction.SouthEast) return [0, tileHeight / 2];
        if (direction == Direction.North) return [tileWidth / 4, -tileHeight / 4];
        if (direction == Direction.East) return [tileWidth / 4, tileHeight / 4];
        if (direction == Direction.South) return [-tileWidth / 4, tileHeight / 4];
        if (direction == Direction.West) return [-tileWidth / 4, -tileHeight / 4];
        return [0, 0];
    }

    /**
     * Returns true if the assigned {@link Direction}s are the same or the opposite.
     * @param direction1 The first direction.
     * @param direction2 The second direction.
     */
    public static isSameOrOpposite(direction1: Direction, direction2: Direction): boolean {
        return direction1 == direction2 || direction1 == DirectionHelper.getOpposite(direction2);
    }

    /**
     * Returns the two components of a {@link Direction}s or null.
     * Example:
     * {@link Direction.NorthEast} returns an array including {@link Direction.North} and {@link Direction.East}
     * {@link Direction.North} returns null
     * @param direction The direction to get the components from.
     */
    public static getComponents(direction: Direction) {
        if (DirectionHelper.cornerToEdges.has(direction)) {
            return DirectionHelper.cornerToEdges.get(direction);
        }
        return null;
    }

}



