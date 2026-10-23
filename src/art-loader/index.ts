import landing from '../../art/landing.svg?raw';
import table from '../../art/table.svg?raw';
import frames from '../../art/frames.svg?raw';

const vesselFiles = import.meta.glob('../../art/vessel/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const vessels: Record<string, string> = Object.fromEntries(
  Object.entries(vesselFiles).map(([p, svg]) => [p.split('/').pop()!.replace('.svg', ''), svg]),
);

export { landing, table, frames };
