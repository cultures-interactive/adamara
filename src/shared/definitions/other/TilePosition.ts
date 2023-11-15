export interface TilePosition {
    x: number;
    y: number;
    plane: number;
}

export function doesTilePositionEqual(a: TilePosition, b: TilePosition) {
    if (!a && !b)
        return true;

    if (!a)
        return false;

    return (a.x === b.x) && (a.y === b.y) && (a.plane === b.plane);
}

export function copyTilePosition(tilePosition: TilePosition): TilePosition {
    const { x, y, plane } = tilePosition;
    return { x, y, plane };
}