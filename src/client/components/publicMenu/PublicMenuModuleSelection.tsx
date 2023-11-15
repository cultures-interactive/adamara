import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { css } from 'styled-components';
import { PlayableModule } from '../../../shared/workshop/ModuleModel';
import { getPublicGameVariantLink, routes } from '../../data/routes';
import { gameStore } from '../../stores/GameStore';
import { Heading1Base } from '../shared/Heading';
import { ModulesToPlayListView } from '../workshopmanagement/ModuleToPlayListView';

const Heading = styled(Heading1Base)`
    margin-top: 1em;
    margin-bottom: 0.5em;
`;

const TopAreaLink = styled.a`
    display: block;
    margin-bottom: 1.2em;
`;

const Container = styled.div`
    display: flex;
`;

const Area = styled.div`
    flex: 1;
`;

const Divider = styled.div`
    margin: 0 2em;
`;

const AreaHeading = styled(Heading1Base)`
    margin-top: 1em;
    margin-bottom: 0.7em;
    white-space: nowrap;
`;

const StandaloneModulesList = styled.div`
    max-height: 300px;
    overflow-y: auto;

    ul {
        margin-top: 0.2em;
        
        li {
            margin-bottom: 0.2em;
        }
    }
`;

const LeftAreaLink = styled.a<{ disabled?: boolean; }>`
    margin-top: 10px;
    margin-bottom: 10px;
    display: block;
    ${props => props.disabled && css`
        pointer-events: none;
        cursor: default;
        color: grey;
    `}
`;

interface Props {
    modules: PlayableModule[];
}

export const PublicMenuModuleSelection: React.FunctionComponent<Props> = ({ modules }) => {
    const { t } = useTranslation();

    const [modulesToPlay, setModulesToPlay] = useState<string[]>([]);

    const sortedModules = modules.sort((a, b) => a.name.localeCompare(b.name, gameStore.languageKey));
    const addOnModules = sortedModules.filter(module => module.mayBePlayedInWorkshops);
    const standaloneModules = sortedModules.filter(module => !module.mayBePlayedInWorkshops);

    return (
        <div>
            <Heading>{t("editor.menu_main_game")}</Heading>
            <TopAreaLink href={routes.mainGame}>
                {t("editor.menu_main_game_play")}
            </TopAreaLink>
            <Container>
                <Area>
                    <AreaHeading>{t("editor.menu_modules")}</AreaHeading>
                    <ModulesToPlayListView
                        playableModules={addOnModules}
                        modulesToPlay={modulesToPlay}
                        addModuleToPlay={id => setModulesToPlay([...modulesToPlay, id])}
                        removeModuleToPlay={id => setModulesToPlay(modulesToPlay.filter(existingId => existingId != id))}
                        showFilter={false}
                    />
                    <LeftAreaLink
                        href={getPublicGameVariantLink(modulesToPlay)}
                        disabled={modulesToPlay.length === 0}
                    >
                        {t("editor.menu_modules_play")}
                    </LeftAreaLink>
                </Area>
                <Divider />
                <Area>
                    <AreaHeading>{t("editor.menu_standalone_modules")}</AreaHeading>
                    <div>{t("editor.menu_standalone_modules_play")}</div>
                    <StandaloneModulesList>
                        <ul>
                            {standaloneModules.map(module => (
                                <li key={module.$modelId}>
                                    <a href={getPublicGameVariantLink([module.$modelId])}>
                                        {module.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </StandaloneModulesList>
                </Area>
            </Container>
        </div>
    );
};
