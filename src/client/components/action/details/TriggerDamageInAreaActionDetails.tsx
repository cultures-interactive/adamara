import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { MapElementSelectionDetail } from './components/MapElementSelectionDetail';
import { MapElementFilter } from "../../../helper/MapElementFilter";
import { TriggerDamageInAreaActionModel } from '../../../../shared/action/ActionModel';
import { NumberActionDetail } from './components/NumberActionDetail';

interface Props {
    action: TriggerDamageInAreaActionModel;
}

export const TriggerDamageInAreaActionDetails: React.FunctionComponent<Props> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <div>
            <MapElementSelectionDetail name={t("action_editor.property_area_trigger")}
                selectedElement={action.mapElement}
                elementSetter={action.setMapElement.bind(action)}
                getSelectableElements={MapElementFilter.filterTriggerLabelsWithoutViewAreaTriggers}
                parameterTypes={["actions/AreaTriggerValueModel"]}
            />
            <NumberActionDetail name={t("action_editor.property_damage")} value={action.damage} valueSetter={action.setDamage.bind(action)} />
            <NumberActionDetail name={t("action_editor.property_delay")} value={action.delay} valueSetter={action.setDelay.bind(action)} />
            <NumberActionDetail name={t("action_editor.property_duration")} value={action.duration} valueSetter={action.setDuration.bind(action)} />
        </div>
    );
});