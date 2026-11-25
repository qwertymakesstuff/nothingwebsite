// The opponent roster. To add an opponent: create a JSON file in this folder (see any existing
// one, and src/schema.ts for every field), then add one import and one entry below. Every file
// is validated at load time, so a mistake fails the build instead of reaching players.

import { numericRating, PersonaSchema, type Persona } from '../schema';
import amara from './amara.json';
import archivist from './archivist.json';
import benedict from './benedict.json';
import corvus from './corvus.json';
import hana from './hana.json';
import ines from './ines.json';
import juniper from './juniper.json';
import kofi from './kofi.json';
import lucien from './lucien.json';
import marlow from './marlow.json';
import pip from './pip.json';
import rosa from './rosa.json';
import selene from './selene.json';
import theo from './theo.json';
import viktor from './viktor.json';

const RAW: unknown[] = [pip, marlow, juniper, theo, rosa, benedict, ines, kofi, hana, viktor, amara, lucien, archivist, selene, corvus];

export const ROSTER: readonly Persona[] = RAW.map((raw) => {
  const parsed = PersonaSchema.safeParse(raw);
  if (!parsed.success) {
    const id = (raw as { id?: string })?.id ?? '(unknown)';
    throw new Error(`Invalid opponent config "${id}": ${parsed.error.message}`);
  }
  return parsed.data;
}).sort((a, b) => numericRating(a) - numericRating(b));

export function getPersona(id: string): Persona | undefined {
  return ROSTER.find((p) => p.id === id);
}
