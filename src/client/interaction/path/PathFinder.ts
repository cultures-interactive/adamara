import { MapViewBaseDefaultsWithMapData } from "../../canvas/shared/map/MapViewBase";
import { MapWalker } from "./MapWalker";
import { PositionInterface, ReadonlyPosition } from "../../../shared/game/PositionModel";
import { DirectionHelper } from "../../../shared/resources/DirectionHelper";
import { MapDataInterface } from "../../../shared/game/MapDataModel";
import { sharedStore } from "../../stores/SharedStore";

/**
 * A used to track the path.
 */
export interface PathNode {
    position: PositionInterface;
    parent?: PathNode;
}

// Another exit condition for the pathfinder.
const MaxSearchIterations = 10000;

/**
 * Class to find paths between two {@link PositionInterface}s on a {@link MapViewBase}.
 * Uses a BreadthFirst search algorithm implementation.
 * See the {@see findPath} method documentation.
 */
export class PathFinder<MapData extends MapDataInterface, MapView extends MapViewBaseDefaultsWithMapData<MapData>> {

    private walker: MapWalker<MapData, MapView>;
    private mapView: MapView;

    /**
     * Creates a new instance.
     * @param mapView The map view.
     */
    public constructor(mapView: MapView) {
        this.walker = new MapWalker(mapView);
        this.mapView = mapView;
    }

    /**
     * Searches for a path between the assigned start {@link PositionInterface} and target {@link PositionInterface}.
     * Uses an BreadthFirst search algorithm. Uses a {@link MapWalker} to find walkable tile neighbours.
     * Cancels the search after {@see MaxSearchIterations}.
     * @param startPosition The start position to find the path.
     * @param endPosition The end position to find the path.
     * @param ignoreViewBoundsCheck Also considers tiles that are not visible if true is assigned.
     * @param ignoreBlockingCharacters Ignores blocking characters if true is assigned.
     */
    public findPath(startPosition: PositionInterface, endPosition: PositionInterface, ignoreViewBoundsCheck = false, ignoreBlockingCharacters = false): Array<PositionInterface> {
        const startNode: PathNode = { position: startPosition };
        const endNode: PathNode = { position: endPosition };
        const nodeQueue = new Array<PathNode>();
        const visitedNodeList = new Array<string>(); // to track visited positions.
        let currentIterationCount = 0;
        nodeQueue.push(startNode);
        visitedNodeList.push(startNode.position.toHash());
        while (nodeQueue.length > 0 && currentIterationCount < MaxSearchIterations) {
            currentIterationCount++;
            const currentNode = nodeQueue.shift();
            if (endNode.position && endNode.position.equalsOther(currentNode.position)) {
                // found a path
                return PathFinder.createPath(currentNode);
            }
            for (const direction of DirectionHelper.allDirections) {
                // handle neighbour tiles
                const neighbourPosition = this.walker.canCrossTile(currentNode.position, direction, true, ignoreViewBoundsCheck, ignoreBlockingCharacters);
                if (neighbourPosition) {
                    const neighborHash = neighbourPosition.toHash();
                    if (visitedNodeList.find(hash => hash === neighborHash)) continue;
                    const neighbourNode: PathNode = { position: neighbourPosition, parent: currentNode };
                    nodeQueue.push(neighbourNode);
                    visitedNodeList.push(neighborHash);
                }
            }
        }
        return null;
    }

    /**
     * Creates a path array from the assigned {@link PathNode} and its parent nodes.
     * @param targetNode A path target node.
     * @private The path of {@link PositionInterface} to the target.
     */
    private static createPath(targetNode: PathNode): Array<PositionInterface> {
        const path = Array<PositionInterface>();
        path.push(targetNode.position);
        while (targetNode.parent) {
            targetNode = targetNode.parent;
            if (targetNode) path.push(targetNode.position);
        }
        return path.reverse();
    }

    /**
     * Can be used to pick a target tile on the {@link MapDataModel}
     * @param tileX The x tile position to pick.
     * @param tileY The y tile position to pick.
     */
    public pickTarget(tileX: number, tileY: number): PositionInterface {
        const highestTilePlane = this.mapView.mapData.getHighestMainGroundTilePlaneForPosition(tileX, tileY, sharedStore.getTileAsset);
        if (highestTilePlane !== undefined) return new ReadonlyPosition({ x: tileX, y: tileY, plane: highestTilePlane });

        // virtual transitions are valid targets.
        const virtualTransition = this.walker.findVirtualTransitionIgnorePlane(tileX, tileY);
        if (virtualTransition) return virtualTransition.position;

        return null;
    }

    public getMapWalker() {
        return this.walker;
    }
}
