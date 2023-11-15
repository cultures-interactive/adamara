import React from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguageData, validLanguages } from '../../../shared/data/languages';

interface Props {
    value: string;
    setValue: (value: string) => void;
}

export const LanguageDropdown: React.FunctionComponent<Props> = ({ value, setValue }) => {
    const { t } = useTranslation();

    return (
        <select
            value={value}
            onChange={({ target }) => setValue(target.value)}
        >
            {
                validLanguages.map(language => <option key={language} value={language}>{t("translation.language_" + language)}</option>)
            }
        </select>
    );
};