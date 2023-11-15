import React from 'react';
import { observer } from "mobx-react-lite";
import { AnimationElementValueModel } from '../../../../shared/action/ValueModel';
import { useTranslation } from 'react-i18next';
import { StringActionDetail } from './components/StringActionDetail';

interface Props {
    valueInstance: AnimationElementValueModel;
}

export const TreeParameterActionAnimationElementValueExtraDetails: React.FunctionComponent<Props> = observer(({ valueInstance }) => {
    const { t } = useTranslation();

    const selectAnimationInTemplateOption = "shouldSelectAnimationInTemplate";
    const selectAnimationInPlayAnimationActionOption = "shouldSelectAnimationInPlayAnimationAction";

    return (
        <div>
            <select
                value={valueInstance.shouldSelectAnimationInTemplate ? selectAnimationInTemplateOption : selectAnimationInPlayAnimationActionOption}
                onChange={({ target }) => {
                    if (target.value === selectAnimationInTemplateOption) {
                        valueInstance.setShouldSelectAnimationInTemplate();
                    } else {
                        valueInstance.setHasRequiredAnimationNames();
                    }
                }}
            >
                <option value={selectAnimationInTemplateOption}>{t("action_editor.property_should_select_animation_in_template")}</option>
                <option value={selectAnimationInPlayAnimationActionOption}>{t("action_editor.property_has_required_animations")}</option>
            </select>
            {valueInstance.hasRequiredAnimationNames && (
                <StringActionDetail
                    name={t("action_editor.property_required_animation_sequences")}
                    value={valueInstance.requiredAnimationNamesString}
                    valueSetter={valueInstance.setRequiredAnimationNamesString.bind(valueInstance)}
                    allowBlankValue={false}
                />
            )}
        </div>
    );
});