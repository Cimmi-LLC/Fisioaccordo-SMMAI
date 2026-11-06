import React from 'react';
import type { CreatorInfo } from '@/services/socialService';
import {
  TIKTOK_PRIVACY_LABEL,
  tiktokConsentText,
  type TikTokOptions,
  type TikTokPrivacy,
} from '@/lib/social/socialCore';


const fieldStyle: React.CSSProperties = {
  width: '100%', backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8,
  padding: '9px 11px', color: 'var(--ink)', fontSize: 13, outline: 'none',
};
const labelCls = 'text-[11px] font-bold uppercase block mb-1.5';
const labelStyle: React.CSSProperties = { color: 'var(--ink3)', letterSpacing: '0.5px' };

interface Props {
  value: TikTokOptions;
  onChange: (v: TikTokOptions) => void;
  creator: CreatorInfo | null;
  creatorError: string | null;
  /** Nome del profilo collegato, finché TikTok non dà il suo. */
  accountName: string;
  mode: 'video' | 'photos';
}

/**
 * Le scelte che TikTok chiede prima di ogni pubblicazione: profilo con cui
 * si pubblica, visibilità scelta dall'utente, commenti/duetti/stitch,
 * contenuto promozionale e la frase di consenso.
 */
const TikTokOptionsPanel: React.FC<Props> = ({ value: tt, onChange: setTt, creator, creatorError, accountName, mode }) => {
  const privacyOptions = (creator?.privacy_level_options?.length ? creator.privacy_level_options : Object.keys(TIKTOK_PRIVACY_LABEL)) as TikTokPrivacy[];

  const check = (key: 'allow_comment' | 'allow_duet' | 'allow_stitch', text: string, disabled: boolean) => (
    <label className="flex items-center gap-2 text-[12px]" style={{ color: disabled ? 'var(--ink3)' : 'var(--ink)', opacity: disabled ? 0.6 : 1 }}>
      <input type="checkbox" checked={tt[key] && !disabled} disabled={disabled}
        onChange={(e) => setTt({ ...tt, [key]: e.target.checked })} />
      {text}{disabled && ' (spento sul tuo profilo)'}
    </label>
  );

  return (
    <div className="p-3 rounded-lg space-y-2.5" style={{ border: '1px solid var(--line)' }}>
      <div className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>
        TikTok · pubblichi come {creator ? (creator.creator_nickname || creator.creator_username) : accountName}
      </div>
      {creatorError && <p className="text-[12px]" style={{ color: '#dc2626' }}>{creatorError}</p>}
      <div>
        <span className={labelCls} style={labelStyle}>Chi può vederlo</span>
        <select value={tt.privacy_level} onChange={(e) => setTt({ ...tt, privacy_level: e.target.value as TikTokPrivacy })} style={fieldStyle}>
          <option value="" disabled>Scegli…</option>
          {privacyOptions.map((p) => (
            <option key={p} value={p} disabled={tt.brand_content && p === 'SELF_ONLY'}>{TIKTOK_PRIVACY_LABEL[p] || p}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        {check('allow_comment', 'Consenti i commenti', !!creator?.comment_disabled)}
        {mode === 'video' && check('allow_duet', 'Consenti i duetti', !!creator?.duet_disabled)}
        {mode === 'video' && check('allow_stitch', 'Consenti lo stitch', !!creator?.stitch_disabled)}
      </div>
      <div className="pt-1 space-y-1" style={{ borderTop: '1px solid var(--line)' }}>
        <label className="flex items-center gap-2 text-[12px] pt-2" style={{ color: 'var(--ink)' }}>
          <input type="checkbox" checked={tt.commercial}
            onChange={(e) => setTt({ ...tt, commercial: e.target.checked, brand_organic: false, brand_content: false })} />
          Contenuto promozionale (pubblicizza un servizio o un prodotto)
        </label>
        {tt.commercial && (
          <div className="pl-6 space-y-1">
            <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--ink)' }}>
              <input type="checkbox" checked={tt.brand_organic} onChange={(e) => setTt({ ...tt, brand_organic: e.target.checked })} />
              Il tuo studio · comparirà «Contenuto promozionale»
            </label>
            <label className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--ink)' }}>
              <input type="checkbox" checked={tt.brand_content}
                onChange={(e) => setTt({ ...tt, brand_content: e.target.checked, privacy_level: e.target.checked && tt.privacy_level === 'SELF_ONLY' ? '' : tt.privacy_level })} />
              Un altro marchio che ti paga · comparirà «Partnership retribuita»
            </label>
          </div>
        )}
      </div>
      <p className="text-[11px]" style={{ color: 'var(--ink3)' }}>
        {tiktokConsentText(tt)} Dopo l'invio TikTok impiega qualche minuto a mostrarlo sul profilo.
      </p>
    </div>
  );
};

export default TikTokOptionsPanel;
