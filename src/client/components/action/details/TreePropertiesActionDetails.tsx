import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { StringActionDetail } from './components/StringActionDetail';
import { DisplayMode, TranslatedStringActionDetail } from './components/TranslatedStringActionDetail';
import { TreePropertiesActionModel } from '../../../../shared/action/ActionModel';
import { Dropdown } from '../../editor/Dropdown';
import { EditorComplexity } from '../../../../shared/definitions/other/EditorComplexity';
import { allEditorComplexities, localSettingsStore } from '../../../stores/LocalSettingsStore';
import { BooleanActionDetail } from './components/BooleanActionDetail';

interface TreePropertiesActionDetailsProps {
    action: TreePropertiesActionModel;
}

export const TreePropertiesActionDetails: React.FunctionComponent<TreePropertiesActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    if (!localSettingsStore.isProductionEditor) {
        return <div>{t("action_editor.only_available_in_production_editor")}</div>;
    }

    return (
        <>
            <TranslatedStringActionDetail name={t("editor.translated_name")} translatedString={action.localizedName} allowBlankValue={false} displayMode={DisplayMode.Simple} />
            <div>{t("editor.item_tags")}<br /><input type="text" value={action.tags.join(" ")} onChange={({ target }) => action.setTags(target.value.split(" "))} /></div>
            <TranslatedStringActionDetail name={t("action_editor.property_description")} translatedString={action.description} displayMode={DisplayMode.Simple} allowBlankValue={true} />
            <TranslatedStringActionDetail name={t("action_editor.property_tutorial")} translatedString={action.tutorial} displayMode={DisplayMode.Simple} allowBlankValue={true} />
            <StringActionDetail name={t("action_editor.property_color")} value={action.color} valueSetter={action.setColor.bind(action)} allowBlankValue={true} />
            <StringActionDetail name={t("action_editor.property_icon")} value={action.icon} valueSetter={action.setIcon.bind(action)} allowBlankValue={true} />
            <div>
                {t("action_editor.property_complexity_gate")}
                <br />
                <Dropdown
                    value={action.complexityGate}
                    onChange={(e => action.setComplexityGate(+e.target.value as EditorComplexity))}
                >
                    {allEditorComplexities.map(complexity => (
                        <option
                            key={complexity}
                            value={complexity}
                        >
                            {t("editor.local_setting_complexity_" + complexity)}
                        </option>
                    ))}
                </Dropdown>
            </div>
            <div>
                {t("action_editor.property_minimum_complexity")}
                <br />
                <Dropdown
                    value={action.minimumComplexity}
                    onChange={(e => action.setMinimumComplexity(+e.target.value as EditorComplexity))}
                >
                    {allEditorComplexities.map(complexity => (
                        <option
                            key={complexity}
                            value={complexity}
                        >
                            {t("editor.local_setting_complexity_" + complexity)}
                        </option>
                    ))}
                </Dropdown>
            </div>
            <BooleanActionDetail name={t("action_editor.property_exclude_from_translations")} checked={action.excludeFromTranslations} toggle={action.toggleExcludeFromTranslations.bind(action)} />
        </>
    );

});