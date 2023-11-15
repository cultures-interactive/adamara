import { Graphics } from "pixi.js";
import { gameConstants } from "../../../data/gameConstants";

export const AreaTriggerVisualColorBorder = 0x4444FF;

export class AreaTriggerVisual extends Graphics {
    public constructor() {
        super();

        const borderSize = 4;
        const offset = -10;

        const { tileWidth, tileHeight } = gameConstants;
        const offsetX = offset;
        const offsetY = offset * (tileHeight / tileWidth);
        this.lineStyle(borderSize, AreaTriggerVisualColorBorder);
        this.moveTo(tileWidth / 2, -offsetY);
        this.lineTo(tileWidth + offsetX, tileHeight / 2);
        this.lineTo(tileWidth / 2, tileHeight + offsetY);
        this.lineTo(-offsetX, tileHeight / 2);
        this.closePath();
    }
}