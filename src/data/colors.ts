import type { Ingredient } from './drinks';

export const COLOR: Record<Ingredient, string> = {
  espresso: '#3B2314',
  drip: '#7A4A2E',
  'steamed-milk': '#FFFBF0',
  'cold-milk': '#FFFBF0',
  'half-and-half': '#F6E7C8',
  foam: '#EBD9B4',
  chocolate: '#2A160D',
  'whipped-cream': '#FFFFFF',
  'ice-cream': '#FFF1D6',
  'hot-water': '#8FE5FF',
  'cold-water': '#8FE5FF',
  ice: '#E6F4FA',
  blend: '#C9A27C',
};

export const LABEL: Record<Ingredient, string> = {
  espresso: 'espresso',
  drip: 'drip coffee',
  'steamed-milk': 'steamed milk',
  'cold-milk': 'cold milk',
  'half-and-half': 'steamed half-and-half',
  foam: 'milk foam',
  chocolate: 'chocolate syrup',
  'whipped-cream': 'whipped cream',
  'ice-cream': 'ice cream',
  'hot-water': 'hot water',
  'cold-water': 'cold water',
  ice: 'ice',
  blend: 'cafe au lait blend',
};

export const ICE_OUTLINE = '#6F8FA0';
