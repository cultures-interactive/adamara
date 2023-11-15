import { Graphics } from "pixi.js";
import { gameConstants } from "../../../data/gameConstants";

export const MapMarkerVisualColorBorder = 0x99FF99;

export class MapMarkerVisual extends Graphics {
    public constructor() {
        super();

        const borderSize = 2;

        const offsetX = 12;
        const offsetY = 35;

        const { tileWidth, tileHeight } = gameConstants;
        this.pivot.set(-tileWidth / 2, -tileHeight / 2);

        this.lineStyle(borderSize, MapMarkerVisualColorBorder);
        this.moveTo(0, 0);
        this.lineTo(offsetX, -offsetY);
        this.lineTo(-offsetX, -offsetY);
        this.closePath();
    }
}