import React from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { IntInputField } from '../shared/IntInputField';
import { useTranslation } from 'react-i18next';
import { Gesture, GesturePatternModel } from '../../../shared/combat/gestures/GesturePatternModel';
import { LineGestureModel } from '../../../shared/combat/gestures/LineGestureModel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import { CircleGestureModel } from '../../../shared/combat/gestures/CircleGestureModel';
import { GesturePointModel } from '../../../shared/combat/gestures/GesturePointModel';
import { GesturePatternPreview } from './GesturePatternPreview';
import { undoableCombatConfigurationDeleteGesturePattern } from '../../stores/undo/operation/CombatConfigurationSubmitChangesOp';

const DeleteButtonContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    
    button {
        color: red;
    }
`;

interface PointEditorProps {
    point: GesturePointModel;
}

export const PointEditor: React.FunctionComponent<PointEditorProps> = observer(({ point }) => {
    return (
        <span>
            (&nbsp;
            <IntInputField value={point.x} onChange={point.setX.bind(point)} />
            &nbsp;|&nbsp;
            <IntInputField value={point.y} onChange={point.setY.bind(point)} />
            &nbsp;)
        </span>
    );
});

interface GestureEditorProps {
    gesturePattern: GesturePatternModel;
    gesture: Gesture;
    gestureIndex: number;
}

export const GestureEditor: React.FunctionComponent<GestureEditorProps> = observer(({ gesturePattern, gesture, gestureIndex }) => {
    const { t } = useTranslation();

    if (gesture instanceof LineGestureModel) {
        return (
            <tr>
                <td>{t("editor.combat_configuration_gesture_line")}:</td>
                <td>
                    {t("editor.combat_configuration_gesture_line_from")} <PointEditor point={gesture.from} />
                    &nbsp;—&nbsp;
                    {t("editor.combat_configuration_gesture_line_to")} <PointEditor point={gesture.to} />
                    &nbsp;
                    <button onClick={() => gesturePattern.removeGesture(gestureIndex)}><FontAwesomeIcon icon={faMinusCircle} /></button>
                </td>
            </tr>
        );
    }

    if (gesture instanceof CircleGestureModel) {
        return (
            <tr key={gesture.$modelId}>
                <td>{t("editor.combat_configuration_gesture_circle")}:</td>
                <td>
                    {t("editor.combat_configuration_gesture_circle_center")} <PointEditor point={gesture.center} />
                    ,&nbsp;
                    {t("editor.combat_configuration_gesture_circle_radius")} <IntInputField value={gesture.radius} onChange={gesture.setRadius.bind(gesture)} />&nbsp;
                    &nbsp;
                    <button onClick={() => gesturePattern.removeGesture(gestureIndex)}><FontAwesomeIcon icon={faMinusCircle} /></button>
                </td>
            </tr>
        );
    }

    throw new Error("Not implemented");
});

interface Props {
    gesturePattern: GesturePatternModel;
    isGlobalPattern: boolean;
}

export const GesturePatternEditor: React.FunctionComponent<Props> = observer(({ gesturePattern, isGlobalPattern }) => {
    const { t } = useTranslation();

    return (
        <div>
            <table>
                <tbody>
                    {/*isGlobalPattern && (
                        <tr>
                            <td>{t("editor.translated_name")}:</td>
                            <td>
                                <input
                                    value={gesturePattern.name.get(languageKey, false)}
                                    placeholder={gesturePattern.name.get(languageKey, true)}
                                    onChange={e => gesturePattern.name.set(languageKey, e.target.value)}
                                />
                            </td>
                        </tr>
                    )*/}
                    <tr>
                        <td>{t("editor.combat_configuration_gesture_pattern_gesture_precision")}:</td>
                        <td><IntInputField value={gesturePattern.precision} onChange={gesturePattern.setPrecision.bind(gesturePattern)} /></td>
                    </tr>
                    <tr>
                        <td>{t("editor.combat_configuration_gesture_pattern_miss_tolerance")}:</td>
                        <td><IntInputField value={gesturePattern.missTolerance} onChange={gesturePattern.setMissTolerance.bind(gesturePattern)} /></td>
                    </tr>
                    <tr>
                        <td>{t("editor.combat_configuration_gesture_pattern_a11y_key_sequence")}:</td>
                        <td><input type="text" size={10} value={gesturePattern.keySequence} onChange={({ target }) => {
                            if (target.value.match("^[wWaAsSD]*$")) {
                                gesturePattern.setKeySequence(target.value.toUpperCase());
                            }
                        }} /></td>
                    </tr>
                    <tr>
                        <td colSpan={2}>
                            <GesturePatternPreview gesturePattern={gesturePattern} width={200} />
                        </td>
                    </tr>
                    {gesturePattern.gestures.map((gesture, index) => (
                        <GestureEditor
                            key={gesture.$modelId}
                            gesturePattern={gesturePattern}
                            gesture={gesture}
                            gestureIndex={index}
                        />
                    ))}
                    <tr>
                        <td colSpan={2}>
                            <button onClick={gesturePattern.addLineGesture.bind(gesturePattern)}>{t("editor.combat_configuration_gesture_pattern_add_line_gesture")}</button>
                            <button onClick={gesturePattern.addCircleGesture.bind(gesturePattern)}>{t("editor.combat_configuration_gesture_pattern_add_circle_gesture")}</button>
                        </td>
                    </tr>
                </tbody>
            </table>
            {isGlobalPattern && (
                <DeleteButtonContainer>
                    <button onClick={() => undoableCombatConfigurationDeleteGesturePattern(gesturePattern)}><FontAwesomeIcon icon={faMinusCircle} /> {t("editor.combat_configuration_gesture_pattern_delete")}</button>
                </DeleteButtonContainer>
            )}
        </div>
    );
});
