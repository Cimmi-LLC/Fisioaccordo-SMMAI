import { describe, it, expect } from 'vitest';
import { sembraInstagram, nomeUtenteInstagram, profiloDaInstagram } from '../instagramProfile.ts';

describe('nomeUtenteInstagram', () => {
  it('riconosce @nome, nome e i link copiati dall\'app', () => {
    expect(nomeUtenteInstagram('@Terapista.Stellato')).toBe('terapista.stellato');
    expect(nomeUtenteInstagram('alicebartozzi_fisio')).toBe('alicebartozzi_fisio');
    expect(nomeUtenteInstagram('https://www.instagram.com/alicebartozzi_fisio/?igsh=abc123')).toBe('alicebartozzi_fisio');
    expect(nomeUtenteInstagram('instagram.com/attilio')).toBe('attilio');
  });
  it('post, reel, storie e testo a caso non sono profili', () => {
    expect(nomeUtenteInstagram('https://www.instagram.com/p/C1abc/')).toBeNull();
    expect(nomeUtenteInstagram('https://instagram.com/reel/xyz')).toBeNull();
    expect(nomeUtenteInstagram('https://www.instagram.com/')).toBeNull();
    expect(nomeUtenteInstagram('nome con spazi')).toBeNull();
    expect(nomeUtenteInstagram('')).toBeNull();
  });
});

describe('sembraInstagram', () => {
  it('distingue Instagram da un sito', () => {
    expect(sembraInstagram('@nome')).toBe(true);
    expect(sembraInstagram('https://www.instagram.com/nome')).toBe(true);
    expect(sembraInstagram('https://www.tuostudio.it')).toBe(false);
    expect(sembraInstagram('notinstagram.com')).toBe(false);
  });
});

describe('profiloDaInstagram', () => {
  it('costruisce testo, logo e immagini dai dati del profilo', () => {
    const p = profiloDaInstagram({
      username: 'attilio', fullName: 'Attilio C', biography: 'Soldi e motivazione',
      businessCategoryName: 'Imprenditore', externalUrl: 'https://esempio.it',
      profilePicUrl: 'https://x/small.jpg', profilePicUrlHD: 'https://x/hd.jpg',
      latestPosts: [{ caption: 'Primo post', displayUrl: 'https://x/1.jpg' }, { caption: '', displayUrl: null }],
    }, 'attilio');
    expect(p.title).toBe('Attilio C');
    expect(p.description).toBe('Soldi e motivazione');
    expect(p.logoUrl).toBe('https://x/hd.jpg');
    expect(p.postImages).toEqual(['https://x/1.jpg']);
    expect(p.bodyText).toContain('BIO: Soldi e motivazione');
    expect(p.bodyText).toContain('1. Primo post');
    expect(p.externalUrl).toBe('https://esempio.it');
  });
  it('profilo quasi vuoto: niente errori', () => {
    const p = profiloDaInstagram({}, 'nome');
    expect(p.title).toBe('@nome');
    expect(p.logoUrl).toBeNull();
    expect(p.postImages).toEqual([]);
  });
});
