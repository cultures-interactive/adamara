///<reference types="webpack-env" />
import { InteractionEvent, Point } from "pixi.js";
import { DynamicMapElementInterface, DynamicMapElementModel } from "../../../../../shared/game/dynamicMapElements/DynamicMapElement";
import { PositionModel } from "../../../../../shared/game/PositionModel";
import { EditorMapViewer } from "../../../../canvas/editor/EditorMapViewer";
import { centerContainer, tileToWorldPositionX, tileToWorldPositionY } from "../../../../helper/pixiHelpers";
import { selectorMapEditorStore } from "../../../../stores/MapEditorStore";
import { undoableMapEditorSelectTile } from "../../../../stores/undo/operation/MapEditorEntitySelectionOp";
import { ActionMapEditorPlaceAssetSideEffect, DynamicMapElementChangeGroup, groupUndoableMapEditorDynamicMapElementChanges, SelectTileSideEffect } from "../../../../stores/undo/operation/MapEditorSubmitCurrentMapDynamicMapElementsChangesOp";
import { TileHasSelectableElementHighlight } from "../../../../canvas/editor/map/TileHasSelectableElementHighlight";
import { TileDataInterface } from "../../../../../shared/game/TileDataModel";
import { autorun, reaction, runInAction } from "mobx";

class ActionMapViewer extends EditorMapViewer {
    private allSelectableTileHighlights: Map<PositionModel, TileHasSelectableElementHighlight> = new Map();

    public constructor() {
        super(selectorMapEditorStore, false);

        this.refreshHighlights = this.refreshHighlights.bind(this);

        this.initialize();

        this.reactionDisposers.push(reaction(() => selectorMapEditorStore.selectorMapEditorOpenCounter, this.jumpToSelectionPosition.bind(this)));
        this.reactionDisposers.push(autorun(this.refreshHighlights.bind(this)));
    }

    protected selectTileData(tile: PositionModel) {
        undoableMapEditorSelectTile(tile, this.mapEditorStore, false);
    }

    private jumpToSelectionPosition() {
        if (selectorMapEditorStore.selectedTilePosition) {
            const { x, y } = selectorMapEditorStore.selectedTilePosition;

            centerContainer(this.mapViewContainer, new Point(tileToWorldPositionX(x, y, true), tileToWorldPositionY(x, y, true)), this.app.renderer.width, this.app.renderer.height);
            selectorMapEditorStore.mapState.setMapCenter(this.mapViewContainer.x, this.mapViewContainer.y, this.mapViewContainer.scale.x);
        }
    }

    protected refreshHighlights() {
        this.overlayContainer.removeChild(this.tileHighlight); // Remove tileHighlight and add it back at the end to have it draw on top

        for (const tileHighlight of this.allSelectableTileHighlights.values()) {
            tileHighlight.destroy();
        }
        this.allSelectableTileHighlights.clear();

        const elementPositions = new Array<PositionModel>();
        const elements = new Set<DynamicMapElementInterface<any>>();
        const interactionTiles = new Set<TileDataInterface>();

        const { currentMap } = this.currentMapStore;
        for (const elementId of selectorMapEditorStore.selectableDynamicMapElements) {
            const mapElement = currentMap.getDynamicMapElementByModelId(elementId);
            if (mapElement) {
                elementPositions.push(mapElement.position);
                elements.add(mapElement);
                continue;
            }

            const interactionTriggerTileData = currentMap.interactionTriggerTiles.find(tile => tile.interactionTriggerData.$modelId === elementId);
            if (interactionTriggerTileData) {
                elementPositions.push(interactionTriggerTileData.position);
                interactionTiles.add(interactionTriggerTileData);
                continue;
            }

            const areaTriggers = currentMap.areaTriggers.filter(areaTrigger => areaTrigger.id === elementId);
            for (const areaTrigger of areaTriggers) {
                elementPositions.push(areaTrigger.position);
                elements.add(areaTrigger);
            }

            const npcsWithViewAreaTriggers = currentMap.npcs.filter(npc => npc.viewAreaTriggers.some(viewAreaTrigger => viewAreaTrigger.name === elementId));
            for (const npc of npcsWithViewAreaTriggers) {
                elements.add(npc);
                elementPositions.push(npc.position);
            }

            if ((areaTriggers.length > 0) || (npcsWithViewAreaTriggers.length > 0))
                continue;
        }

        for (const position of elementPositions) {
            if (position == null || this.allSelectableTileHighlights.get(position))
                continue;

            const selectableTileHighlight = new TileHasSelectableElementHighlight(position);
            this.mapView.addChildToContentContainer(selectableTileHighlight);
            this.allSelectableTileHighlights.set(position, selectableTileHighlight);
        }

        this.overlayContainer.addChild(this.tileHighlight);

        runInAction(() => {
            this.mapEditorStore.setHighlightedElements(elements);
            this.mapEditorStore.setHighlightedTiles(interactionTiles);
        });
    }

    protected handlePointerDownPlaceAsset(e: InteractionEvent) {
        const { placementSelection } = this.mapEditorStore;
        if (!placementSelection.selectedOtherElement)
            return;

        super.handlePointerDownPlaceAsset(e);
    }

    protected addDynamicMapElement(dynamicMapElement: DynamicMapElementModel<any>) {
        groupUndoableMapEditorDynamicMapElementChanges(DynamicMapElementChangeGroup.Create, () => {
            this.currentMapStore.currentMap.addDynamicMapElement(dynamicMapElement);
        }, [
            new SelectTileSideEffect(this.mapEditorStore, dynamicMapElement.position),
            new ActionMapEditorPlaceAssetSideEffect(this.mapEditorStore)
        ]);
    }
}

let actionMapViewer: ActionMapViewer;

export function createActionMapViewer() {
    if (actionMapViewer)
        return;

    actionMapViewer = new ActionMapViewer();
}

export function getActionMapViewer() {
    return actionMapViewer;
}

export function disposeActionMapViewer() {
    if (actionMapViewer) {
        actionMapViewer.dispose();
        actionMapViewer = null;
    }
}

if (module.hot) {
    const { data } = module.hot;
    if (data && data.parent) {
        createActionMapViewer();
        actionMapViewer.attach(data.parent);
    }

    module.hot.dispose(data => {
        if (actionMapViewer) {
            data.parent = actionMapViewer.parentElement;
            disposeActionMapViewer();
        }
    });
}
