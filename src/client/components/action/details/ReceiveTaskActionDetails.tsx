import React from 'react';
import { observer } from "mobx-react-lite";
import { ReceiveTaskActionModel } from '../../../../shared/action/ActionModel';
import { StringActionDetail } from './components/StringActionDetail';
import { QuestOrTaskActionDetail } from './QuestOrTaskActionDetail';
import { useTranslation } from 'react-i18next';
import { MapElementSelectionDetail } from './components/MapElementSelectionDetail';
import { MapElementFilter } from "../../../helper/MapElementFilter";
import { extendedMapMarkerValueModelTypesArray } from '../../../../shared/action/ValueModel';
import { getTreeParent } from '../../../../shared/action/ActionTreeModel';

interface ReceiveTaskActionDetailsProps {
    action: ReceiveTaskActionModel;
}

export const ReceiveTaskActionDetails: React.FunctionComponent<ReceiveTaskActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    const parentTree = getTreeParent(action);

    return <>
        <StringActionDetail name={t("action_editor.property_task_id")} value={action.taskName} valueSetter={action.setTaskName.bind(action)} allowBlankValue={false} />
        <QuestOrTaskActionDetail questId={action.questId} questIdSetter={action.setQuestId.bind(action)} text={action.description} parentTree={parentTree} />
        {
            action.location && (
                <MapElementSelectionDetail name={t("action_editor.property_map_marker")}
                    selectedElement={action.location}
                    elementSetter={action.setLocation.bind(action)}
                    parameterTypes={extendedMapMarkerValueModelTypesArray}
                    getSelectableElements={MapElementFilter.filterExtendedMapMarkerLabels}
                />
            )
        }
    </>;
});