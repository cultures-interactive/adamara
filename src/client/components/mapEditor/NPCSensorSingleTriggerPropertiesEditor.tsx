import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { ViewAreaTriggerModel } from "../../../shared/game/ViewAreaTriggerModel";
import { LayerDeleteButton } from "./EditorTileInspectorLayer";
import { AiFillDelete } from "react-icons/ai";
import { UiConstants } from "../../data/UiConstants";

const Container = styled.div`
    width: 100%;
    padding: 4px;
    &:hover {
        background-color: ${UiConstants.COLOR_HOVER};
    }
    border-bottom: 1px solid black;
`;

const FlexRow = styled.div`
    display: flex;
    flex-direction: row;
`;

const Input = styled.input`
    accent-color: ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
    &:focus {
        outline: 2px solid ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
        border-radius: 2px;
        border-color: rgba(0, 0, 0, 0);
    }
`;

const InputLabel = styled.label`
    margin-left: 4px;
`;

const FlexColumn = styled.div`
    display: flex;
    flex-direction: column;
    margin: 3px;
    flex-grow: 1;
    flex-shrink: 0;
`;

const ViewDirectionLabel = styled.div`
    margin-top: 3px;
`;

const DeleteContainer = styled.div`
    float: right;
`;

const InputContainer = styled.div`
    margin: 2px;
    flex-shrink: 0;
`;

const NumberInput = styled.input`
    width: 40px;
    &:focus {
        outline: 2px solid ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
        border-radius: 2px;
        border-color: rgba(0, 0, 0, 0);
    }
`;

interface Props {
    viewTrigger: ViewAreaTriggerModel;
    onDeleteTrigger: (viewAreaTrigger: ViewAreaTriggerModel) => void;
    isCurrentMapPartOfTheModule: boolean;
}

export const NPCSensorSingleTriggerPropertiesEditor: React.FunctionComponent<Props> = observer((props) => {
    const { t } = useTranslation();

    return (
        <Container>
            <DeleteContainer>
                <LayerDeleteButton onClick={() => props.onDeleteTrigger(props.viewTrigger)}>
                    <AiFillDelete />
                </LayerDeleteButton>
            </DeleteContainer>
            <FlexColumn>
                {t("editor.npc_inspector_area_trigger_name")}
                <Input type={"text"}
                    value={props.viewTrigger.name}
                    onChange={(e) => props.viewTrigger.setName(e.target.value)} />
            </FlexColumn>
            <FlexColumn>
                {t("editor.npc_inspector_range_of_view")}
                <NumberInput
                    type={"number"}
                    value={props.viewTrigger.rangeOfSight}
                    onChange={(e) => props.viewTrigger.setRangeOfSight(+e.target.value)}
                />
            </FlexColumn>
            <ViewDirectionLabel>{t("editor.npc_inspector_view_direction")}</ViewDirectionLabel>
            <FlexRow>
                <InputContainer>
                    <Input
                        type={"checkbox"}
                        id={props.viewTrigger.$modelId + "-forward"}
                        checked={props.viewTrigger.directionForward}
                        onChange={e => props.viewTrigger.setDirectionForward(!props.viewTrigger.directionForward)}
                    />
                    <InputLabel htmlFor={props.viewTrigger.$modelId + "-forward"}>
                        {t("editor.npc_inspector_view_direction_forward")}
                    </InputLabel>
                </InputContainer>

                <InputContainer>
                    <Input
                        type={"checkbox"}
                        id={props.viewTrigger.$modelId + "-backward"}
                        checked={props.viewTrigger.directionBackward}
                        onChange={e => props.viewTrigger.setDirectionBackward(!props.viewTrigger.directionBackward)}
                    />
                    <InputLabel htmlFor={props.viewTrigger.$modelId + "-backward"}>
                        {t("editor.npc_inspector_view_direction_backward")}
                    </InputLabel>
                </InputContainer>

                <InputContainer>
                    <Input
                        type={"checkbox"}
                        id={props.viewTrigger.$modelId + "-left"}
                        checked={props.viewTrigger.directionLeft}
                        onChange={e => props.viewTrigger.setDirectionLeft(!props.viewTrigger.directionLeft)}
                    />
                    <InputLabel htmlFor={props.viewTrigger.$modelId + "-left"}>
                        {t("editor.npc_inspector_view_direction_left")}
                    </InputLabel>
                </InputContainer>

                <InputContainer>
                    <Input
                        type={"checkbox"}
                        id={props.viewTrigger.$modelId + "-right"}
                        checked={props.viewTrigger.directionRight}
                        onChange={e => props.viewTrigger.setDirectionRight(!props.viewTrigger.directionRight)}
                    />
                    <InputLabel htmlFor={props.viewTrigger.$modelId + "-right"}>
                        {t("editor.npc_inspector_view_direction_right")}
                    </InputLabel>
                </InputContainer>
            </FlexRow>
            {!props.isCurrentMapPartOfTheModule && (
                <FlexRow>
                    <label>
                        <input type="checkbox" checked={props.viewTrigger.isModuleGate} onChange={() => props.viewTrigger.setIsModuleGate(!props.viewTrigger.isModuleGate)} />&nbsp;
                        {t("editor.element_is_module_gate_area_trigger")}
                    </label>
                </FlexRow>
            )}
        </Container>
    );
});