import { FRAMES, ROOMS, WORLD_W, type FramePlace, type Room } from './layout';

type Props = {
  width: number;
  boxHeight: number;
  /** Rooms and frame ticks become buttons when a handler is given. */
  onRoom?: (r: Room) => void;
  onFrame?: (f: FramePlace) => void;
  className?: string;
  labelSize?: number;
};

const fx = (x: number, w: number) => (x / WORLD_W) * w;

/**
 * The corridor as a sketch strip: a box per room, a tick per frame, and a lilac dot where she is.
 * The dot follows the CSS variable --pos (0..1), which the gallery loop updates every frame.
 */
export function MapStrip({ width, boxHeight, onRoom, onFrame, className, labelSize = 11 }: Props) {
  const labelRow = labelSize + 6;
  return (
    <div className={`map-strip${className ? ' ' + className : ''}`} style={{ width, height: boxHeight + 2 * labelRow, '--lab': `${labelSize}px` } as React.CSSProperties}>
      {ROOMS.map((r, i) => {
        const left = fx(r.x0, width), w = Math.max(6, fx(r.x1 - r.x0, width));
        const above = i % 2 === 0;
        const Box = onRoom ? 'button' : 'div';
        return (
          <div key={r.id}>
            <Box
              className="map-room"
              {...(onRoom ? { type: 'button' as const, onClick: () => onRoom(r), 'aria-label': `Go to ${r.label === 'test' ? 'the testing room' : r.label}` } : {})}
              style={{ left, width: w, top: labelRow, height: boxHeight }}
            />
            <span className="map-label" style={{ left: left + w / 2, top: above ? 0 : labelRow + boxHeight + 2 }}>{r.label}</span>
          </div>
        );
      })}
      {FRAMES.map((f) => {
        const Tick = onFrame ? 'button' : 'i';
        return (
          <Tick
            key={f.id}
            className="map-tick"
            data-name={f.drink.name}
            {...(onFrame ? { type: 'button' as const, onClick: () => onFrame(f), 'aria-label': f.drink.name } : {})}
            style={{ left: fx(f.x, width), top: labelRow + boxHeight * 0.2, height: boxHeight * 0.6 }}
          />
        );
      })}
      <span className="map-dot" style={{ top: labelRow + boxHeight / 2 }} aria-hidden="true" />
    </div>
  );
}

/** The same map, drawn large on the lobby wall as a directory board. */
export function Directory() {
  return (
    <div className="directory" role="img" aria-label="Directory: lobby, then the shots, water, drip, milk and cold and sweet wings, then the testing room">
      <b>directory</b>
      <MapStrip width={300} boxHeight={34} labelSize={12} />
      <small><i className="map-dot-key" /> you are here · {FRAMES.length} coffees</small>
    </div>
  );
}
