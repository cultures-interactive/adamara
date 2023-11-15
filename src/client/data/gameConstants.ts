import { MathE } from "../../shared/helper/MathExtension";

const tileWidth = 256;
const tileHeight = 146;

export const gameConstants = {
    tileWidth,
    tileHeight,

    tileCuttingWaterMaskExtraSpace: 50,

    unProjectedTileSize: 90.5096 * 2,
    projectionRotationX: 55.2285 * MathE.degToRad,
    projectionRotationZ: 45 * MathE.degToRad,
    tileAspectRatio: tileWidth / tileHeight,

    cullingEarlyRejectionPaddingX: tileWidth * 3,
    cullingEarlyRejectionPaddingY: tileHeight * 5,

    maxTileCount: 1000, // Maximum map length/height - jj: to get rid of this limitation, use the actual current map width/height instead

    waterColor: 0x3E6F6A,
    emergencyLightColor: 0x0030ff,

    nonBlockingDialogueRemoveTimeMS: 17500,

    playerSpeed: 7,
    playerCollisionRadius: 45,

    mapStartMarker: "Start", // An object with this name marks the player start position

    arenaFightZoomAnimationDurationMillis: 500,

    map: {
        wheelZoomSpeed: 0.001,
        pinchZoomSpeed: 0.003,
        panDistanceMargin: 100, // The distance vairiation allowed between two fingers when panning, everything outside is interpreted as pinch
        minZoomEditor: 0.15,
        minZoomGame: 0.35,
        maxZoom: 1.0,
        minZoomAnimatedCamera: 0.15,
        maxZoomAnimatedCamera: 4
    },

    planes: new Array<number>(),
    minPlane: 0,
    maxPlane: 19,

    onTileLayers: {
        background: 0,
        foreground: 2,
        middle: 1,
        foreground2: 3
    },

    inputKeys: {
        up: ["ArrowUp", "w", "W"],
        left: ["ArrowLeft", "a", "A"],
        down: ["ArrowDown", "s", "S"],
        right: ["ArrowRight", "d", "D"]
    }
};

for (let i = gameConstants.minPlane; i <= gameConstants.maxPlane; i++) {
    gameConstants.planes.push(i);
}

export const gameCanvasSize = {
    width: 1280,
    height: 720
};
