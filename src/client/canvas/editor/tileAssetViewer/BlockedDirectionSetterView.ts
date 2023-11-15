import { Container, Graphics } from "pixi.js";
import { Direction } from "../../../../shared/resources/DirectionHelper";
import { gameConstants } from "../../../data/gameConstants";
import { halfTileHeight, halfTileWidth } from "../../../helper/pixiHelpers";

const { tileWidth, tileHeight } = gameConstants;

export type ToggleCallback = (x: number, y: number, direction: Direction) => void;

export class BlockedDirectionsSetterView extends Container {
    public tileX: number;
    public tileY: number;

    public constructor(
        private toggleCallback: ToggleCallback
    ) {
        super();

        const { tileWidth, tileHeight } = gameConstants;

        const grid = new Graphics();
        grid.lineStyle(1.5, 0x000000);
        grid.moveTo(tileWidth / 2, tileHeight);
        grid.lineTo(tileWidth, tileHeight / 2);
        grid.lineTo(tileWidth / 2, 0);
        grid.lineTo(0, tileHeight / 2);
        grid.closePath();
        this.addChild(grid);

        this.makeSideGraphic(Direction.North, 1, -1, false);
        this.makeSideGraphic(Direction.East, 1, 1, true);
        this.makeSideGraphic(Direction.South, -1, 1, false);
        this.makeSideGraphic(Direction.West, -1, -1, true);
    }

    private makeSideGraphic(direction: Direction, screenDirectionX: number, screenDirectionY: number, rotated: boolean) {
        const shortSide = 0.2;
        const longSide = 0.4;
        const lengthX = (rotated ? shortSide : longSide) / 2;
        const lengthY = (rotated ? longSide : shortSide) / 2;

        const graphic = new Graphics();
        //graphic.lineStyle(2, 0x000000);
        graphic.beginFill(0xFFFFFF, 0.2);
        graphic.moveTo(-halfTileWidth * (lengthX - lengthY), -halfTileHeight * (lengthX + lengthY));
        graphic.lineTo(-halfTileWidth * (lengthX + lengthY), -halfTileHeight * (lengthX - lengthY));
        graphic.lineTo(halfTileWidth * (lengthX - lengthY), halfTileHeight * (lengthX + lengthY));
        graphic.lineTo(halfTileWidth * (lengthX + lengthY), halfTileHeight * (lengthX - lengthY));
        graphic.closePath();
        graphic.endFill();

        graphic.position.x = halfTileWidth + screenDirectionX / 6 * tileWidth;
        graphic.position.y = halfTileHeight + screenDirectionY / 6 * tileHeight;

        this.addChild(graphic);

        graphic.interactive = true;
        graphic.buttonMode = true;
        graphic.on("click", () => this.toggleCallback(this.tileX, this.tileY, direction));
    }
}