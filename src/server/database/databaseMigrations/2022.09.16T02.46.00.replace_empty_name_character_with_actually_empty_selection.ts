import { QueryInterface } from "sequelize";
import { MigrationFn } from "umzug";
import { logger } from "../../integrations/logging";
import { sequelize } from "../db";
import { CharacterConfiguration } from "../models/CharacterConfiguration";
import { ActionTree } from "../models/ActionTree";
import { SnapshotOutOfModel, SnapshotOutOfObject } from "mobx-keystone";
import { ActionModel, StartDialogueActionModel, TreeParamterActionModel } from "../../../shared/action/ActionModel";
import { NPCReferenceModel } from "../../../shared/action/NPCReferenceModel";
import { NPCValueModel } from "../../../shared/action/ValueModel";
import { ActionTreeModel } from "../../../shared/action/ActionTreeModel";

// This is a migration specifically written for our current app server, changing the workaround with
// the empty-named character for dialogues without specific speaker to a proper empty character selection.
export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    await sequelize.transaction(async transaction => {
        // Check if the character with the id 100 exists and has the right $modelId.
        // If so: It is extremely likely that this is the unmigrated server app state.
        const emptyNameCharacter = await CharacterConfiguration.findOne({ where: { id: 100 } });
        if (!emptyNameCharacter || emptyNameCharacter.snapshot.$modelId !== "dv-sEGE3pJAROG71Xmz1biOoQ==") {
            console.log("No need to migrate - this is not the server state with the empty-named character.");
            return;
        }

        await emptyNameCharacter.destroy({ transaction });

        const allActionTrees = (await ActionTree.findAll());

        let dialoguesAdjusted = 0;
        let treeParametersAdjusted = 0;

        const processActionTreeNodes = (actions: SnapshotOutOfObject<ActionModel>[]) => {
            for (const action of actions) {
                if (action.$modelType === "actions/ActionTreeModel") {
                    const subtree = action as SnapshotOutOfObject<ActionTreeModel>;
                    processActionTreeNodes((subtree as any).actions);
                } else if (action.$modelType === "actions/StartDialogueActionModel") {
                    const dialogue = action as SnapshotOutOfObject<StartDialogueActionModel>;
                    if (adjustNPCReferenceIfNecessary(dialogue.speaker)) {
                        dialoguesAdjusted++;
                    }
                } else if (action.$modelType === "actions/TreeParamterActionModel") {
                    const treeParameter = action as SnapshotOutOfObject<TreeParamterActionModel>;
                    if (treeParameter.value.$modelType === "actions/NPCValueModel") {
                        const treeParameterValue = treeParameter.value as SnapshotOutOfObject<NPCValueModel>;
                        if (adjustNPCReferenceIfNecessary(treeParameterValue.value)) {
                            treeParametersAdjusted++;
                        }
                    }
                }
            }
        };

        for (const actionTree of allActionTrees) {
            const snapshot = actionTree.getSnapshot();

            processActionTreeNodes((snapshot as any).actions);

            actionTree.setSnapshot(snapshot);
            await actionTree.save({ transaction });
        }

        console.log(`Deleted empty-named character, and adjusted ${dialoguesAdjusted} StartDialogueAction nodes and ${treeParametersAdjusted} NPC tree parameter values.`);
    });
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
    logger.warn("We can't really migrate backwards from this.");
};

function adjustNPCReferenceIfNecessary(reference: SnapshotOutOfModel<NPCReferenceModel>) {
    if (reference.npcId === "100") {
        reference.npcId = "-1";
        return true;
    }

    return false;
}