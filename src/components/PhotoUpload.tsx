
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhotoUploadProps {
  basePhoto: string | null;
  onPhotoUpload: (photo: string) => void;
  onPhotoRemove: () => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  basePhoto,
  onPhotoUpload,
  onPhotoRemove
}) => {
  const { toast } = useToast();

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onPhotoUpload(reader.result as string);
        toast({
          title: "Foto caricata! 📸",
          description: "La foto sarà usata come base per il contenuto"
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBasePhoto = () => {
    onPhotoRemove();
    toast({
      title: "Foto rimossa",
      description: "La foto base è stata rimossa"
    });
  };

  return (
    <Card className="bg-gray-700/50 border-gray-600">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center">
          <Camera className="h-4 w-4 mr-2" />
          📸 Carica una foto base (Opzionale)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {basePhoto ? (
          <div className="relative">
            <img 
              src={basePhoto} 
              alt="Foto base"
              className="w-full h-32 object-cover rounded-lg"
            />
            <Button
              onClick={removeBasePhoto}
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2 p-1 h-6 w-6"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              id="base-photo-upload"
            />
            <label 
              htmlFor="base-photo-upload" 
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-gray-300 text-sm">
                Clicca per caricare una foto
              </span>
              <span className="text-gray-500 text-xs mt-1">
                Questa foto sarà usata come base per il contenuto
              </span>
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PhotoUpload;
