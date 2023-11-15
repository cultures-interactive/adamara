import { Container, IDestroyOptions, Point } from "pixi.js";
import { DynamicMapElementAnimationElementInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel";
import { DynamicMapElementNPCInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { MapDataInterface } from "../../../../shared/game/MapDataModel";
import { TileDataInterface } from "../../../../shared/game/TileDataModel";
import { TileAssetModel, TileImageUsage } from "../../../../shared/resources/TileAssetModel";
import { gameConstants } from "../../../data/gameConstants";
import { worldToTilePositionX, worldToTilePositionY, tileToWorldPositionX, tileToWorldPositionY, adjustViewMap, adjustMapElementContainerViewMap } from "../../../helper/pixiHelpers";
import { ApplicationReference } from "../ApplicationReference";
import { Culling } from "../optimization/Culling";
import { AnimationElementViewBase } from "./AnimationElementViewBase";
import { MapElementContainer } from "./sorting/MapElementContainer";
import { MapElementSorter } from "./sorting/MapElementSorter";
import { NpcViewBase } from "./NpcViewBase";
import { TileViewBase } from "./TileViewBase";
import { TileViewBundle } from "./TileViewBundle";
import { Water } from "./Water";

export type MapViewBaseDefaultsWithMapData<MapData extends MapDataInterface> = MapViewBase<MapData, TileViewBase, NpcViewBase, AnimationElementViewBase>;

export abstract class MapViewBase<MapData extends MapDataInterface, TileView extends TileViewBase, NpcView extends NpcViewBase, AnimationElementView extends AnimationElementViewBase> extends Container {
    private _mapData: MapData;
    protected contentContainer: Container;

    public appRef: ApplicationReference;

    public left = 0;
    public right = 0;
    public top = 0;
    public bottom = 0;

    private culling: Culling;
    private mapElementSorter: MapElementSorter;

    protected water: Water;
    protected tileViewBundles = new Map<TileDataInterface, TileViewBundle<TileView>>();
    protected npcViews = new Map<DynamicMapElementNPCInterface, NpcView>();
    protected animationElementViews = new Map<DynamicMapElementAnimationElementInterface, AnimationElementView>();

    protected baseMapChangeCallbacks = [
        this.refreshSize,
        this.refreshVisibility,
        this.refreshWater,
        this.refreshTiles,
        this.refreshNpcs,
        this.refreshAnimationElements
    ];

    protected constructor(appRef: ApplicationReference, isEditor: boolean) {
        super();

        this.appRef = appRef;

        this.createTileView = this.createTileView.bind(this);

        this.water = new Water(appRef);
        this.addChild(this.water);

        this.contentContainer = new Container();
        //this.contentContainer.sortableChildren = true;
        this.addChild(this.contentContainer);

        this.culling = new Culling(appRef, this.contentContainer);
        this.mapElementSorter = new MapElementSorter(appRef, this.contentContainer, isEditor);

        this.addChildToContentContainer = this.addChildToContentContainer.bind(this);
        this.createNpcView = this.createNpcView.bind(this);
        this.createAnimationElementView = this.createAnimationElementView.bind(this);

        this.interactiveChildren = false;
    }

    public destroy(options?: boolean | IDestroyOptions): void {
        // First destroy all tileViewBundles (which will also destroy the contained tiles, even though
        // those are in the contentContainer)
        for (const tileViewBundle of this.tileViewBundles.values()) {
            tileViewBundle.destroy();
        }
        this.tileViewBundles.clear();

        this.culling.destroy();
        this.mapElementSorter.destroy();

        // Then destroy everything else, including the contentContainer and its contents
        super.destroy(options);
    }

    protected initialize(mapData: MapData) {
        this.mapData = mapData;
    }

    public addChildToContentContainer(child: MapElementContainer) {
        this.contentContainer.addChild(child);
    }

    public get mapData() {
        return this._mapData;
    }

    public set mapData(mapData: MapData) {
        this._mapData = mapData;
        this.onMapDataChanged();
    }

    protected abstract onMapDataChanged(): void;

    private refreshVisibility() {
        this.visible = !!this.mapData;
    }

    private refreshWater() {
        if (!this.mapData)
            return;

        this.water.visible = this.mapData.properties.shouldShowWater;
    }

    private refreshSize() {
        if (!this.mapData || this.mapData.tiles.length == 0)
            return;

        this.left = this.mapData.tiles.reduce((a, b) => a.position.x < b.position.x ? a : b).position.x;
        this.right = this.mapData.tiles.reduce((a, b) => a.position.x > b.position.x ? a : b).position.x;
        this.top = this.mapData.tiles.reduce((a, b) => a.position.y < b.position.y ? a : b).position.y;
        this.bottom = this.mapData.tiles.reduce((a, b) => a.position.y > b.position.y ? a : b).position.y;
    }

    private refreshTiles() {
        if (!this.mapData)
            return;

        adjustViewMap(
            this.mapData.tiles,
            this.tileViewBundles,
            tileData => new TileViewBundle(tileData, this.mapData, this.createTileView),
            this.addChildToContentContainer,
            tileViewBundle => tileViewBundle.destroy()
        );
    }

    private refreshNpcs() {
        if (!this.mapData)
            return;

        adjustMapElementContainerViewMap(
            this.addChildToContentContainer,
            this.mapData.npcs,
            this.npcViews,
            this.createNpcView
        );
    }

    private refreshAnimationElements() {
        if (!this.mapData)
            return;

        adjustMapElementContainerViewMap(
            this.addChildToContentContainer,
            this.mapData.animationElements,
            this.animationElementViews,
            this.createAnimationElementView
        );
    }

    /**
     * Returns true if the assigned {@link Point} is in the view bounds of the app.
     * @param worldPosition The point to check in world coordinate system.
     * @return True if the point is in the view bounds.
     */
    public isPositionInViewBounds(worldPosition: Point): boolean {
        const { view } = this.appRef.required;
        const screenPosition = this.toGlobal(worldPosition);
        return screenPosition.x >= 0 && screenPosition.x <= view.width
            && screenPosition.y >= 0 && screenPosition.y <= view.height;
    }

    /**
     * Returns true if the tiles center position is in the view bounds of the app.
     * @param tileX The tile x position.
     * @param tileY The tile y position.
     * @return True if the tiles center position is in the view bounds.
     */
    public isTileCenterInViewBounds(tileX: number, tileY: number): boolean {
        const { tileWidth, tileHeight } = gameConstants;
        const tileCenterX = tileToWorldPositionX(tileX, tileY) + tileWidth / 2;
        const tileCenterY = tileToWorldPositionY(tileX, tileY) + tileHeight / 2;
        return this.isPositionInViewBounds(new Point(tileCenterX, tileCenterY));
    }

    /**
     * Gets the tile position to a global position, and also information about the highest tile found there.
     * @param global The global position (which is also the screen position)
     * @returns The x|y tile position clicked. "tileExists" to see whether an actual tile was found there.
     * "highestTilePlane" contains the plane of the highest tile that was found there, or undefined.
     */
    public getTilePosition(global: Point) {
        const local = this.toLocal(global);
        const x = worldToTilePositionX(local.x, local.y);
        const y = worldToTilePositionY(local.x, local.y);
        return { x, y };
    }

    public findNPC(tileX: number, tileY: number): NpcViewBase {
        for (const npc of this.npcViews.values()) {
            if (npc.baseTileX == tileX && npc.baseTileY == tileY) return npc;
        }
        return null;
    }

    public getTileViewBundle(tileDataInterface: TileDataInterface) {
        return this.tileViewBundles.get(tileDataInterface);
    }

    public get allNPCs() {
        return this.npcViews;
    }

    protected abstract createTileView(tileData: TileDataInterface, tileAssetData: TileAssetModel, tileImageUsage: TileImageUsage): TileView;

    protected abstract createNpcView(data: DynamicMapElementNPCInterface): NpcViewBase;

    protected abstract createAnimationElementView(data: DynamicMapElementAnimationElementInterface): AnimationElementViewBase;
}
