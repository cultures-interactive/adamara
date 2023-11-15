import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { MenuCardSubLabel } from "../menu/MenuCardSubLabel";
import { Input } from "../editor/Input";
import { SoundSelectionButton } from "../action/selector/SoundSelectionButton";
import { SoundCache } from "../../stores/SoundCache";
import { editorStore } from "../../stores/EditorStore";
import { mainMapEditorStore } from "../../stores/MapEditorStore";

const MarginContainer = styled.div`
    margin-left: 8px; 
`;

export const MapSettingsComponent: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const { currentMap } = mainMapEditorStore.currentMapStore;

    const toggleShouldShowWater = () => {
        currentMap.properties.setShouldShowWater(!currentMap.properties.shouldShowWater);
    };

    if (!currentMap)
        return null;

    return (
        <>
            <MenuCardSubLabel>{t("editor.map_settings")}</MenuCardSubLabel>
            <MarginContainer>
                <label>
                    {t("editor.show_water_on_map")}
                    <Input
                        type="checkbox"
                        checked={currentMap.properties.shouldShowWater}
                        onChange={toggleShouldShowWater}
                    />
                </label>
            </MarginContainer>
            <MarginContainer>
                <SoundSelectionButton
                    onSelectSoundPath={(path) => currentMap.properties.setBackgroundSoundFilePath(path)}
                    selectedPath={currentMap.properties.backgroundSoundFilePath}
                    filterForSoundPrefix={[SoundCache.LEVEL_BACKGROUND_PREFIX]}
                    text={t("editor.map_background_sound")}
                    allowBlankValue={true}
                />
            </MarginContainer>
            <MarginContainer>
                {t("editor.map_name")}
                <Input
                    type="text"
                    value={currentMap.properties.name}
                    onChange={e => currentMap.properties.setName(e.target.value)}
                />
            </MarginContainer>
            {editorStore.isMainGameEditor && <MarginContainer>
                {t("editor.map_sorting_priority")}
                <Input
                    type="number"
                    step={1}
                    value={currentMap.properties.sortingPriority}
                    onChange={e => currentMap.properties.setSortingPriority(+e.target.value)}
                />
            </MarginContainer>}
        </>
    );
});