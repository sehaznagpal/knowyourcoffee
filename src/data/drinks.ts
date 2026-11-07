export type Ingredient =
  | 'espresso' | 'drip' | 'hot-water' | 'cold-water' | 'steamed-milk' | 'cold-milk' | 'half-and-half'
  | 'foam' | 'whipped-cream' | 'ice-cream' | 'chocolate' | 'ice' | 'blend';

export type Layer = { ing: Ingredient; parts: number };
export type VesselId = '01' | '02' | '03';
export type Category = 'shots' | 'with water' | 'with drip' | 'with milk' | 'cold & sweet';

export type Drink = {
  id: string;
  name: string;
  aliases: string[]; // extra names people search for
  confusedWith: { id: string; text: string }[]; // up to 3 drinks people mix this one up with, with the one-line difference
  category: Category;
  vessel: VesselId;
  layers: Layer[]; // bottom to top
  orderMatters?: boolean;
  blended?: boolean; // drawn as one blended colour
  crema?: boolean; // thin lighter line on top
  microfoam?: boolean; // thin foam line on top, no separate layer
  tip: string;
};

const L = (ing: Ingredient, parts: number): Layer => ({ ing, parts });

const BASE: Omit<Drink, 'confusedWith'>[] = [
  { id: 'espresso', name: 'Espresso', aliases: ['single shot', 'short black', 'shot'], category: 'shots', vessel: '03', layers: [L('espresso', 1)], crema: true, tip: 'One concentrated shot with golden crema. The base of almost everything here.' },
  { id: 'doppio', name: 'Doppio', aliases: ['double espresso', 'double shot'], category: 'shots', vessel: '03', layers: [L('espresso', 2)], tip: 'A double shot. Same drink as espresso, twice the amount.' },
  { id: 'macchiato', name: 'Macchiato', aliases: ['espresso macchiato', 'caffè macchiato'], category: 'shots', vessel: '03', layers: [L('espresso', 2), L('foam', 1)], tip: "Espresso 'stained' with a dollop of milk foam. Mostly coffee." },
  { id: 'americano', name: 'Americano', aliases: ['caffè americano', 'black coffee'], category: 'with water', vessel: '01', layers: [L('espresso', 1), L('hot-water', 2)], orderMatters: true, tip: 'Espresso first, then topped up with hot water.' },
  { id: 'long-black', name: 'Long black', aliases: [], category: 'with water', vessel: '01', layers: [L('hot-water', 2), L('espresso', 1)], orderMatters: true, tip: 'Water first, then espresso poured on top to keep the crema. Stronger-tasting than an americano.' },
  { id: 'red-eye', name: 'Red eye', aliases: ['shot in the dark'], category: 'with drip', vessel: '01', layers: [L('espresso', 1), L('drip', 3)], tip: 'Drip coffee with one shot of espresso added.' },
  { id: 'black-eye', name: 'Black eye', aliases: ['double red eye'], category: 'with drip', vessel: '01', layers: [L('espresso', 2), L('drip', 3)], tip: 'Drip coffee with two shots of espresso. The stronger sibling of the red eye.' },
  { id: 'cortado', name: 'Cortado', aliases: ['gibraltar'], category: 'with milk', vessel: '03', layers: [L('espresso', 1), L('steamed-milk', 1)], tip: 'Espresso cut with an equal amount of warm milk. Small and strong.' },
  { id: 'flat-white', name: 'Flat white', aliases: [], category: 'with milk', vessel: '01', layers: [L('espresso', 1), L('steamed-milk', 2)], microfoam: true, tip: 'Espresso with silky steamed milk and only a thin foam. Stronger and less foamy than a latte.' },
  { id: 'cappuccino', name: 'Cappuccino', aliases: ['cappucino', 'capuccino', 'cappa'], category: 'with milk', vessel: '01', layers: [L('espresso', 1), L('steamed-milk', 1), L('foam', 1)], tip: 'The classic thirds: espresso, steamed milk, foam. Light and foamy.' },
  { id: 'latte', name: 'Latte', aliases: ['caffè latte', 'cafe latte', 'milk coffee'], category: 'with milk', vessel: '02', layers: [L('espresso', 1), L('steamed-milk', 3), L('foam', 1)], tip: 'Mostly steamed milk over espresso with a thin foam top. Milder and creamier.' },
  { id: 'latte-macchiato', name: 'Latte macchiato', aliases: ['layered latte'], category: 'with milk', vessel: '02', layers: [L('steamed-milk', 3), L('foam', 1), L('espresso', 1)], orderMatters: true, tip: 'Milk first, espresso poured in last, so you see the layers.' },
  { id: 'breve', name: 'Breve', aliases: ['caffè breve', 'half and half latte'], category: 'with milk', vessel: '01', layers: [L('espresso', 1), L('half-and-half', 3), L('foam', 1)], tip: 'A latte made with half-and-half instead of milk. Richer and creamier.' },
  { id: 'mocha', name: 'Mocha', aliases: ['caffè mocha', 'mochaccino', 'chocolate coffee'], category: 'with milk', vessel: '02', layers: [L('chocolate', 1), L('espresso', 1), L('steamed-milk', 3), L('whipped-cream', 1)], tip: 'A latte with chocolate. Syrup at the bottom, whipped cream on top.' },
  { id: 'cafe-au-lait', name: 'Cafe au lait', aliases: ['café au lait', 'coffee with milk'], category: 'with milk', vessel: '01', layers: [L('drip', 1), L('steamed-milk', 1)], blended: true, tip: 'Equal parts brewed coffee and hot milk. Uses drip coffee, not espresso.' },
  { id: 'iced-latte', name: 'Iced latte', aliases: ['iced coffee', 'cold coffee'], category: 'cold & sweet', vessel: '02', layers: [L('espresso', 1), L('cold-milk', 3), L('ice', 1)], tip: 'Espresso and cold milk poured over ice.' },
  { id: 'iced-americano', name: 'Iced americano', aliases: ['iced coffee', 'iced black coffee'], category: 'cold & sweet', vessel: '02', layers: [L('espresso', 1), L('cold-water', 2), L('ice', 1)], tip: 'Espresso with cold water over ice.' },
  { id: 'affogato', name: 'Affogato', aliases: ['ice cream coffee', 'coffee dessert'], category: 'cold & sweet', vessel: '03', layers: [L('ice-cream', 1), L('espresso', 1)], orderMatters: true, tip: "A scoop of ice cream 'drowned' in a shot of hot espresso. A dessert." },
];

// Pairs people often confuse, from the brief. Each pair shows on both cards (a card shows at most three).
const PAIRS: [string, string, string][] = [
  ['espresso', 'doppio', 'A doppio is simply two shots instead of one.'],
  ['macchiato', 'latte-macchiato', 'Macchiato is espresso with a dab of foam; latte macchiato is mostly milk with espresso poured in last.'],
  ['macchiato', 'cortado', 'Macchiato gets only a spoon of foam; cortado gets an equal amount of steamed milk.'],
  ['americano', 'long-black', 'Same parts, opposite order: long black pours espresso onto water, so it keeps the crema.'],
  ['red-eye', 'black-eye', 'Red eye adds one shot to drip coffee, black eye adds two.'],
  ['cortado', 'flat-white', 'Cortado is milk 1:1 and no foam; flat white has twice the milk and a thin microfoam.'],
  ['flat-white', 'latte', 'Flat white has less milk and almost no foam, so it tastes stronger.'],
  ['cappuccino', 'latte', 'Cappuccino is equal thirds with a thick foam; latte is mostly milk with a thin foam.'],
  ['cappuccino', 'flat-white', 'Cappuccino has a whole layer of foam; flat white has only a thin line.'],
  ['latte', 'latte-macchiato', 'Latte starts with espresso; latte macchiato adds it last so you see layers.'],
  ['latte', 'breve', "Breve swaps the milk for half-and-half, so it's richer."],
  ['latte', 'mocha', 'Mocha is a latte with chocolate syrup and whipped cream.'],
  ['latte', 'cafe-au-lait', 'Café au lait uses brewed drip coffee, not espresso, half and half with milk.'],
  ['latte', 'iced-latte', 'Iced latte uses cold milk over ice.'],
  ['americano', 'iced-americano', 'Iced americano uses cold water over ice.'],
  ['iced-latte', 'iced-americano', 'Same ice and espresso; one adds cold milk, the other cold water.'],
  ['espresso', 'affogato', 'An affogato is an espresso poured over a scoop of ice cream.'],
];
const confusedFor = (id: string) =>
  PAIRS.filter(([a, b]) => a === id || b === id)
    .map(([a, b, text]) => ({ id: a === id ? b : a, text }))
    .slice(0, 3);

export const DRINKS: Drink[] = BASE.map((d) => ({ ...d, confusedWith: confusedFor(d.id) }));

export const CATEGORIES: Category[] = ['shots', 'with water', 'with drip', 'with milk', 'cold & sweet'];
