import { Graphics, ILineStyleOptions } from "pixi.js";
import { gameConstants } from "../../../data/gameConstants";

/**
 * A {@link Graphics} that can be used as a highlight for a tile.
 */
export class TileHighlight extends Graphics {

    private offset = 0;
    private _heightPlaneEnd: number;
    private heightPlaneStart: number = 0;
    private tilesX: number = 1;
    private tilesY: number = 1;
    private upwards: boolean = false;

    /**
     * Creates a new instance.
     * @param borderSize The border size. Can be negative for a outline.
     * @param colorBorder The color of the border.
     * @param colorFill The fill color.
     */
    public constructor(
        private readonly borderSize: number,
        private colorBorder: number,
        private colorFill: number = -1,
        private lineAlpha = 1,
        heightPlane = 0,
        private heightLineStyle: ILineStyleOptions = { width: 4, color: 0xFFFFFF, alpha: 0.3 },
        private heightLineBackAlpha: number = 0,
        private fillAlpha = 1
    ) {
        super();

        if (this.borderSize < 0) {
            this.offset = Math.abs(this.borderSize);
            this.borderSize = this.offset;
        }

        this._heightPlaneEnd = heightPlane;
        this.refresh();
    }

    public hide() {
        this.visible = false;
    }

    public show() {
        this.visible = true;
    }

    public get heightPlane() {
        return this._heightPlaneEnd;
    }

    public set heightPlane(value: number) {
        if (this._heightPlaneEnd == value)
            return;

        this._heightPlaneEnd = value;
        this.refresh();
    }

    public setAll(tilesX: number, tilesY: number, heightPlaneEnd: number, heightPlaneStart: number, upwards: boolean) {
        if ((this.tilesX === tilesX) &&
            (this.tilesY === tilesY) &&
            (this._heightPlaneEnd === heightPlaneEnd) &&
            (this.heightPlaneStart === heightPlaneStart) &&
            (this.upwards === upwards))
            return;

        this.tilesX = tilesX;
        this.tilesY = tilesY;
        this._heightPlaneEnd = heightPlaneEnd;
        this.heightPlaneStart = heightPlaneStart;
        this.upwards = upwards;

        this.refresh();
    }

    private refresh() {
        this.clear();

        const { tileWidth, tileHeight } = gameConstants;
        const { tilesX, tilesY, heightPlane, heightPlaneStart, upwards } = this;
        this.lineStyle(this.borderSize, this.colorBorder, this.lineAlpha);

        if (this.colorFill > -1) {
            this.beginFill(this.colorFill, this.fillAlpha);
        }

        const offsetY = (upwards ? (-heightPlane - heightPlaneStart) : heightPlaneStart) * tileHeight;

        const topPointX = tileWidth / 2;
        const topPointY = offsetY;

        const rightPointX = (tilesX + 1) * tileWidth / 2;
        const rightPointY = tilesX * tileHeight / 2 + offsetY;

        const bottomPointX = (tilesX - tilesY + 1) * tileWidth / 2;
        const bottomPointY = (tilesX + tilesY) * tileHeight / 2 + offsetY;

        const leftPointX = -(tilesY - 1) * tileWidth / 2;
        const leftPointY = tilesY * tileHeight / 2 + offsetY;

        this.moveTo(topPointX, topPointY - this.offset);
        this.lineTo(rightPointX + this.offset, rightPointY);
        this.lineTo(bottomPointX, bottomPointY + this.offset);
        this.lineTo(leftPointX - this.offset, leftPointY);
        this.closePath();
        this.endFill();

        if (heightPlane > 0) {
            const heightOffset = tileHeight * heightPlane;

            this.lineStyle(this.heightLineStyle);

            this.moveTo(bottomPointX, bottomPointY);
            this.lineTo(bottomPointX, bottomPointY + heightOffset);

            this.moveTo(leftPointX, leftPointY);
            this.lineTo(leftPointX, leftPointY + heightOffset);

            this.moveTo(rightPointX, rightPointY);
            this.lineTo(rightPointX, rightPointY + heightOffset);

            for (let i = 1 + Math.floor(heightPlaneStart); i < heightPlane + heightPlaneStart; i++) {
                const currentHeightOffset = tileHeight * i * (upwards ? -1 : 1) - offsetY;
                this.moveTo(leftPointX, leftPointY + currentHeightOffset);
                this.lineTo(bottomPointX, bottomPointY + currentHeightOffset);
                this.lineTo(rightPointX, rightPointY + currentHeightOffset);
            }

            this.moveTo(leftPointX, leftPointY + heightOffset);
            this.lineTo(bottomPointX, bottomPointY + heightOffset);
            this.lineTo(rightPointX, rightPointY + heightOffset);

            if (this.heightLineBackAlpha > 0) {
                this.lineStyle({
                    ...this.heightLineStyle,
                    alpha: this.heightLineBackAlpha
                });
                this.moveTo(leftPointX, leftPointY + heightOffset);
                this.lineTo(topPointX, topPointY + heightOffset);
                this.lineTo(rightPointX, rightPointY + heightOffset);
            }
        }
    }
}
