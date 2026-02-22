import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { useAIMemory } from '@/hooks/useAIMemory';

interface FeedbackWidgetProps {
  generatedContent: string;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ generatedContent }) => {
  const { addFeedback } = useAIMemory();
  const [showComment, setShowComment] = useState(false);
  const [isPositive, setIsPositive] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);

  const handleVote = (positive: boolean) => {
    setIsPositive(positive);
    setShowComment(true);
  };

  const handleSend = async () => {
    if (isPositive === null) return;
    await addFeedback(isPositive, comment || (isPositive ? 'Mi piace' : 'Non mi piace'), generatedContent);
    setSent(true);
    setTimeout(() => { setSent(false); setShowComment(false); setComment(''); setIsPositive(null); }, 2000);
  };

  if (sent) return <p className="text-xs text-center text-muted-foreground py-2">✅ Feedback salvato! L'AI imparerà.</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 justify-center">
        <span className="text-xs text-muted-foreground">Come ti sembra?</span>
        <Button size="sm" variant={isPositive === true ? 'default' : 'ghost'} className="h-7 w-7 p-0" onClick={() => handleVote(true)}>
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant={isPositive === false ? 'destructive' : 'ghost'} className="h-7 w-7 p-0" onClick={() => handleVote(false)}>
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>
      {showComment && (
        <div className="flex gap-1.5">
          <Textarea placeholder="Cosa miglioreresti?" value={comment} onChange={e => setComment(e.target.value)} rows={1} className="text-xs" />
          <Button size="sm" className="h-8" onClick={handleSend}><Send className="h-3.5 w-3.5" /></Button>
        </div>
      )}
    </div>
  );
};

export default FeedbackWidget;
