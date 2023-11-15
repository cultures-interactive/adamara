///<reference types="webpack-env" />
import { autorun, runInAction } from "mobx";
import { Container, InteractionEvent, Point } from "pixi.js";
import { getEventMouseButton, getInteractionManagerFromApplication, isMouseMove, MouseButton, tileToWorldPositionX, tileToWorldPositionY, worldToTilePosition } from "../../helper/pixiHelpers";
import { AppContext, PixiApp } from "../shared/PixiApp";
import { EditorMapView } from "./map/EditorMapView";
import { TemporaryObjectView, TemporaryObjectViewMode } from "./map/TemporaryObjectView";
import { gameConstants } from "../../data/gameConstants";
import { PositionModel } from "../../../shared/game/PositionModel";
import { ErrorType } from "../../stores/editor/ErrorNotification";
import { EditorToolType, mainMapEditorStore } from "../../stores/MapEditorStore";
import { EditorMapScrollController } from "./controller/EditorMapScrollController";
import { MapZoomController } from "../shared/controller/MapZoomController";
import { Group, Layer } from "@pixi/layers";
import { TileImageUsage } from "../../../shared/resources/TileAssetModel";
import { DebugTileInfoView } from "./map/debug/DebugTileInfoView";
import { TileHighlight } from "./map/TileHighlight";
import { UiConstants } from "../../data/UiConstants";
import { EditorMapShortcutController } from "./controller/EditorMapShortcutController";
import { undoableMapEditorSelectTile } from "../../stores/undo/operation/MapEditorEntitySelectionOp";
import { getChangesToClearTilesToMakeWayForGroundTile, TileAssetChange, undoableMapEditorRemoveTiles, undoableMapEditorSetAndSelectTiles } from "../../stores/undo/operation/MapEditorSetTilesOp";
import { isPlacementSelectionEmpty, OtherPlacementElement } from "../../stores/MapRelatedStore";
import { DynamicMapElementModel } from "../../../shared/game/dynamicMapElements/DynamicMapElement";
import { DynamicMapElementNPCModel } from "../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { DynamicMapElementChangeGroup, groupUndoableMapEditorDynamicMapElementChanges, SelectTileSideEffect } from "../../stores/undo/operation/MapEditorSubmitCurrentMapDynamicMapElementsChangesOp";
import { DynamicMapElementAreaTriggerModel } from "../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { DynamicMapElementMapMarkerModel } from "../../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel";
import { DynamicMapElementAnimationElementModel } from "../../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel";
import { getEmptyChangeableTileDataSnapshot } from "../../../shared/game/TileDataModel";
import { undoableSetDebugStartMarkerOp } from "../../stores/undo/operation/MapEditorDebugStartMarkerChangeOp";
import { TileOriginLineDisplay } from "./map/TileOriginLineDisplay";
import { firstDecorationLayerIndex, getTileLayerType, groundLayerIndex } from "../../../shared/data/layerConstants";
import { TileLayerType } from "../../../shared/resources/TileLayerType";
import { localSettingsStore } from "../../stores/LocalSettingsStore";
import { sharedStore } from "../../stores/SharedStore";
import { errorStore } from "../../stores/ErrorStore";
import { charEditorStore } from "../../stores/CharacterEditorStore";

export class EditorMapViewer extends PixiApp {
    protected mapViewContainer: Container;
    protected mapView: EditorMapView;
    private placementPreview: TemporaryObjectView;

    private onPointerDownTilePositionSelection: PositionModel; // tile position at the last 'pointer down event' for selection

    private isDragPlacing: boolean;
    private lastTileAssetPlacementX: number;
    private lastTileAssetPlacementY: number;

    private editorMapScrollController: EditorMapScrollController;
    private editorMapZoomController: MapZoomController;

    private readonly debugTileInfo = new DebugTileInfoView();

    protected overlayContainer = new Container();
    protected tileHighlight: TileHighlight; // graphic that surrounds a tile
    private tileOriginLineDisplay: TileOriginLineDisplay;

    private shortcutController: EditorMapShortcutController;

    protected get currentMapStore() { return this.mapEditorStore.currentMapStore; }

    public constructor(
        protected mapEditorStore = mainMapEditorStore,
        protected moveToCenterOfMapAfterAttaching = true
    ) {
        super("EditorMapViewer", AppContext.Main, {
            manualTextureGarbageCollectionMode: true
        });

        //this.app.renderer.backgroundColor = gameConstants.waterColor;

        this.resize = this.resize.bind(this);
    }

    public initialize() {
        const { stage } = this.app;

        const textGroup = new Group(1, false);
        stage.addChild(new Layer(textGroup));

        this.mapViewContainer = new Container();
        stage.addChild(this.mapViewContainer);

        this.mapView = new EditorMapView(this.appReference, null, textGroup, this.mapEditorStore, this.mapEditorStore.currentMapStore, this.overlayContainer);
        this.mapViewContainer.addChild(this.mapView);

        this.placementPreview = new TemporaryObjectView(TemporaryObjectViewMode.TargetValid);
        this.placementPreview.visible = false;
        this.mapViewContainer.addChild(this.placementPreview);

        this.tileHighlight = new TileHighlight(-6, UiConstants.COLOR_SELECTION_HIGHLIGHT_0x);
        this.overlayContainer.addChild(this.tileHighlight);

        this.tileOriginLineDisplay = new TileOriginLineDisplay();
        this.tileOriginLineDisplay.alpha = 0.5;
        this.overlayContainer.addChild(this.tileOriginLineDisplay);

        this.mapViewContainer.addChild(this.overlayContainer);

        this.editorMapScrollController = new EditorMapScrollController(this.mapEditorStore.mapState);
        this.editorMapZoomController = new MapZoomController(gameConstants.map.minZoomEditor, this.mapEditorStore.mapState, () => true);

        this.on(PixiApp.EventAttached, this.onAttached, this);
        this.on(PixiApp.EventDetached, this.onDetached, this);

        this.reactionDisposers.push(autorun(this.mapDataRefresher.bind(this)));
        this.reactionDisposers.push(autorun(this.mapZoomRefresher.bind(this)));
        this.reactionDisposers.push(autorun(this.onToolChanged.bind(this)));
        this.reactionDisposers.push(autorun(this.onSelectedHeightPlaneChanged.bind(this)));
        this.reactionDisposers.push(autorun(this.onPlacementSelectionChanged.bind(this)));
        this.reactionDisposers.push(autorun(this.onRefreshTileHighlight.bind(this)));
        this.reactionDisposers.push(autorun(this.onRefreshTileOriginLineDisplay.bind(this)));

        const interactionManager = getInteractionManagerFromApplication(this.app);
        interactionManager.on('pointerdown', this.onPointerDown, this);
        interactionManager.on('pointermove', this.onPointerMove, this);
        interactionManager.on('pointerup', this.onPointerUp, this);
        interactionManager.on('pointerout', this.onPointerOut, this);
        this.app.view.onwheel = this.onWheel.bind(this);

        this.shortcutController = new EditorMapShortcutController(this.outputDebugDataForSelection.bind(this), this.mapEditorStore);
    }

    public dispose(): void {
        this.app.view.onwheel = undefined;

        this.shortcutController.dispose();

        super.dispose();
    }

    protected mapDataRefresher() {
        const { currentMap } = this.currentMapStore;

        if (this.mapView.mapData === currentMap)
            return;

        if (currentMap && currentMap.tiles.length > 0) {
            this.moveToCenterOfMap();
        }

        // Manually trigger garbage collection while map is changing
        this.triggerManualTextureGarbageCollection();

        // Switch to the new map
        this.mapView.mapData = currentMap;
    }

    public moveToCenterOfMap() {
        // Run in action to avoid subscribing to reactions.
        runInAction(() => {
            const { currentMap } = this.currentMapStore;

            if (currentMap && currentMap.tiles.length > 0) {
                const startMarker = currentMap.mapMarkers.find(m => m.label === gameConstants.mapStartMarker);

                // Center on start marker, if it exists, or else on the first tile that was set down
                const elementToCenterOn = startMarker || currentMap.tiles[0];

                const { x, y } = elementToCenterOn.position;
                const scale = this.mapViewContainer.scale.x;
                const px = this.app.renderer.width / 2 - tileToWorldPositionX(x, y, true) * scale;
                const py = this.app.renderer.height / 2 - tileToWorldPositionY(x, y, true) * scale;
                this.mapEditorStore.mapState.setMapCenter(px, py);
            }
        });
    }

    private mapZoomRefresher() {
        const { currentMapCenterX, currentMapCenterY, currentMapZoom } = this.mapEditorStore.mapState;
        this.mapViewContainer.position.set(currentMapCenterX, currentMapCenterY);
        this.mapViewContainer.scale.set(currentMapZoom, currentMapZoom);
    }

    private onPointerDown(e: InteractionEvent) {
        this.mapEditorStore.mapState.setMapCenter(this.mapViewContainer.position.x, this.mapViewContainer.position.y, this.mapViewContainer.scale.x);
        if (document.activeElement && (document.activeElement as any).blur) (document.activeElement as any).blur();
        e.data.originalEvent.preventDefault();
        this.resetOnPointerDownCache();
        if (!(getEventMouseButton(e) == MouseButton.LeftOrTouch)) return;
        if (e.target instanceof TemporaryObjectView) {
            e.stopPropagation();
            return;
        }
        this.handlePointerDownSingleSelect(e);
        this.handlePointerDownPlaceAsset(e);
    }

    protected handlePointerDownPlaceAsset(e: InteractionEvent) {
        if (!(this.mapEditorStore.selectedTool == EditorToolType.PlaceAsset)) return;
        if (!this.currentMapStore.isUserAllowedToEditCurrentMap)
            return;

        const { x, y } = this.mapView.getTilePosition(e.data.global);
        const plane = this.mapEditorStore.getHeightPlaneForNewAsset(x, y);
        e.stopPropagation();

        const { placementSelection } = this.mapEditorStore;

        if (placementSelection.selectedOtherElement) {
            switch (placementSelection.selectedOtherElement) {
                case OtherPlacementElement.AreaTrigger:
                    this.addDynamicMapElement(new DynamicMapElementAreaTriggerModel({
                        position: new PositionModel({ x, y, plane }),
                        id: placementSelection.areaTriggerId || ""
                    }));
                    break;

                case OtherPlacementElement.MapMarker:
                    this.addDynamicMapElement(new DynamicMapElementMapMarkerModel({
                        position: new PositionModel({ x, y, plane })
                    }));
                    break;

                case OtherPlacementElement.StartMarker:
                    const existingStartMarker = this.currentMapStore.currentMap.dynamicMapElements.find(element => (element instanceof DynamicMapElementMapMarkerModel) && (element.label === gameConstants.mapStartMarker));
                    if (existingStartMarker) {
                        groupUndoableMapEditorDynamicMapElementChanges(DynamicMapElementChangeGroup.MoveStartMarker, () => {
                            existingStartMarker.position.setXYPlane(x, y, plane);
                        }, [new SelectTileSideEffect(this.mapEditorStore, { x, y, plane })]);
                    } else {
                        this.addDynamicMapElement(new DynamicMapElementMapMarkerModel({
                            position: new PositionModel({ x, y, plane }),
                            label: gameConstants.mapStartMarker
                        }));
                    }
                    break;

                case OtherPlacementElement.DebugStartMarker:
                    const newDebugStartMapMarker = new DynamicMapElementMapMarkerModel({ position: new PositionModel({ x, y, plane }) });
                    newDebugStartMapMarker.setLabel("Debug Start");
                    undoableSetDebugStartMarkerOp(newDebugStartMapMarker, this.currentMapStore.currentMapId);
                    break;

                default:
                    throw new Error("Not implemented: " + OtherPlacementElement[placementSelection.selectedOtherElement]);
            }
        } else if (placementSelection.selectedCharacterId) {
            const alreadyHasNPCOnTile = this.currentMapStore.currentMap.getAllDynamicMapElementsAtPositionXYPlane(x, y, plane).some(element => element instanceof DynamicMapElementNPCModel);
            if (alreadyHasNPCOnTile) {
                errorStore.addError(ErrorType.General, "editor.error_can_only_have_one_npc_per_tile");
            } else {
                this.addDynamicMapElement(new DynamicMapElementNPCModel({
                    position: new PositionModel({ x, y, plane }),
                    characterId: placementSelection.selectedCharacterId
                }));
            }
        } else if (placementSelection.selectedAnimationName) {
            this.addDynamicMapElement(new DynamicMapElementAnimationElementModel({
                position: new PositionModel({ x, y, plane }),
                animationName: placementSelection.selectedAnimationName
            }));
        } else {
            this.placeTileAsset(x, y);
            if (placementSelection.selectedTileAssetId || isPlacementSelectionEmpty(placementSelection)) {
                this.isDragPlacing = true;
            }
        }
    }

    private placeTileAsset(x: number, y: number) {
        this.lastTileAssetPlacementX = x;
        this.lastTileAssetPlacementY = y;
        const { placementSelection, effectiveSelectedLayer, selectedPlane } = this.mapEditorStore;
        if (isPlacementSelectionEmpty(placementSelection)) {
            this.clearTileWithXYOverlap(x, y, selectedPlane, effectiveSelectedLayer);
        } else {
            const { selectedTileAssetId } = placementSelection;
            this.setTile(x, y, selectedPlane, effectiveSelectedLayer, selectedTileAssetId);
        }
    }

    private clearTileWithXYOverlap(x: number, y: number, plane: number, layer: number) {
        let tilesToBeDeleted = this.currentMapStore.currentMap.getTilesOnPlaneWithXYOverlap(x, y, plane, sharedStore.getTileAsset);

        if (layer === null) {
            // If no layer is selected, delete all tiles on the position
        } else if (getTileLayerType(layer) === TileLayerType.Decoration) {
            // If decoration is currently selected, delete all decoration on that tile
            tilesToBeDeleted = tilesToBeDeleted.filter(tile => getTileLayerType(tile.position.layer) === TileLayerType.Decoration);
        } else {
            // If something except decoration is currently selected, only delete that exact layer
            tilesToBeDeleted = tilesToBeDeleted.filter(tile => tile.position.layer === layer);
        }

        if (tilesToBeDeleted.length > 0) {
            const emptyData = getEmptyChangeableTileDataSnapshot();
            undoableMapEditorRemoveTiles(
                this.currentMapStore,
                plane,
                tilesToBeDeleted.map(tile => ({
                    position: tile.position,
                    newData: emptyData
                }))
            );
        }
    }

    private setTile(x: number, y: number, plane: number, layer: number, tileAssetId: string) {
        const changes = new Array<TileAssetChange>();

        if (layer == null) {
            if (sharedStore.getTileAsset(tileAssetId).layerType === TileLayerType.Ground) {
                layer = groundLayerIndex;
            } else {
                layer = firstDecorationLayerIndex;
            }
        }

        const isDecoration = getTileLayerType(layer) === TileLayerType.Decoration;
        if (isDecoration) {
            layer = this.mapView.mapData.getFirstEmptyLayer(x, y, plane, firstDecorationLayerIndex);
        } else {
            changes.push(...getChangesToClearTilesToMakeWayForGroundTile(this.currentMapStore, tileAssetId, x, y, plane, layer));
        }

        const position = { x, y, layer, plane };

        changes.push({
            position,
            newData: {
                ...getEmptyChangeableTileDataSnapshot(),
                tileAssetId
            }
        });

        undoableMapEditorSetAndSelectTiles(
            this.currentMapStore,
            plane,
            changes,
            position
        );
    }

    protected addDynamicMapElement(dynamicMapElement: DynamicMapElementModel<any>) {
        groupUndoableMapEditorDynamicMapElementChanges(DynamicMapElementChangeGroup.Create, () => {
            this.currentMapStore.currentMap.addDynamicMapElement(dynamicMapElement);
        }, [new SelectTileSideEffect(this.mapEditorStore, dynamicMapElement.position)]);
    }

    private handlePointerDownSingleSelect(e: InteractionEvent) {
        if (!(this.mapEditorStore.selectedTool == EditorToolType.SingleSelect)) return;
        const pointerTilePosition = worldToTilePosition(this.mapView.toLocal(e.data.global));
        const pointerTileData = this.mapView.mapData.getTilesOnPlaneWithXYOverlap(pointerTilePosition.x, pointerTilePosition.y, this.mapEditorStore.selectedPlane, sharedStore.getTileAsset);
        if (pointerTileData) {
            // selected a tile
            this.onPointerDownTilePositionSelection = new PositionModel({
                x: pointerTilePosition.x,
                y: pointerTilePosition.y,
                plane: this.mapEditorStore.selectedPlane
            });
            e.stopPropagation();
        }
    }

    private onPointerMove(e: InteractionEvent) {
        if (charEditorStore.selectedCharacterConfiguration)
            return;

        const didScroll = this.editorMapScrollController.scroll(e);
        if (!didScroll) {
            this.editorMapZoomController.pinch(e, this.mapView.toLocal(e.data.global));
        }

        if (!isMouseMove(e))
            return;

        if (this.mapEditorStore.selectedTool == EditorToolType.PlaceAsset) {
            const { global } = e.data;
            const { x, y } = this.mapView.getTilePosition(global);

            if (this.isDragPlacing && ((this.lastTileAssetPlacementX !== x) || (this.lastTileAssetPlacementY !== y))) {
                let shouldSkip = false;

                const { selectedTileAssetId } = this.mapEditorStore.placementSelection;
                if (selectedTileAssetId) {
                    const tileAsset = sharedStore.getTileAsset(selectedTileAssetId);
                    const diffX = Math.abs(this.lastTileAssetPlacementX - x);
                    const diffY = Math.abs(this.lastTileAssetPlacementY - y);
                    shouldSkip = (diffX < tileAsset.size.x) && (diffY < tileAsset.size.y);
                }

                if (!shouldSkip) {
                    this.placeTileAsset(x, y);
                }
            }

            this.placementPreview.visible = true;
            this.placementPreview.x = tileToWorldPositionX(x, y);
            this.placementPreview.y = tileToWorldPositionY(x, y);
        }

        this.showMouseDebugInfo(e.data.global);
    }

    private showMouseDebugInfo(screenMousePosition: Point) {
        if (!localSettingsStore.showDebugInfo) {
            this.mapViewContainer.removeChild(this.debugTileInfo);
            return;
        }
        this.mapViewContainer.addChild(this.debugTileInfo);

        this.debugTileInfo.update(this.mapView, screenMousePosition, this.mapEditorStore.selectedPlane);
    }

    private onPointerUp(e: InteractionEvent) {
        this.editorMapScrollController.reset();
        this.editorMapZoomController.reset();

        e.data.originalEvent.preventDefault();

        this.isDragPlacing = false;

        if (this.handlePointerUpSelectedTileData(e)) return;

        /*
        if (getEventMouseButton(e) == MouseButton.Right && !this.editorMapScrollController.didJustScroll()) {
            const { x, y } = this.mapView.getTile(e.data.global);
            const { selectedLayer, selectedPlane } = this.mapEditorStore;
            // Desktop only: Delete tile on right click
            undoableMapEditorSetTile(x, y, selectedLayer, selectedPlane, null);
        }
        */

        this.resetOnPointerDownCache();
    }

    private handlePointerUpSelectedTileData(e: InteractionEvent): boolean {
        if (this.onPointerDownTilePositionSelection) {
            // handle tile selection
            const pointerTilePosition = worldToTilePosition(this.mapView.toLocal(e.data.global));
            if (this.onPointerDownTilePositionSelection.x === pointerTilePosition.x && this.onPointerDownTilePositionSelection.y === pointerTilePosition.y
                && this.onPointerDownTilePositionSelection.plane === this.mapEditorStore.selectedPlane) {
                const pointerTileData = this.mapView.mapData.getTilesOnPlaneWithXYOverlap(pointerTilePosition.x, pointerTilePosition.y, this.mapEditorStore.selectedPlane, sharedStore.getTileAsset);
                if (pointerTileData) {
                    // pointer up over 'pointer down tile position'
                    e.stopPropagation();
                    this.selectTileData(this.onPointerDownTilePositionSelection);
                    this.resetOnPointerDownCache();
                    return true;
                }
            }
        }
        return false;
    }

    protected selectTileData(tile: PositionModel) {
        undoableMapEditorSelectTile(tile, this.mapEditorStore, false);
    }

    private onPointerOut(e: InteractionEvent) {
        this.resetOnPointerDownCache();
        this.isDragPlacing = false;
    }

    private resetOnPointerDownCache() {
        this.onPointerDownTilePositionSelection = null;
    }

    private onWheel(e: WheelEvent) {
        this.mapEditorStore.mapState.setMapCenter(this.mapViewContainer.position.x, this.mapViewContainer.position.y, this.mapViewContainer.scale.x);
        e.preventDefault();
        e.stopPropagation();
        const data = getInteractionManagerFromApplication(this.app).eventData.data;

        if (data) {
            this.editorMapZoomController.wheelZoom(e, this.mapView.toLocal(data.global));
        }
    }

    public onToolChanged() {
        if (this.mapEditorStore.selectedTool != EditorToolType.PlaceAsset) {
            this.placementPreview.visible = false;
        }
    }

    public onSelectedHeightPlaneChanged() {
        const { selectedPlane } = this.mapEditorStore;
        this.placementPreview.setHeightPlane(selectedPlane);
    }

    public onPlacementSelectionChanged() {
        const { placementSelection } = this.mapEditorStore;
        const { selectedTileAssetId, selectedCharacterId, selectedAnimationName, selectedOtherElement, areaTriggerId } = placementSelection;

        if (selectedTileAssetId) {
            const tileAsset = sharedStore.getTileAsset(selectedTileAssetId);
            this.placementPreview.setTilePreview(selectedTileAssetId, tileAsset?.imageProperties(TileImageUsage.Background), tileAsset?.imageProperties(TileImageUsage.Foreground));
        } else if (selectedCharacterId != null) {
            this.placementPreview.setCharacterPreview(selectedCharacterId);
        } else if (selectedAnimationName != null) {
            this.placementPreview.setAnimationPreview(selectedAnimationName);
        } else if (selectedOtherElement != null) {
            switch (selectedOtherElement) {
                case OtherPlacementElement.AreaTrigger:
                    this.placementPreview.setAreaTrigger(areaTriggerId || "");
                    break;

                case OtherPlacementElement.MapMarker:
                    this.placementPreview.setMapMarker("");
                    break;

                case OtherPlacementElement.StartMarker:
                    this.placementPreview.setMapMarker(gameConstants.mapStartMarker);
                    break;

                case OtherPlacementElement.DebugStartMarker:
                    this.placementPreview.setDebugStartMarker();
                    break;

                default:
                    throw new Error("Not implemented: " + OtherPlacementElement[selectedOtherElement]);
            }
        } else {
            this.placementPreview.clear();
        }
    }

    public onRefreshTileHighlight() {
        const { selectedTilePosition } = this.mapEditorStore;
        if (selectedTilePosition && !this.mapEditorStore.showGamePreview) {
            const { x, y } = selectedTilePosition;
            this.tileHighlight.x = tileToWorldPositionX(x, y);
            this.tileHighlight.y = tileToWorldPositionY(x, y);
            this.tileHighlight.visible = true;

            if (this.mapEditorStore.ignoreHeightPlanes) {
                this.tileHighlight.alpha = 1;
            } else {
                const sameHeightPlane = this.mapEditorStore.selectedPlane === this.mapEditorStore.selectedTilePosition.plane;
                this.tileHighlight.alpha = sameHeightPlane ? 1.0 : UiConstants.ALPHA_WRONG_HEIGHT_PLANE;
            }
        } else {
            this.tileHighlight.visible = false;
        }
    }

    public onRefreshTileOriginLineDisplay() {
        const { selectedTilePosition } = this.mapEditorStore;
        if (selectedTilePosition && this.mapEditorStore.showConflictResolutionOriginLines) {
            this.tileOriginLineDisplay.visible = true;
            this.tileOriginLineDisplay.clear();
            for (const tileData of this.mapEditorStore.selectedTileDataForOriginLineDisplay) {
                if (tileData === this.mapEditorStore.hoveredConflictResolutionOriginTileData) {
                    this.tileOriginLineDisplay.lineStyle({ width: 2, color: 0xFFFF00 });
                } else {
                    this.tileOriginLineDisplay.lineStyle({ width: 2, color: 0x00FF00 });
                }
                this.tileOriginLineDisplay.drawTileData(tileData, false);
            }
        } else {
            this.tileOriginLineDisplay.visible = false;
        }
    }

    public outputDebugDataForSelection() {
        if (!this.mapEditorStore.hasSelectedTile)
            return;

        for (const tileData of this.mapEditorStore.selectedTileDataWithXYOverlap) {
            const tileViewBundle = this.mapView.getTileViewBundle(tileData);
            if (tileViewBundle) {
                tileViewBundle.outputDebugData();
            }
        }
    }

    public onAttached() {
        this.resize();

        window.addEventListener('resize', this.resize);

        if (this.moveToCenterOfMapAfterAttaching) {
            this.moveToCenterOfMap();
        }
    }

    public onDetached() {
        window.removeEventListener('resize', this.resize);
    }

    private resize() {
        const { parentElement } = this.app.view;
        const { clientWidth, clientHeight } = parentElement;

        this.app.renderer.resize(clientWidth, clientHeight);
        this.mapEditorStore.setCanvasSize(clientWidth, clientHeight);
    }
}

let editorMapViewer: EditorMapViewer;

export function createEditorMapViewer() {
    if (editorMapViewer)
        return;

    editorMapViewer = new EditorMapViewer();
    editorMapViewer.initialize();
}

export function getEditorMapViewer() {
    return editorMapViewer;
}

export function disposeEditorMapViewer() {
    if (editorMapViewer) {
        editorMapViewer.dispose();
        editorMapViewer = null;
    }
}

if (module.hot) {
    const { data } = module.hot;
    if (data && data.parent) {
        createEditorMapViewer();
        editorMapViewer.attach(data.parent);
    }

    module.hot.dispose(data => {
        if (editorMapViewer) {
            data.parent = editorMapViewer.parentElement;
            disposeEditorMapViewer();
        }
    });
}
