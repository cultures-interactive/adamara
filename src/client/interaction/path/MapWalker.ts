import { MapDataInterface } from "../../../shared/game/MapDataModel";
import { Direction, DirectionHelper } from "../../../shared/resources/DirectionHelper";
import { PositionInterface, ReadonlyPosition } from "../../../shared/game/PositionModel";
import { TileDataInterface } from "../../../shared/game/TileDataModel";
import { PlaneTransitModel } from "../../../shared/resources/PlaneTransitModel";
import { MapViewBaseDefaultsWithMapData } from "../../canvas/shared/map/MapViewBase";
import { TileLayerType } from "../../../shared/resources/TileLayerType";
import { sharedStore } from "../../stores/SharedStore";

/**
 * A transition counterpart to a {@link PlaneTransitModel} that is contained in {@link MapDataModel}.
 */
export interface VirtualTransition {
    position: PositionInterface;
    transit: PlaneTransitModel;
}

/**
 * This class can be used to find out if the player can "walk" from one {@link PositionInterface}
 * in a direction. It parses the {@link MapDataModel} and creates and holds a link of {@link VirtualTransition}s.
 */
export class MapWalker<MapData extends MapDataInterface, MapView extends MapViewBaseDefaultsWithMapData<MapData>> {

    private readonly mapData: MapData;
    private readonly mapView: MapView;
    private readonly virtualTransitions = Array<VirtualTransition>();

    /**
     * Creates a new instance.
     * @param mapView The base map view.
     */
    public constructor(mapView: MapView) {
        this.mapData = mapView.mapData;
        this.mapView = mapView;
        this.initVirtualTransitions();
    }

    /**
     * Loops over all tiles and create {@link VirtualTransition} from {@link PlaneTransitModel}.
     * Adds the transitions to the private field.
     */
    private initVirtualTransitions() {
        if (!this.mapData)
            return;

        for (const tileData of this.mapData.tiles) {
            const planeTransit = sharedStore.getTileAsset(tileData.tileAssetId)?.planeTransit;
            if (planeTransit?.isInitialized()) {
                const targetPosition = new ReadonlyPosition({
                    x: tileData.position.x + planeTransit.targetXOffset,
                    y: tileData.position.y + planeTransit.targetYOffset,
                    plane: tileData.position.plane + planeTransit.heightDifference
                });
                this.virtualTransitions.push({ position: targetPosition, transit: planeTransit.createCounterPart() });
            }
        }
    }

    /**
     * Returns a {@link VirtualTransition} from the assigned {@link PositionInterface}
     * @param position - The position for the search (ignoring layer).
     * @return The {@link VirtualTransition} or null.
     */
    public findVirtualTransition(position: PositionInterface): VirtualTransition {
        return this.virtualTransitions.find(element => element.position.x == position.x && element.position.y == position.y && element.position.plane == position.plane);
    }

    /**
     * Returns a {@link VirtualTransition} from the assigned tileX and tileY position ignoring the plane position.
     * @param tileX - The tile x position.
     * @param tileY - The tile y position.
     * @return The {@link VirtualTransition} or null.
     */
    public findVirtualTransitionIgnorePlane(tileX: number, tileY: number): VirtualTransition {
        return this.virtualTransitions.find(element => element.position.x == tileX && element.position.y == tileY);
    }

    /**
     * Gets the neighbour {@link PositionInterface} of the assigned start {@link PositionInterface} in
     * the assigned {@link Direction}. Considers {@link PlaneTransitModel}s and {@link VirtualTransition}s
     * to find neighbours. Does not check for blocking.
     * @param startPosition The start position.
     * @param neighbourDirection The direction to get the neighbour from.
     * @param cachedStartTileData Optional cached tile data of the start position (for performance)
     * @return The neighbour position.
     */
    private getNeighbour(startPosition: PositionInterface, neighbourDirection: Direction, cachedStartTileData: TileDataInterface[] = null): PositionInterface {
        const startTileData = (cachedStartTileData == null) ? this.mapData.getTilesOnPlaneWithXYOverlap(startPosition.x, startPosition.y, startPosition.plane, sharedStore.getTileAsset) : cachedStartTileData;
        // check for special case: transition
        const planeTransit = MapWalker.findFirstTransitModel(startTileData);
        if (planeTransit != null && planeTransit.direction == neighbourDirection) {
            // return the position the transition is pointing to
            return startPosition.copyWithAppliedTransition(planeTransit);
        }
        // check for special case: virtual transition
        const virtualTransition = this.findVirtualTransition(startPosition);
        if (virtualTransition != null && virtualTransition.transit.direction == neighbourDirection) {
            // return the position the virtual transition is pointing to
            return startPosition.copyWithAppliedTransition(virtualTransition.transit);
        }
        const neighbourOffset = DirectionHelper.getTileOffset(neighbourDirection);
        return new ReadonlyPosition({
            x: startPosition.x + neighbourOffset.x,
            y: startPosition.y + neighbourOffset.y,
            plane: startPosition.plane
        });
    }

    /**
     * Returns the {@link PositionInterface} of the {@link Direction} to walk considering {@link PlaneTransitModel}s
     * and {@link VirtualTransition}s that are on the map. Returns null if the player can not walk in this direction.
     * @param currentTilePosition The base position to check for blocks (note: the layer is ignored).
     * @param walkDirection The direction to check for blocks.
     * @param checkIfTargetBlocks Checks if the neighbour does block.
     * @param ignoreViewBoundsCheck Also considers tiles that are not in the viewport if true is assigned.
     * @param ignoreBlockingCharacters Ignores blocking characters if true is assigned.
     * @return The target {@link PositionInterface} or null.
     */
    public canCrossTile(currentTilePosition: PositionInterface, walkDirection: Direction, checkIfTargetBlocks = true, ignoreViewBoundsCheck = false, ignoreBlockingCharacters = false): PositionInterface {
        //  grid positions that are out of the viewport are blocking.
        if (!ignoreViewBoundsCheck && !this.mapView.isTileCenterInViewBounds(currentTilePosition.x, currentTilePosition.y)) return null;

        const currentTileData = this.mapData.getTilesOnPlaneWithXYOverlap(currentTilePosition.x, currentTilePosition.y, currentTilePosition.plane, sharedStore.getTileAsset);

        const currentTransition = MapWalker.findFirstTransitModel(currentTileData);
        if (currentTransition && !DirectionHelper.isSameOrOpposite(currentTransition.direction, walkDirection)) return null; // transitions can only be crossed in their direction and opposite direction.

        const virtualTransition = this.findVirtualTransition(currentTilePosition);
        if (virtualTransition && !DirectionHelper.isSameOrOpposite(virtualTransition.transit.direction, walkDirection)) return null; // virtual transitions can only be crossed in their direction and opposite direction.

        const ignoreEmptyLayerCondition = virtualTransition != undefined; // virtual transitions can be walked without any layers

        // checking the blocking conditions of the layers...
        const { x, y, plane } = currentTilePosition;
        if (MapWalker.isTileBlocking(x, y, plane, currentTileData, walkDirection, ignoreEmptyLayerCondition)) return null;

        // special case crossing a corner
        if (this.isCornerBlocking(currentTilePosition, walkDirection, ignoreEmptyLayerCondition)) return null;

        const targetTilePosition = this.getNeighbour(currentTilePosition, walkDirection, currentTileData);

        const npcOnTargetTile = this.mapView.findNPC(targetTilePosition.x, targetTilePosition.y);
        if (npcOnTargetTile && !ignoreBlockingCharacters && npcOnTargetTile.isBlocking) {
            return null;
        }

        if (checkIfTargetBlocks) {
            // check if the entrance to the neighbour does block.
            const oppositeDirection = DirectionHelper.getOpposite(walkDirection);
            if (this.canCrossTile(targetTilePosition, oppositeDirection, false, ignoreViewBoundsCheck, ignoreBlockingCharacters) == null) {
                return null;
            }
        }

        return targetTilePosition;
    }

    /**
     * Returns true if the assigned walk direction is pointing to a corner and this corner is blocking.
     * The method checks if the neighbours are blocking.
     * @param currentPosition The current tile position.
     * @param walkingDirection The walking direction.
     * @param ignoreEmptyLayerCondition Also considers tiles that are not in the viewport if true is assigned.
     */
    private isCornerBlocking(currentPosition: PositionInterface, walkingDirection: Direction, ignoreEmptyLayerCondition: boolean): boolean {
        const directionComponents = DirectionHelper.getComponents(walkingDirection);
        if (!directionComponents) return false; // is not crossing a corner.
        const neighbourOffset1 = DirectionHelper.getTileOffset(directionComponents[0]);
        const neighbourOffset2 = DirectionHelper.getTileOffset(directionComponents[1]);
        const cornerDirection1 = DirectionHelper.getNeighbourDirectionByVector(neighbourOffset1, neighbourOffset2);
        const cornerDirection2 = DirectionHelper.getNeighbourDirectionByVector(neighbourOffset2, neighbourOffset1);

        const { plane } = currentPosition;
        const x1 = currentPosition.x + neighbourOffset1.x;
        const y1 = currentPosition.y + neighbourOffset1.y;
        const tileData1 = this.mapData.getTilesOnPlaneWithXYOverlap(x1, y1, plane, sharedStore.getTileAsset);
        if (MapWalker.isTileBlocking(x1, y1, plane, tileData1, cornerDirection1, ignoreEmptyLayerCondition))
            return true;

        const x2 = currentPosition.x + neighbourOffset2.x;
        const y2 = currentPosition.y + neighbourOffset2.y;
        const tileData2 = this.mapData.getTilesOnPlaneWithXYOverlap(x2, y2, plane, sharedStore.getTileAsset);
        if (MapWalker.isTileBlocking(x2, y2, plane, tileData2, cornerDirection2, ignoreEmptyLayerCondition))
            return true;

        return false;
    }

    /**
     * Returns true if the assigned array of {@link TileDataInterface} contains layers
     * that block in the assigned {@link Direction}.
     * @param currentTileData The tile data to use.
     * @param walkDirection The direction to check.
     * @param ignoreEmptyLayerCondition If true: Ignores if there is a ground layer or the {@link TileDataInterface} is empty.
     */
    private static isTileBlocking(tileX: number, tileY: number, tilePlane: number, currentTileData: TileDataInterface[], walkDirection: Direction, ignoreEmptyLayerCondition = false): boolean {
        // grid positions without tiles are blocking
        if (currentTileData.length == 0 && !ignoreEmptyLayerCondition) return true;

        // check all assets of the layers
        let foundGroundLayer: boolean;
        for (const layeredTile of currentTileData) {
            if (layeredTile.position.plane !== tilePlane)
                throw new Error("All currentTileData have to be on the same plane as tilePlane");

            const tileAsset = sharedStore.getTileAsset(layeredTile.tileAssetId);
            const offsetX = tileX - layeredTile.position.x;
            const offsetY = tileY - layeredTile.position.y;

            if (!tileAsset || tileAsset.isBlockedAtOffset(walkDirection, offsetX, offsetY))
                return true;

            if (tileAsset.layerType == TileLayerType.Ground)
                foundGroundLayer = true;
        }
        if (!foundGroundLayer && !ignoreEmptyLayerCondition) return true; // tiles without a ground are blocking

        return false;
    }

    /**
     * Searches in the assigned {@link TileDataInterface}s for a {@link PlaneTransitModel}
     * returns the first or null.
     * @param dataModels The models to search in.
     * @return The first transit model or null.
     */
    private static findFirstTransitModel(dataModels: TileDataInterface[]): PlaneTransitModel {
        for (const dataModel of dataModels) {
            const planeTransit = sharedStore.getTileAsset(dataModel.tileAssetId)?.planeTransit;
            if (planeTransit?.isInitialized()) return planeTransit;
        }
        return null;
    }


    public hasBlockingNPC(tilePosition: PositionInterface): boolean {
        if (!tilePosition) return false;
        const npc = this.mapView.findNPC(tilePosition.x, tilePosition.y);
        return npc && npc.isBlocking;
    }

}
