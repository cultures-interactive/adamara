import { Container, Graphics, TilingSprite } from "pixi.js";
import { gameConstants } from "../../../data/gameConstants";
import { Direction } from "../../../../shared/resources/DirectionHelper";

export class BlockedDirectionsView extends Container {
    private grid: Graphics;
    public north: Graphics;
    public east: Graphics;
    public south: Graphics;
    public west: Graphics;

    public constructor() {
        super();

        const { tileWidth, tileHeight } = gameConstants;
        const color = 0x440000;

        this.grid = new Graphics();
        this.grid.lineStyle(1.5, 0x000000);
        this.grid.moveTo(tileWidth / 2, tileHeight);
        this.grid.lineTo(tileWidth, tileHeight / 2);
        this.grid.lineTo(tileWidth / 2, 0);
        this.grid.lineTo(0, tileHeight / 2);
        this.grid.closePath();

        this.north = new Graphics();
        this.north.beginFill(color, 0.3);
        this.north.moveTo(tileWidth / 2, 0);
        this.north.lineTo(tileWidth, tileHeight / 2);
        this.north.lineTo(tileWidth * 5 / 6, tileHeight * 4 / 6);
        this.north.lineTo(tileWidth * 2 / 6, tileHeight * 1 / 6);
        this.north.closePath();
        this.north.endFill();
        this.north.visible = false;

        this.east = new Graphics();
        this.east.beginFill(color, 0.3);
        this.east.moveTo(tileWidth, tileHeight / 2);
        this.east.lineTo(tileWidth / 2, tileHeight);
        this.east.lineTo(tileWidth * 2 / 6, tileHeight * 5 / 6);
        this.east.lineTo(tileWidth * 5 / 6, tileHeight * 2 / 6);
        this.east.closePath();
        this.east.endFill();
        this.east.visible = false;

        this.south = new Graphics();
        this.south.beginFill(color, 0.3);
        this.south.moveTo(tileWidth / 2, tileHeight);
        this.south.lineTo(0, tileHeight / 2);
        this.south.lineTo(tileWidth * 1 / 6, tileHeight * 2 / 6);
        this.south.lineTo(tileWidth * 4 / 6, tileHeight * 5 / 6);
        this.south.closePath();
        this.south.endFill();
        this.south.visible = false;

        this.west = new Graphics();
        this.west.beginFill(color, 0.3);
        this.west.moveTo(0, tileHeight / 2);
        this.west.lineTo(tileWidth / 2, 0);
        this.west.lineTo(tileWidth * 4 / 6, tileHeight * 1 / 6);
        this.west.lineTo(tileWidth * 1 / 6, tileHeight * 4 / 6);
        this.west.closePath();
        this.west.endFill();
        this.west.visible = false;

        this.addChild(this.grid, this.north, this.east, this.south, this.west);
    }

    public update(blocked: Direction[]) {
        this.north.visible = this.isBlocked(blocked, Direction.North);
        this.east.visible = this.isBlocked(blocked, Direction.East);
        this.south.visible = this.isBlocked(blocked, Direction.South);
        this.west.visible = this.isBlocked(blocked, Direction.West);
    }

    private isBlocked(blocked: Direction[], direction: Direction) {
        return blocked && blocked.some(d => d === direction);
    }
}