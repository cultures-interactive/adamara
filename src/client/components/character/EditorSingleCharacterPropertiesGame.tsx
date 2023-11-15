import React from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { InvalidCriteriaMessage } from "../shared/InvalidCriteriaMessage";
import { Input } from "../shared/Input";
import { genders } from "../../../shared/definitions/other/Gender";
import { gameStore } from "../../stores/GameStore";

const CharacterData = styled.div`
    align-self: flex-start;
    flex-grow: 1;
`;

const CharacterField = styled.div`
    display: flex;
    flex-direction: column;
    margin-bottom: 16px;
`;

const CharacterSubField = styled.div`
    margin-left: 16px;
    display: flex;
    flex-direction: column;
`;

export const EditorSingleCharacterPropertiesGame: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const hasName = gameStore.playerName;

    return (
        <CharacterData>
            <CharacterField>
                <br />
                {t("game.character_config_name_game")}
                <Input
                    type="text"
                    value={gameStore.playerName}
                    onChange={e => gameStore.setPlayerName(e.target.value)}
                    className={hasName ? "" : "invalid"}
                />
                {!hasName && (
                    <InvalidCriteriaMessage>
                        {t("editor.invalid_name_criteria_name_empty")}
                    </InvalidCriteriaMessage>
                )}
            </CharacterField>
            <CharacterField>
                {t("game.character_config_gender")}
                <CharacterSubField>
                    {
                        genders.map(gender => (
                            <label key={gender}>
                                <input
                                    type="radio"
                                    name="gender"
                                    value={gender} checked={gameStore.playerGender === gender}
                                    onChange={() => gameStore.setPlayerGender(gender)}
                                />
                                &nbsp;
                                {t("game.character_config_gender_option" + gender)}
                            </label>
                        ))
                    }
                </CharacterSubField>
            </CharacterField>
        </CharacterData>
    );
});
