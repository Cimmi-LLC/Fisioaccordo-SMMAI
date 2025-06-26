
import React from 'react';

interface PhotoManagerProps {
  basePhoto: string | null;
  setBasePhoto: (photo: string | null) => void;
}

const PhotoManager: React.FC<PhotoManagerProps> = ({
  basePhoto,
  setBasePhoto
}) => {
  const handlePhotoUpload = (photo: string) => {
    setBasePhoto(photo);
  };

  const handlePhotoRemove = () => {
    setBasePhoto(null);
  };

  return {
    handlePhotoUpload,
    handlePhotoRemove
  };
};

export default PhotoManager;
