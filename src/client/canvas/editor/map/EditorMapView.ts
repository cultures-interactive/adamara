import { Group } from "@pixi/layers";
import { Container } from "pixi.js";
import { MapDataModel } from "../../../../shared/game/MapDataModel";
import { MapViewBase } from "../../shared/map/MapViewBase";
import { EditorTileView } from "./EditorTileView";
import { MapRelatedStore } from "../../../stores/MapRelatedStore";
import { DynamicMapElementNPCInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { EditorNpcView } from "./EditorNpcView";
import { DynamicMapElementAnimationElementInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel";
import { EditorAnimationElementView } from "./EditorAnimationElementView";
import { DynamicMapElementAreaTriggerModel } from "../../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { DynamicMapElementMapMarkerModel } from "../../../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel";
import { MapMarkerView } from "./MapMarkerView";
import { AreaTriggerView } from "./AreaTriggerView";
import { adjustMapElementContainerViewMap } from "../../../helper/pixiHelpers";
import { TileDataInterface } from "../../../../shared/game/TileDataModel";
import { TileAssetModel, TileImageUsage } from "../../../../shared/resources/TileAssetModel";
import { autoDisposeOnDisplayObjectRemovedArray, RecreateReactionsFunction } from "../../../helper/ReactionDisposerGroup";
import { MapWalker } from "../../../interaction/path/MapWalker";
import { DebugStartMarkerView } from "./DebugStartMarkerView";
import { ApplicationReference } from "../../shared/ApplicationReference";
import { gameStore } from "../../../stores/GameStore";
import { CurrentMapStore } from "../../../stores/CurrentMapStore";

export class EditorMapView extends MapViewBase<MapDataModel, EditorTileView, EditorNpcView, EditorAnimationElementView> {
    private recreateOnMapChangeReactions: RecreateReactionsFunction;
    private areaTriggerViews = new Map<DynamicMapElementAreaTriggerModel, AreaTriggerView>();
    private mapMarkerViews = new Map<DynamicMapElementMapMarkerModel, MapMarkerView>();
    private debugStartMarkerView = new Map<DynamicMapElementMapMarkerModel, DebugStartMarkerView>();

    private _mapWalker: MapWalker<MapDataModel, EditorMapView>;

    public constructor(
        appRef: ApplicationReference,
        mapData: MapDataModel,
        private textGroup: Group,
        private mapRelatedStore: MapRelatedStore,
        private currentMapStore: CurrentMapStore,
        private overlayContainer: Container = null
    ) {
        super(appRef, true);

        this.recreateOnMapChangeReactions = autoDisposeOnDisplayObjectRemovedArray(this, [
            ...this.baseMapChangeCallbacks,
            this.refreshAreaTriggers,
            this.refreshMapMarkers,
            this.refreshMapWalker,
            this.refreshDebugStartMarker
        ], true);

        this.initialize(mapData);
    }

    private refreshAreaTriggers() {
        if (!this.mapData)
            return;

        adjustMapElementContainerViewMap(
            this.addChildToContentContainer,
            this.mapData.areaTriggers,
            this.areaTriggerViews,
            data => new AreaTriggerView(this.mapRelatedStore, data, this.textGroup)
        );
    }

    private refreshMapMarkers() {
        if (!this.mapData)
            return;

        adjustMapElementContainerViewMap(
            this.addChildToContentContainer,
            this.mapData.mapMarkers,
            this.mapMarkerViews,
            data => new MapMarkerView(this.mapRelatedStore, data, this.textGroup)
        );
    }

    private refreshDebugStartMarker() {
        if (!this.mapData)
            return;

        const debugStartMarker = [];
        if (gameStore.debugStartMarker && gameStore.debugStartMarkerMapId === this.currentMapStore?.currentMapId)
            debugStartMarker.push(gameStore.debugStartMarker);

        adjustMapElementContainerViewMap(
            this.addChildToContentContainer,
            debugStartMarker,
            this.debugStartMarkerView,
            (_) => new DebugStartMarkerView(this.mapRelatedStore, this.textGroup)
        );
    }

    private refreshMapWalker() {
        if (!this.mapData) {
            this._mapWalker = null;
            return;
        }

        this._mapWalker = new MapWalker(this);
    }

    protected onMapDataChanged() {
        this.recreateOnMapChangeReactions();
    }

    public get mapWalker() {
        return this._mapWalker;
    }

    protected createTileView(tileData: TileDataInterface, tileAssetData: TileAssetModel, tileImageUsage: TileImageUsage) {
        return new EditorTileView(tileData, tileAssetData, tileImageUsage, this.water, this.mapRelatedStore);
    }

    protected createNpcView(data: DynamicMapElementNPCInterface) {
        return new EditorNpcView(this.mapRelatedStore, data, this.overlayContainer);
    }

    protected createAnimationElementView(data: DynamicMapElementAnimationElementInterface) {
        return new EditorAnimationElementView(this.mapRelatedStore, data);
    }
}