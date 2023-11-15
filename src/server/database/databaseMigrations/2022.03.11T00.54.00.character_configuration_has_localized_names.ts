import { MigrationFn } from "umzug";
import { QueryInterface } from "sequelize";
import { CharacterConfiguration } from "../models/CharacterConfiguration";
import { getSnapshot, objectMap } from "mobx-keystone";
import { TranslatedString } from "../../../shared/game/TranslatedString";

export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    for (const characterConfiguration of await CharacterConfiguration.findAll()) {
        const { snapshot } = characterConfiguration;

        // CharacterConfigurationModel.name: string -> localizedName: TranslatedString
        const stringName = (snapshot as any).name as string;
        snapshot.localizedName = getSnapshot(new TranslatedString({
            text: objectMap<string>([["de", stringName]])
        }));

        characterConfiguration.snapshot = snapshot;
        await characterConfiguration.save();
    }
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    for (const characterConfiguration of await CharacterConfiguration.findAll()) {
        const { snapshot } = characterConfiguration;

        // CharacterConfigurationModel.localizedName: TranslatedString -> name: string
        (snapshot as any).name = snapshot.localizedName.text.items["de"];

        characterConfiguration.snapshot = snapshot;
        await characterConfiguration.save();
    }
};
