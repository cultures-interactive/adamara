import { Container, Graphics, InteractionData, InteractionEvent } from "pixi.js";
import { UiConstants } from "../../../data/UiConstants";
import { tileAssetEditorStore } from "../../../stores/TileAssetEditorStore";

export class Generic2DHandle {
    public readonly handleView: Container;
    protected readonly handleGraphic: Graphics;
    protected readonly indicatorGraphic: Graphics;
    protected dragging: boolean;
    protected dragData: InteractionData;
    protected handleSize: number;

    public constructor(
        private cameraContainer: Container,
        handleColor: number,
        private isCurrentlyInitialized: () => boolean,
        private getPositionX: () => number,
        private getPositionY: () => number,
        private setPosition: (x: number, y: number) => void
    ) {
        // Create Handle Graphic
        this.handleGraphic = new Graphics();
        this.handleGraphic.interactive = true;
        this.handleGraphic.cursor = 'move';
        this.handleGraphic
            .on('pointerdown', this.onDragStart, this)
            .on('pointerup', this.onDragEnd, this)
            .on('pointerupoutside', this.onDragEnd, this)
            .on('pointermove', this.onDragMove, this);

        this.handleSize = 5;
        this.drawHandleGraphic(handleColor);

        // Create dragging indicator
        this.indicatorGraphic = new Graphics();
        this.indicatorGraphic.lineStyle(3, UiConstants.COLOR_DARK_BUTTON_0x, 1);
        this.indicatorGraphic.beginFill(UiConstants.COLOR_DARK_BUTTON_0x, 1);
        this.indicatorGraphic.drawCircle(0, 0, this.handleSize - 1);
        this.indicatorGraphic.endFill();
        this.indicatorGraphic.visible = false;

        this.handleView = new Container();
        this.handleView.addChild(this.handleGraphic);
        this.handleView.addChild(this.indicatorGraphic);

        this.dragging = false;
    }

    public updatePosition() {
        this.handleGraphic.visible = this.isCurrentlyInitialized() && !tileAssetEditorStore.showGamePreview;
        if (this.isCurrentlyInitialized()) {
            const x = this.getPositionX();
            const y = this.getPositionY();
            this.handleGraphic.x = x;
            this.handleGraphic.y = y;
            this.indicatorGraphic.x = x;
            this.indicatorGraphic.y = y;
        }
    }

    public isDragged() {
        return this.dragging;
    }

    public drawHandleGraphic(color: number) {
        this.handleGraphic.lineStyle(3, color, 1);
        this.handleGraphic.beginFill(color, 1);
        this.handleGraphic.drawCircle(0, 0, this.handleSize);
        this.handleGraphic.endFill();
    }

    public onDragStart(event: InteractionEvent) {
        this.dragging = true;
        this.dragData = event.data;
        this.indicatorGraphic.visible = true;
    }

    public onDragEnd() {
        this.dragging = false;
        this.dragData = null;
        this.indicatorGraphic.visible = false;
        this.updatePosition();
    }

    public get handleX() {
        return this.handleGraphic.x;
    }

    public get handleY() {
        return this.handleGraphic.y;
    }

    public onDragMove() {
        if (this.isCurrentlyInitialized() && this.dragging) {
            const newPosition = this.dragData.getLocalPosition(this.cameraContainer);
            this.setPosition(newPosition.x, newPosition.y);
        }
    }
}