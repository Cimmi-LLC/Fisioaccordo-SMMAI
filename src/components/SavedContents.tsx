
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

const SavedContents: React.FC<SavedContentsProps> = ({ savedContents, isLoading = false }) => {
  if (isLoading) {
    return (
      <Card className="mt-6 sm:mt-8 backdrop-blur-enhanced">
        <CardHeader>
          <CardTitle className="text-foreground">I Tuoi Contenuti Salvati</CardTitle>
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

  const getPlatformEmoji = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return '📸';
      case 'facebook': return '👥';
      case 'linkedin': return '💼';
      case 'tiktok': return '🎵';
      default: return '📱';
    }
  };

  const getToneColor = (tone?: string) => {
    switch (tone?.toLowerCase()) {
      case 'professionale': return 'bg-primary/20 text-primary border-primary/30';
      case 'amichevole': return 'bg-accent/20 text-accent border-accent/30';
      case 'energico': return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'educativo': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-muted/20 text-muted-foreground border-border';
    }
  };

  return (
    <Card className="mt-6 sm:mt-8 backdrop-blur-enhanced">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground text-lg sm:text-xl">
            I Tuoi Contenuti Salvati
          </CardTitle>
          <Badge variant="secondary">
            {savedContents.length} contenuti
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedContents.map((content) => (
            <div 
              key={content.id} 
              className="group bg-muted/20 p-4 rounded-lg border border-border hover:border-primary transition-all duration-200 hover:bg-muted/30 hover:shadow-enhanced"
            >
              {/* Header della card */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-foreground font-medium text-sm sm:text-base line-clamp-2 flex-1">
                  {content.title}
                </h3>
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge 
                  variant="outline" 
                  className="text-xs"
                >
                  {getPlatformEmoji(content.platform)} {content.platform}
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-xs"
                >
                  {content.post_type}
                </Badge>
                {content.tone && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs border ${getToneColor(content.tone)}`}
                  >
                    {content.tone}
                  </Badge>
                )}
              </div>

              {/* Preview del contenuto */}
              <p className="text-muted-foreground text-sm line-clamp-3 mb-4 leading-relaxed">
                {content.content_text.substring(0, 120)}...
              </p>

              {/* Footer con data e azioni */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(content.created_at)}
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs hover:text-primary"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Vedi
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs hover:text-primary"
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    Condividi
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action se ci sono pochi contenuti */}
        {savedContents.length < 3 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-secondary/10 to-primary/10 rounded-lg border border-primary/20">
            <p className="text-primary text-sm text-center">
              💡 <strong>Tip Pro:</strong> Crea almeno 5-10 contenuti per avere sempre materiale pronto da pubblicare!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SavedContents;
