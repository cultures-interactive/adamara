///<reference types="webpack-env" />
import { autorun } from "mobx";
import { Container, InteractionEvent } from "pixi.js";
import { MapDataModel } from "../../../../shared/game/MapDataModel";
import { PositionModel } from "../../../../shared/game/PositionModel";
import { TileDataModel } from "../../../../shared/game/TileDataModel";
import { ImagePropertiesModel } from "../../../../shared/resources/ImagePropertiesModel";
import { TileAssetModel, TileImageUsage } from "../../../../shared/resources/TileAssetModel";
import { editorClient } from "../../../communication/EditorClient";
import { gameConstants } from "../../../data/gameConstants";
import { getInteractionManagerFromApplication, tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";
import { MapState } from "../../../stores/MapState";
import { MapZoomController } from "../../shared/controller/MapZoomController";
import { AppContext, PixiApp } from "../../shared/PixiApp";
import { EditorMapScrollController } from "../controller/EditorMapScrollController";
import { EditorMapView } from "../map/EditorMapView";
import { ImagePositionHandle } from "./ImagePositionHandle";
import { TileHighlight } from "../map/TileHighlight";
import { TileOriginLineDisplay } from "../map/TileOriginLineDisplay";
import { Generic2DHandle } from "./Generic2DHandle";
import { SizeAndHandleManager } from "./SizeAndOffsetHandleManager";
import { TileLayerType } from "../../../../shared/resources/TileLayerType";
import { BlockedTileSetterView } from "./BlockedTileSetterView";
import { Direction } from "../../../../shared/resources/DirectionHelper";
import { sharedStore } from "../../../stores/SharedStore";
import { tileAssetEditorStore } from "../../../stores/TileAssetEditorStore";
import { makeChanges } from "../../../../shared/helper/mobXHelpers";
import { firstDecorationLayerIndex, groundLayerIndex } from "../../../../shared/data/layerConstants";

const border = gameConstants.tileWidth / 8;

const previewSize = {
    width: gameConstants.tileWidth * 2 + border * 2,
    height: gameConstants.tileHeight * 2 + border * 2
};

export class EditorTileAssetViewer extends PixiApp {
    private readonly mapViewContainer: Container;
    private readonly mapView: EditorMapView;

    private readonly handles = new Array<Generic2DHandle>();
    private readonly foregroundHandle: ImagePositionHandle;
    private readonly backgroundHandle: ImagePositionHandle;
    private readonly sizeHandleManager: SizeAndHandleManager<TileAssetModel>;

    private readonly sizeIndicatorBottom: TileHighlight;
    private readonly sizeIndicator: TileHighlight;
    private readonly originLineDisplay: TileOriginLineDisplay;

    private readonly blockedTileSetterView: BlockedTileSetterView;

    private readonly mapState: MapState;

    private readonly editorMapScrollController: EditorMapScrollController;
    private readonly editorMapZoomController: MapZoomController;

    private previouslySelectedAssetId: string = null;

    public constructor() {
        super("EditorTileAssetViewer", AppContext.Main, previewSize);

        this.app.renderer.backgroundColor = 0x888888;
        const { stage } = this.app;
        this.mapState = tileAssetEditorStore.mapState;
        //undoableSetPlane(tileCreationAssetConfiguratorStore, 0);

        this.mapViewContainer = new Container();
        stage.addChild(this.mapViewContainer);

        this.sizeIndicatorBottom = new TileHighlight(2, 0xFFFFFF, 0xFFFFFF, 0.6);
        this.sizeIndicatorBottom.alpha = 0.5;
        this.mapViewContainer.addChild(this.sizeIndicatorBottom);

        this.mapView = new EditorMapView(this.appReference, null, null, tileAssetEditorStore, null);
        this.mapViewContainer.addChild(this.mapView);

        this.foregroundHandle = this.addHandle(new ImagePositionHandle(this.mapView));
        this.backgroundHandle = this.addHandle(new ImagePositionHandle(this.mapView));

        this.sizeHandleManager = new SizeAndHandleManager<TileAssetModel>(
            this.mapView,
            this.addHandle.bind(this),
            (tileAsset, changeExecuter) => {
                const hasChanges = makeChanges(tileAsset, changeExecuter);
                if (hasChanges) {
                    editorClient.updateTileAsset(tileAsset, null, null, null, null);
                }
            },
            tileAsset => { return tileAsset.layerType === TileLayerType.Ground; }
        );

        this.sizeIndicator = new TileHighlight(2, 0xFFFFFF, undefined, 0.6, 0, { width: 2, color: 0xFFFFFF, alpha: 0.6 }, 0.2);
        this.mapViewContainer.addChild(this.sizeIndicator);

        this.originLineDisplay = new TileOriginLineDisplay();
        this.originLineDisplay.alpha = 0.5;
        this.mapViewContainer.addChild(this.originLineDisplay);

        this.blockedTileSetterView = new BlockedTileSetterView(this.toggleBlockedTile.bind(this));
        this.mapViewContainer.addChild(this.blockedTileSetterView);

        this.editorMapScrollController = new EditorMapScrollController(this.mapState);
        this.editorMapZoomController = new MapZoomController(gameConstants.map.minZoomEditor, this.mapState, () => true);

        this.reactionDisposers.push(autorun(this.mapZoomRefresher.bind(this)));
        this.reactionDisposers.push(autorun(this.updateTileData.bind(this)));
        this.reactionDisposers.push(autorun(this.refreshTileSize.bind(this)));
        this.reactionDisposers.push(autorun(this.updateOriginLineDisplay.bind(this)));
        this.reactionDisposers.push(autorun(this.updateOffsetAndSizeHandles.bind(this)));
        this.reactionDisposers.push(autorun(this.updateBlockedTileSetterView.bind(this)));

        const interactionManager = getInteractionManagerFromApplication(this.app);
        interactionManager.on('pointerdown', this.onPointerDown, this);
        interactionManager.on('pointermove', this.onPointerMove, this);
        interactionManager.on('pointerup', this.onPointerUp, this);
        this.app.view.onwheel = this.onWheel.bind(this);
    }

    public dispose(): void {
        this.app.view.onwheel = undefined;

        super.dispose();
    }

    private updateTileData() {
        let tiles: TileDataModel[];
        let backgroundImageProperties: ImagePropertiesModel;
        let foregroundImageProperties: ImagePropertiesModel;

        const { tileHeight } = gameConstants;
        const { placementSelection } = tileAssetEditorStore;
        const { selectedTileAssetId } = placementSelection;
        const tileAsset = sharedStore.getTileAsset(selectedTileAssetId);
        const layer = (tileAsset?.layerType === TileLayerType.Ground) ? groundLayerIndex : firstDecorationLayerIndex;

        let shouldShowWater = false;

        const gridWidth = 1;
        const gridHeight = 1;
        if (selectedTileAssetId) {
            tiles = [new TileDataModel({ tileAssetId: selectedTileAssetId, position: new PositionModel({ layer }) })];
            backgroundImageProperties = tileAsset.imageProperties(TileImageUsage.Background);
            foregroundImageProperties = tileAsset.imageProperties(TileImageUsage.Foreground);
            shouldShowWater = tileAsset.layerType === TileLayerType.Ground;
        } else {
            tiles = [];
            backgroundImageProperties = null;
            foregroundImageProperties = null;
        }

        const graphicalSize = Math.max(backgroundImageProperties?.size?.height || tileHeight, foregroundImageProperties?.size?.height || tileHeight) / (tileHeight * 0.5);
        const deltaX = Math.min(
            Math.min(backgroundImageProperties?.positionOnTile?.x || 0, foregroundImageProperties?.positionOnTile?.x || 0),
            (gridHeight - 1) * gameConstants.tileWidth * -0.5
        );
        const deltaY = Math.min(backgroundImageProperties?.positionOnTile?.y || 0, foregroundImageProperties?.positionOnTile?.y || 0);
        const mapData = new MapDataModel({ tiles: tiles });
        mapData.properties.setShouldShowWater(shouldShowWater);
        const scale = (gridHeight + gridWidth) > graphicalSize ? 4 / (gridHeight + gridWidth) : 4 / graphicalSize;
        this.mapView.mapData = mapData;

        this.backgroundHandle.setImageAsset(backgroundImageProperties, tileAsset);
        this.foregroundHandle.setImageAsset(foregroundImageProperties, tileAsset);

        if (!this.handles.some(handle => handle.isDragged()) && (this.previouslySelectedAssetId != selectedTileAssetId)) {
            this.mapViewContainer.position.x = (border - deltaX) * scale;
            this.mapViewContainer.position.y = (border - deltaY) * scale;
            this.mapViewContainer.scale.set(scale);
        }

        this.previouslySelectedAssetId = selectedTileAssetId;
    }

    private refreshTileSize() {
        const { placementSelection, showGamePreview } = tileAssetEditorStore;
        const { selectedTileAssetId } = placementSelection;

        const tileAsset = sharedStore.getTileAsset(selectedTileAssetId);
        if (showGamePreview || !tileAsset) {
            this.sizeIndicator.visible = false;
            this.sizeIndicatorBottom.visible = false;
            return;
        }

        const layerType = tileAsset.layerType;
        const size = tileAsset.size;
        const isGround = layerType === TileLayerType.Ground;
        const isTransit = tileAsset.planeTransit?.isInitialized();
        const goingUp = !isGround || isTransit;

        this.sizeIndicator.setAll(size.x, size.y, size.z, tileAsset.internalOffsetZ, goingUp);
        this.sizeIndicator.visible = true;

        if (isGround) {
            this.sizeIndicatorBottom.visible = false;
        } else {
            this.sizeIndicatorBottom.setAll(size.x, size.y, 0, 0, false);
            this.sizeIndicatorBottom.visible = true;
        }

        const { offsetX, offsetY } = tileAsset;
        const x = tileToWorldPositionX(offsetX, offsetY);
        const y = tileToWorldPositionY(offsetX, offsetY);
        this.sizeIndicator.position.set(x, y);
        this.sizeIndicatorBottom.position.set(x, y);
    }

    private mapZoomRefresher() {
        const { currentMapCenterX, currentMapCenterY, currentMapZoom } = this.mapState;
        this.mapViewContainer.position.set(currentMapCenterX, currentMapCenterY);
        this.mapViewContainer.scale.set(currentMapZoom, currentMapZoom);
    }

    private updateOriginLineDisplay() {
        const { placementSelection } = tileAssetEditorStore;
        const { selectedTileAssetId } = placementSelection;

        let isDecorationTile: boolean = false;
        let isFlat: boolean = false;

        const tileAsset = sharedStore.getTileAsset(selectedTileAssetId);
        const layer = (tileAsset?.layerType === TileLayerType.Ground) ? groundLayerIndex : firstDecorationLayerIndex;
        if (tileAsset) {
            isDecorationTile = tileAsset.layerType === TileLayerType.Decoration;
            isFlat = tileAsset.size.isFlat;
        }

        if (tileAssetEditorStore.showGamePreview || !selectedTileAssetId || isFlat || (!isDecorationTile && !tileAssetEditorStore.isHoveringConflictResolutionOrigin)) {
            this.originLineDisplay.visible = false;
            return;
        }

        this.originLineDisplay.visible = true;
        this.originLineDisplay.drawTileData(new TileDataModel({
            tileAssetId: selectedTileAssetId,
            position: new PositionModel({ layer })
        }), true);
    }

    private updateOffsetAndSizeHandles() {
        const { selectedTileAssetId } = tileAssetEditorStore.placementSelection;
        if (selectedTileAssetId) {
            const tileAsset = sharedStore.getTileAsset(selectedTileAssetId);
            if (tileAsset) {
                this.sizeHandleManager.target = tileAsset;
                return;
            }
        }

        this.sizeHandleManager.target = null;
    }

    private addHandle<T extends Generic2DHandle>(handle: T) {
        this.mapViewContainer.addChild(handle.handleView);
        this.handles.push(handle);
        return handle;
    }

    private updateBlockedTileSetterView() {
        const { selectedTileAssetId } = tileAssetEditorStore.placementSelection;
        if (!selectedTileAssetId ||
            tileAssetEditorStore.showGamePreview ||
            !tileAssetEditorStore.editBlockedDirections
        ) {
            this.blockedTileSetterView.visible = false;
            return;
        }

        const tileAsset = sharedStore.getTileAsset(selectedTileAssetId);
        this.blockedTileSetterView.refresh(tileAsset);
        this.blockedTileSetterView.visible = true;
    }

    private toggleBlockedTile(x: number, y: number, direction: Direction) {
        const { selectedTileAssetId } = tileAssetEditorStore.placementSelection;
        const tileAsset = sharedStore.getTileAsset(selectedTileAssetId);
        tileAsset.toggleBlockedAtOffset(x, y, direction);
        editorClient.updateTileAsset(tileAsset, null, null, null, null);
    }

    private onPointerDown(e: InteractionEvent) {
        this.mapState.setMapCenter(this.mapViewContainer.position.x, this.mapViewContainer.position.y, this.mapViewContainer.scale.x);
        e.stopPropagation();
    }

    private onPointerMove(e: InteractionEvent) {
        const didScroll = this.editorMapScrollController.scroll(e);
        if (!didScroll) {
            this.editorMapZoomController.pinch(e, this.mapViewContainer.toLocal(e.data.global));
        }
    }

    private onPointerUp(e: InteractionEvent) {
        this.editorMapZoomController.reset();
        e.data.originalEvent.preventDefault();
    }

    private onWheel(e: WheelEvent) {
        this.mapState.setMapCenter(this.mapViewContainer.position.x, this.mapViewContainer.position.y, this.mapViewContainer.scale.x);
        const data = getInteractionManagerFromApplication(this.app).eventData.data;
        e.preventDefault();
        e.stopPropagation();
        if (data) {
            this.editorMapZoomController.wheelZoom(e, this.mapView.toLocal(data.global));
        }
    }
}

let editorTileAssetViewer: EditorTileAssetViewer;

export function createEditorTileAssetViewer() {
    if (editorTileAssetViewer)
        return;

    editorTileAssetViewer = new EditorTileAssetViewer();
}

export function getEditorTileAssetViewer() {
    return editorTileAssetViewer;
}

export function disposeEditorTileAssetViewer() {
    if (editorTileAssetViewer) {
        editorTileAssetViewer.dispose();
        editorTileAssetViewer = null;
    }
}

if (module.hot) {
    const { data } = module.hot;
    if (data && data.parent) {
        createEditorTileAssetViewer();
        editorTileAssetViewer.attach(data.parent);
    }

    module.hot.dispose(data => {
        if (editorTileAssetViewer) {
            data.parent = editorTileAssetViewer.parentElement;
            disposeEditorTileAssetViewer();
        }
    });
}

