import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { AiFillStar } from "react-icons/ai";
import { MenuCard } from "../menu/MenuCard";
import { ListItem } from "../menu/ListItem";
import { Input } from "../shared/Input";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { UiConstants } from "../../data/UiConstants";
import { PlayableModule } from "../../../shared/workshop/ModuleModel";

const ListView = styled(MenuCard)`
    grid-column-start: 1;
    display: grid;
    overflow-y: scroll;
    max-height: 200px;
`;

const ContentListItem = styled(ListItem)`
    :hover {
        cursor: default;
    }
    &.disabled {
        color: ${UiConstants.COLOR_DISABLED_SELECTION_HIGHLIGHT};
        background-color: ${UiConstants.COLOR_DISABLED};
        pointer-events: none;
        cursor: default;
    }
`;

const ToolBar = styled.div`
    min-height: 30px;
`;

const ListFilterContainer = styled.span`
    float: right;
`;

interface ModulesOfWorkshopListViewProps {
    playableModules: PlayableModule[];
    modulesToPlay: string[];
    addModuleToPlay: (id: string) => void;
    removeModuleToPlay: (id: string) => void;
    showFilter: boolean;
}

export const ModulesToPlayListView: React.FunctionComponent<ModulesOfWorkshopListViewProps> = observer(({
    playableModules, modulesToPlay, addModuleToPlay, removeModuleToPlay, showFilter
}) => {
    const { t } = useTranslation();

    const [filterText, setFilterText] = useState("");

    const getItemName = (module: PlayableModule) => module ? module.name : "[ERROR: Module not found]";
    const getItemId = (module: PlayableModule) => module ? module.$modelId : "";

    const isItemSelected = (id: string): boolean => {
        return modulesToPlay.includes(id);
    };

    const findConflictingModules = (module: PlayableModule): string[] => {
        if (module.usedGates.length == 0)
            return [];

        const conflictingModules = [];
        for (const moduleToPlayId of modulesToPlay) {
            if (moduleToPlayId == getItemId(module))
                continue;

            const moduleToPlay = playableModules.find(module => module.$modelId === moduleToPlayId);
            if (!moduleToPlay)
                continue;

            for (const gate of moduleToPlay.usedGates) {
                if (module.usedGates.includes(gate)) {
                    conflictingModules.push(moduleToPlay.name);
                    break;
                }
            }
        }
        return conflictingModules;
    };

    const toggleItemSelection = (id: string) => {
        if (isItemSelected(id)) {
            removeModuleToPlay(id);
        } else {
            addModuleToPlay(id);
        }
    };

    const filteredItems = () => { // case-insensitive search
        return playableModules
            .filter(item => item.mayBePlayedInWorkshops)
            .filter(item => {
                const itemName = getItemName(item);
                const searchText = filterText.toLowerCase();
                return itemName.includes(searchText);
            });
    };

    return (
        <>
            {showFilter && (
                <ToolBar>
                    <ListFilterContainer>{t("management.filter")}: <Input value={filterText} onChange={({ target }) => setFilterText(target.value)}></Input></ListFilterContainer>
                </ToolBar>
            )}
            <ListView>
                {filteredItems().map((item) => {
                    const conflictingModules = findConflictingModules(item);
                    const disabled = conflictingModules.length > 0 && !isItemSelected(getItemId(item));
                    return <ContentListItem
                        key={getItemId(item)}
                        className={`${isItemSelected(getItemId(item)) ? "selected" : ""} 
                        ${disabled ? "disabled " : ""}`}
                        onClick={() => toggleItemSelection(getItemId(item))}
                    >
                        <input
                            type="checkbox"
                            checked={isItemSelected(getItemId(item))}
                            disabled={disabled}
                            onChange={() => { }}
                        ></input>
                        {(item ? item.highlighted : false) ? <span> <AiFillStar /></span> : ''}
                        {" " + getItemName(item)}
                        {disabled && ` (${t("management.module_conflict")}${conflictingModules.map(n => " " + n)})`}
                    </ContentListItem>;
                })}
            </ListView>
        </>);
});