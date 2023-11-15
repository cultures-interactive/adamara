import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";
import { logger } from "../../integrations/logging";
import { CombatConfiguration } from "../models/CombatConfiguration";
import { getSnapshot } from "mobx-keystone";
import { CombatConfigurationModel } from "../../../shared/combat/CombatConfigurationModel";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await CombatConfiguration.truncate();
    await CombatConfiguration.create({
        snapshotJSONString: JSON.stringify(getSnapshot(new CombatConfigurationModel({})))
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    logger.warn("It's not completely possible to migrate backwards from here since the old data is lost. The best we can do is delete the new configuration so no error will be thrown.");
    await CombatConfiguration.truncate();
};
