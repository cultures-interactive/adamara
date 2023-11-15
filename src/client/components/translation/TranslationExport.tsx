import React, { useState } from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { LanguageDropdown } from './LanguageDropdown';
import { clientCollectTranslatableEntityData, translatableEntityDataArrayToCSV } from '../../helper/translationHelpers';
import { TranslationHeader } from './TranslationHeader';
import { editorStore } from '../../stores/EditorStore';

const TranslationCSVDebugOutput = styled.div`
    white-space: pre;
`;

const csvSeparatorOptions = [
    ";",
    ","
];

export const TranslationExport: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const [sourceLanguage, setSourceLanguage] = useState("de");
    const [targetLanguage, setTargetLanguage] = useState("en");
    const [csvSeparator, setCsvSeparator] = useState(csvSeparatorOptions[0]);

    const complete = sourceLanguage && targetLanguage;

    const translatableEntities = complete && clientCollectTranslatableEntityData(sourceLanguage);
    const csvText = complete && translatableEntityDataArrayToCSV(translatableEntities, sourceLanguage, targetLanguage, csvSeparator);

    const exportTranslatableText = () => {
        const file = new Blob(["\uFEFF" + csvText], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);

        const { sessionModule } = editorStore;
        const context = sessionModule ? `${sessionModule.workshopName}-${sessionModule.moduleName}` : "core-game";
        a.download = `translatableText-${sourceLanguage}-to-${targetLanguage}-${context}.csv`;
        a.click();
    };

    return (
        <div>
            <TranslationHeader titleKey=/*t*/"translation.export" />
            <div>{t("translation.base_language")}: <LanguageDropdown value={sourceLanguage} setValue={setSourceLanguage} /></div>
            <div>{t("translation.target_language")}: <LanguageDropdown value={targetLanguage} setValue={setTargetLanguage} /></div>
            <div>
                {t("translation.csv_separator")}:&nbsp;
                <select value={csvSeparator} onChange={e => setCsvSeparator(e.target.value)}>
                    {csvSeparatorOptions.map(divider => <option key={divider} value={divider}>{divider}</option>)}
                </select>
            </div>
            <div>
                <button onClick={exportTranslatableText}>
                    {t("editor.export_translatable_text")}
                </button>
            </div>
            {complete && (
                <>
                    <hr />
                    <TranslationCSVDebugOutput>
                        {csvText}
                    </TranslationCSVDebugOutput>
                </>
            )}
        </div>
    );
});