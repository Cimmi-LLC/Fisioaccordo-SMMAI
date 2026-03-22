
import React, { useState } from 'react';
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

  if (sent) {
    return (
      <p className="text-[11px] text-center py-2 font-medium" style={{ color: 'var(--ink3)' }}>
        Feedback salvato! L'AI imparerà.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 justify-center">
        <span className="text-[11px] font-medium" style={{ color: 'var(--ink3)' }}>Com'è venuto?</span>
        <button
          className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
          style={{
            backgroundColor: isPositive === true ? 'var(--viola)' : 'transparent',
            border: '1px solid var(--line)',
            color: isPositive === true ? 'white' : 'var(--ink3)',
          }}
          onClick={() => handleVote(true)}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
          style={{
            backgroundColor: isPositive === false ? '#dc2626' : 'transparent',
            border: '1px solid var(--line)',
            color: isPositive === false ? 'white' : 'var(--ink3)',
          }}
          onClick={() => handleVote(false)}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
      {showComment && (
        <div className="flex gap-1.5">
          <textarea
            placeholder="Cosa miglioreresti?"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={1}
            className="flex-1 text-[11px] px-3 py-1.5 rounded-lg resize-none outline-none"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              fontFamily: 'Montserrat, sans-serif',
            }}
          />
          <button
            onClick={handleSend}
            className="h-8 px-3 rounded-lg text-white flex items-center justify-center"
            style={{ backgroundColor: 'var(--viola)' }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedbackWidget;
