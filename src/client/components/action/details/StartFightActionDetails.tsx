import React from 'react';
import { observer } from "mobx-react-lite";
import { StartFightActionModel } from '../../../../shared/action/ActionModel';
import { FaPlusCircle } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ActionEditorChangeGroup, groupUndoableActionEditorChanges } from '../../../stores/undo/operation/ActionEditorSubmitChangesOp';
import styled from 'styled-components';
import { MapElementReferenceModel } from '../../../../shared/action/MapElementReferenceModel';
import { MapElementSelectionDetail } from './components/MapElementSelectionDetail';
import { MapElementFilter } from "../../../helper/MapElementFilter";
import { AiFillDelete } from "react-icons/ai";
import { ElementGroup, ElementGroupContainer } from './components/BaseElements';

const EnemyContainer = styled(ElementGroupContainer)`
    display: flex;
    flex-direction: row;
`;

const IconButton = styled.div`
    margin-top: -2px;
    float: right;
    color: #555555;
    cursor: pointer;
    font-size: large;

    &:hover {
        color: black;
    }
`;

interface StartFightActionDetailsProps {
    action: StartFightActionModel;
}

export const StartFightActionDetails: React.FunctionComponent<StartFightActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <>
            {
                action.enemies.map(
                    (enemy, index) => (
                        <EnemyContainer key={index}>
                            <MapElementSelectionDetail
                                name={(t("action_editor.property_enemy") + " " + (index + 1))}
                                selectedElement={enemy}
                                elementSetter={(npc) => {
                                    groupUndoableActionEditorChanges(ActionEditorChangeGroup.UnspecificGroupedNodeChanges, () => {
                                        action.removeEnemy(index);
                                        action.addEnemy(index, npc);
                                    });
                                }}
                                parameterTypes={["actions/EnemyOnMapValueModel"]}
                                getSelectableElements={MapElementFilter.filterEnemiesLabels}
                            />
                            <IconButton onClick={() => action.removeEnemy(index)}><AiFillDelete /></IconButton>
                        </EnemyContainer>
                    )
                )
            }
            <ElementGroup>
                <button onClick={() => action.addEnemy(action.enemies.length, new MapElementReferenceModel({}))}><FaPlusCircle /> {t("action_editor.property_add_enemy")}</button>
            </ElementGroup>
        </>
    );
});