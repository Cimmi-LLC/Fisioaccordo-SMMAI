
import { useCallback } from 'react';

interface UsePhotoManagerProps {
  basePhoto: string | null;
  setBasePhoto: (photo: string | null) => void;
}

export const usePhotoManager = ({
  basePhoto,
  setBasePhoto
}: UsePhotoManagerProps) => {
  const handlePhotoUpload = useCallback((photo: string) => {
    setBasePhoto(photo);
  }, [setBasePhoto]);

  const handlePhotoRemove = useCallback(() => {
    setBasePhoto(null);
  }, [setBasePhoto]);

  return {
    handlePhotoUpload,
    handlePhotoRemove
  };
};
