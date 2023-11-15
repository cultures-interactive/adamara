import { MathE } from "../../../shared/helper/MathExtension";
import { projectAngle, unProjectAngle, unProjectPosition } from "../../../client/helper/pixiHelpers";
import { gameConstants } from "../../../client/data/gameConstants";

test("Angle projection works as expected.", () => {
    expect(projectAngle(0 * MathE.degToRad)).toBeCloseTo(29.7 * MathE.degToRad, 0);
    expect(projectAngle(90 * MathE.degToRad)).toBeCloseTo(150.3 * MathE.degToRad, 0);
    expect(projectAngle(180 * MathE.degToRad)).toBeCloseTo(209.7 * MathE.degToRad, 0);
    expect(projectAngle(270 * MathE.degToRad)).toBeCloseTo(330.3 * MathE.degToRad, 0);

    expect(unProjectAngle(29.7 * MathE.degToRad + 0.1)).toBeCloseTo(MathE.modulo(0 * MathE.degToRad, MathE.PI_DOUBLE), 0);
    expect(unProjectAngle(150.3 * MathE.degToRad)).toBeCloseTo(90 * MathE.degToRad, 0);
    expect(unProjectAngle(209.7 * MathE.degToRad)).toBeCloseTo(180 * MathE.degToRad, 0);
    expect(unProjectAngle(330.3 * MathE.degToRad)).toBeCloseTo(270 * MathE.degToRad, 0);
});

test("Position inverse projection works as expected.", () => {
    const testPoint1 = [gameConstants.tileWidth / 2, 0, 0];
    const result1 = unProjectPosition(testPoint1);
    expect(result1[0]).toBeCloseTo(gameConstants.unProjectedTileSize / 2, 1);
    expect(result1[1]).toBeCloseTo(-gameConstants.unProjectedTileSize / 2, 1);

    const testPoint2 = [gameConstants.tileWidth / 4, gameConstants.tileHeight / 4, 0];
    const result2 = unProjectPosition(testPoint2);
    expect(result2[0]).toBeCloseTo(gameConstants.unProjectedTileSize / 2, 1);
    expect(result2[1]).toBeCloseTo(0, 1);
});

