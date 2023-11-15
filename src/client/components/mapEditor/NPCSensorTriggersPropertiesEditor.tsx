import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { DynamicMapElementNPCModel } from "../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { MenuCardSubLabel } from "../menu/MenuCardSubLabel";
import { MenuCardScrollContainer } from "../menu/MenuCardScrollContainer";
import { MdAddCircle } from "react-icons/md";
import { NPCSensorSingleTriggerPropertiesEditor } from "./NPCSensorSingleTriggerPropertiesEditor";
import { ViewAreaTriggerModel } from "../../../shared/game/ViewAreaTriggerModel";
import { UiConstants } from "../../data/UiConstants";

interface Props {
    npc: DynamicMapElementNPCModel;
    isCurrentMapPartOfTheModule: boolean;
}

const AddButton = styled.button`
    cursor: pointer;
    margin-left: 5px;
    margin-bottom: 4px;
`;

const AddIcon = styled(MdAddCircle)`
    vertical-align: bottom;
    margin-right: 2px;
`;

const Container = styled.div`
    margin-left: 5px;
    border-radius: ${UiConstants.BORDER_RADIUS};
    border: 1px black solid;
`;

export const NPCSensorTriggersPropertiesEditor: React.FunctionComponent<Props> = observer(({ npc, isCurrentMapPartOfTheModule }) => {
    const { t } = useTranslation();


    function addViewTrigger() {
        npc.addViewAreaTrigger(new ViewAreaTriggerModel({}));
    }

    function deleteViewTrigger(trigger: ViewAreaTriggerModel) {
        npc.removeViewAreaTrigger(trigger);
    }

    return (
        <>
            <MenuCardSubLabel>{t("editor.npc_inspector_sensors")} ({npc.viewAreaTriggers.length})</MenuCardSubLabel>

            <AddButton onClick={addViewTrigger}> <AddIcon />{t("editor.npc_inspector_add_sensor")}</AddButton>

            {
                npc.viewAreaTriggers.length > 0 &&
                (
                    <Container>
                        {npc.viewAreaTriggers.map(trigger => (
                            <NPCSensorSingleTriggerPropertiesEditor
                                key={trigger.$modelId}
                                viewTrigger={trigger}
                                onDeleteTrigger={deleteViewTrigger}
                                isCurrentMapPartOfTheModule={isCurrentMapPartOfTheModule}
                            />
                        ))}
                    </Container>
                )
            }
        </>
    );
});