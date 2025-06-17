
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, User } from "lucide-react";
import PhotoUpload from './PhotoUpload';

interface FormData {
  description: string;
  audience: string;
  length: string;
  tone: string;
  platform: string;
  postType: string;
  numSlides: string;
  numImages: string;
}

interface ContentFormProps {
  formData: FormData;
  onInputChange: (field: string, value: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  basePhoto: string | null;
  onPhotoUpload: (photo: string) => void;
  onPhotoRemove: () => void;
}

const ContentForm: React.FC<ContentFormProps> = ({
  formData,
  onInputChange,
  isGenerating,
  onGenerate,
  basePhoto,
  onPhotoUpload,
  onPhotoRemove
}) => {
  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">
          Crea il tuo contenuto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 1. Descrivi il tuo post */}
        <div>
          <Label className="text-gray-300 text-lg font-medium">1. Descrivi il tuo post</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => onInputChange('description', e.target.value)}
            placeholder="mal di schiena al pc"
            className="bg-gray-700 border-gray-600 text-white mt-2 min-h-[100px]"
          />
        </div>

        {/* 2. Definisci la tua Audience */}
        <div>
          <Label className="text-gray-300 text-lg font-medium flex items-center">
            <User className="h-4 w-4 mr-2" />
            2. Definisci la tua Audience (Opzionale)
          </Label>
          <Input
            value={formData.audience}
            onChange={(e) => onInputChange('audience', e.target.value)}
            placeholder="lavoratori al pc"
            className="bg-gray-700 border-gray-600 text-white mt-2"
          />
        </div>

        {/* Opzioni in griglia */}
        <div className="grid grid-cols-2 gap-4">
          {/* Lunghezza */}
          <div>
            <Label className="text-gray-300">Lunghezza</Label>
            <Select value={formData.length} onValueChange={(value) => onInputChange('length', value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="corto">Corto</SelectItem>
                <SelectItem value="medio">Medio</SelectItem>
                <SelectItem value="lungo">Lungo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tono */}
          <div>
            <Label className="text-gray-300">Tono</Label>
            <Select value={formData.tone} onValueChange={(value) => onInputChange('tone', value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="professionale">Professionale</SelectItem>
                <SelectItem value="informale">Informale</SelectItem>
                <SelectItem value="divertente">Divertente</SelectItem>
                <SelectItem value="motivazionale">Motivazionale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Piattaforma */}
          <div>
            <Label className="text-gray-300">Piattaforma</Label>
            <Select value={formData.platform} onValueChange={(value) => onInputChange('platform', value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo di Post */}
          <div>
            <Label className="text-gray-300">Tipo di Post</Label>
            <Select value={formData.postType} onValueChange={(value) => onInputChange('postType', value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="carosello">Carosello</SelectItem>
                <SelectItem value="post-singolo">Post Singolo</SelectItem>
                <SelectItem value="storia">Storia</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Numero Slide */}
          <div>
            <Label className="text-gray-300">Numero Slide</Label>
            <Select value={formData.numSlides} onValueChange={(value) => onInputChange('numSlides', value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="3">3 Slide</SelectItem>
                <SelectItem value="5">5 Slide</SelectItem>
                <SelectItem value="7">7 Slide</SelectItem>
                <SelectItem value="10">10 Slide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Numero Immagini */}
          <div>
            <Label className="text-gray-300">Numero Immagini</Label>
            <Select value={formData.numImages} onValueChange={(value) => onInputChange('numImages', value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="1">1 Immagine</SelectItem>
                <SelectItem value="2">2 Immagini</SelectItem>
                <SelectItem value="3">3 Immagini</SelectItem>
                <SelectItem value="4">4 Immagini</SelectItem>
                <SelectItem value="5">5 Immagini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Upload foto base */}
        <PhotoUpload
          basePhoto={basePhoto}
          onPhotoUpload={onPhotoUpload}
          onPhotoRemove={onPhotoRemove}
        />

        <Button 
          onClick={onGenerate} 
          disabled={isGenerating}
          className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-6"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generando contenuto...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              3. Genera Contenuto
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ContentForm;
