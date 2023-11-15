import React, { ReactElement } from 'react';
import { observer } from "mobx-react-lite";
import { PlacementSelectionItem, ScrollContainer, TileAssetPlacementButtons, PlacementSelectorLoadingBar, PlacementSelectorHeadline, PlacementSelectorAssetSearch, ScrollContainerUnderHeadline, PlacementSelectorLayerSelection, TileCategoryMenu, ContainerUnderHeadline } from './PlacementSelectorComponents';
import styled from 'styled-components';
import { MenuCard } from '../menu/MenuCard';
import { useTranslation } from 'react-i18next';
import { ListItemNoWrapping } from '../menu/ListItem';
import { undoableMapEditorSelectAnimationElementPlacement, undoableMapEditorSelectCharacterPlacement, undoableMapEditorSelectOtherPlacementElement } from '../../stores/undo/operation/SetPlacementSelectionOp';
import { OtherPlacementElement, SearchFilterCategory, TagType } from '../../stores/MapRelatedStore';
import { AnimationAssetModel, AnimationType } from '../../../shared/resources/AnimationAssetModel';
import { wrapIterator } from '../../../shared/helper/IterableIteratorWrapper';
import { mainMapEditorStore, PlacementSelectorCategory } from '../../stores/MapEditorStore';
import { undoableMapEditorSetPlacementSelectorCategory } from '../../stores/undo/operation/MapEditorSetPlacementSelectorCategoryOp';
import { gameStore } from '../../stores/GameStore';
import { sharedStore } from '../../stores/SharedStore';
import { ElementIconAreaTrigger, ElementIconDebugStartMarker, ElementIconMapMarker, ElementIconStartMarker, ElementIconType } from '../editor/ElementIcons';
import { animationThumbnailStore, characterThumbnailStore } from '../../stores/GeneratedThumbnailStore';
import { loadingAnimationUrl } from '../../canvas/loader/StaticAssetLoader';
import { CharacterConfigurationModel } from '../../../shared/resources/CharacterConfigurationModel';
import { undoableToggleOnlyShowEnemyCharacters } from '../../stores/undo/operation/MapEditorSetNPCEnemyFilter';
import { GiCrossedSwords } from 'react-icons/gi';
import { undoableCharacterEditorCreateCharacter } from '../../stores/undo/operation/CharacterEditorCreationOp';
import { charEditorStore } from '../../stores/CharacterEditorStore';
import { undoableCharacterEditorSelectCharacter } from '../../stores/undo/operation/CharacterEditorSelectCharacterOp';
import { FaPlusCircle } from 'react-icons/fa';
import { MdEdit } from 'react-icons/md';
import { userStore } from '../../stores/UserStore';
import { editorStore } from '../../stores/EditorStore';
import { mainCategoryTags, tileAssetFloorTag } from '../../../shared/resources/TileAssetModel';

const ContentContainer = styled(MenuCard)`
    overflow: initial;
    width: 100%;
`;

const TileAssetContentContainer = styled(ContentContainer)`
    display: flex;
`;

const TileCategoryMenuContainer = styled.div`
    overflow: initial;
    flex-grow: 0;
    margin: 2px;
`;

const TilesContainer = styled(MenuCard)`
    overflow: hidden;
    flex-grow: 1;
`;

const ElementSpacing = styled.span`
    margin: 5px;
`;

const TileAssets: React.FunctionComponent = observer(() => {
    return (
        <TileAssetContentContainer>
            <TileCategoryMenuContainer>
                <TileCategoryMenu mapRelatedStore={mainMapEditorStore} skipMainCategories={true} />
            </TileCategoryMenuContainer>
            <TilesContainer>
                <PlacementSelectorHeadline>
                    {mainMapEditorStore.complexityUseLayers &&
                        <ElementSpacing>
                            <PlacementSelectorLayerSelection mapRelatedStore={mainMapEditorStore} />
                            &nbsp;
                        </ElementSpacing>
                    }
                    <ElementSpacing>
                        <PlacementSelectorAssetSearch mapRelatedStore={mainMapEditorStore} category={SearchFilterCategory.TileAsset} />
                    </ElementSpacing>
                </PlacementSelectorHeadline>

                <ContainerUnderHeadline>
                    <TileAssetPlacementButtons
                        showEmpty={true}
                        tileAssets={mainMapEditorStore.filteredTileAssets}
                        mapRelatedStore={mainMapEditorStore}
                    />
                </ContainerUnderHeadline>
            </TilesContainer>
        </TileAssetContentContainer>
    );
});

const EnemyIconContainer = styled.div`
    position: absolute;
    top: 5px;
    right: 5px;
`;

interface NPCItemProps {
    character: CharacterConfigurationModel;
}

const NPCItem: React.FunctionComponent<NPCItemProps> = observer(({ character }) => {
    return (
        <PlacementSelectionItem
            label={character.localizedName.get(gameStore.languageKey)}
            /*backgroundColor={character.isEnemy ? "#FFCCCB" : undefined}*/
            imageUrl={`url(${characterThumbnailStore.getOrGenerateThumbnail(character.id) || loadingAnimationUrl})`}
            imageScaledWidth={null}
            isSelected={mainMapEditorStore.placementSelection.selectedCharacterId === character.id}
            isAssetPlacementActive={mainMapEditorStore.isAssetSelectionEnabled}
            onClick={() => undoableMapEditorSelectCharacterPlacement(character.id)}
        >
            {character.isEnemy && (
                <EnemyIconContainer>
                    <GiCrossedSwords size={15} />
                </EnemyIconContainer>
            )}
        </PlacementSelectionItem>
    );
});

const ButtonWithIcon = styled.button`
    position: relative;
    padding-left: 23px;
`;

const AddIcon = styled(FaPlusCircle)`
    position: absolute;
    left: 4px;
    top: 1px;
`;

const EditIcon = styled(MdEdit)`
    position: absolute;
    left: 4px;
    top: 1px;
`;

const ModuleSpacer = styled.div`
    clear: both;

    --text-divider-gap: 0.75rem;
    display: flex;
    align-items: center;

    &::before, &::after {
        content: '';
        height: 1px;
        background-color: silver;
        flex-grow: 1;
    }

    &::before {
        margin-right: var(--text-divider-gap);
    }

    &::after {
        margin-left: var(--text-divider-gap);
    }
`;

const AddCharacterButtonIconContainer = styled.div`
    position: absolute;
    top: 13px;
    left: 25px;
`;

const AddCharacterButton: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    return (
        <PlacementSelectionItem
            label={t("editor.character_config_create_new")}
            isSelected={false}
            isAssetPlacementActive={false}
            onClick={() => undoableCharacterEditorCreateCharacter(charEditorStore)}
        >
            <AddCharacterButtonIconContainer>
                <AddIcon size={30} />
            </AddCharacterButtonIconContainer>
        </PlacementSelectionItem>
    );
});

const NPCs: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const searchFilterLowerCase = mainMapEditorStore.getSearchFilter(SearchFilterCategory.NPC).toLowerCase();
    const { onlyShowEnemyCharacters } = mainMapEditorStore;

    const { selectedCharacterId } = mainMapEditorStore.placementSelection;
    const selectedCharacter = (selectedCharacterId != null) && sharedStore.getCharacter(selectedCharacterId);
    const mayEditCharacter = selectedCharacter && userStore.mayEditCharacter(selectedCharacter);
    const { isModuleEditor } = editorStore;

    const characters = wrapIterator(sharedStore.characterConfigurations.values())
        .filter(character => (
            (editorStore.isMainGameEditor || sharedStore.getAnimationByName(character.animationAssetName)) &&
            (!searchFilterLowerCase || character.localizedName.get(gameStore.languageKey).toLowerCase().includes(searchFilterLowerCase)) &&
            (!onlyShowEnemyCharacters || character.isEnemy)
        ))
        .sort((a, b) => a.localizedName.get(gameStore.languageKey).localeCompare(b.localizedName.get(gameStore.languageKey), gameStore.languageKey));

    return (
        <ContentContainer>
            <PlacementSelectorHeadline>
                <ElementSpacing>
                    <PlacementSelectorAssetSearch mapRelatedStore={mainMapEditorStore} category={SearchFilterCategory.NPC} />
                </ElementSpacing>
                <ElementSpacing>
                    <label>
                        <input type="checkbox" checked={onlyShowEnemyCharacters} onChange={() => undoableToggleOnlyShowEnemyCharacters()} />
                        &nbsp;
                        {t("editor.only_show_enemy_characters")}
                    </label>
                </ElementSpacing>
                <ElementSpacing>
                    <ButtonWithIcon
                        onClick={() => undoableCharacterEditorCreateCharacter(charEditorStore)}
                    >
                        <AddIcon />{t("editor.character_config_create_new")}
                    </ButtonWithIcon>
                </ElementSpacing>
                <ElementSpacing>
                    <ButtonWithIcon
                        disabled={!mayEditCharacter}
                        onClick={() => undoableCharacterEditorSelectCharacter(selectedCharacterId, charEditorStore)}
                    >
                        <EditIcon />{t("editor.character_config_edit")}
                    </ButtonWithIcon>
                </ElementSpacing>
            </PlacementSelectorHeadline>

            <ScrollContainerUnderHeadline>
                {!isModuleEditor && characters.map(character => <NPCItem key={character.id} character={character} />)}
                {isModuleEditor && (
                    <>
                        <ModuleSpacer>{t("editor.own_characters")}</ModuleSpacer>
                        {
                            characters.filter(character => character.moduleOwner).map(character => (
                                <NPCItem key={character.id} character={character} />
                            ))
                        }
                        <AddCharacterButton />
                        <ModuleSpacer>{t("editor.pre_made_characters")}</ModuleSpacer>
                        {
                            characters.filter(character => !character.moduleOwner).map(character => (
                                <NPCItem key={character.id} character={character} />
                            ))
                        }
                    </>
                )}
            </ScrollContainerUnderHeadline>
        </ContentContainer>
    );
});

interface AnimationItemProps {
    animation: AnimationAssetModel;
}

const AnimationItem: React.FunctionComponent<AnimationItemProps> = observer(({ animation }) => {
    return (
        <PlacementSelectionItem
            label={animation.localizedName.get(gameStore.languageKey)}
            imageUrl={`url(${animationThumbnailStore.getOrGenerateThumbnail(animation.id) || loadingAnimationUrl})`}
            imageScaledWidth={null}
            isSelected={mainMapEditorStore.placementSelection.selectedAnimationName === animation.name}
            isAssetPlacementActive={mainMapEditorStore.isAssetSelectionEnabled}
            onClick={() => undoableMapEditorSelectAnimationElementPlacement(animation.name)}
        />
    );
});

const Animations: React.FunctionComponent = observer(() => {
    const searchFilterLowerCase = mainMapEditorStore.getSearchFilter(SearchFilterCategory.Animation).toLowerCase();

    return (
        <ContentContainer>
            <PlacementSelectorHeadline>
                <ElementSpacing>
                    <PlacementSelectorAssetSearch mapRelatedStore={mainMapEditorStore} category={SearchFilterCategory.Animation} />
                </ElementSpacing>
            </PlacementSelectorHeadline>

            <ScrollContainerUnderHeadline>
                {Array.from(sharedStore.animationAssets.values())
                    .filter(animation => (
                        animation.metaData.type === AnimationType.Map) &&
                        (!searchFilterLowerCase || animation.localizedName.get(gameStore.languageKey).toLowerCase().includes(searchFilterLowerCase))
                    )
                    .sort((a, b) => a.localizedName.get(gameStore.languageKey).localeCompare(b.localizedName.get(gameStore.languageKey), gameStore.languageKey))
                    .map(animation => <AnimationItem key={animation.id} animation={animation} />)
                }
            </ScrollContainerUnderHeadline>
        </ContentContainer>
    );
});

interface OtherElementDescription {
    type: OtherPlacementElement;
    icon: ReactElement;
    additionalCheck?: () => boolean;
    show?: () => boolean;
}

const otherElementDescriptions: OtherElementDescription[] = [
    {
        type: OtherPlacementElement.AreaTrigger,
        icon: <ElementIconAreaTrigger type={ElementIconType.MapPlacementSelector} />,
        additionalCheck: () => !mainMapEditorStore.placementSelection.areaTriggerId
    },
    {
        type: OtherPlacementElement.MapMarker,
        icon: <ElementIconMapMarker type={ElementIconType.MapPlacementSelector} />
    },
    {
        type: OtherPlacementElement.StartMarker,
        icon: <ElementIconStartMarker type={ElementIconType.MapPlacementSelector} />
    },
    {
        type: OtherPlacementElement.DebugStartMarker,
        icon: <ElementIconDebugStartMarker type={ElementIconType.MapPlacementSelector} />,
        show: () => mainMapEditorStore.complexityShowDebugStartMarker
    }
];

const Others: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    return (
        <ContentContainer>
            <ScrollContainer>
                {otherElementDescriptions
                    .filter(element => !element.show || element.show())
                    .map(element => (
                        <PlacementSelectionItem
                            key={element.type}
                            label={t("editor.placement_" + OtherPlacementElement[element.type])}
                            imageUrl={null}
                            imageScaledWidth={null}
                            icon={element.icon}
                            isSelected={(mainMapEditorStore.placementSelection.selectedOtherElement === element.type) && (!element.additionalCheck || element.additionalCheck())}
                            isAssetPlacementActive={mainMapEditorStore.isAssetSelectionEnabled}
                            onClick={() => undoableMapEditorSelectOtherPlacementElement(element.type, mainMapEditorStore)}
                        />
                    ))
                }
            </ScrollContainer>
        </ContentContainer>
    );
});

function getCategories(): PlacementSelectorCategory[] {
    const categories = new Array<PlacementSelectorCategory>();

    categories.push({
        name: /*t*/"editor.tile_assets",
        component: TileAssets
    });

    if (sharedStore.hasFloorCategoryTiles) {
        categories.push({
            name: /*t*/"editor.tile_assets_floor",
            component: TileAssets,
            includeTileCategories: [
                {
                    type: TagType.Tag,
                    tag: tileAssetFloorTag
                }
            ]
        });

        if (sharedStore.hasTilesWithoutMainCategory) {
            categories.push({
                name: /*t*/"editor.tile_assets_others",
                component: TileAssets,
                excludeTileCategories: mainCategoryTags.map(tag => ({
                    type: TagType.Tag,
                    tag
                }))
            });
        }
    }

    categories.push({
        name: /*t*/"editor.placement_category_npcs",
        component: NPCs
    });

    categories.push({
        name: /*t*/"editor.placement_category_animations",
        component: Animations
    });

    categories.push({
        name: /*t*/"editor.placement_category_other",
        component: Others
    });

    return categories;
}

const Container = styled.div`
    display: flex;
    height: 100%;
`;

export const MapEditorPlacementSelector: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const categories = getCategories();

    const selectedCategory = mainMapEditorStore.selectedCategory || categories[0];

    return (
        <>
            <PlacementSelectorLoadingBar />
            <Container>
                <div>
                    {[...categories].map(category => (
                        <ListItemNoWrapping
                            key={category.name}
                            className={(category.name === selectedCategory?.name) ? "selected" : ""}
                            onClick={() => undoableMapEditorSetPlacementSelectorCategory(category)}
                        >
                            {t(category.name)}
                        </ListItemNoWrapping>
                    ))}
                </div>
                {selectedCategory && <selectedCategory.component />}
            </Container>
        </>
    );
});
