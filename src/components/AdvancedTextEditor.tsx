import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Type, Plus, Trash2, Palette, Check, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ItalianTextValidator } from "@/services/italianTextValidator";
import { useToast } from "@/hooks/use-toast";

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold' | '300' | '500' | '600' | '700' | '800' | '900';
  fontFamily: string;
  outline: boolean;
  outlineColor: string;
  outlineWidth: number;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  rotation: number;
}

interface AdvancedTextEditorProps {
  imageUrl: string;
  onImageUpdate: (newUrl: string) => void;
  onClose: () => void;
}

const AdvancedTextEditor: React.FC<AdvancedTextEditorProps> = ({ 
  imageUrl, 
  onImageUpdate, 
  onClose 
}) => {
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();

  // Premium fonts with Italian accent support
  const premiumFonts = [
    { value: 'Inter', label: 'Inter (Moderno)', best: 'Testo scorrevole con accenti' },
    { value: 'Poppins', label: 'Poppins (Friendly)', best: 'Social media post' },
    { value: 'Montserrat', label: 'Montserrat (Display)', best: 'Titoli e headline' },
    { value: 'Roboto', label: 'Roboto (Readable)', best: 'Corpo testo lungo' },
    { value: 'Playfair Display', label: 'Playfair (Elegante)', best: 'Quote e citazioni' }
  ];

  const fontWeights = [
    { value: '300', label: 'Light' },
    { value: 'normal', label: 'Normal' },
    { value: '500', label: 'Medium' },
    { value: '600', label: 'Semi Bold' },
    { value: 'bold', label: 'Bold' },
    { value: '800', label: 'Extra Bold' },
    { value: '900', label: 'Black' }
  ];

  const colors = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b',
    '#eb4d4b', '#6c5ce7', '#2d3436', '#636e72', '#fdcb6e'
  ];

  // Validate text in real-time
  useEffect(() => {
    if (newText) {
      const result = ItalianTextValidator.validate(newText);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [newText]);

  const addTextElement = useCallback(() => {
    if (!newText.trim()) return;
    
    // Use validated and corrected text
    const finalText = validationResult?.correctedText || newText;
    const optimalFont = ItalianTextValidator.getOptimalFont(finalText);
    
    const newElement: TextElement = {
      id: crypto.randomUUID(),
      text: finalText,
      x: 50,
      y: 50,
      fontSize: 48, // Larger default for better readability
      color: '#ffffff',
      fontWeight: 'bold',
      fontFamily: optimalFont,
      outline: true, // Enable outline by default for readability
      outlineColor: '#000000',
      outlineWidth: 2,
      shadow: true,
      shadowColor: '#000000',
      shadowBlur: 4,
      rotation: 0
    };
    
    setTextElements([...textElements, newElement]);
    setNewText('');
    setValidationResult(null);
    setSelectedElement(newElement.id);

    if (validationResult?.suggestions.length > 0) {
      toast({
        title: "✨ Testo migliorato automaticamente",
        description: `${validationResult.suggestions.length} correzioni applicate`
      });
    }
  }, [newText, validationResult, textElements, toast]);

  const updateElement = useCallback((id: string, updates: Partial<TextElement>) => {
    setTextElements(elements => 
      elements.map(el => el.id === id ? { ...el, ...updates } : el)
    );
  }, []);

  const deleteElement = useCallback((id: string) => {
    setTextElements(elements => elements.filter(el => el.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
    }
  }, [selectedElement]);

  const renderCanvas = useCallback(async () => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI support for crisp text
    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = imageRef.current.naturalWidth;
    const displayHeight = imageRef.current.naturalHeight;

    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Enable high-quality text rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw the background image
    ctx.drawImage(imageRef.current, 0, 0, displayWidth, displayHeight);

    // Render all text elements with premium quality
    textElements.forEach(element => {
      ctx.save();

      // Apply rotation if needed
      if (element.rotation !== 0) {
        ctx.translate(element.x + 50, element.y + 25);
        ctx.rotate((element.rotation * Math.PI) / 180);
        ctx.translate(-(element.x + 50), -(element.y + 25));
      }

      // Set font with proper fallbacks
      const fontFamily = `${element.fontWeight} ${element.fontSize}px "${element.fontFamily}", "Inter", "Arial", sans-serif`;
      ctx.font = fontFamily;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Apply shadow if enabled
      if (element.shadow) {
        ctx.shadowColor = element.shadowColor;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = element.shadowBlur;
      }

      // Apply outline/stroke if enabled
      if (element.outline) {
        ctx.strokeStyle = element.outlineColor;
        ctx.lineWidth = element.outlineWidth;
        ctx.lineJoin = 'round';
        ctx.strokeText(element.text, element.x, element.y);
      }

      // Fill text
      ctx.fillStyle = element.color;
      ctx.fillText(element.text, element.x, element.y);

      // Reset shadow
      ctx.shadowColor = 'transparent';
      
      ctx.restore();
    });

    // Export as high-quality PNG
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    onImageUpdate(dataUrl);

    toast({
      title: "🎨 Immagine renderizzata",
      description: "Testo applicato con qualità premium"
    });
  }, [textElements, onImageUpdate, toast]);

  const selectedElementData = textElements.find(el => el.id === selectedElement);

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Editor Testo Premium
            <Badge variant="secondary" className="text-xs">
              Italiano Perfetto
            </Badge>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* High-quality image preview */}
        <div className="relative">
          <img 
            ref={imageRef}
            src={imageUrl} 
            alt="Anteprima"
            className="max-w-full h-48 object-contain rounded-lg border border-border"
            onLoad={() => renderCanvas()}
          />
          
          {/* Interactive text overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {textElements.map(element => (
              <div
                key={element.id}
                className={`absolute pointer-events-auto cursor-move transition-all ${
                  selectedElement === element.id ? 'ring-2 ring-primary' : ''
                }`}
                style={{
                  left: `${(element.x / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                  top: `${(element.y / (imageRef.current?.naturalHeight || 1)) * 100}%`,
                  fontSize: `${element.fontSize * 0.25}px`,
                  color: element.color,
                  fontWeight: element.fontWeight,
                  fontFamily: `"${element.fontFamily}", Inter, Arial, sans-serif`,
                  textShadow: element.shadow ? `1px 1px ${element.shadowBlur}px ${element.shadowColor}` : 'none',
                  WebkitTextStroke: element.outline ? `${element.outlineWidth * 0.5}px ${element.outlineColor}` : 'none',
                  transform: `rotate(${element.rotation}deg)`
                }}
                onClick={() => setSelectedElement(element.id)}
              >
                {element.text}
              </div>
            ))}
          </div>
        </div>

        {/* Hidden high-res canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Advanced text input with validation */}
        <div className="space-y-2">
          <Label className="text-foreground">Aggiungi Testo (con correzione automatica)</Label>
          <Textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Scrivi il tuo testo... Gli accenti saranno corretti automaticamente!"
            className="bg-input border-border text-foreground min-h-20"
            rows={3}
          />
          
          {/* Validation feedback */}
          {validationResult && (
            <div className="space-y-2">
              {validationResult.suggestions.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Correzioni suggerite:
                    </p>
                    {validationResult.suggestions.map((suggestion: string, idx: number) => (
                      <p key={idx} className="text-xs text-green-600 dark:text-green-300">
                        • {suggestion}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              {validationResult.errors.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                      Attenzione:
                    </p>
                    {validationResult.errors.map((error: string, idx: number) => (
                      <p key={idx} className="text-xs text-yellow-600 dark:text-yellow-300">
                        • {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              {validationResult.correctedText !== newText && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                    Testo corretto:
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-300 font-mono bg-blue-500/5 p-2 rounded">
                    "{validationResult.correctedText}"
                  </p>
                </div>
              )}
            </div>
          )}
          
          <Button onClick={addTextElement} className="w-full bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Testo Premium
          </Button>
        </div>

        {/* Text elements list */}
        <div className="space-y-2">
          <Label className="text-foreground">Elementi Testo</Label>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {textElements.map(element => (
              <div
                key={element.id}
                className={`flex items-center justify-between p-2 rounded border transition-all ${
                  selectedElement === element.id 
                    ? 'bg-primary/20 border-primary' 
                    : 'bg-muted/50 border-border'
                }`}
              >
                <span 
                  className="text-foreground cursor-pointer flex-1 truncate text-sm"
                  onClick={() => setSelectedElement(element.id)}
                >
                  {element.text}
                </span>
                <Button
                  onClick={() => deleteElement(element.id)}
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive/80 p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced properties for selected element */}
        {selectedElementData && (
          <div className="space-y-4 border-t border-border pt-4">
            <Label className="text-foreground font-medium">Proprietà Avanzate</Label>
            
            {/* Text content */}
            <div>
              <Label className="text-muted-foreground text-sm">Testo</Label>
              <Input
                value={selectedElementData.text}
                onChange={(e) => updateElement(selectedElement!, { text: e.target.value })}
                className="bg-input border-border text-foreground mt-1"
              />
            </div>

            {/* Font selection */}
            <div>
              <Label className="text-muted-foreground text-sm">Font Premium</Label>
              <Select 
                value={selectedElementData.fontFamily} 
                onValueChange={(value) => updateElement(selectedElement!, { fontFamily: value })}
              >
                <SelectTrigger className="bg-input border-border text-foreground mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {premiumFonts.map(font => (
                    <SelectItem key={font.value} value={font.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{font.label}</span>
                        <span className="text-xs text-muted-foreground">{font.best}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Size and weight */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-muted-foreground text-sm">Dimensione</Label>
                <Input
                  type="number"
                  value={selectedElementData.fontSize}
                  onChange={(e) => updateElement(selectedElement!, { fontSize: parseInt(e.target.value) || 24 })}
                  className="bg-input border-border text-foreground mt-1"
                  min="12"
                  max="200"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Peso</Label>
                <Select 
                  value={selectedElementData.fontWeight} 
                  onValueChange={(value) => updateElement(selectedElement!, { fontWeight: value as any })}
                >
                  <SelectTrigger className="bg-input border-border text-foreground mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {fontWeights.map(weight => (
                      <SelectItem key={weight.value} value={weight.value}>
                        {weight.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Colors */}
            <div>
              <Label className="text-muted-foreground text-sm">Colore Testo</Label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {colors.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 transition-all ${
                      selectedElementData.color === color ? 'border-primary scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateElement(selectedElement!, { color })}
                  />
                ))}
              </div>
            </div>

            {/* Position and rotation */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-muted-foreground text-sm">X</Label>
                <Input
                  type="number"
                  value={selectedElementData.x}
                  onChange={(e) => updateElement(selectedElement!, { x: parseInt(e.target.value) || 0 })}
                  className="bg-input border-border text-foreground mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Y</Label>
                <Input
                  type="number"
                  value={selectedElementData.y}
                  onChange={(e) => updateElement(selectedElement!, { y: parseInt(e.target.value) || 0 })}
                  className="bg-input border-border text-foreground mt-1"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Rotazione</Label>
                <Input
                  type="number"
                  value={selectedElementData.rotation}
                  onChange={(e) => updateElement(selectedElement!, { rotation: parseInt(e.target.value) || 0 })}
                  className="bg-input border-border text-foreground mt-1"
                  min="-180"
                  max="180"
                />
              </div>
            </div>
          </div>
        )}

        {/* Render button */}
        <Button
          onClick={renderCanvas}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
        >
          <Palette className="mr-2 h-4 w-4" />
          Applica con Qualità Premium
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdvancedTextEditor;