import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { undoStore } from '../../stores/undo/UndoStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faPuzzlePiece, faRedo, faUndo } from '@fortawesome/free-solid-svg-icons';
import { dataConstants } from '../../../shared/data/dataConstants';
import { DebugWait } from '../debug/DebugWait';
import { localSettingsStore } from '../../stores/LocalSettingsStore';

const UndoRedoDebugArea = styled.div`
    position: absolute;
    background: rgba(255, 255, 255, 0.5);
    pointer-events: none;
    white-space: nowrap;
`;

export const HeaderUndoRedo: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const { hasUndo, hasRedo } = undoStore;

    return (
        <>
            <div>
                {false && dataConstants.isDevelopment && <DebugWait />}
                <button disabled={!hasUndo} onClick={undoStore.undo}><FontAwesomeIcon icon={faUndo} /> {t("editor.undo")}</button>
                <button disabled={!hasRedo} onClick={undoStore.redo}><FontAwesomeIcon icon={faRedo} /> {t("editor.redo")}</button>
            </div>
            {localSettingsStore.showUndoHistoryDebug && (
                <UndoRedoDebugArea>
                    {(undoStore.redoQueue.length > 0) && (
                        <div>
                            <ol reversed start={undoStore.undoQueue.length + undoStore.redoQueue.length}>
                                {undoStore.redoQueue.map((element, i) => (
                                    <li
                                        key={i}
                                        style={i == (undoStore.redoQueue.length - 1) ? { fontWeight: "bold" } : null}
                                    >
                                        {t(element.nameTranslationKey)}
                                        {element.isBusy && <>&nbsp;<FontAwesomeIcon icon={faCog} spin={true} /></>}
                                        {(i == (undoStore.redoQueue.length - 1)) ? ` ← ${t("editor.redo")}` : ""}
                                    </li>
                                ))}
                            </ol>
                            <hr />
                        </div>
                    )}
                    {(undoStore.undoQueue.length > 0) && (
                        <ol reversed start={undoStore.undoQueue.length}>
                            {undoStore.undoQueue.slice().reverse().slice(0, 5).map((element, i) => (
                                <li
                                    key={i}
                                    style={i == 0 ? { fontWeight: "bold" } : null}
                                >
                                    {t(element.nameTranslationKey)}
                                    {element.mayTryMerge && <>&nbsp;<FontAwesomeIcon icon={faPuzzlePiece} /></>}
                                    {element.isBusy && <>&nbsp;<FontAwesomeIcon icon={faCog} spin={true} /></>}
                                    {(i == 0) ? ` ← ${t("editor.undo")}` : ""}
                                </li>
                            ))}
                            {(undoStore.undoQueue.length > 5) && <li>...</li>}
                        </ol>
                    )}
                </UndoRedoDebugArea>
            )}
        </>
    );
});
