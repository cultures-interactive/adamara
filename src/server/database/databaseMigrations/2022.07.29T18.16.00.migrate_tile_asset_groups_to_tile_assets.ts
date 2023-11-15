import { arrayActions, fromSnapshot, getSnapshot } from "mobx-keystone";
import { QueryInterface, Transaction } from "sequelize";
import { MigrationFn } from "umzug";
import { getTileLayerType } from "../../../shared/data/layerConstants";
import { PositionModel } from "../../../shared/game/PositionModel";
import { TileDataInteractionTriggerModel } from "../../../shared/game/TileDataInteractionTriggerModel";
import { TileDataModel } from "../../../shared/game/TileDataModel";
import { ImagePropertiesModel } from "../../../shared/resources/ImagePropertiesModel";
import { Size3DModel } from "../../../shared/resources/Size3DModel";
import { matchTileAssetSnapshot, TileAssetGroupModel } from "../../../shared/legacy/TileAssetGroupModel";
import { TileAssetModel, TileImageUsage } from "../../../shared/resources/TileAssetModel";
import { TileLayerType } from "../../../shared/resources/TileLayerType";
import { logger } from "../../integrations/logging";
import { GameMap } from "../models/GameMap";
import { TileAsset } from "../models/TileAsset";
import { sequelize } from "../db";

interface OldMapDataSnapshot {
    name: string;
}

const derivedMarker = "$$derived$$";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const tileAssets = await TileAsset.findAll({ transaction });
        const maps = await GameMap.findAll({ transaction });

        const derivedTileAssetsById = new Map<string, TileAssetModel>(
            tileAssets
                .filter(tileAsset => matchTileAssetSnapshot(tileAsset.snapshot, { includeDerived: true }))
                .map(tileAsset => [tileAsset.id, fromSnapshot<TileAssetModel>(tileAsset.snapshot)])
        );

        outputReportBeforeMigration(tileAssets, maps);

        logger.info("Migrating derived tiles on maps...");
        await migrateDerivedTilesOnMaps(transaction, maps, tileAssets, derivedTileAssetsById);
        logger.info("All maps migrated.\n");

        logger.info("Migrating tile groups...");
        await migrateTileGroupsToNewFormat(transaction, tileAssets, derivedTileAssetsById);
        logger.info("All tile groups migrated.\n");

        logger.info("Deleting derived tiles from database.");
        await removeDerivedTilesFromDatabase(transaction, tileAssets);
        logger.info("Deleted all tile groups and derived tiles from database.");
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    logger.warn("We can't really migrate backwards from this.");
};

function outputReportBeforeMigration(tileAssets: TileAsset[], maps: GameMap[]) {
    const singleTileAssets = new Array<TileAssetModel>();
    const singleTileAssetIds = new Set<string>();
    const groupTileAssets = new Array<TileAssetGroupModel>();

    for (const tileAsset of tileAssets) {
        if (tileAsset.deleted)
            continue;

        const { snapshot } = tileAsset;
        if (matchTileAssetSnapshot(snapshot, { includeGroupBaseAssets: true })) {
            groupTileAssets.push(fromSnapshot<TileAssetGroupModel>(snapshot));
        } else if (matchTileAssetSnapshot(snapshot, { includeNonDerived: true })) {
            singleTileAssets.push(fromSnapshot<TileAssetModel>(snapshot));
            singleTileAssetIds.add(snapshot.id);
        }
    }

    const singleTileDecoAssetsWithForegroundAndBackground = new Array<string>();
    for (const tileAsset of singleTileAssets) {
        if ((tileAsset.layerType === TileLayerType.Decoration) &&
            tileAsset.imageProperties(TileImageUsage.Background) &&
            tileAsset.imageProperties(TileImageUsage.Foreground)) {
            singleTileDecoAssetsWithForegroundAndBackground.push(tileAsset.id);
        }
    }

    const groupTileDecoAssetsWithForegroundAndBackground = new Array<string>();
    const groupTileAssetsWithNonDerivedTiles = new Array<string>();
    const groupTileAssetsFirstDerivedTileId = new Map<string, string>();
    for (const tileAsset of groupTileAssets) {
        if ((tileAsset.baseAsset.layer === TileLayerType.Decoration) &&
            tileAsset.baseAsset.imageProperties(TileImageUsage.Background) &&
            tileAsset.baseAsset.imageProperties(TileImageUsage.Foreground)) {
            groupTileDecoAssetsWithForegroundAndBackground.push(tileAsset.id);
        }

        if (tileAsset.tiles.some(tile => singleTileAssetIds.has(tile.tileAssetId))) {
            groupTileAssetsWithNonDerivedTiles.push(tileAsset.id);
        }

        const firstDerivedTile = tileAsset.tiles.find(tile => tile.tileAssetId.indexOf("$$derived$$") !== -1);
        if (firstDerivedTile) {
            groupTileAssetsFirstDerivedTileId.set(firstDerivedTile.tileAssetId, tileAsset.id);
        }
    }

    const tileAssetsIdsPerMapId = new Map<number, Set<string>>();
    const mapInfoPerTileAssetId = new Map<string, Array<{ mapName: string; usageCount: number; }>>();
    const derivedInteractionTriggerCountPerMap = new Map<string, Array<string>>();

    for (const map of maps) {
        if (map.deleted)
            continue;

        const mapId = map.id;
        const mapData = map.snapshotData;
        const mapName = (mapData as unknown as OldMapDataSnapshot);

        const derivedInteractionTriggers = new Array<string>();

        const tileAssetIds = new Set<string>();
        const tileUsageCounterOnMap = new Map<string, number>();
        // eslint-disable-next-line prefer-const
        for (let { tileAssetId, isInteractionTrigger, interactionTriggerData, position } of mapData.tiles) {
            if (tileAssetId.indexOf("$$derived$$") !== -1) {
                if (isInteractionTrigger) {
                    derivedInteractionTriggers.push(`(${position.x}|${position.y}|${position.plane}) ${interactionTriggerData.label} (tile: ${tileAssetId})`);
                }

                if (groupTileAssetsFirstDerivedTileId.has(tileAssetId)) {
                    tileAssetId = groupTileAssetsFirstDerivedTileId.get(tileAssetId);
                } else {
                    continue;
                }
            }

            tileAssetIds.add(tileAssetId);

            if (!tileUsageCounterOnMap.has(tileAssetId)) {
                tileUsageCounterOnMap.set(tileAssetId, 1);
            } else {
                tileUsageCounterOnMap.set(tileAssetId, tileUsageCounterOnMap.get(tileAssetId) + 1);
            }
        }

        for (const tileAssetId of tileAssetIds) {
            if (!mapInfoPerTileAssetId.has(tileAssetId)) {
                mapInfoPerTileAssetId.set(tileAssetId, []);
            }
            mapInfoPerTileAssetId.get(tileAssetId).push({
                mapName: `${mapName} (#${mapId})`,
                usageCount: tileUsageCounterOnMap.get(tileAssetId)
            });
        }

        tileAssetsIdsPerMapId.set(mapId, tileAssetIds);
        derivedInteractionTriggerCountPerMap.set(`${mapName} (#${mapId})`, derivedInteractionTriggers);
    }

    const outputTileInfo = (tileAssetId: string) => {
        logger.info(` - ${tileAssetId}`);
        if (mapInfoPerTileAssetId.has(tileAssetId)) {
            for (const info of mapInfoPerTileAssetId.get(tileAssetId)) {
                logger.info(`    > ${info.mapName} (used ${info.usageCount} times)`);
            }
        }
    };

    logger.info(`Single deco tiles with both background and foreground (${singleTileDecoAssetsWithForegroundAndBackground.length}):`);
    singleTileDecoAssetsWithForegroundAndBackground.forEach(outputTileInfo);

    logger.info("");

    logger.info(`Group deco tiles with both background and foreground (${groupTileDecoAssetsWithForegroundAndBackground.length}):`);
    groupTileDecoAssetsWithForegroundAndBackground.forEach(outputTileInfo);

    logger.info("");

    logger.info(`Group tiles with non-derived tiles (${groupTileAssetsWithNonDerivedTiles.length}):`);
    groupTileAssetsWithNonDerivedTiles.forEach(outputTileInfo);

    logger.info("");

    logger.info(`Maps with derived tile interaction triggers:`);
    for (const [mapNameWithId, tileIds] of derivedInteractionTriggerCountPerMap) {
        if (tileIds.length === 0)
            continue;

        logger.info(" - " + mapNameWithId + ": ");
        for (const tileId of tileIds) {
            logger.info("   > " + tileId);
        }
    }

    logger.info("");
}

async function migrateDerivedTilesOnMaps(transaction: Transaction, maps: GameMap[], tileAssets: TileAsset[], derivedTileAssetsById: Map<string, TileAssetModel>) {
    const derivedTilesInGroupAssetCountById = new Map<string, number>(
        tileAssets
            .filter(tileAsset => matchTileAssetSnapshot(tileAsset.snapshot, { includeGroupBaseAssets: true }))
            .map(
                tileAsset =>
                    [
                        tileAsset.id,
                        fromSnapshot<TileAssetGroupModel>(tileAsset.snapshot)
                            .tiles
                            .filter(tile => derivedTileAssetsById.has(tile.tileAssetId))
                            .length
                    ]
            )
    );

    for (const map of maps) {
        const mapData = map.snapshotData;

        logger.info(` - Migrating map: ${(mapData as unknown as OldMapDataSnapshot).name} (#${map.id})${map.deleted ? " (deleted)" : ""}`);

        const resultingTiles = [...mapData.tiles];

        const foundAssetGroupsInfoBySignature = new Map<string, {
            x: number;
            y: number;
            layer: number;
            plane: number;
            groupId: string;
            originalTile: TileDataModel;
            interactionTriggerData: TileDataInteractionTriggerModel;
            tilesFound: number;
        }>();

        for (let i = 0; i < resultingTiles.length; i++) {
            const tile = resultingTiles[i];
            const { tileAssetId, position, isInteractionTrigger, interactionTriggerData } = tile;

            if (derivedTileAssetsById.has(tileAssetId)) {
                const [groupId, offsetString] = tileAssetId.split(derivedMarker + "_");
                const offsetSplit = offsetString.split("_");
                const offsetX = +offsetSplit[0];
                const offsetY = +offsetSplit[1];

                const x = position.x - offsetX;
                const y = position.y - offsetY;
                const { layer, plane } = position;

                const signature = `${groupId} ${x} ${y} ${layer} ${plane}`;
                let groupInfo = foundAssetGroupsInfoBySignature.get(signature);

                if (groupInfo) {
                    groupInfo.tilesFound++;
                } else {
                    groupInfo = {
                        x,
                        y,
                        layer,
                        plane,
                        groupId,
                        originalTile: tile,
                        interactionTriggerData: null,
                        tilesFound: 1
                    };

                    foundAssetGroupsInfoBySignature.set(signature, groupInfo);
                }

                if (isInteractionTrigger) {
                    if (groupInfo.interactionTriggerData) {
                        logger.error(`   > Interaction trigger conflict: (${position.x}|${position.y}|${position.plane}) ${interactionTriggerData.label} (tile: ${tileAssetId}) will be ignored in favor of ${groupInfo.interactionTriggerData.label}`);
                    } else {
                        logger.info(`   > Migrating interaction trigger: (${position.x}|${position.y}|${position.plane}) ${interactionTriggerData.label} (tile: ${tileAssetId})`);
                        groupInfo.interactionTriggerData = fromSnapshot<TileDataInteractionTriggerModel>(getSnapshot(interactionTriggerData));
                        groupInfo.interactionTriggerData.setTileOffsetX(offsetX);
                        groupInfo.interactionTriggerData.setTileOffsetY(offsetY);
                    }
                }

                resultingTiles.splice(i, 1);
                i--;
            }
        }

        const migrated = new Array<string>();
        const skipped = new Array<string>();

        for (const { x, y, layer, plane, groupId, originalTile, interactionTriggerData, tilesFound } of foundAssetGroupsInfoBySignature.values()) {
            const totalTilesCountInGroup = derivedTilesInGroupAssetCountById.get(groupId);
            if (totalTilesCountInGroup === undefined)
                continue;

            const tilesPercentageFound = tilesFound / totalTilesCountInGroup;
            const skip = (tilesPercentageFound < 0.5) && !interactionTriggerData;
            const entry = `${groupId} @ (${x}|${y}|${layer}): ${tilesFound}/${totalTilesCountInGroup} (${Math.round(tilesPercentageFound * 100)}%)${interactionTriggerData ? ` with interaction trigger '${interactionTriggerData.label}'` : ""}`;
            if (skip) {
                skipped.push(entry);
                continue;
            } else {
                migrated.push(entry);
            }

            const {
                conflictResolutionOriginOverride,
                conflictResolutionFlatZIndex,
                offsetXOverride,
                offsetYOverride,
                offsetZOverride
            } = originalTile as any;

            resultingTiles.push(new TileDataModel({
                position: new PositionModel({
                    x, y, layer, plane
                }),
                tileAssetId: groupId,
                conflictResolutionOriginOverride,
                conflictResolutionFlatZIndex,
                offsetXOverride,
                offsetYOverride,
                offsetZOverride,
                interactionTriggerData: interactionTriggerData
            } as any));
        }

        arrayActions.setLength(mapData.tiles, 0);
        arrayActions.push(mapData.tiles, ...resultingTiles);

        map.snapshotData = mapData;

        if (skipped.length > 0) {
            logger.info("   > Skipped:");
            for (const entry of skipped) {
                logger.info("     * [SKIPPED] " + entry);
            }
        }

        if (migrated.length > 0) {
            logger.info("   > Migrated:");
            for (const entry of migrated) {
                logger.info("     * " + entry);
            }
        }

        await map.save({ transaction });
    }
}

async function migrateTileGroupsToNewFormat(transaction: Transaction, tileAssets: TileAsset[], derivedTileAssetsById: Map<string, TileAssetModel>) {
    for (const groupAsset of tileAssets) {
        if (groupAsset.deleted) {
            await groupAsset.destroy({ transaction });
            continue;
        }

        const { snapshot } = groupAsset;
        if (!matchTileAssetSnapshot(snapshot, { includeGroupBaseAssets: true }))
            continue;

        logger.info(` - Migrating tile group asset: ${groupAsset.id}`);

        const groupAssetData = fromSnapshot<TileAssetGroupModel>(snapshot);

        const layerType = getTileLayerType(groupAssetData.baseAsset.layer);

        let sizeX = groupAssetData.size.x;
        let sizeY = groupAssetData.size.y;
        const sizeZ = groupAssetData.size.z;

        const derivedChildTiles = groupAssetData.tiles.filter(tile => derivedTileAssetsById.has(tile.tileAssetId));

        for (const childTile of derivedChildTiles) {
            const { position: { x, y } } = childTile;
            sizeX = Math.max(sizeX, x + 1);
            sizeY = Math.max(sizeY, y + 1);
        }

        const newTileAssetData = new TileAssetModel({
            id: groupAssetData.id,
            layerType,
            imageAssets: groupAssetData.baseAsset.imageAssets.map(imageAsset => fromSnapshot<ImagePropertiesModel>(getSnapshot(imageAsset), { generateNewIds: true })),
            defaultGroundHeight: null,
            tags: [...groupAssetData.tags],
            offsetX: groupAssetData.offsetX,
            offsetY: groupAssetData.offsetY,
            internalOffsetZ: groupAssetData.internalOffsetZ,
            size: new Size3DModel({ x: sizeX, y: sizeY, z: sizeZ }),
            conflictResolutionOrigin: groupAssetData.conflictResolutionOrigin
        });

        newTileAssetData.resizeBlockedTilesIfNecessary();

        for (const childTile of derivedChildTiles) {
            const { tileAssetId, position: { x, y } } = childTile;

            const childTileAsset = derivedTileAssetsById.get(tileAssetId);
            const { blockedTiles } = childTileAsset;

            for (const blockedTile of blockedTiles[0][0]) {
                if (newTileAssetData.hasTileOffset(x, y)) {
                    newTileAssetData.toggleBlockedAtOffset(x, y, blockedTile);
                }
            }
        }

        const newTileAsset = new TileAsset();

        newTileAsset.snapshot = getSnapshot(newTileAssetData);

        newTileAsset.backgroundImageData = groupAsset.backgroundImageData;
        newTileAsset.backgroundImageDataVersion = groupAsset.backgroundImageDataVersion;

        newTileAsset.foregroundImageData = groupAsset.foregroundImageData;
        newTileAsset.foregroundImageDataVersion = groupAsset.foregroundImageDataVersion;

        newTileAsset.middleImageData = groupAsset.middleImageData;
        newTileAsset.middleImageDataVersion = groupAsset.middleImageDataVersion;

        newTileAsset.waterMaskForegroundImageData = groupAsset.waterMaskForegroundImageData;
        newTileAsset.waterMaskForegroundImageDataVersion = groupAsset.waterMaskForegroundImageDataVersion;

        await groupAsset.destroy({ transaction });
        await newTileAsset.save({ transaction });
    }
}

async function removeDerivedTilesFromDatabase(transaction: Transaction, tileAssets: TileAsset[]) {
    for (const tileAsset of tileAssets) {
        if (matchTileAssetSnapshot(tileAsset.snapshot, { includeDerived: true })) {
            await tileAsset.destroy({ transaction });
        }
    }
}
