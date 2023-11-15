import { Direction, DirectionHelper } from "../../shared/resources/DirectionHelper";
import { gameConstants } from "../data/gameConstants";
import { tileToWorldPositionX, tileToWorldPositionY } from "./pixiHelpers";
import { MovementState } from "../interaction/path/MovementState";

export const TileVertices: Map<Direction, Array<number>> = new Map([
    [Direction.NorthEast, [gameConstants.tileWidth / 2, 0]],
    [Direction.SouthWest, [-gameConstants.tileWidth / 2, 0]],
    [Direction.NorthWest, [0, -gameConstants.tileHeight / 2]],
    [Direction.SouthEast, [0, gameConstants.tileHeight / 2]],
    [Direction.North, [gameConstants.tileWidth / 4, -gameConstants.tileHeight / 4]],
    [Direction.East, [gameConstants.tileWidth / 4, gameConstants.tileHeight / 4]],
    [Direction.South, [-gameConstants.tileWidth / 4, gameConstants.tileHeight / 4]],
    [Direction.West, [-gameConstants.tileWidth / 4, -gameConstants.tileHeight / 4]]
]);

export const ZeroVector = [0, 0];

/**
 * This method approximates the intersection of an 'object' with the tile grid.
 * Object = the assigned position and radius.
 * The calculation is based on the objects distance to the tiles vertices.
 * It is method not 100% accurate in detecting intersections but should be good enough.
 * Assumes that the radius has about 1/4 the width of a tile.
 * @param objectWorldX The world x position to check.
 * @param objectWorldY The world y position to check.
 * @param objectRadius The radius for the intersection check.
 * @param out The result (avoiding new instance creations)
 */
export function approximateTileIntersection(objectWorldX: number, objectWorldY: number, objectRadius: number, out: MovementState) {
    // get the center world position of the tile
    const tileCenterX = tileToWorldPositionX(out.baseTileX, out.baseTileY, true);
    const tileCenterY = tileToWorldPositionY(out.baseTileX, out.baseTileY, true);
    out.clearSecondaryTiles();

    for (let i = 0; i < DirectionHelper.allDirections.length; i++) {
        const direction = DirectionHelper.allDirections[i];
        const distance = calcDistanceToTileVertex(direction, objectWorldX, objectWorldY, tileCenterX, tileCenterY);
        if (distance < objectRadius) {
            out.pushSecondaryTile(direction, out.baseTileX, out.baseTileY);
            // handle corner tiles..
            const components = DirectionHelper.getComponents(direction);
            if (components) {
                out.pushSecondaryTile(components[0], out.baseTileX, out.baseTileY);
                out.pushSecondaryTile(components[1], out.baseTileX, out.baseTileY);
            }
        }
    }
}

/**
 * Calculates the the distance of an object to the vertex of a tile.
 * @param vertexDirection The {@link Direction} of the vertex.
 * @param objectWorldX The world x position to check.
 * @param objectWorldY The world y position to check.
 * @param tileCenterX The x center of the tile in world coordinates.
 * @param tileCenterY The y center of the tile in world coordinates.
 */
export function calcDistanceToTileVertex(vertexDirection: Direction, objectWorldX: number, objectWorldY: number, tileCenterX: number, tileCenterY: number): number {
    const vertexX = tileCenterX + TileVertices.get(vertexDirection)[0];
    const vertexY = tileCenterY + TileVertices.get(vertexDirection)[1];
    return calcDistance(objectWorldX, objectWorldY, vertexX, vertexY);
}

export function calcDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
}

/**
 * Returns the 'tile vertex' that is the closest to the assigned object position relative to the assigned tile position.
 * @param objectWorldX The object x position in world coordinates.
 * @param objectWorldY The object y position in world coordinates.
 * @param tileCenterX The tile x position in world coordinates.
 * @param tileCenterY The tile y position in world coordinates.
 * @return The direction of the 'tile vertex'.
 */
export function getClosestTileVertex(objectWorldX: number, objectWorldY: number, tileCenterX: number, tileCenterY: number): Direction {
    let closestDistance = -1;
    let foundDirection = Direction.West;
    DirectionHelper.allDirections.forEach(direction => {
        const currentDistance = calcDistanceToTileVertex(direction, objectWorldX, objectWorldY, tileCenterX, tileCenterY);
        if (closestDistance < 0 || currentDistance < closestDistance) {
            closestDistance = currentDistance;
            foundDirection = direction;
        }
    });
    return foundDirection;
}
