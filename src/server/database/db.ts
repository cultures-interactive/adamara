import { Sequelize } from "sequelize-typescript";
import { ServerState } from "../data/ServerState";
import { ActionTree } from "./models/ActionTree";
import { CombatConfiguration } from "./models/CombatConfiguration";
import { GameMap } from "./models/GameMap";
import { TileAsset } from "./models/TileAsset";
import { Umzug, SequelizeStorage } from "umzug";
import { AnimationAsset } from "./models/AnimationAsset";
import { Item } from "./models/Item";
import { CharacterConfiguration } from "./models/CharacterConfiguration";
import { Image } from "./models/Image";
import { logger } from "../integrations/logging";
import { DebugTimer } from "../helper/DebugTimer";
import { GameDesignVariables } from "./models/GameDesignVariables";
import { patchedSave } from "../helper/sequelizeUtils";
import { Workshop } from "./models/Workshop";
import { Module } from "./models/Module";
import { regularlyScheduleAsyncBackgroundTransaction } from "../helper/asyncUtils";
import { startSegment } from "newrelic";
import { sendToSentryAndLogger } from "../integrations/errorReporting";
import { MakeshiftTranslationSystemData } from "./models/MakeshiftTranslationSystemData";

const connectionURL = process.env.DB_URL;

export const sequelize = new Sequelize(connectionURL, {
    dialectOptions: {
        // Default for connectTimeout is 10000 (10s) which *might* be leading to ECONNRESET/ETIMEDOUT problems
        // (see https://stackoverflow.com/a/52465919/491553 / https://github.com/sequelize/sequelize/issues/3895#issuecomment-581995235)
        connectTimeout: 20000
    },
    retry: {
        max: 5,
        match: [
            /ECONNRESET/i,
            /ETIMEDOUT/i
        ]
    },
    logging: (sql, options) => {
        let logLevel = "verbose";

        if (sql.startsWith("Executing (default): UPDATE `sessions`") ||
            sql.startsWith("Executing (default): SELECT `sessions`") ||
            sql.startsWith("Executing (default): UPDATE `sid`") ||
            sql.startsWith("Executing (default): SELECT `sid`") ||
            sql.startsWith("Executing (default): DELETE FROM `sessions`")) {

            logLevel = "silly";
        }

        if (!logger.isLevelEnabled(logLevel))
            return;

        const boundParameters = (options as any).bind as Array<any>;
        const additionalInformation = {} as any;
        if (boundParameters) {
            if (sql.indexOf("`id` = ?") !== -1) {
                // UPDATE
                additionalInformation.id = boundParameters[boundParameters.length - 1];
            } else if (sql.indexOf("(`id`") !== -1) {
                // INSERT INTO
                additionalInformation.id = boundParameters[0];
            }
        }

        logger.log(logLevel, sql, additionalInformation);
    },
    hooks: {
        afterSave: (instance) => {
            const instanceAny = instance as any;
            const instanceName = instanceAny.constructor.name;
            if (instanceName === "Session")
                return;

            logger.verbose(`${instanceName} ${instanceAny.id} saved.`);
        }
    }
});
sequelize.addModels([__dirname + "/models"]);

const migrationTableName = "migrations";
const oldMigrationTableName = "SequelizeMeta";

export const umzug = new Umzug({
    migrations: { glob: __dirname + '/databaseMigrations/*.js' },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize, tableName: migrationTableName }),
    logger,
});

const saveIntervalInSeconds = 10;

export async function initializeDatabase() {
    try {
        // Migrate migrations table (if the old table is still used)
        const queryInterface = sequelize.getQueryInterface();
        const hasOldMigrationTable = await queryInterface.tableExists(oldMigrationTableName);
        if (hasOldMigrationTable) {
            const hasNewMigrationTable = await queryInterface.tableExists(migrationTableName);
            if (hasNewMigrationTable) {
                throw new Error(`Both migration tables "${oldMigrationTableName}" (old) and "${migrationTableName}" (new) were found. This is usually the case when a database dump was imported. Please delete the table that was *not* freshly imported and restart this app.`);
            }
            logger.info(`Renaming migration table from "${oldMigrationTableName}" to "${migrationTableName}."`);
            await queryInterface.renameTable(oldMigrationTableName, migrationTableName);
        }

        // Run migrations
        await umzug.up();
    } catch (error) {
        // jse_info is a huge object that will be automatically printed on migration errors and seems unnecessary
        delete error.jse_info;
        throw error;
    }
}

export async function loadWorkshopsIntoServerState(serverState: ServerState) {
    serverState.setAllWorkshops(await Workshop.findAll());
}

export async function loadModulesIntoServerState(serverState: ServerState) {
    serverState.setAllModules(await Module.findAll());
}

export async function loadCombatConfigurationIntoServerState(serverState: ServerState) {
    serverState.combatConfiguration = await CombatConfiguration.findOne();
}

export async function loadGameDesignVariablesConfigurationIntoServerState(serverState: ServerState) {
    serverState.gameDesignVariables = await GameDesignVariables.findOne();
}

export async function loadTileAssetsIntoServerState(serverState: ServerState) {
    const tileAssets = await TileAsset.findAll();
    serverState.tileAssets = new Map(tileAssets.map(a => [a.id, a]));
}

export async function loadMapsIntoServerState(serverState: ServerState) {
    const maps = await GameMap.findAll({ where: { deleted: false } });
    for (const map of maps) {
        serverState.createAndAddMapWithMetaData(map);
    }
}

export async function loadActionTreesIntoServerState(serverState: ServerState) {
    const actionTrees = await ActionTree.findAll();
    for (const actionTree of actionTrees) {
        serverState.createAndAddActionTreeWithMetaData(actionTree);
    }
}

export async function loadItemsIntoServerState(serverState: ServerState) {
    const items = await Item.findAll();
    serverState.items = new Map(items.map(item => [item.id, item]));
}

export async function loadImagesIntoServerState(serverState: ServerState) {
    const images = await Image.findAll();
    serverState.images = new Map(images.map(image => [image.id, image]));
}

export async function loadAnimationAssetsIntoServerState(serverState: ServerState) {
    const animationAssets = await AnimationAsset.findAll();
    serverState.animationAssets = new Map(animationAssets.map(a => [a.id, a]));
}

export async function loadCharacterConfigurationsIntoServerState(serverState: ServerState) {
    const characterConfigurations = await CharacterConfiguration.findAll();
    serverState.characterConfigurations = new Map(characterConfigurations.map(c => [c.id, c]));
}

export async function loadMakeshiftTranslationSystemDataIntoServerState(serverState: ServerState) {
    serverState.makeshiftTranslationSystemData = await MakeshiftTranslationSystemData.findOne();
}

export function regularlySaveServerState(serverState: ServerState) {
    const stopFunctions = new Array<() => void>();
    stopFunctions.push(regularlyScheduleAsyncBackgroundTransaction("db:saveServerState()", () => saveServerState(serverState), saveIntervalInSeconds * 1000));

    return () => {
        stopFunctions.forEach(callback => callback());
    };
}

export async function saveServerState(serverState: ServerState) {
    let errorCounter = 0;

    // Each saveActionTree() has it's own segment, so startSegment() is not necessary around the for loop
    for (const actionTreeWithMetadata of serverState.actionTreesWithMetadata.values()) {
        if (actionTreeWithMetadata.mightHaveChanges) {
            await actionTreeWithMetadata.saveActionTree().catch(e => {
                sendToSentryAndLogger(e);
                errorCounter++;
            });
        }
    }

    // Each saveGameMap() has it's own segment, so startSegment() is not necessary around the for loop
    for (const mapWithMetaData of serverState.mapsWithMetaData) {
        if (mapWithMetaData.mightHaveChanges) {
            await mapWithMetaData.saveGameMap().catch(e => {
                sendToSentryAndLogger(e);
                errorCounter++;
            });
        }
    }

    await startSegment("TileAssets", false, async () => {
        for (const tileAsset of serverState.tileAssets.values()) {
            if (tileAsset.changed()) {
                await patchedSave(tileAsset).catch(e => {
                    sendToSentryAndLogger(e);
                    errorCounter++;
                });
            }
        }
    });

    await startSegment("Workshops", false, async () => {
        for (const workshop of serverState.activeAndDeletedWorkshops) {
            if (workshop.changed()) {
                await patchedSave(workshop).catch(e => {
                    sendToSentryAndLogger(e);
                    errorCounter++;
                });
            }
        }
    });

    await startSegment("Modules", false, async () => {
        for (const module of serverState.activeAndDeletedModules) {
            if (module.changed()) {
                await patchedSave(module).catch(e => {
                    sendToSentryAndLogger(e);
                    errorCounter++;
                });
            }
        }
    });

    await startSegment("Items", false, async () => {
        for (const item of serverState.items.values()) {
            if (item.changed()) {
                await patchedSave(item).catch(e => {
                    sendToSentryAndLogger(e);
                    errorCounter++;
                });
            }
        }
    });

    await startSegment("Images", false, async () => {
        for (const image of serverState.images.values()) {
            if (image.changed()) {
                await patchedSave(image).catch(e => {
                    sendToSentryAndLogger(e);
                    errorCounter++;
                });
            }
        }
    });

    await startSegment("CharacterConfigurations", false, async () => {
        for (const characterConfiguration of serverState.characterConfigurations.values()) {
            if (characterConfiguration.changed()) {
                await patchedSave(characterConfiguration).catch(e => {
                    sendToSentryAndLogger(e);
                    errorCounter++;
                });
            }
        }
    });

    await startSegment("CombatConfiguration", false, async () => {
        if (serverState.combatConfiguration.changed()) {
            await patchedSave(serverState.combatConfiguration).catch(e => {
                sendToSentryAndLogger(e);
                errorCounter++;
            });
        }
    });

    await startSegment("GameDesignVariables", false, async () => {
        if (serverState.gameDesignVariables.changed()) {
            await patchedSave(serverState.gameDesignVariables).catch(e => {
                sendToSentryAndLogger(e);
                errorCounter++;
            });
        }
    });

    await startSegment("MakeshiftTranslationSystemData", false, async () => {
        if (serverState.makeshiftTranslationSystemData.changed()) {
            await patchedSave(serverState.makeshiftTranslationSystemData).catch(e => {
                sendToSentryAndLogger(e);
                errorCounter++;
            });
        }
    });

    return errorCounter;
}