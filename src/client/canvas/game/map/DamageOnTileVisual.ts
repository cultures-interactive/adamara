import { Container, Graphics } from "pixi.js";
import { TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { flatUnitSize3D } from "../../../../shared/resources/Size3DModel";
import { gameConstants } from "../../../data/gameConstants";
import { createOrUpdateBoxSimple, FlatOrder } from "../../../helper/mapElementSortingHelper";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";
import { TileHighlight } from "../../editor/map/TileHighlight";
import { BoundsUpdateMode, MapElementContainer } from "../../shared/map/sorting/MapElementContainer";

let runningIndex = 0;

export class DamageOnTileVisual extends MapElementContainer {
    private countdownIndicator: Graphics;
    private triggeringIndicator: Container;
    private time: number;
    private delay: number;
    private index = runningIndex++;

    public constructor() {
        super(BoundsUpdateMode.UpdateFromGetLocalBoundsWhenDirty);

        this.triggeringIndicator = new TileHighlight(5, 0x000000, 0xFF0000);
        this.triggeringIndicator.alpha = 0.5;
        this.addChild(this.triggeringIndicator);

        const { tileWidth, tileHeight } = gameConstants;

        this.countdownIndicator = new Graphics();
        this.countdownIndicator.scale.set(1, tileHeight / tileWidth);
        this.countdownIndicator.position.set(tileWidth / 2, tileHeight / 2);
        this.addChild(this.countdownIndicator);
    }

    public update(elapsedS: number) {
        if (this.countdownIndicator.visible) {
            this.time += elapsedS;
            this.updateCountdownIndicator();
        }
    }

    private updateCountdownIndicator() {
        const t = Math.min(this.time / this.delay, 1);
        const scale = t;
        //this.countdownIndicatorScaling.scale.set(scale, scale);
        //this.countdownIndicatorScaling.alpha = t;
        this.countdownIndicator.clear();
        this.countdownIndicator.lineStyle({ color: 0, width: 2 });
        this.countdownIndicator.beginFill(0xFFFFFF);
        this.countdownIndicator.drawTorus(0, 0, gameConstants.tileHeight / 2, 0, 0, -Math.PI * 2 * (1 - t));
        this.countdownIndicator.endFill();
    }

    public set tilePosition(tilePosition: TilePosition) {
        const { x, y } = tilePosition;
        this.position.set(tileToWorldPositionX(x, y), tileToWorldPositionY(x, y));
        this.setBox(createOrUpdateBoxSimple(this.box, tilePosition, flatUnitSize3D, 0, "damageOnTileVisual_" + this.index, FlatOrder.DamageInAreaVisual));
    }

    public showCountdownIndicator(delay: number, delayLeft: number) {
        this.countdownIndicator.visible = true;
        this.triggeringIndicator.visible = false;

        this.time = delay - delayLeft;
        this.delay = delay;
        this.updateCountdownIndicator();
        this.setMapElementContainerBoundsDirty();
    }

    public showTriggeringIndicator() {
        this.countdownIndicator.visible = false;
        this.triggeringIndicator.visible = true;
        this.setMapElementContainerBoundsDirty();
    }
}