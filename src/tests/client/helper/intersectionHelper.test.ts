import { calcDistanceToTileVertex } from "../../../client/helper/intersectionHelper";
import { Direction } from "../../../shared/resources/DirectionHelper";
import { gameConstants } from "../../../client/data/gameConstants";

test("Distance calculation works as expected", () => {
    let distance = calcDistanceToTileVertex(Direction.NorthEast, 0, 0, 0, 0);
    expect(distance).toBe(gameConstants.tileWidth / 2);
    distance = calcDistanceToTileVertex(Direction.SouthWest, 0, 0, 0, 0);
    expect(distance).toBe(gameConstants.tileWidth / 2);
    distance = calcDistanceToTileVertex(Direction.NorthWest, 20, 30, 20, 30);
    expect(distance).toBe(gameConstants.tileHeight / 2);
    distance = calcDistanceToTileVertex(Direction.NorthEast, 100 + gameConstants.tileWidth / 2, 100, 100, 100);
    expect(distance).toBe(0);
    distance = calcDistanceToTileVertex(Direction.SouthWest, 100 - gameConstants.tileWidth / 2, 100, 100, 100);
    expect(distance).toBe(0);
    distance = calcDistanceToTileVertex(Direction.NorthWest, 100, 100 - gameConstants.tileHeight / 2, 100, 100);
    expect(distance).toBe(0);
});
