import { Graphics } from "pixi.js";
import { TileDataInterface } from "../../../../shared/game/TileDataModel";
import { MathE } from "../../../../shared/helper/MathExtension";
import { gameConstants } from "../../../data/gameConstants";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";
import { sharedStore } from "../../../stores/SharedStore";

export class TileOriginLineDisplay extends Graphics {
    // This empty constructor is used to remove optional arguments from Graphics constructor
    public constructor() {
        super();
    }

    public drawTileData(tileData: TileDataInterface, clearFirst: boolean) {
        if (clearFirst) {
            this.clear();
            this.lineStyle({ width: 2, color: 0x00FF00 });
        }

        const tileAsset = sharedStore.getTileAsset(tileData.tileAssetId);
        if (!tileAsset)
            return;

        const { tileWidth, tileHeight } = gameConstants;
        const { size } = tileAsset;
        const origin = tileData.hasConflictResolutionOriginOverride
            ? tileData.conflictResolutionOriginOverride
            : tileAsset.conflictResolutionOrigin;

        const offsetZ = tileAsset.offsetZComputed;

        const offsetX = tileAsset.offsetX + tileData.additionalOffsetX;
        const offsetY = tileAsset.offsetY + tileData.additionalOffsetY;

        const tileX = tileData.position.x - offsetZ + offsetX;
        const tileY = tileData.position.y - offsetZ + offsetY;

        const x = tileToWorldPositionX(tileX, tileY, false);
        const y = tileToWorldPositionY(tileX, tileY, false);

        const topPointX = x + tileWidth / 2;
        const topPointY = y;

        const rightPointX = x + (size.x + 1) * tileWidth / 2;
        const rightPointY = y + size.x * tileHeight / 2;

        const bottomPointX = x + (size.x - size.y + 1) * tileWidth / 2;
        const bottomPointY = y + (size.x + size.y) * tileHeight / 2;

        const leftPointX = x - (size.y - 1) * tileWidth / 2;
        const leftPointY = y + size.y * tileHeight / 2;

        const lineY = MathE.lerp(topPointY, bottomPointY, origin);

        let fromX = (lineY <= leftPointY)
            ? MathE.lerp(topPointX, leftPointX, MathE.inverseLerp(topPointY, leftPointY, lineY))
            : MathE.lerp(leftPointX, bottomPointX, MathE.inverseLerp(leftPointY, bottomPointY, lineY));

        let toX = (lineY <= rightPointY)
            ? MathE.lerp(topPointX, rightPointX, MathE.inverseLerp(topPointY, rightPointY, lineY))
            : MathE.lerp(rightPointX, bottomPointX, MathE.inverseLerp(rightPointY, bottomPointY, lineY));

        // When size.x or size.y is 0, fromX or toX are NaN.
        // In those cases, the box side line is flat, so just set one value to the other.
        if (Number.isNaN(fromX)) {
            fromX = toX;
        } else if (Number.isNaN(toX)) {
            toX = fromX;
        }

        this.drawOriginLine(fromX, toX, lineY);
    }

    private drawOriginLine(fromX: number, toX: number, y: number) {
        if (fromX !== toX) {
            this.moveTo(fromX, y);
            this.lineTo(toX, y);
        }

        this.drawCircle((fromX + toX) / 2, y, 10);
    }
}
