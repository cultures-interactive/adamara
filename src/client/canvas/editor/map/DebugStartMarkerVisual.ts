import { Graphics } from "pixi.js";
import { gameConstants } from "../../../data/gameConstants";

export const MapMarkerVisualColorBorder = 0x99FF99;

export class DebugStartMarkerVisual extends Graphics {
    public constructor() {
        super();

        const borderSize = 2;

        const offsetX = 12;
        const offsetY = 25;

        const { tileWidth, tileHeight } = gameConstants;
        this.pivot.set(-tileWidth / 2, -tileHeight / 2);

        this.lineStyle(borderSize, MapMarkerVisualColorBorder);
        this.moveTo(0, 0);
        this.lineTo(offsetX, -offsetY);
        this.quadraticCurveTo(0, -offsetY - 25, -offsetX, -offsetY);
        this.closePath();
        this.drawCircle(0, -offsetY, 4);
    }
}