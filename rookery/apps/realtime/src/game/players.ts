import { PROVISIONAL_RD } from '@rookery/chess-core';
import type { PlayerInfo } from '@rookery/protocol';
import type { PlayerCard, StoredRating } from '../supabase';

/** The public card shown to an opponent. */
export function playerInfo(card: PlayerCard & { glicko: StoredRating }): PlayerInfo {
  return {
    id: card.id,
    username: card.username,
    displayName: card.displayName,
    avatarPath: card.avatarPath,
    country: card.country,
    rating: Math.round(card.glicko.rating),
    provisional: card.glicko.rd > PROVISIONAL_RD,
  };
}

const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Unguessable game id (12 characters, ~70 bits): doubles as the secret in invitation links. */
export function randomId(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let id = '';
  for (const b of bytes) id += ALPHABET[b % ALPHABET.length];
  return id;
}
