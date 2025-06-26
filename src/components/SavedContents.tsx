
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SavedContent {
  id: string;
  title: string;
  content_text: string;
  platform: string;
  post_type: string;
}

interface SavedContentsProps {
  savedContents: SavedContent[];
}

const SavedContents: React.FC<SavedContentsProps> = ({ savedContents }) => {
  if (savedContents.length === 0) {
    return null;
  }

  return (
    <Card className="mt-8 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">I Tuoi Contenuti Salvati</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedContents.map((content) => (
            <div key={content.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
              <h3 className="text-white font-medium mb-2">{content.title}</h3>
              <p className="text-gray-400 text-sm mb-2">
                {content.platform} • {content.post_type}
              </p>
              <p className="text-gray-300 text-sm line-clamp-3">
                {content.content_text.substring(0, 100)}...
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SavedContents;
