import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Orientation, PopupSubMenu, PopupSubMenuIconContainer } from "../../menu/PopupSubMenu";
import { AiFillSound } from "react-icons/ai";
import { SoundSelectionDetail } from "../details/components/SoundSelectionDetail";
import { SoundCache, soundCache } from "../../../stores/SoundCache";
import { ParsedPath } from "path";
import { ActionModel } from "../../../../shared/action/ActionModel";

const Button = styled.button`
    cursor: pointer;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
`;

const ButtonContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    padding-top: 8px;
`;

interface Props {
    onSelectSoundPath: (path: ParsedPath) => void;
    selectedPath?: ParsedPath;
    filterForSoundPrefix?: Array<string>;
    text?: string;
    action?: ActionModel;
    onSelectTreeParameter?: (treeParameter: string) => void;
    selectedTreeParameter?: string;
    allowBlankValue?: boolean;
}

export const SoundSelectionButton: React.FunctionComponent<Props> = observer((props) => {
    const { t } = useTranslation();

    const [soundPaths] = useState(props.filterForSoundPrefix ?
        SoundCache.filterForPrefix(soundCache.getSoundPaths(), props.filterForSoundPrefix) : soundCache.getSoundPaths());

    const [selectionCandidatePath, setSelectionCandidatePath] = useState(props.selectedPath);
    const [selectionCandidateParameter, setSelectionCandidateParameter] = useState(props.selectedTreeParameter);

    function onSelectSoundPath(path: ParsedPath) {
        setSelectionCandidatePath(path);
        setSelectionCandidateParameter(null);
    }

    function onSelectSoundParameter(parameter: string) {
        setSelectionCandidateParameter(parameter);
        setSelectionCandidatePath(null);
    }

    function onClickApply() {
        if (!selectionCandidatePath && !selectionCandidateParameter) {
            props.onSelectSoundPath(null);
            props.onSelectTreeParameter?.(null);
        }
        if (selectionCandidatePath) props.onSelectSoundPath(selectionCandidatePath);
        else props.onSelectTreeParameter?.(selectionCandidateParameter);
    }

    return (
        <Row>
            {props.text}
            <PopupSubMenu
                orientation={Orientation.Left}
                relativeOffset={0}
                containerWidth={`400px`}
                buttonContent={
                    <>
                        <PopupSubMenuIconContainer>
                            <AiFillSound />
                        </PopupSubMenuIconContainer>
                        {props.selectedPath ? props.selectedPath.name : t("editor.map_background_sound_select")}
                    </>
                }
                buttonInvalid={!props.allowBlankValue && !props.selectedPath && !props.selectedTreeParameter}
                onOpen={() => { }}
                positionFixed={true}
                childrenWithCallbacks={(closePopup) => (
                    <>
                        <SoundSelectionDetail
                            onSelectPath={onSelectSoundPath}
                            selectedPath={selectionCandidatePath}
                            soundPaths={soundPaths}
                            action={props.action}
                            onSelectTreeParameter={onSelectSoundParameter}
                            selectedTreeParameter={selectionCandidateParameter}
                            showEmptyStateAsInvalid={!props.allowBlankValue}
                        />
                        <ButtonContainer>
                            <Button onClick={() => {
                                onClickApply();
                                closePopup();
                            }}>
                                {t("editor.map_background_sound_select")}
                            </Button>
                            <Button onClick={closePopup}>
                                {t("editor.map_background_sound_cancel")}
                            </Button>
                        </ButtonContainer>
                    </>
                )}
            >
            </PopupSubMenu>
        </Row>
    );
});