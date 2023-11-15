import React from 'react';
import { observer } from "mobx-react-lite";
import { NPCReferenceModel } from '../../../../../shared/action/NPCReferenceModel';
import { Dropdown } from "../../../editor/Dropdown";
import { formatTreeParameter } from "../../../../../shared/helper/actionTreeHelper";
import { gameStore } from '../../../../stores/GameStore';
import { sharedStore } from '../../../../stores/SharedStore';
import { ActionTreeModel } from '../../../../../shared/action/ActionTreeModel';
import { ElementGroup, ElementLabel } from './BaseElements';

interface NPCActionDetailProps {
    parentTree: ActionTreeModel;
    name: string;
    selectedNPC: NPCReferenceModel;
    npcSetter: (value: NPCReferenceModel) => void;
    allowBlankValue?: boolean;
}

export const NPCActionDetail: React.FunctionComponent<NPCActionDetailProps> = observer(({ name, selectedNPC, npcSetter, allowBlankValue, parentTree }) => {
    const { languageKey } = gameStore;

    const parameters = parentTree.treeParameterActions("actions/NPCValueModel").map(treeParam => {
        const treeParameterName = formatTreeParameter(treeParam.name);
        return new NPCReferenceModel({ npcId: treeParameterName, npcName: treeParameterName });
    });
    const characters = sharedStore.getCharacters()
        .sort((a, b) => {
            if (a.moduleOwner !== b.moduleOwner)
                return -a.moduleOwner.localeCompare(b.moduleOwner);

            return a.localizedName.get(languageKey).localeCompare(b.localizedName.get(languageKey), gameStore.languageKey);
        })
        .map(npc => new NPCReferenceModel({ npcId: "" + npc.id, npcName: npc.localizedName.get(languageKey) }));
    const allCharacters = [...parameters, ...characters];

    const setNPC = (npcId: string) => {
        const newNPC = allCharacters.find(c => c.npcId === npcId);
        npcSetter(newNPC ? newNPC : new NPCReferenceModel({}));
    };

    return (
        <ElementGroup>
            <ElementLabel>{name}</ElementLabel>
            <Dropdown
                className={(((selectedNPC instanceof NPCReferenceModel) && selectedNPC.isComplete()) || allowBlankValue) ? "" : "invalid"}
                value={selectedNPC ? selectedNPC.npcId : ""}
                onChange={({ target }) => setNPC(target.value)}
            >
                <option key={"-1"} value={""}>-</option>
                {allCharacters.map(character => <option key={character.npcId} value={character.npcId}>{character.npcName}</option>)}
            </Dropdown>
        </ElementGroup>
    );
});