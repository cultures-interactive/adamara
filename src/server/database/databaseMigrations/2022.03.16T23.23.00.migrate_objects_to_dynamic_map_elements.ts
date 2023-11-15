import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";
import { SnapshotOutOfObject, getSnapshot, SnapshotOutOf, model, Model, prop } from "mobx-keystone";
import { ActionModel, LocationTriggerActionModel, MovePlayerActionModel, MoveMapElementActionModel, ReceiveTaskActionModel, TreeParamterActionModel, TreePropertiesActionModel } from "../../../shared/action/ActionModel";
import { ActionTreeSnapshot, ActionTreeModel } from "../../../shared/action/ActionTreeModel";
import { MapElementReferenceModel } from "../../../shared/action/MapElementReferenceModel";
import { DynamicMapElementAreaTriggerSnapshot, DynamicMapElementAreaTriggerModel } from "../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { DynamicMapElementMapMarkerSnapshot, DynamicMapElementMapMarkerModel } from "../../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel";
import { MapDataSnapshot } from "../../../shared/game/MapDataModel";
import { PositionSnapshot, PositionModel } from "../../../shared/game/PositionModel";
import { wrapIterator } from "../../../shared/helper/IterableIteratorWrapper";
import { logger } from "../../integrations/logging";
import { ActionTree } from "../models/ActionTree";
import { GameMap } from "../models/GameMap";
import { MapMarkerValueModel } from "../../../shared/action/ValueModel";

interface OldMapDataSnapshot {
    name: string;
}

@model("game/ObjectPropertiesModel")
export class ObjectPropertiesModel extends Model({
    name: prop<string>("").withSetter(),
    note: prop<string>("").withSetter(),
    hitPoints: prop<number>(0).withSetter(),
    debugSymbol: prop<string>("").withSetter()
}) {
}

@model("game/ObjectModel")
export class ObjectDataModel extends Model({
    position: prop<PositionModel>(),
    properties: prop(() => new ObjectPropertiesModel({}))
}) {
}

export type ObjectDataSnapshot = SnapshotOutOf<ObjectDataModel>;

const startMarkerName = "Start";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    logger.info("Starting object migration.");

    const allMapsById = await getAllMapsWithMetaDataById();
    const { allActionTrees, allNodes } = await getAllActionTreesWithMetaData();

    migrateStartMarkers(allMapsById);
    migrateAreaTriggers(allNodes, allMapsById);
    migrateMapMarkers(allNodes, allMapsById);

    fixMapPositionValueModelInstances(allNodes);

    await saveAll(allMapsById, allActionTrees);

    showLogMessages(allMapsById);

    logger.info("Finished object migration.");
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    throw new Error("Implementing a reverse migration for this is too much work.");
};

const logMessagesInfo = new Map<MapWithMetaData, string[]>();
const logMessagesWarn = new Map<MapWithMetaData, string[]>();

type ActionSnapshot = SnapshotOutOfObject<ActionModel>;

interface ObjectWithMetaData {
    objectSnapshot: ObjectDataSnapshot;
    mapMarkerSnapshot: DynamicMapElementMapMarkerSnapshot;
    areaTriggerSnapshot: DynamicMapElementAreaTriggerSnapshot;
    placementWarning: string;
}

interface MapWithMetaData {
    databaseInstance: GameMap;
    nameWithId: string;
    snapshot: MapDataSnapshot;
    objectsByName: Map<string, ObjectWithMetaData>;
    objectsByNameLowercase: Map<string, ObjectWithMetaData>;
    objectsWithoutName: Array<ObjectDataSnapshot>;
    usedDynamicMapElementSnapshots: Set<any>;
}

interface ActionTreeWithMetaData {
    databaseInstance: ActionTree;
    snapshot: ActionTreeSnapshot;
}

interface ActionNodeWithMetaData {
    node: ActionSnapshot;
    pathToNode: string;
}

async function getAllMapsWithMetaDataById() {
    const allMapsWithMetaData = (await GameMap.findAll()).map(makeMapMetaData);
    return new Map(allMapsWithMetaData.map(map => [map.databaseInstance.id, map]));
}

function makeMapMetaData(databaseInstance: GameMap): MapWithMetaData {
    const snapshot = databaseInstance.snapshot;
    const objectsByName = new Map(((snapshot as any).objects as ObjectDataModel[])
        .filter(objectSnapshot => objectSnapshot.properties.name)
        .map(objectSnapshot => {
            const objectName = objectSnapshot.properties.name;
            const { position } = objectSnapshot;
            const tilesOnThisPosition = snapshot.tiles.filter(tile => (tile.position.x === position.x) && (tile.position.y === position.y));
            let plane = 0;
            let placementWarning: string = undefined;
            if (tilesOnThisPosition.length === 0) {
                placementWarning = ` - object "${objectName}" (${position.x}|${position.y}) doesn't have any tiles under it. Placing on height plane ${plane + 1}.`;
            } else {
                if (!tilesOnThisPosition.some(tile => tile.position.plane === 0)) {
                    plane = tilesOnThisPosition[0].position.plane;
                }
                if (tilesOnThisPosition.length > 1) {
                    placementWarning = ` - object "${objectName}" (${position.x}|${position.y}) could have multiple height planes. Placing it on height plane ${plane + 1}.`;
                }
            }

            return [objectSnapshot.properties.name, {
                objectSnapshot,
                mapMarkerSnapshot: getSnapshot(new DynamicMapElementMapMarkerModel({
                    position: createDynamicMapElementPosition(objectSnapshot.position, plane),
                    label: (objectName.toLowerCase() === startMarkerName.toLowerCase()) ? startMarkerName : objectName
                })),
                areaTriggerSnapshot: getSnapshot(new DynamicMapElementAreaTriggerModel({
                    position: createDynamicMapElementPosition(objectSnapshot.position, plane),
                    id: objectName
                })),
                placementWarning
            }];
        })
    );

    const objectsWithoutName = ((snapshot as any).objects as ObjectDataModel[])
        .filter(objectSnapshot => !objectSnapshot.properties.name);

    const objectsByNameLowercase = new Map(
        wrapIterator(objectsByName.values()).map(object => [object.objectSnapshot.properties.name.toLowerCase(), object])
    );

    return {
        databaseInstance,
        nameWithId: `${(snapshot as unknown as OldMapDataSnapshot).name} (${databaseInstance.id})`,
        snapshot,
        objectsByName,
        objectsByNameLowercase,
        objectsWithoutName,
        usedDynamicMapElementSnapshots: new Set<any>()
    };
}

function createDynamicMapElementPosition(position: PositionSnapshot, plane: number) {
    return new PositionModel({
        ...position,
        layer: 0,
        plane
    });
}

async function getAllActionTreesWithMetaData() {
    const allActionTrees = (await ActionTree.findAll());
    const allActionTreesWithMetaData = allActionTrees.map(actionTree => makeActionTreeMetaData(actionTree));
    const allNodes = new Array<ActionNodeWithMetaData>();
    for (const actionTree of allActionTreesWithMetaData) {
        const properties = (actionTree.snapshot as any).actions.find((a: any) => a.$modelType === "actions/TreePropertiesActionModel") as SnapshotOutOfObject<TreePropertiesActionModel>;
        let name = "";
        if (properties) {
            name = (properties as any)?.name || actionTree.snapshot.$modelId;
        } else {
            name = "Hauptbaum";
        }
        console.log({ name, propertiesName: (properties as any)?.name, modelid: actionTree.snapshot.$modelId });
        if (actionTree.databaseInstance.deleted) {
            name += " (deleted)";
        }
        recursivelyAddNodes(allNodes, (actionTree.snapshot as any).actions, name + " > ");
    }

    return {
        allActionTrees: allActionTreesWithMetaData,
        allNodes
    };

    //return new Map(allActionTreesWithMetaData.map(actionTree => [actionTree.databaseInstance.id, actionTree]));
}

function recursivelyAddNodes(allNodes: Array<ActionNodeWithMetaData>, currentNodes: Array<ActionSnapshot>, pathToNode: string) {
    for (const node of currentNodes) {
        allNodes.push({ node, pathToNode });

        if (node.$modelType === "actions/ActionTreeModel") {
            const actionTreeModel = node as SnapshotOutOfObject<ActionTreeModel>;
            const { actions } = actionTreeModel as any;
            const properties = actions.find((a: any) => a.$modelType === "actions/TreePropertiesActionModel") as SnapshotOutOfObject<TreePropertiesActionModel>;
            const name = (properties as any).name || "...";
            recursivelyAddNodes(allNodes, actions, pathToNode + name + " > ");
        }
    }
}

function makeActionTreeMetaData(databaseInstance: ActionTree): ActionTreeWithMetaData {
    const snapshot = databaseInstance.getSnapshot();
    return {
        databaseInstance,
        snapshot
    };
}

function migrateStartMarkers(allMapsById: Map<number, MapWithMetaData>) {
    for (const map of allMapsById.values()) {
        const startObject = map.objectsByNameLowercase.get("start");
        if (startObject) {
            logInfo(map, ` - object "${startObject.objectSnapshot.properties.name}" => map marker "${startObject.mapMarkerSnapshot.label}"`);
            map.usedDynamicMapElementSnapshots.add(startObject.mapMarkerSnapshot);
        } else {
            logWarn(map, ` - This map has no object named \"${startMarkerName}\"`);
        }
    }
}

function migrateAreaTriggers(allNodes: Array<ActionNodeWithMetaData>, allMapsById: Map<number, MapWithMetaData>) {
    // Location Trigger: Area Trigger
    for (const nodeWithMetaData of allNodes) {
        const { node, pathToNode } = nodeWithMetaData;

        if (node.$modelType === "actions/LocationTriggerActionModel") {
            const locationTriggerSnapshot = node as SnapshotOutOfObject<LocationTriggerActionModel>;
            const mapId = locationTriggerSnapshot.mapElement.mapId;
            const objectName = (locationTriggerSnapshot.mapElement as any).objectName;
            if (!objectName) {
                logWarn(allMapsById.get(mapId), " - Location Trigger with empty object target found");
                continue;
            }

            const reference = getObjectFromOldMapElementReference("Location Trigger", nodeWithMetaData, mapId, objectName, allMapsById);
            if (!reference)
                continue;

            const { map, object } = reference;

            // LocationTriggerActionModel.mapElement.objectName -> elementId
            const areaTrigger = object.areaTriggerSnapshot;
            locationTriggerSnapshot.mapElement.elementId = areaTrigger.id;
            // locationTriggerSnapshot.mapElement.elementLabel = areaTrigger.id;
            map.usedDynamicMapElementSnapshots.add(areaTrigger);

            logInfo(map, ` - [${pathToNode}Location Trigger] object "${object.objectSnapshot.properties.name}" => area trigger`);
        }
    }
}

function migrateMapMarkers(allNodes: Array<ActionNodeWithMetaData>, allMapsById: Map<number, MapWithMetaData>) {
    for (const nodeWithMetaData of allNodes) {
        const { node, pathToNode } = nodeWithMetaData;

        // Move Player: Map Marker
        if (node.$modelType === "actions/LoadMapActionModel") {
            const movePlayerSnapshot = node as SnapshotOutOfObject<MovePlayerActionModel>;

            // MovePlayerActionModel: @model("actions/LoadMapActionModel") -> @model("actions/MovePlayerActionModel")
            (movePlayerSnapshot as any).$modelType = "actions/MovePlayerActionModel";

            const mapId = (movePlayerSnapshot as any).mapId;
            const objectName = (movePlayerSnapshot as any).targetObject;

            if (!objectName) {
                // If there is no targetObject, just migrate the mapId only (it will use the start map marker for that map)
                movePlayerSnapshot.targetMapMarker = getSnapshot(new MapElementReferenceModel({
                    mapId
                }));

                logWarn(allMapsById.get(mapId), ` - [${pathToNode}Move Player] Pointing to this map, but with no target object. This won't work and you should fix this.`);
                continue;
            }

            const reference = getObjectFromOldMapElementReference("Move Player", nodeWithMetaData, mapId, objectName, allMapsById);
            if (!reference)
                continue;

            const { map, object } = reference;

            // MovePlayerActionModel.targetMapMarker.objectName -> elementId
            const mapMarker = object.mapMarkerSnapshot;
            movePlayerSnapshot.targetMapMarker = getSnapshot(new MapElementReferenceModel({
                mapId,
                elementId: mapMarker.$modelId,
                // elementLabel: `[m] ${objectName}`
            }));
            map.usedDynamicMapElementSnapshots.add(mapMarker);

            logInfo(map, ` - [${pathToNode}Move Player] object "${object.objectSnapshot.properties.name}" => map marker`);
        }

        // Move Map Element: Map Marker
        if (node.$modelType === "actions/CutsceneActionModel") {
            const moveMapElementSnapshot = node as SnapshotOutOfObject<MoveMapElementActionModel>;

            // MovePlayerActionModel: @model("actions/") -> @model("actions/MoveMapElementActionModel")
            (moveMapElementSnapshot as any).$modelType = "actions/MoveMapElementActionModel";


            const movedElementObjectName = (moveMapElementSnapshot as any).fromObject as string;
            const nodeName = `${pathToNode}/Move Map Element for "${movedElementObjectName}"`;

            const targetObjectName = (moveMapElementSnapshot as any).toObject as string;
            if (!targetObjectName)
                continue;


            const impactedMaps = findMapsWithObjectNames([movedElementObjectName, targetObjectName], allMapsById);
            if (impactedMaps.length === 0) {
                logWarn(null, ` - [${nodeName}] Didn't find any map that has both "${movedElementObjectName}" and "${targetObjectName}. Cannot migrate.`);
                continue;
            } else if (impactedMaps.length > 1) {
                logWarn(null, ` - [${nodeName}] Found ${impactedMaps.length} maps that have both "${movedElementObjectName}" and "${targetObjectName}". Don't know which map to point it to. Cannot migrate.`);
                logWarn(null, " - Migrated those objects to map markers anyway - please point MoveMapElementActionModel to the right map manually:");
                for (const impactedMap of impactedMaps) {
                    const object = impactedMap.objectsByName.get(targetObjectName);
                    impactedMap.usedDynamicMapElementSnapshots.add(object.mapMarkerSnapshot);
                    logWarn(null, `    > Map ${impactedMap.nameWithId}: object "${object.objectSnapshot.properties.name}" => map marker`);
                }

                continue;
            }

            const map = impactedMaps[0];
            const mapId = map.databaseInstance.id;
            const object = map.objectsByName.get(targetObjectName);

            // MoveMapElementActionModel.targetMapMarker.objectName -> elementId
            const mapMarker = object.mapMarkerSnapshot;
            moveMapElementSnapshot.targetMapMarker = getSnapshot(new MapElementReferenceModel({
                mapId,
                elementId: mapMarker.$modelId,
                // elementLabel: `[m] ${targetObjectName}`
            }));
            map.usedDynamicMapElementSnapshots.add(mapMarker);

            logInfo(map, ` - [${nodeName}] object "${object.objectSnapshot.properties.name}" => map marker`);
        }

        // Receive Location Quest Task: Map Marker
        if (node.$modelType === "actions/ReceiveTaskActionModel") {
            const receiveTaskSnapshot = node as SnapshotOutOfObject<ReceiveTaskActionModel>;
            if (!receiveTaskSnapshot.location)
                continue;

            const mapId = receiveTaskSnapshot.location.mapId;
            const objectName = (receiveTaskSnapshot.location as any).objectName;
            const taskName = receiveTaskSnapshot.taskName;

            const nodeName = `${pathToNode}Start Quest Location Task "${taskName}"`;

            if (!objectName) {
                logWarn(allMapsById.get(mapId), ` - [${nodeName}] has empty object target. Cannot migrate.`);
                continue;
            }

            const reference = getObjectFromOldMapElementReference("Start Quest Location Task", nodeWithMetaData, mapId, objectName, allMapsById);
            if (!reference)
                continue;

            const { map, object } = reference;

            // ReceiveTaskActionModel.location.objectName -> elementId
            const mapMarker = object.mapMarkerSnapshot;
            receiveTaskSnapshot.location.elementId = mapMarker.$modelId;
            map.usedDynamicMapElementSnapshots.add(mapMarker);
            logInfo(map, ` - [${nodeName}] object "${object.objectSnapshot.properties.name}" => map marker`);
        }
    }
}

function fixMapPositionValueModelInstances(allNodes: Array<ActionNodeWithMetaData>) {
    for (const nodeWithMetaData of allNodes) {
        const { node, pathToNode } = nodeWithMetaData;

        if (node.$modelType === "actions/TreeParamterActionModel") {
            const treeParameterSnapshot = node as SnapshotOutOfObject<TreeParamterActionModel>;
            if (treeParameterSnapshot.value.$modelType !== "actions/MapPositionValueModel")
                continue;

            (treeParameterSnapshot as any).value = getSnapshot(new MapMarkerValueModel({}));
            logInfo(undefined, ` - [${pathToNode}Tree parameter "${treeParameterSnapshot.name}"] Was re-adjusted to be a MapMarker. Please check if that is correct.`);
        }
    }
}

async function saveAll(allMapsById: Map<number, MapWithMetaData>, allActionTrees: Array<ActionTreeWithMetaData>) {
    for (const map of allMapsById.values()) {
        // Add actually used new dynamic map elements to snapshot
        if (!map.snapshot.dynamicMapElements) {
            map.snapshot.dynamicMapElements = [];
        }
        for (const dynamicMapElement of map.usedDynamicMapElementSnapshots) {
            map.snapshot.dynamicMapElements.push(dynamicMapElement);
        }

        const leftObjects = [];
        for (const object of map.objectsByName.values()) {
            if (map.snapshot.dynamicMapElements.some(element => ((element as any) === object.areaTriggerSnapshot) || ((element as any) === object.mapMarkerSnapshot))) {
                // Object was used. Show placement warning, if there is any.
                if (object.placementWarning) {
                    logWarn(map, object.placementWarning);
                }
            } else {
                // Object was not used. Leave.
                logWarn(map, ` - Not migrating unused object: "${object.objectSnapshot.properties.name}"`);
                leftObjects.push(object.objectSnapshot);
            }
        }

        for (const object of map.objectsWithoutName) {
            logWarn(map, ` - Not migrating object without name at (${object.position.x}|${object.position.y})`);
            leftObjects.push(object);
        }

        // Only leave unmigrated objects
        (map.snapshot as any).objects = leftObjects;

        // Save map
        map.databaseInstance.snapshot = map.snapshot;
        await map.databaseInstance.save();
    }

    // Save action trees
    for (const actionTree of allActionTrees) {
        actionTree.databaseInstance.setSnapshot(actionTree.snapshot);
        await actionTree.databaseInstance.save();
    }
}

function getMap(nodeName: string, nodeWithMetaData: ActionNodeWithMetaData, mapId: number, allMapsById: Map<number, MapWithMetaData>) {
    const { node, pathToNode } = nodeWithMetaData;

    // mapId === 0 means "not set"
    if (mapId === 0)
        return null;

    if (!allMapsById.has(mapId)) {
        logWarn(null, ` - [${pathToNode}${nodeName}] Points to map #${mapId} which doesn't exist. Cannot migrate.`);
        return null;
    }

    return allMapsById.get(mapId);
}

function getObjectFromOldMapElementReference(nodeName: string, nodeWithMetaData: ActionNodeWithMetaData, mapId: number, objectName: string, allMapsById: Map<number, MapWithMetaData>) {
    const { node, pathToNode } = nodeWithMetaData;

    const map = getMap(nodeName, nodeWithMetaData, mapId, allMapsById);

    if (!map)
        return null;

    let object = map.objectsByName.get(objectName);
    if (!object) {
        const lowerCaseObject = map.objectsByNameLowercase.get(objectName.toLowerCase());
        if (!lowerCaseObject) {
            logWarn(map, ` - [${pathToNode}${nodeName}] Points to an object named "${objectName}" which doesn't exist on this map. Cannot migrate.`);
            return null;
        } else {
            logWarn(map, ` - [${pathToNode}${nodeName}] Points to an object named "${objectName}" which doesn't exist on this map. However, "${lowerCaseObject.objectSnapshot.properties.name}" exists - using that instead.`);
            object = lowerCaseObject;
        }
    }

    return {
        map,
        object
    };
}

function findMapsWithObjectNames(objectNames: string[], allMapsById: Map<number, MapWithMetaData>) {
    return wrapIterator(allMapsById.values()).filter(map => objectNames.every(objectName => map.objectsByName.has(objectName)));
}

function logInfo(map: MapWithMetaData, message: string) {
    log(logMessagesInfo, map, message);
}

function logWarn(map: MapWithMetaData, message: string) {
    log(logMessagesWarn, map, message);
}

function log(logMessages: Map<MapWithMetaData, string[]>, map: MapWithMetaData, message: string) {
    if (!map)
        map = undefined;

    if (!logMessages.has(map)) {
        logMessages.set(map, []);
    }

    logMessages.get(map).push(message);
}

function showLogMessages(allMapsById: Map<number, MapWithMetaData>) {
    logger.info("");

    showLogMessagesForMap(undefined);

    for (const map of allMapsById.values()) {
        showLogMessagesForMap(map);
    }
}

function showLogMessagesForMap(map: MapWithMetaData) {
    const info = logMessagesInfo.get(map);
    const warn = logMessagesWarn.get(map);

    if (!info && !warn)
        return;

    const forMap = map ? "for " + map.nameWithId : "without a map";

    if (info) {
        logger.info("Successful migrations " + forMap + ":");
        info.forEach(message => logger.info(message));
        logger.info("");
    }

    if (warn) {
        logger.warn("Warnings " + forMap + ":");
        warn.forEach(message => logger.warn(message));
        logger.warn("");
    }
}
