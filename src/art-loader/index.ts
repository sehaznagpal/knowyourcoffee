import landing from '../../art/landing.svg?raw';
import table from '../../art/table.svg?raw';
import frames from '../../art/frames.svg?raw';
import board from '../../art/board.svg?raw';
import testGlass from '../../art/test-glass.svg?raw';
import maskTestGlass from '../../art/liquid-mask_test-glass.svg?raw';

const vesselFiles = import.meta.glob('../../art/vessel/[0-9]*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const maskFiles = import.meta.glob('../../art/vessel/liquid-mask_*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const byName = (files: Record<string, string>, strip: RegExp) =>
  Object.fromEntries(Object.entries(files).map(([p, svg]) => [p.split('/').pop()!.replace(strip, ''), svg]));

export const vessels: Record<string, string> = { ...byName(vesselFiles, /\.svg$/), 'test-glass': testGlass };
export const masks: Record<string, string> = { ...byName(maskFiles, /^liquid-mask_|\.svg$/g), 'test-glass': maskTestGlass };

export { landing, table, frames, board };
