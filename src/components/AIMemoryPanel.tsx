import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Plus, Trash2, Loader2 } from 'lucide-react';
import { useAIMemory } from '@/hooks/useAIMemory';

const MEMORY_TYPES = [
  { value: 'preference', label: '⚙️ Preferenza' },
  { value: 'brand_voice', label: '🎤 Brand Voice' },
  { value: 'style', label: '✍️ Stile' },
  { value: 'correction', label: '📝 Correzione' },
  { value: 'feedback', label: '💬 Feedback' }
];

const AIMemoryPanel: React.FC = () => {
  const { memories, loading, addMemory, deleteMemory } = useAIMemory();
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('preference');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setAdding(true);
    await addMemory(newType, newContent.trim());
    setNewContent('');
    setAdding(false);
  };

  const typeLabel = (type: string) => MEMORY_TYPES.find(t => t.value === type)?.label || type;
  const stats = {
    total: memories.length,
    corrections: memories.filter(m => m.memory_type === 'correction').length,
    feedback: memories.filter(m => m.memory_type === 'feedback').length,
    preferences: memories.filter(m => m.memory_type === 'preference' || m.memory_type === 'brand_voice' || m.memory_type === 'style').length,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5" /> Memoria AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 text-xs">
          <Badge variant="secondary">{stats.total} memorie</Badge>
          <Badge variant="outline">{stats.corrections} correzioni</Badge>
          <Badge variant="outline">{stats.feedback} feedback</Badge>
          <Badge variant="outline">{stats.preferences} preferenze</Badge>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEMORY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={adding || !newContent.trim()} size="sm">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <Textarea
            placeholder="Es: Non usare mai emoji cuore, Firma sempre con 'Studio FisioLife', Tono autorevole ma amichevole..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            rows={2}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : memories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nessuna memoria. Aggiungi preferenze e l'AI imparerà!</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {memories.map(m => (
              <div key={m.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm group">
                <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{typeLabel(m.memory_type)}</Badge>
                <p className="flex-1 text-foreground/90">{m.content}</p>
                <button onClick={() => deleteMemory(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIMemoryPanel;
