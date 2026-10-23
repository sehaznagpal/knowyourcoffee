export type Ingredient =
  | 'espresso' | 'drip' | 'hot-water' | 'cold-water' | 'steamed-milk' | 'cold-milk' | 'half-and-half'
  | 'foam' | 'whipped-cream' | 'ice-cream' | 'chocolate' | 'ice' | 'blend';

export type Layer = { ing: Ingredient; parts: number };
export type VesselId = '01' | '02' | '03';
export type Category = 'shots' | 'with water' | 'with drip' | 'with milk' | 'cold & sweet';

export type Drink = {
  id: string;
  name: string;
  category: Category;
  vessel: VesselId;
  layers: Layer[]; // bottom to top
  orderMatters?: boolean;
  tip: string;
};

const L = (ing: Ingredient, parts: number): Layer => ({ ing, parts });

export const DRINKS: Drink[] = [
  { id: 'espresso', name: 'Espresso', category: 'shots', vessel: '03', layers: [L('espresso', 1)], tip: 'One concentrated shot with golden crema. The base of almost everything here.' },
  { id: 'doppio', name: 'Doppio', category: 'shots', vessel: '03', layers: [L('espresso', 2)], tip: 'A double shot. Same drink as espresso, twice the amount.' },
  { id: 'macchiato', name: 'Macchiato', category: 'shots', vessel: '03', layers: [L('espresso', 2), L('foam', 1)], tip: "Espresso 'stained' with a dollop of milk foam. Mostly coffee." },
  { id: 'americano', name: 'Americano', category: 'with water', vessel: '01', layers: [L('espresso', 1), L('hot-water', 2)], orderMatters: true, tip: 'Espresso first, then topped up with hot water.' },
  { id: 'long-black', name: 'Long black', category: 'with water', vessel: '01', layers: [L('hot-water', 2), L('espresso', 1)], orderMatters: true, tip: 'Water first, then espresso poured on top to keep the crema. Stronger-tasting than an americano.' },
  { id: 'red-eye', name: 'Red eye', category: 'with drip', vessel: '01', layers: [L('espresso', 1), L('drip', 3)], tip: 'Drip coffee with one shot of espresso added.' },
  { id: 'black-eye', name: 'Black eye', category: 'with drip', vessel: '01', layers: [L('espresso', 2), L('drip', 3)], tip: 'Drip coffee with two shots of espresso. The stronger sibling of the red eye.' },
  { id: 'cortado', name: 'Cortado', category: 'with milk', vessel: '03', layers: [L('espresso', 1), L('steamed-milk', 1)], tip: 'Espresso cut with an equal amount of warm milk. Small and strong.' },
  { id: 'flat-white', name: 'Flat white', category: 'with milk', vessel: '01', layers: [L('espresso', 1), L('steamed-milk', 2)], tip: 'Espresso with silky steamed milk and only a thin foam. Stronger and less foamy than a latte.' },
  { id: 'cappuccino', name: 'Cappuccino', category: 'with milk', vessel: '01', layers: [L('espresso', 1), L('steamed-milk', 1), L('foam', 1)], tip: 'The classic thirds: espresso, steamed milk, foam. Light and foamy.' },
  { id: 'latte', name: 'Latte', category: 'with milk', vessel: '02', layers: [L('espresso', 1), L('steamed-milk', 3), L('foam', 1)], tip: 'Mostly steamed milk over espresso with a thin foam top. Milder and creamier.' },
  { id: 'latte-macchiato', name: 'Latte macchiato', category: 'with milk', vessel: '02', layers: [L('steamed-milk', 3), L('foam', 1), L('espresso', 1)], orderMatters: true, tip: 'Milk first, espresso poured in last, so you see the layers.' },
  { id: 'breve', name: 'Breve', category: 'with milk', vessel: '01', layers: [L('espresso', 1), L('half-and-half', 3), L('foam', 1)], tip: 'A latte made with half-and-half instead of milk. Richer and creamier.' },
  { id: 'mocha', name: 'Mocha', category: 'with milk', vessel: '02', layers: [L('chocolate', 1), L('espresso', 1), L('steamed-milk', 3), L('whipped-cream', 1)], tip: 'A latte with chocolate. Syrup at the bottom, whipped cream on top.' },
  { id: 'cafe-au-lait', name: 'Cafe au lait', category: 'with milk', vessel: '01', layers: [L('blend', 2)], tip: 'Equal parts brewed coffee and hot milk. Uses drip coffee, not espresso.' },
  { id: 'iced-latte', name: 'Iced latte', category: 'cold & sweet', vessel: '02', layers: [L('espresso', 1), L('cold-milk', 3), L('ice', 1)], tip: 'Espresso and cold milk poured over ice.' },
  { id: 'iced-americano', name: 'Iced americano', category: 'cold & sweet', vessel: '02', layers: [L('espresso', 1), L('cold-water', 2), L('ice', 1)], tip: 'Espresso with cold water over ice.' },
  { id: 'affogato', name: 'Affogato', category: 'cold & sweet', vessel: '03', layers: [L('ice-cream', 1), L('espresso', 1)], orderMatters: true, tip: "A scoop of ice cream 'drowned' in a shot of hot espresso. A dessert." },
];

export const CATEGORIES: Category[] = ['shots', 'with water', 'with drip', 'with milk', 'cold & sweet'];
