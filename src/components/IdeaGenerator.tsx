
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { getProfession, DEFAULT_PROFESSION_ID } from "@/lib/brand/profession";

interface IdeaGeneratorProps {
  ideaInput: string;
  setIdeaInput: (value: string) => void;
  onIdeaGenerated: (idea: string) => void;
  /** Idee rapide del mestiere del brand attivo; senza brand: fisioterapia. */
  ideas?: string[];
  placeholder?: string;
}

const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({
  ideaInput,
  setIdeaInput,
  onIdeaGenerated,
  ideas,
  placeholder,
}) => {
  const generateIdea = () => {
    const pool = ideas && ideas.length > 0 ? ideas : getProfession(DEFAULT_PROFESSION_ID).temiEsempio;
    const randomIdea = pool[Math.floor(Math.random() * pool.length)];
    setIdeaInput(randomIdea);
    onIdeaGenerated(randomIdea);
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--viola-dim)',
        border: '1px solid var(--line)',
      }}
    >
      <p
        className="text-[10px] font-black uppercase mb-3"
        style={{ color: 'var(--viola)', letterSpacing: '0.8px' }}
      >
        Ispirazione rapida
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={ideaInput}
          onChange={(e) => setIdeaInput(e.target.value)}
          placeholder={placeholder || "Inserisci un argomento (es. mal di schiena, riabilitazione)"}
          className="flex-1 px-3 py-2 text-[12px] font-medium rounded-lg outline-none focus:border-opacity-50 transition-colors"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            color: 'var(--ink)',
            minHeight: '44px',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(230,0,126,0.35)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--line)')}
        />
        <Button
          onClick={generateIdea}
          size="sm"
          className="text-white text-[11px] font-black uppercase px-4 whitespace-nowrap min-h-[44px] border-0"
          style={{
            backgroundColor: 'var(--viola)',
            borderRadius: '8px',
            letterSpacing: '0.5px',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--viola-deep)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--viola)')}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Trova Idee
        </Button>
      </div>
    </div>
  );
};

export default IdeaGenerator;
