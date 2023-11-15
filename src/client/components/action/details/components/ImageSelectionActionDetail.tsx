import React from 'react';
import { observer } from "mobx-react-lite";
import { ImageUsecase } from '../../../../../shared/resources/ImageModel';
import { ImageSelectionWithUpload } from '../../../images/ImageSelectionWithUpload';
import { ElementGroup } from './BaseElements';

interface ImageSelectionActionDetailProps {
    imageId: number;
    imageIdSetter: (id: number) => void;
}

export const ImageSelectionActionDetail: React.FunctionComponent<ImageSelectionActionDetailProps> = observer(({ imageId, imageIdSetter }) => {
    return (
        <ElementGroup>
            <ImageSelectionWithUpload
                selectedImageId={imageId}
                selectedImageIdSetter={imageIdSetter}
                imageUsecase={ImageUsecase.DisplayImage}
            />
        </ElementGroup>
    );
});