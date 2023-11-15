import React from 'react';
import { BsBag, BsBraces, BsDiamond, BsXDiamondFill } from 'react-icons/bs';
import { FaRegEye, FaWalking } from 'react-icons/fa';
import { GrMapLocation } from 'react-icons/gr';
import { ImLocation, ImLocation2 } from 'react-icons/im';
import { MdAnimation, MdErrorOutline, MdOutlineImageNotSupported } from 'react-icons/md';
import { VscDebugAlt } from 'react-icons/vsc';

export enum ElementIconType {
    MapPlacementSelector,
    ActionEditorSelector,
    PartOfText
}

interface ElementIconProps {
    type: ElementIconType;
}

const mapPlacementSelectorIconSize = 40;
const actionEditorSelectorIconSize = 50;

function getPropertiesFromProps(props: ElementIconProps) {
    switch (props.type) {
        case ElementIconType.MapPlacementSelector:
            return { size: mapPlacementSelectorIconSize };

        case ElementIconType.ActionEditorSelector:
            return { size: actionEditorSelectorIconSize };

        case ElementIconType.PartOfText:
            return { size: undefined };

        default:
            throw new Error("Not implemented");
    }
}

export const ElementIconMapMarker: React.FunctionComponent<ElementIconProps> = (props) => <ImLocation {...getPropertiesFromProps(props)} />;
export const ElementIconStartMarker: React.FunctionComponent<ElementIconProps> = (props) => <ImLocation2 {...getPropertiesFromProps(props)} />;
export const ElementIconAreaTrigger: React.FunctionComponent<ElementIconProps> = (props) => <BsDiamond {...getPropertiesFromProps(props)} />;
export const ElementIconDebugStartMarker: React.FunctionComponent<ElementIconProps> = (props) => <VscDebugAlt {...getPropertiesFromProps(props)} />;
export const ElementIconTile: React.FunctionComponent<ElementIconProps> = (props) => <BsXDiamondFill {...getPropertiesFromProps(props)} />;
export const ElementAnimation: React.FunctionComponent<ElementIconProps> = (props) => <MdAnimation {...getPropertiesFromProps(props)} />;
export const ElementCharacter: React.FunctionComponent<ElementIconProps> = (props) => <FaWalking {...getPropertiesFromProps(props)} />;

export const ElementIconViewAreaTrigger: React.FunctionComponent = () => <FaRegEye size={actionEditorSelectorIconSize} />;
export const ElementParameter: React.FunctionComponent = () => <BsBraces size={actionEditorSelectorIconSize} />;

export const NoMapElementIcon: React.FunctionComponent = () => <GrMapLocation size={actionEditorSelectorIconSize} />;
export const MapElementErrorIcon: React.FunctionComponent = () => <MdErrorOutline size={actionEditorSelectorIconSize} />;

export const NoItemIcon: React.FunctionComponent = () => <BsBag size={actionEditorSelectorIconSize} />;
export const ItemImageMissingIcon: React.FunctionComponent = () => <MdOutlineImageNotSupported size={actionEditorSelectorIconSize} />;