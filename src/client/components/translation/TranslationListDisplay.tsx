import React, { ReactElement } from 'react';
import styled, { css } from 'styled-components';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { TranslationAction, TranslationData, TranslationStringData } from '../../helper/translationHelpers';
import { Gender, genders } from '../../../shared/definitions/other/Gender';
import { TranslationActionSelection } from './TranslationActionSelection';

const Table = styled.table`
    border-collapse: collapse;

    tr {
        border: 1px solid lightgrey;
    }

    th, td {
        padding: 5px 10px;
    }
`;

interface RowProps {
    discarded: boolean;
}

const Row = styled.tr<RowProps>`
    ${props => props.discarded && css`color: #c0c0c0;`}
`;

enum CellState {
    Normal,
    Problematic,
    Translated
}

interface CellProps {
    state: CellState;
    action: TranslationAction;
    proxyContent?: boolean;
}

const Cell = styled.td<CellProps>`
    ${props => props.proxyContent && css`font-style: italic; color: grey;`}
    ${props => ((props.state === CellState.Problematic) && (props.action === TranslationAction.NotSet)) && css`background-color: red;`}
    ${props => ((props.state === CellState.Translated) && (props.action === TranslationAction.NotSet)) && css`background-color: lightgrey;`}
    ${props => ((props.state !== CellState.Normal) && (props.action === TranslationAction.Commit)) && css`background-color: #77ff77;`}
    ${props => (props.action === TranslationAction.Discard) && css`color: #c0c0c0;`}
`;

const PreviousText = styled.div`
    text-decoration: line-through;
`;

const NewText = styled.div`
`;

const Remark = styled.div`
`;

const Empty = () => <>[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</>;

interface TranslationDisplayProps {
    translation: TranslationStringData;
}

const TranslationDisplay: React.FunctionComponent<TranslationDisplayProps> = observer(({ translation }) => {
    const { t } = useTranslation();

    const {
        entityLabel,
        translatableStringLabel,
        translationsByGender,
        stillExists
    } = translation;

    const displays = new Array<ReactElement>();

    let hasNonDiscardedSubelements = false;

    for (const gender of genders) {
        const translationDataForGender = translationsByGender.get(gender);
        const {
            currentSourceLanguageString,
            currentTargetLanguageString,
            importSourceLanguageString,
            importTargetLanguageString,
            sourceLanguageStringChanged,
            targetLanguageStringChanged,
            action,
            sourceReplacedFromNeutral
        } = translationDataForGender;

        // No update necessary
        if (!targetLanguageStringChanged)
            continue;

        if (action !== TranslationAction.Discard) {
            hasNonDiscardedSubelements = true;
        }

        let sourceState = sourceLanguageStringChanged ? CellState.Problematic : CellState.Translated;
        let targetState = (targetLanguageStringChanged && (currentTargetLanguageString.length > 0)) ? CellState.Problematic : CellState.Translated;

        if (!stillExists) {
            sourceState = CellState.Normal;
            targetState = CellState.Normal;
        }

        displays.push(
            <>
                <Cell state={CellState.Normal} action={action}>
                    {t("game.character_config_gender_option" + gender)}
                </Cell>
                {stillExists && (
                    <Cell state={sourceState} action={action} proxyContent={sourceReplacedFromNeutral}>
                        {sourceReplacedFromNeutral && <Remark>{t("game.character_config_gender_option" + Gender.Neutral)}:</Remark>}
                        {sourceLanguageStringChanged && (
                            <PreviousText>{importSourceLanguageString || <Empty />}</PreviousText>
                        )}
                        <NewText>{currentSourceLanguageString}</NewText>
                    </Cell>
                )}
                {!stillExists && (
                    <Cell state={CellState.Normal} action={action}>
                        <div>{importSourceLanguageString || <Empty />}</div>
                    </Cell>
                )}
                <Cell state={targetState} action={action}>
                    <PreviousText>{currentTargetLanguageString}</PreviousText>
                    <NewText>{importTargetLanguageString}</NewText>
                </Cell>
                {stillExists && (
                    <Cell state={CellState.Normal} action={action}>
                        <TranslationActionSelection translation={translation} gender={gender} />
                    </Cell>
                )}
            </>
        );
    }

    if (displays.length === 0)
        return null;

    const rowDiscarded = !stillExists || !hasNonDiscardedSubelements;

    return (
        <>
            <Row discarded={rowDiscarded}>
                <td rowSpan={displays.length}>{entityLabel}</td>
                <td rowSpan={displays.length}>{translatableStringLabel}</td>
                {displays[0]}
            </Row>
            {displays.slice(1).map((display, index) => (
                <Row discarded={rowDiscarded} key={index}>
                    {display}
                </Row>
            ))}
        </>
    );
});

interface TranslationListDisplayProps {
    titleKey: string;
    translations: TranslationStringData[];
    translationData: TranslationData;
}

export const TranslationListDisplay: React.FunctionComponent<TranslationListDisplayProps> = observer(({
    titleKey, translations, translationData
}) => {
    const { t } = useTranslation();

    const {
        sourceLanguageKey,
        targetLanguageKey
    } = translationData;

    return (
        <div>
            <h2>{t(titleKey)}</h2>
            <Table>
                <tbody>
                    <tr>
                        <th colSpan={3}></th>
                        <th>{t("translation.language_" + sourceLanguageKey)}</th>
                        <th>{t("translation.language_" + targetLanguageKey)}</th>
                    </tr>
                    {translations.map(translation =>
                        <TranslationDisplay
                            key={translation.translatedStringModelId}
                            translation={translation}
                        />
                    )}
                </tbody>
            </Table>
        </div>
    );
});