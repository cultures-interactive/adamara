import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { PlaySoundActionModel } from "../../../../shared/action/ActionModel";
import { ParsedPath } from "path";
import { SoundSelectionDetail } from "./components/SoundSelectionDetail";
import { MenuCard } from "../../menu/MenuCard";
import { InputWithMargin } from "../../editor/Input";
import { MapElementReferenceModel } from "../../../../shared/action/MapElementReferenceModel";
import { MapElementSelectionDetail } from "./components/MapElementSelectionDetail";
import { MapElementFilter } from "../../../helper/MapElementFilter";
import { FloatInputField } from "../../shared/FloatInputField";
import { SoundCache, soundCache } from "../../../stores/SoundCache";
import { extendedMapMarkerValueModelTypesArray } from "../../../../shared/action/ValueModel";
import { SoundActionHelper } from "../../../canvas/game/controller/SoundActionHelper";

const Container = styled.div`
    width: 100%; 
`;

interface Props {
    action: PlaySoundActionModel;
}

const HeaderText = styled.div`
    cursor: pointer;
    margin-top: 2px;
    margin-left: 4px;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
`;

const Margin = styled.div`
    margin: 4px;
    margin-left: 8px;
`;

const CenteredRow = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
`;

const NumberInput = styled(FloatInputField)`
    max-width: 50px;
    margin-left: 16px;
`;

export const PlaySoundActionDetails: React.FunctionComponent<Props> = observer(({ action }) => {
    const { t } = useTranslation();
    const [soundPaths] = useState(SoundCache.filterForPrefix(soundCache.getSoundPaths(), SoundCache.ALL_GAME_SOUND_PREFIX).filter(item => item != null));

    function onSoundPathSelected(path: ParsedPath) {
        SoundActionHelper.applySoundPathSelection(action, path);
    }

    function onSoundTreeParameterSelected(treeParameter: string) {
        SoundActionHelper.applySoundTreeParameterSelection(action, treeParameter);
    }

    function onRangeChange(range: number) {
        action.setRangeInTiles(range);
    }

    function onClickTogglePosition() {
        if (action.sourcePosition) {
            action.setSourcePosition(null);
        } else {
            action.setSourcePosition(new MapElementReferenceModel({}));
        }
    }

    function onClickToggleLoop() {
        action.setLoopWhileInRange(!action.loopWhileInRange);
    }

    return (
        <Container>
            <MenuCard>
                <SoundSelectionDetail
                    soundPaths={soundPaths}
                    onSelectPath={onSoundPathSelected}
                    onSelectTreeParameter={onSoundTreeParameterSelected}
                    selectedPath={action.filePath}
                    selectedTreeParameter={action.treeParameter}
                    action={action}
                    showEmptyStateAsInvalid={true}
                />
            </MenuCard>
            <MenuCard>
                <Row onClick={onClickTogglePosition}>
                    <InputWithMargin
                        type={"checkbox"}
                        checked={action.sourcePosition != null}
                        onChange={e => { }}
                    />
                    <HeaderText>
                        {t("action_editor.node_play_sound_use_position")}
                    </HeaderText>
                </Row>
                {
                    action.sourcePosition && (
                        <>
                            <Margin>
                                <CenteredRow>
                                    {t("action_editor.node_play_sound_position_description") + ":"}
                                    <MapElementSelectionDetail
                                        name={""}
                                        selectedElement={action.sourcePosition}
                                        elementSetter={action.setSourcePosition.bind(action)}
                                        parameterTypes={extendedMapMarkerValueModelTypesArray}
                                        getSelectableElements={MapElementFilter.filterExtendedMapMarkerLabels}
                                    />
                                </CenteredRow>
                            </Margin>
                            <Margin>
                                <CenteredRow>
                                    {t("action_editor.node_play_sound_position_range") + ":"}
                                    <NumberInput
                                        value={action.rangeInTiles}
                                        onlyPositive={true}
                                        onChange={onRangeChange}>
                                    </NumberInput>
                                </CenteredRow>
                            </Margin>
                            <Margin>
                                <CenteredRow onClick={onClickToggleLoop}>
                                    {t("action_editor.node_play_sound_loop") + ":"}
                                    <InputWithMargin
                                        type={"checkbox"}
                                        checked={action.loopWhileInRange}
                                        onChange={e => { }}
                                    />
                                </CenteredRow>
                            </Margin>
                        </>
                    )
                }
            </MenuCard>
        </Container>
    );
});