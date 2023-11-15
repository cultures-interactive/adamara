import { MathE } from "../helper/MathExtension";

export const conflictResolutionOriginStep = 0.01;
export const tileOffsetAndSizeStep = 0.05;
const tileOffsetAndSizePrecision = 1 / tileOffsetAndSizeStep;
export const tileMaxOffsetXY = 1 - tileOffsetAndSizeStep;
export const boxMathPrecision = 100;

export function adjustTileOffsetXY(value: number) {
    return MathE.clamp(adjustTileOffsetAndSizePrecision(value), 0, tileMaxOffsetXY);
}

export function adjustTileOffsetZ(value: number) {
    return Math.max(adjustTileOffsetAndSizePrecision(value), 0);
}

export function adjustTileSizeXY(value: number, isGround: boolean) {
    value = Math.max(value, 0);

    if (isGround) {
        return Math.round(value);
    }

    return adjustTileOffsetAndSizePrecision(value);
}

export function adjustTileSizeZ(value: number) {
    return Math.max(adjustTileOffsetAndSizePrecision(value), 0);
}

export function adjustTileOffsetAndSizePrecision(value: number) {
    return MathE.adjustPrecision(value, tileOffsetAndSizePrecision);
}

export function convertToBoxMathInteger(value: number) {
    return Math.round(value * boxMathPrecision);
}