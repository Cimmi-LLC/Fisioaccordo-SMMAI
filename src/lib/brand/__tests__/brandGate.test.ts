import { describe, it, expect } from 'vitest';
import { decideBrandGate, checkBrandGate } from '../../brandGate.ts';

describe('decideBrandGate', () => {
  it('un errore del server non vale "zero brand"', () => {
    expect(decideBrandGate({ count: null, error: { message: 'timeout' } })).toBe('error');
    expect(decideBrandGate({ count: 0, error: { status: 503 } })).toBe('error');
  });
  it('count mancante senza errore resta un errore', () => {
    expect(decideBrandGate({ count: null, error: null })).toBe('error');
  });
  it('count 0 senza errore manda all\'onboarding, > 0 entra', () => {
    expect(decideBrandGate({ count: 0, error: null })).toBe('none');
    expect(decideBrandGate({ count: 2, error: null })).toBe('has');
  });
});

describe('checkBrandGate', () => {
  it('riprova dopo un errore e si ferma alla prima risposta certa', async () => {
    let calls = 0;
    const res = await checkBrandGate(async () => {
      calls++;
      return calls === 1 ? { count: null, error: { status: 503 } } : { count: 1, error: null };
    }, { pauseMs: 0 });
    expect(res).toBe('has');
    expect(calls).toBe(2);
  });
  it('dopo tutti i tentativi falliti dice "error", mai "none"', async () => {
    let calls = 0;
    const res = await checkBrandGate(async () => { calls++; throw new Error('Failed to fetch'); }, { attempts: 3, pauseMs: 0 });
    expect(res).toBe('error');
    expect(calls).toBe(3);
  });
  it('una query appesa scade e conta come errore', async () => {
    const res = await checkBrandGate(
      (signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))),
      { attempts: 1, timeoutMs: 20, pauseMs: 0 },
    );
    expect(res).toBe('error');
  });
});
