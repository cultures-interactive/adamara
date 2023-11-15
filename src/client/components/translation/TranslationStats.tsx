import React, { useState } from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { clientCollectTranslatableEntityData } from '../../helper/translationHelpers';
import { validLanguages } from '../../../shared/data/languages';
import { LanguageDropdown } from './LanguageDropdown';
import { TranslatedString } from '../../../shared/game/TranslatedString';
import { wrapIterator } from '../../../shared/helper/IterableIteratorWrapper';
import { isBlank } from '../../../shared/helper/generalHelpers';
import { TranslationHeader } from './TranslationHeader';

const Table = styled.table`
    border-collapse: collapse;

    tr {
        border: 1px solid lightgrey;
    }

    th, td {
        padding: 5px 10px;
    }
`;

const TdLeft = styled.td`
    text-align: right;
`;

const TdCenter = styled.td`
    text-align: center;
`;

function getTranslatedNeutralStringPercentage(translatedStrings: TranslatedString[], language: string) {
    let translatedCount = 0;
    for (const translatedString of translatedStrings) {
        if (!isBlank(translatedString.get(language, false))) {
            translatedCount++;
        }
    }

    return translatedCount / translatedStrings.length;
}

export const TranslationStats: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const [sourceLanguage, setSourceLanguage] = useState("de");

    const translatableEntities = clientCollectTranslatableEntityData(sourceLanguage);
    const translatedStrings = new Array<TranslatedString>();
    const translatedStringsByEntityLabel = new Map<string, TranslatedString[]>();

    for (const { label, translateableStrings } of translatableEntities) {
        if (!translatedStringsByEntityLabel.has(label)) {
            translatedStringsByEntityLabel.set(label, []);
        }

        const entityTranslatedStrings = translateableStrings.map(translatableString => translatableString.translatedString);
        translatedStrings.push(...entityTranslatedStrings);
        translatedStringsByEntityLabel.get(label).push(...entityTranslatedStrings);
    }

    const languagesExceptSource = validLanguages.filter(language => language != sourceLanguage);

    return (
        <>
            <TranslationHeader titleKey=/*t*/"translation.stats" />
            <div>{t("translation.base_language")}: <LanguageDropdown value={sourceLanguage} setValue={setSourceLanguage} /></div>
            <br />
            <div>
                {t("translation.stats_description")}
            </div>
            <br />
            <Table>
                <tbody>
                    <tr>
                        <TdLeft></TdLeft>
                        <TdCenter>{t("translation.full_text_count")}</TdCenter>
                        {languagesExceptSource.map(language => <TdCenter key={language}>{t("translation.language_" + language)}</TdCenter>)}
                    </tr>
                    {wrapIterator(translatedStringsByEntityLabel.keys()).map(entityLabel => (
                        <tr key={entityLabel}>
                            <TdLeft>{entityLabel}</TdLeft>
                            <TdCenter>{translatedStringsByEntityLabel.get(entityLabel).length}</TdCenter>
                            {languagesExceptSource.map(language => (
                                <TdCenter key={language}>
                                    {Math.floor(getTranslatedNeutralStringPercentage(translatedStringsByEntityLabel.get(entityLabel), language) * 100)}%
                                </TdCenter>
                            ))}
                        </tr>
                    ))}
                    <tr>
                        <TdLeft>Total</TdLeft>
                        <TdCenter>{translatedStrings.length}</TdCenter>
                        {languagesExceptSource.map(language => (
                            <TdCenter key={language}>
                                {Math.floor(getTranslatedNeutralStringPercentage(translatedStrings, language) * 100)}%
                            </TdCenter>
                        ))}
                    </tr>
                </tbody>
            </Table>
        </>
    );
});