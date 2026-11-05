import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronDown, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import SkeletonLoader from "./ui/skeleton-loader";

interface SavedContent {
  id: string;
  title: string;
  content_text: string;
  platform: string;
  post_type: string;
  created_at?: string;
  tone?: string;
}

interface SavedContentsProps {
  savedContents: SavedContent[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
}

const TITOLO = "I tuoi contenuti salvati";

const SavedContents: React.FC<SavedContentsProps> = ({ savedContents, isLoading = false, onDelete }) => {
  const { toast } = useToast();
  const [aperto, setAperto] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="mt-6 sm:mt-8 backdrop-blur-enhanced">
        <CardHeader>
          <CardTitle className="text-foreground">{TITOLO}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonLoader type="card" count={3} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (savedContents.length === 0) {
    return null;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const copia = async (testo: string) => {
    try {
      await navigator.clipboard.writeText(testo);
      toast({ title: "Testo copiato" });
    } catch {
      toast({ title: "Copia non riuscita", description: "Apri il contenuto e copialo a mano.", variant: "destructive" });
    }
  };

  const elimina = (content: SavedContent) => {
    if (!onDelete) return;
    if (window.confirm(`Eliminare «${content.title}»?`)) onDelete(content.id);
  };

  return (
    <Card className="mt-6 sm:mt-8 backdrop-blur-enhanced">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground text-lg sm:text-xl">
            {TITOLO}
          </CardTitle>
          <Badge variant="secondary">
            {savedContents.length} {savedContents.length === 1 ? 'contenuto' : 'contenuti'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {savedContents.map((content) => {
            const isAperto = aperto === content.id;
            const testo = content.content_text || '';
            return (
              <div
                key={content.id}
                className="group bg-muted/20 p-4 rounded-lg border border-border hover:border-primary transition-all duration-200 hover:bg-muted/30 hover:shadow-enhanced min-w-0"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-foreground font-medium text-sm sm:text-base line-clamp-2 flex-1">
                    {content.title}
                  </h3>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => elimina(content)}
                      aria-label="Elimina"
                      className="ml-2 h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">{content.platform}</Badge>
                  <Badge variant="outline" className="text-xs">{content.post_type}</Badge>
                </div>

                <p className={`text-muted-foreground text-sm mb-4 leading-relaxed whitespace-pre-line break-words ${isAperto ? '' : 'line-clamp-3'}`}>
                  {testo}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(content.created_at)}
                  </div>

                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:text-primary" onClick={() => setAperto(isAperto ? null : content.id)}>
                      <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${isAperto ? 'rotate-180' : ''}`} />
                      {isAperto ? 'Chiudi' : 'Leggi tutto'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:text-primary" onClick={() => copia(testo)}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copia
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SavedContents;
