import React from 'react';
import { observer } from "mobx-react-lite";
import { StringActionDetail } from './components/StringActionDetail';
import { TreeParamterActionModel } from '../../../../shared/action/ActionModel';
import { AnimationElementValueModel, AreaTriggerValueModel, EnemyOnMapValueModel, ExtendedMapMarkerValueModel, FactionValueModel, InteractionTriggerValueModel, ItemIdValueModel, ItemTagValueModel, MapMarkerValueModel, NPCOnMapValueModel, NPCValueModel, NumberValueModel, PlayStyleValueModel, QuestIdValueModel, SoundValueModel, StringValueModel, TranslatedStringValueModel, ValueModel } from '../../../../shared/action/ValueModel';
import { useTranslation } from 'react-i18next';
import { clone } from 'mobx-keystone';
import { DisplayMode, TranslatedStringActionDetail } from './components/TranslatedStringActionDetail';
import { BooleanActionDetail } from './components/BooleanActionDetail';
import { TreeParameterActionAnimationElementValueExtraDetails } from './TreeParameterActionAnimationElementValueExtraDetails';
import { ElementGroup, ElementLabel } from './components/BaseElements';

const valueModelTypes = [
    new TranslatedStringValueModel({}),
    new ItemIdValueModel({}),
    new ItemTagValueModel({}),
    new NPCValueModel({}),
    new NPCOnMapValueModel({}),
    new EnemyOnMapValueModel({}),
    new AnimationElementValueModel({}),
    new FactionValueModel({}),
    new MapMarkerValueModel({}),
    new ExtendedMapMarkerValueModel({}),
    new AreaTriggerValueModel({}),
    new InteractionTriggerValueModel({}),
    new PlayStyleValueModel({}),
    new QuestIdValueModel({}),
    new StringValueModel({}),
    new NumberValueModel({}),
    new SoundValueModel({})
];

const valueModelPrototypes = valueModelTypes.reduce((obj: Record<string, ValueModel>, key) => {
    obj[key.$modelType] = key;
    return obj;
}, {});

interface Props {
    action: TreeParamterActionModel;
}

export const TreeParameterActionDetails: React.FunctionComponent<Props> = observer(({ action }) => {
    const { t } = useTranslation();
    return (
        <>
            <StringActionDetail name={t("action_editor.property_name")} value={action.name} valueSetter={action.setName.bind(action)} allowBlankValue={false} />
            <ElementGroup>
                <ElementLabel>{t("action_editor.property_type")}</ElementLabel>
                <select value={action.value.$modelType} onChange={({ target }) => action.setValue(clone(valueModelPrototypes[target.value]))}>
                    {valueModelTypes.map(valueModel => <option key={valueModel.$modelType} value={valueModel.$modelType}>{t(valueModel.title())}</option>)}
                </select>
            </ElementGroup>
            {
                (action.value instanceof AnimationElementValueModel) && (
                    <TreeParameterActionAnimationElementValueExtraDetails valueInstance={action.value} />
                )
            }
            <TranslatedStringActionDetail name={t("action_editor.property_outside_label")} translatedString={action.description} displayMode={DisplayMode.Simple} allowBlankValue={true} />
            <TranslatedStringActionDetail name={t("action_editor.property_tutorial")} translatedString={action.tutorial} displayMode={DisplayMode.Simple} allowBlankValue={true} />
            <BooleanActionDetail name={t("action_editor.property_dividing_line")} checked={action.dividingLine} toggle={action.toggleDividingLine.bind(action)} />
            <BooleanActionDetail name={t("action_editor.property_show_on_node")} checked={action.showOnNode} toggle={action.toggleShowOnNode.bind(action)} />
            <BooleanActionDetail name={t("action_editor.allow_blank_value")} checked={action.allowBlankValue} toggle={action.toggleAllowBlankValue.bind(action)} />
        </>
    );
});