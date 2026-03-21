import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, User } from "lucide-react";
import PhotoUpload from './PhotoUpload';
import CanvaTemplateSelector, { CanvaTemplate } from './CanvaTemplateSelector';
import { BlotatoService } from '@/services/blotatoService';

interface FormData {
  description: string;
  audience: string;
  length: string;
  tone: string;
  platform: string;
  postType: string;
  numSlides: string;
  numImages: string;
  visualTemplate: string;
  canvaTemplate?: CanvaTemplate | null;
  selectedPlatforms?: string[];
  scheduleDate?: string;
}

interface ContentFormProps {
  formData: FormData;
  onInputChange: (field: string, value: string | string[]) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  basePhoto: string | null;
  onPhotoUpload: (photo: string) => void;
  onPhotoRemove: () => void;
  onPublish?: (platforms: string[]) => void;
}

const ContentForm: React.FC<ContentFormProps> = ({
  formData,
  onInputChange,
  isGenerating,
  onGenerate,
  basePhoto,
  onPhotoUpload,
  onPhotoRemove,
  onPublish
}) => {
  const supportedPlatforms = BlotatoService.getSupportedPlatforms();

  const handlePlatformToggle = (platformId: string, checked: boolean) => {
    const currentPlatforms = formData.selectedPlatforms || [];
    if (checked) {
      onInputChange('selectedPlatforms', [...currentPlatforms, platformId]);
    } else {
      onInputChange('selectedPlatforms', currentPlatforms.filter(id => id !== platformId));
    }
  };

  return (
    <Card className="backdrop-blur-enhanced">
      <CardHeader>
        <CardTitle className="text-foreground">
          Crea il Tuo Contenuto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 1. Descrivi il tuo post */}
        <div>
          <Label className="text-foreground text-lg font-medium">1. Descrivi il Tuo Post</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => onInputChange('description', e.target.value)}
            placeholder="es. mal di schiena da scrivania"
            className="bg-input border-border text-foreground mt-2 min-h-[100px] focus:border-primary focus:ring-primary"
          />
        </div>

        {/* 2. Definisci il Pubblico */}
        <div>
          <Label className="text-foreground text-lg font-medium flex items-center">
            <User className="h-4 w-4 mr-2 text-primary" />
            2. Definisci il Tuo Pubblico (Opzionale)
          </Label>
          <Input
            value={formData.audience}
            onChange={(e) => onInputChange('audience', e.target.value)}
            placeholder="es. lavoratori in ufficio"
            className="bg-input border-border text-foreground mt-2 focus:border-primary focus:ring-primary"
          />
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Lunghezza */}
          <div>
            <Label className="text-foreground">Lunghezza</Label>
            <Select value={formData.length} onValueChange={(value) => onInputChange('length', value)}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="corto">Corto</SelectItem>
                <SelectItem value="medio">Medio</SelectItem>
                <SelectItem value="lungo">Lungo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tono */}
          <div>
            <Label className="text-foreground">Tono</Label>
            <Select value={formData.tone} onValueChange={(value) => onInputChange('tone', value)}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="professionale">Professionale</SelectItem>
                <SelectItem value="informale">Informale</SelectItem>
                <SelectItem value="divertente">Divertente</SelectItem>
                <SelectItem value="motivazionale">Motivazionale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Piattaforma */}
          <div>
            <Label className="text-foreground">Piattaforma</Label>
            <Select value={formData.platform} onValueChange={(value) => onInputChange('platform', value)}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo di Post */}
          <div>
            <Label className="text-foreground">Tipo di Post</Label>
            <Select value={formData.postType} onValueChange={(value) => onInputChange('postType', value)}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="carosello">Carosello</SelectItem>
                <SelectItem value="post-singolo">Post Singolo</SelectItem>
                <SelectItem value="storia">Storia</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Numero di Slide */}
          <div>
            <Label className="text-foreground">Numero di Slide</Label>
            <Select value={formData.numSlides} onValueChange={(value) => onInputChange('numSlides', value)}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="3">3 Slide</SelectItem>
                <SelectItem value="5">5 Slide</SelectItem>
                <SelectItem value="7">7 Slide</SelectItem>
                <SelectItem value="10">10 Slide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Numero di Immagini */}
          <div>
            <Label className="text-foreground">Numero di Immagini</Label>
            <Select value={formData.numImages} onValueChange={(value) => onInputChange('numImages', value)}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="1">1 Immagine</SelectItem>
                <SelectItem value="2">2 Immagini</SelectItem>
                <SelectItem value="3">3 Immagini</SelectItem>
                <SelectItem value="4">4 Immagini</SelectItem>
                <SelectItem value="5">5 Immagini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Canva Template */}
        <CanvaTemplateSelector
          value={formData.visualTemplate === 'default' ? null : formData.visualTemplate}
          postType={formData.postType}
          onChange={(templateId, template) => {
            onInputChange('visualTemplate', templateId || 'default');
            if (template) {
              onInputChange('canvaTemplate', template as any);
            }
          }}
        />

        {/* Base photo upload */}
        <PhotoUpload
          basePhoto={basePhoto}
          onPhotoUpload={onPhotoUpload}
          onPhotoRemove={onPhotoRemove}
        />

        {/* Platform Selection */}
        <div className="space-y-3">
          <Label className="text-foreground text-lg font-medium">Publishing Platforms</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {supportedPlatforms.map((platform) => (
              <div key={platform.id} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={platform.id}
                  checked={formData.selectedPlatforms?.includes(platform.id) || false}
                  onCheckedChange={(checked) => handlePlatformToggle(platform.id, checked as boolean)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm">{platform.icon}</span>
                  <Label htmlFor={platform.id} className="text-xs font-medium cursor-pointer text-foreground">
                    {platform.name}
                  </Label>
                </div>
              </div>
            ))}
          </div>
          {formData.selectedPlatforms?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.selectedPlatforms.map(platformId => {
                const platform = supportedPlatforms.find(p => p.id === platformId);
                return platform ? (
                  <Badge key={platformId} variant="secondary" className="text-xs">
                    {platform.icon} {platform.name}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Schedule Date */}
        <div className="space-y-2">
          <Label htmlFor="scheduleDate" className="text-foreground">Schedule Publication (Optional)</Label>
          <Input
            id="scheduleDate"
            type="datetime-local"
            value={formData.scheduleDate || ''}
            onChange={(e) => onInputChange('scheduleDate', e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="bg-input border-border text-foreground focus:border-primary focus:ring-primary"
          />
        </div>

        <Button 
          onClick={onGenerate} 
          disabled={isGenerating}
          className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-6"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating content...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              3. Generate Content
            </>
          )}
        </Button>

      </CardContent>
    </Card>
  );
};

export default ContentForm;
