import { ReadonlyMapData } from "../../../../shared/game/MapDataModel";
import { MapViewBase } from "../../shared/map/MapViewBase";
import { GameTileView } from "./GameTileView";
import { Container } from "pixi.js";
import { GameNpcView } from "./GameNpcView";
import { DynamicMapElementNPCInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { DynamicMapElementAnimationElementInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel";
import { GameAnimationElementView } from "./GameAnimationElementView";
import { wrapIterator } from "../../../../shared/helper/IterableIteratorWrapper";
import { autoDisposeOnDisplayObjectRemoved, RecreateReactionsFunction } from "../../../helper/ReactionDisposerGroup";
import { TaskMarkerWithColor } from "./TaskMarkerWithColor";
import { GameInteractionTrigger } from "./GameInteractionTrigger";
import { resolvePotentialMapElementTreeParameter } from "../../../helper/treeParameterHelpers";
import { DynamicMapElementModel } from "../../../../shared/game/dynamicMapElements/DynamicMapElement";
import { ReadonlyDynamicMapElementAreaTrigger } from "../../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { TileDataInterface } from "../../../../shared/game/TileDataModel";
import { TileAssetModel, TileImageUsage } from "../../../../shared/resources/TileAssetModel";
import { PathFinder } from "../../../interaction/path/PathFinder";
import { InteractionTriggerActionModel } from "../../../../shared/action/ActionModel";
import { ApplicationReference } from "../../shared/ApplicationReference";
import { gameStore } from "../../../stores/GameStore";

export class GameMapView extends MapViewBase<ReadonlyMapData, GameTileView, GameNpcView, GameAnimationElementView> {
    private readonly recreateGameStoreReactions: RecreateReactionsFunction;

    protected _pathfinder: PathFinder<ReadonlyMapData, this>;

    public constructor(
        appRef: ApplicationReference,
        mapData: ReadonlyMapData,
        private characterOverlayContainer: Container,
        private interactionTriggerOverlay: Container,
        private appDisposed: () => boolean
    ) {
        super(appRef, false);

        this.recreateGameStoreReactions = autoDisposeOnDisplayObjectRemoved(this, autoDisposingAutorun => {
            autoDisposingAutorun(this.refreshInteractionTriggers.bind(this)); // to refresh when the active tasks change in player state
        });

        this.initialize(mapData);
    }

    public get npcViewsArray() {
        return Array.from(this.npcViews.values());
    }

    public get animationElementViewsArray() {
        return Array.from(this.animationElementViews.values());
    }

    public get interactionTriggersArray() {
        const array = new Array<GameInteractionTrigger>();

        for (const npcView of this.npcViews.values()) {
            if (npcView.interactionTrigger)
                array.push(npcView.interactionTrigger);
        }

        for (const animationElementView of this.animationElementViews.values()) {
            if (animationElementView.interactionTrigger)
                array.push(animationElementView.interactionTrigger);
        }

        for (const tileViewBundle of this.tileViewBundles.values()) {
            for (const tileView of tileViewBundle.tileViews) {
                if (tileView.interactionTrigger)
                    array.push(tileView.interactionTrigger);
            }
        }

        return array;
    }

    public get pathfinder() {
        return this._pathfinder;
    }

    protected onMapDataChanged() {
        for (const callback of this.baseMapChangeCallbacks) {
            callback.call(this);
        }

        this.refreshPathfinder();
        this.recreateGameStoreReactions();
    }

    protected createTileView(tileData: TileDataInterface, tileAssetData: TileAssetModel, tileImageUsage: TileImageUsage) {
        return new GameTileView(tileData, tileAssetData, tileImageUsage, this.water, this.interactionTriggerOverlay);
    }

    protected createNpcView(data: DynamicMapElementNPCInterface) {
        return new GameNpcView(data, this.characterOverlayContainer, this.appDisposed, this.interactionTriggerOverlay);
    }

    protected createAnimationElementView(data: DynamicMapElementAnimationElementInterface) {
        return new GameAnimationElementView(data, this.appDisposed, this.interactionTriggerOverlay);
    }

    public shakeX(value: number) {
        this.x = value;
    }

    private refreshPathfinder() {
        this._pathfinder = new PathFinder(this);
    }

    private refreshInteractionTriggers() {
        if (!gameStore.gameEngine)
            return;

        const { gameState } = gameStore.gameEngine;

        const shownInteractionTriggers = new Set<GameInteractionTrigger>();

        for (const triggerId of gameState.activeTriggerActions) {
            const triggerAction = gameStore.gameEngine.getCachedActionNode(triggerId);
            if (!(triggerAction instanceof InteractionTriggerActionModel))
                continue;

            const triggerTarget = resolvePotentialMapElementTreeParameter(triggerAction.triggerElement, "actions/InteractionTriggerValueModel", triggerAction);
            if (!triggerTarget)
                continue;

            const triggerElement = this.interactionTriggersArray.find(t => t.$modelId === triggerTarget.elementId);
            triggerElement?.show(triggerAction.iconType);

            shownInteractionTriggers.add(triggerElement);
        }

        for (const triggerElement of this.interactionTriggersArray) {
            if (shownInteractionTriggers.has(triggerElement))
                continue;

            triggerElement.hide();
        }
    }

    public getTaskMarkerOnCurrentMap() {
        const { gameState, rootActionTree } = gameStore.gameEngine;
        const activeLocationTasks = wrapIterator(gameState.playerQuestLogTasks.keys()).map(taskId => rootActionTree.taskForId(taskId)).filter(task => task.isTaskWithLocation());

        return activeLocationTasks.map(task => {
            const mapElementReference = resolvePotentialMapElementTreeParameter(task.location, undefined, task);
            const elementId = mapElementReference.mapId === gameState.currentMap ? mapElementReference.elementId : gameState.findTransitionToMap(mapElementReference.mapId, rootActionTree)?.elementId;
            let mapElement = this.mapData.dynamicMapElements.find(marker => marker instanceof ReadonlyDynamicMapElementAreaTrigger ? marker.id === elementId : (marker as DynamicMapElementModel<any>).$modelId === elementId);

            // See if its a deco tile with an interaction trigger
            if (!mapElement && mapElementReference.mapId === gameState.currentMap) {
                const tilesWithInteractionTrigger = this.mapData.interactionTriggerTiles;
                const locationTaskTile = tilesWithInteractionTrigger.find(t => t.interactionTriggerData.$modelId === mapElementReference.elementId);
                if (locationTaskTile) {
                    const locationTaskTileMapElement = {
                        position: locationTaskTile.position,
                        createReadOnlyVersion: () => locationTaskTileMapElement
                    };
                    mapElement = locationTaskTileMapElement;
                }
            }

            if (!mapElement)
                return null;

            return new TaskMarkerWithColor(mapElement, gameState.playerQuestLogTasks.get(task.$modelId));
        }).filter(task => !!task);
    }
}