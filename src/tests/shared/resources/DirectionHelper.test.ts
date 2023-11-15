import { Direction, DirectionHelper } from "../../../shared/resources/DirectionHelper";
import { Vector } from "vector2d";


test("'getNeighbourDirection' returns the expected direction", () => {
    for (const testDirection of DirectionHelper.allDirections) {
        const northWestOffset = DirectionHelper.getTileOffset(testDirection);
        const randomStartX = Math.floor(Math.random() * 100);
        const randomStartY = Math.floor(Math.random() * 100);
        const resultDirection = DirectionHelper.getNeighbourDirectionByVector(
            new Vector(randomStartX, randomStartY),
            new Vector(randomStartX + northWestOffset.x, randomStartY + northWestOffset.y));
        expect(testDirection).toEqual(resultDirection);
    }
    const invalidDirection = DirectionHelper.getNeighbourDirectionByVector(new Vector(0, 0), new Vector(0, 2));
    expect(invalidDirection).toEqual(null);
});
