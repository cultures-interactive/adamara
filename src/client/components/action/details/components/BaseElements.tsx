import styled from 'styled-components';
import { UiConstants } from '../../../../data/UiConstants';

export const ElementGroup = styled.div`
    padding: 5px;
`;

export const ElementLabel = styled.label`
    display: block;

    &:not(:last-child) {
        margin-bottom: 2px;
    }
`;

export const ElementGroupContainer = styled(ElementGroup)`
    margin-top: 4px;
    margin-bottom: 8px;
    border-radius: ${UiConstants.BORDER_RADIUS};
    border: 1px #444444 solid;
    padding: 4px;
`;
