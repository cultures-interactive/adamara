import { getSnapshot } from "mobx-keystone";
import { QueryInterface, Transaction } from "sequelize";
import { MigrationFn } from "umzug";
import { PositionModel } from "../../../shared/game/PositionModel";
import { TileDataModel } from "../../../shared/game/TileDataModel";
import { TileAssetSnapshot, TileImageUsage } from "../../../shared/resources/TileAssetModel";
import { TileLayerType } from "../../../shared/resources/TileLayerType";
import { logger } from "../../integrations/logging";
import { sequelize } from "../db";
import { GameMap } from "../models/GameMap";
import { TileAsset } from "../models/TileAsset";

interface OldMapDataSnapshot {
    name: string;
}

const background = " Hintergrund";
const foreground = " Vordergrund";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        const affectedTileIds = new Set<string>();
        const tileIdToNewBackgroundTileId = new Map<string, string>();
        const tileIdToNewForegroundTileId = new Map<string, string>();

        const tileAssets = await TileAsset.findAll();
        for (const tileAsset of tileAssets) {
            const snapshot = tileAsset.snapshot;

            // Only apply to decoration...
            if (snapshot.layerType !== TileLayerType.Decoration)
                continue;

            // ...with both a background and a foreground image
            if ((snapshot.imageAssets.length < TileImageUsage.Foreground) ||
                !snapshot.imageAssets[TileImageUsage.Background] ||
                !snapshot.imageAssets[TileImageUsage.Foreground])
                continue;

            affectedTileIds.add(snapshot.id);

            await tileAsset.destroy({ transaction });

            await createTileAsset(transaction, snapshot, tileAsset.backgroundImageData, 0, background, tileIdToNewBackgroundTileId, false);
            await createTileAsset(transaction, snapshot, tileAsset.foregroundImageData, 1, foreground, tileIdToNewForegroundTileId, true);
        }

        logger.info("Split assets:");
        for (const tileAssetId of affectedTileIds) {
            logger.info(`- Split ${tileAssetId}:`);
            logger.info(`    > ${tileIdToNewBackgroundTileId.get(tileAssetId)}`);
            logger.info(`    > ${tileIdToNewForegroundTileId.get(tileAssetId)}`);
        }

        const maps = await GameMap.findAll();
        for (const map of maps) {
            const { snapshot } = map;

            const replacedTiles = new Array<string>();

            for (const tile of [...snapshot.tiles]) {
                const {
                    tileAssetId,
                    conflictResolutionFlatZIndex,
                    offsetXOverride,
                    offsetYOverride,
                    offsetZOverride,
                    position: { x, y, layer, plane }
                } = tile as any;

                if (!affectedTileIds.has(tileAssetId))
                    continue;

                replacedTiles.push(`(${x}|${y}|${plane}) ${tileAssetId} -> ${tileIdToNewBackgroundTileId.get(tileAssetId)} / ${tileIdToNewForegroundTileId.get(tileAssetId)}`);

                tile.tileAssetId = tileIdToNewBackgroundTileId.get(tileAssetId);
                tile.conflictResolutionOriginOverride = null;

                let newLayer = layer + 1;
                while (snapshot.tiles.some(
                    otherTile =>
                        otherTile.position.x === x &&
                        otherTile.position.y === y &&
                        otherTile.position.plane === plane &&
                        otherTile.position.layer === newLayer
                )) {
                    newLayer++;
                }

                const newTile = new TileDataModel({
                    tileAssetId: tileIdToNewForegroundTileId.get(tileAssetId),
                    position: new PositionModel({
                        x,
                        y,
                        plane,
                        layer: newLayer,
                    }),
                    conflictResolutionFlatZIndex,
                    offsetXOverride,
                    offsetYOverride,
                    offsetZOverride,
                    conflictResolutionOriginOverride: null,
                    interactionTriggerData: null
                } as any);

                snapshot.tiles.push(getSnapshot(newTile));
            }

            map.snapshot = snapshot;

            await map.save({ transaction });

            if (replacedTiles.length > 0) {
                logger.info(`- Map ${(snapshot as unknown as OldMapDataSnapshot).name} (#${map.id}):`);
                for (const tile of replacedTiles) {
                    logger.info(`    > ${tile}`);
                }
            }
        }
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    logger.warn("We can't really migrate backwards from this.");
};

async function createTileAsset(
    transaction: Transaction, snapshotOriginal: TileAssetSnapshot, imageData: ArrayBuffer,
    origin: number, idPostfix: string, tileIdToNewTileId: Map<string, string>, isForeground: boolean
) {
    // Make a mutable clone of snapshot
    const snapshotCopy = JSON.parse(JSON.stringify(snapshotOriginal)) as TileAssetSnapshot;
    if (isForeground) {
        snapshotCopy.imageAssets[TileImageUsage.Background] = snapshotCopy.imageAssets[TileImageUsage.Foreground];
    }
    snapshotCopy.imageAssets[TileImageUsage.Foreground] = null;

    const newIdBase = snapshotOriginal.id + idPostfix;
    let newId = newIdBase;
    let newIdCounter = 2;

    while (await TileAsset.count({ where: { id: newId } }) > 0) {
        newId = newIdBase + " " + (newIdCounter++);
    }

    snapshotCopy.id = newId;
    snapshotCopy.conflictResolutionOrigin = origin;

    const tileAsset = new TileAsset();
    tileAsset.snapshot = snapshotCopy;
    tileAsset.backgroundImageData = imageData;

    await tileAsset.save({ transaction });

    tileIdToNewTileId.set(snapshotOriginal.id, snapshotCopy.id);
}
