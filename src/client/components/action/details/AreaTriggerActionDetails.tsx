import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { MapElementSelectionDetail } from './components/MapElementSelectionDetail';
import { MapElementFilter } from "../../../helper/MapElementFilter";
import { Dropdown } from '../../editor/Dropdown';
import { LocationTriggerActionModel } from '../../../../shared/action/ActionModel';
import { ElementGroup } from './components/BaseElements';
import { BooleanActionDetail } from './components/BooleanActionDetail';

interface AreaTriggerActionDetailsProps {
    action: LocationTriggerActionModel;
}

export const AreaTriggerActionDetails: React.FunctionComponent<AreaTriggerActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <>
            <MapElementSelectionDetail name={null}
                selectedElement={action.mapElement}
                elementSetter={value => action.setMapElement(value)}
                getSelectableElements={MapElementFilter.filterTriggerLabels}
                parameterTypes={["actions/AreaTriggerValueModel"]}
            />
            <ElementGroup>
                <Dropdown
                    value={action.triggerOnEnter ? "1" : "0"}
                    onChange={e => action.setTriggerOnEnter(e.target.value === "1")}
                >
                    <option value="1">{t("content.answer_enter")}</option>
                    <option value="0">{t("content.answer_leave")}</option>
                </Dropdown>
            </ElementGroup>
            {(action.triggerOnEnter && action.toggleCheckOnActivation) && (
                <BooleanActionDetail name={t("action_editor.property_check_trigger_on_activation")} checked={action.checkOnActivation} toggle={action.toggleCheckOnActivation.bind(action)} />
            )}
            {(action.triggerOnEnter && action.toggleStopPlayerPath) && (
                <BooleanActionDetail name={t("action_editor.property_stop_player_path")} checked={action.stopPlayerPath} toggle={action.toggleStopPlayerPath.bind(action)} />
            )}
        </>
    );
});