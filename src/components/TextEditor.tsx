
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Type, Plus, Trash2, Move, Palette } from "lucide-react";

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontFamily: string;
}

interface TextEditorProps {
  imageUrl: string;
  onImageUpdate: (newUrl: string) => void;
  onClose: () => void;
}

const TextEditor: React.FC<TextEditorProps> = ({ imageUrl, onImageUpdate, onClose }) => {
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const fonts = [
    'Arial, sans-serif',
    'Georgia, serif',
    'Times New Roman, serif',
    'Helvetica, sans-serif',
    'Impact, sans-serif'
  ];

  const colors = [
    '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
  ];

  const addTextElement = () => {
    if (!newText.trim()) return;
    
    const newElement: TextElement = {
      id: crypto.randomUUID(),
      text: newText,
      x: 50,
      y: 50,
      fontSize: 24,
      color: '#ffffff',
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif'
    };
    
    setTextElements([...textElements, newElement]);
    setNewText('');
    setSelectedElement(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(elements => 
      elements.map(el => el.id === id ? { ...el, ...updates } : el)
    );
  };

  const deleteElement = (id: string) => {
    setTextElements(elements => elements.filter(el => el.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
    }
  };

  const renderCanvas = async () => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Imposta le dimensioni del canvas
    canvas.width = imageRef.current.naturalWidth;
    canvas.height = imageRef.current.naturalHeight;

    // Disegna l'immagine
    ctx.drawImage(imageRef.current, 0, 0);

    // Disegna tutti i testi
    textElements.forEach(element => {
      ctx.font = `${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
      ctx.fillStyle = element.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      // Aggiunge un'ombra per migliorare la leggibilità
      ctx.shadowColor = element.color === '#ffffff' ? '#000000' : '#ffffff';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 4;
      
      ctx.fillText(element.text, element.x, element.y);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
    });

    // Converte in data URL e aggiorna l'immagine
    const dataUrl = canvas.toDataURL('image/png');
    onImageUpdate(dataUrl);
  };

  const selectedElementData = textElements.find(el => el.id === selectedElement);

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Editor Testo
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Anteprima immagine con overlay per i testi */}
        <div className="relative">
          <img 
            ref={imageRef}
            src={imageUrl} 
            alt="Anteprima"
            className="max-w-full h-48 object-contain rounded-lg border border-gray-600"
            onLoad={() => renderCanvas()}
          />
          
          {/* Overlay per posizionare i testi */}
          <div className="absolute inset-0 pointer-events-none">
            {textElements.map(element => (
              <div
                key={element.id}
                className={`absolute pointer-events-auto cursor-move ${
                  selectedElement === element.id ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  left: `${(element.x / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                  top: `${(element.y / (imageRef.current?.naturalHeight || 1)) * 100}%`,
                  fontSize: `${element.fontSize * 0.3}px`,
                  color: element.color,
                  fontWeight: element.fontWeight,
                  fontFamily: element.fontFamily,
                  textShadow: element.color === '#ffffff' ? '1px 1px 2px #000' : '1px 1px 2px #fff'
                }}
                onClick={() => setSelectedElement(element.id)}
              >
                {element.text}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas nascosto per il rendering */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Aggiunta nuovo testo */}
        <div className="space-y-2">
          <Label className="text-gray-300">Aggiungi Testo</Label>
          <div className="flex gap-2">
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Inserisci il testo..."
              className="bg-gray-700 border-gray-600 text-white"
              onKeyPress={(e) => e.key === 'Enter' && addTextElement()}
            />
            <Button onClick={addTextElement} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Lista elementi testo */}
        <div className="space-y-2">
          <Label className="text-gray-300">Elementi Testo</Label>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {textElements.map(element => (
              <div
                key={element.id}
                className={`flex items-center justify-between p-2 rounded text-sm ${
                  selectedElement === element.id 
                    ? 'bg-blue-600/50 border border-blue-400' 
                    : 'bg-gray-700'
                }`}
              >
                <span 
                  className="text-white cursor-pointer flex-1 truncate"
                  onClick={() => setSelectedElement(element.id)}
                >
                  {element.text}
                </span>
                <Button
                  onClick={() => deleteElement(element.id)}
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Proprietà elemento selezionato */}
        {selectedElementData && (
          <div className="space-y-3 border-t border-gray-600 pt-4">
            <Label className="text-gray-300">Proprietà Testo Selezionato</Label>
            
            <div>
              <Label className="text-gray-400 text-sm">Testo</Label>
              <Input
                value={selectedElementData.text}
                onChange={(e) => updateElement(selectedElement!, { text: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-gray-400 text-sm">Dimensione</Label>
                <Input
                  type="number"
                  value={selectedElementData.fontSize}
                  onChange={(e) => updateElement(selectedElement!, { fontSize: parseInt(e.target.value) || 24 })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                  min="12"
                  max="100"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Peso</Label>
                <Select 
                  value={selectedElementData.fontWeight} 
                  onValueChange={(value) => updateElement(selectedElement!, { fontWeight: value as 'normal' | 'bold' })}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="bold">Grassetto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-sm">Font</Label>
              <Select 
                value={selectedElementData.fontFamily} 
                onValueChange={(value) => updateElement(selectedElement!, { fontFamily: value })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {fonts.map(font => (
                    <SelectItem key={font} value={font}>
                      {font.split(',')[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-400 text-sm">Colore</Label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {colors.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 ${
                      selectedElementData.color === color ? 'border-white' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateElement(selectedElement!, { color })}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-gray-400 text-sm">Posizione X</Label>
                <Input
                  type="number"
                  value={selectedElementData.x}
                  onChange={(e) => updateElement(selectedElement!, { x: parseInt(e.target.value) || 0 })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-400 text-sm">Posizione Y</Label>
                <Input
                  type="number"
                  value={selectedElementData.y}
                  onChange={(e) => updateElement(selectedElement!, { y: parseInt(e.target.value) || 0 })}
                  className="bg-gray-700 border-gray-600 text-white mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Pulsante applica modifiche */}
        <Button
          onClick={renderCanvas}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <Palette className="mr-2 h-4 w-4" />
          Applica Modifiche
        </Button>
      </CardContent>
    </Card>
  );
};

export default TextEditor;
