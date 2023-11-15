import React, { ChangeEvent, useState } from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { populateTranslationData } from '../../helper/translationHelpers';
import { errorStore } from '../../stores/ErrorStore';
import { TranslationListDisplay } from './TranslationListDisplay';
import { TranslationDataStatsDisplay } from './TranslationDataStatsDisplay';
import { translationStore } from '../../stores/TranslationStore';
import { TranslationImportingPopup } from './TranslationImporting';
import { TranslationHeader } from './TranslationHeader';
import { wait } from '../../../shared/helper/generalHelpers';
import { readUnicodeText, readTextUsingEncodingLibrary } from '../../helper/fileHelpers';

enum Method {
    UTF8 = "UTF8",
    Unicode = "Unicode",
    Detect = "Detect"
}

export const TranslationImport: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const [method, setMethod] = useState(Method.Detect);

    const { translationData } = translationStore;

    const onFileSet = async (e: ChangeEvent<HTMLInputElement>) => {
        try {
            const { target } = e;
            const file = target.files[0];
            if (!file)
                return;

            translationStore.setTranslationData(null);

            await wait(1);

            let importCSV: string;

            switch (method) {
                case Method.UTF8:
                    importCSV = await file.text();
                    break;

                case Method.Unicode:
                    importCSV = await readUnicodeText(file);
                    break;

                case Method.Detect:
                    importCSV = await readTextUsingEncodingLibrary(file);
                    break;

                default:
                    throw new Error("Not implemented: " + method);
            }

            target.value = null;

            translationStore.setTranslationData(populateTranslationData(file.name, importCSV));
        } catch (e) {
            errorStore.addErrorFromErrorObject(e);
        }
    };

    return (
        <div>
            <TranslationHeader titleKey=/*t*/"translation.import" />
            <div>
                {t("translation.upload_translation")}:&nbsp;
                <select
                    value={method}
                    onChange={({ target }) => setMethod(target.value as Method)}
                >
                    <option value={Method.Detect}>Auto</option>
                    <option value={Method.UTF8}>UTF8</option>
                    <option value={Method.Unicode}>Unicode</option>
                </select>
                <input
                    type="file"
                    accept={"text/csv"}
                    onChange={onFileSet}
                />
            </div>
            {translationData && (
                <>
                    <div>
                        <button onClick={() => translationStore.setTranslationData(populateTranslationData(translationData.filename, translationData.importCSV))}>{t("translation.reset_choices_and_reload")}</button>
                    </div>
                    <div>
                        <h2>{t("translation.loaded", { filename: translationData.filename })}</h2>
                        <TranslationDataStatsDisplay />
                        <button
                            disabled={!translationStore.mayCommitChanges}
                            onClick={() => translationStore.commitChanges().catch(errorStore.addErrorFromErrorObject)}
                        >
                            {t("translation.commit_changes", { count: translationStore.commitActionCount })}
                        </button>
                    </div>
                    <TranslationListDisplay titleKey={/*t*/"translation.translations"} translations={translationData.translations} translationData={translationData} />
                    <TranslationListDisplay titleKey={/*t*/"translation.stats_translations_for_deleted_entities"} translations={translationData.translationsForRemovedElements} translationData={translationData} />
                    <TranslationImportingPopup />
                </>
            )}
        </div>
    );
});