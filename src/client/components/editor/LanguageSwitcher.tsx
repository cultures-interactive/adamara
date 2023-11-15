import React from 'react';
import { validLanguages, getLanguageData } from '../../../shared/data/languages';
import i18n from '../../integration/i18n';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher: React.FunctionComponent = () => {
    // Use the useTranslation hook just to have this component refresh when the language changes
    useTranslation();

    return (
        <>
            <select
                value={i18n.language}
                onChange={({ target }) => {
                    i18n.changeLanguage(target.value).catch(console.error);
                }}
            >
                {
                    validLanguages.map(languageKey => <option key={languageKey} value={languageKey}>{getLanguageData(languageKey).languageName}</option>)
                }
            </select>
        </>
    );
};
