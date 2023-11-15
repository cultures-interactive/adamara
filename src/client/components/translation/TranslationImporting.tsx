import React from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { translationStore } from '../../stores/TranslationStore';
import { Overlay, CenterContainer, PopupWindow } from '../shared/PopupComponents';
import { UiConstants } from '../../data/UiConstants';
import { LoadingBarBlock } from '../shared/LoadingBar';

const ModalOverlay = styled(Overlay)`
    z-index: ${UiConstants.Z_INDEX_MODAL};
`;

const ErrorDiv = styled.div`
    color: darkred;
`;

export const TranslationImportingPopup: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    if (!translationStore.showingImportingPopup)
        return null;

    const { isImporting, importResults } = translationStore;
    const { progressPercentage100Floored, successfulLines, failedLines, totalLineCount } = importResults;

    return (
        <ModalOverlay>
            <CenterContainer>
                <PopupWindow>
                    <h1>{t("translation.importing_popup_headline", { totalLineCount })}</h1>
                    <LoadingBarBlock
                        label={t("translation.import_progress")}
                        percentage100={progressPercentage100Floored}
                    />
                    {(failedLines > 0) && <ErrorDiv>{t("translation.import_lines_failed", { failedLines })}</ErrorDiv>}
                    {!isImporting && (
                        <>
                            <div>{t("translation.importing_finished")}</div>
                            <div>{t("translation.importing_finished_successful_line_count", { successfulLines })}</div>
                            {(failedLines > 0) && <ErrorDiv>{t("translation.importing_finished_failed_line_count", { failedLines })}</ErrorDiv>}
                        </>
                    )}
                    <button disabled={isImporting} onClick={translationStore.closeImportingPopup}>
                        {t("translation.importing_popup_close")}
                    </button>
                </PopupWindow>
            </CenterContainer>
        </ModalOverlay>
    );
});