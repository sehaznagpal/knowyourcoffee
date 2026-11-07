import { Frame } from './Frame';
import { Arch, At, Bench, Door, Floor, Lamp, Plant, Stanchions } from './props';
import { DOOR_X, FLOOR_Y, FRAMES, LAMPS, LOBBY_W, WINGS, WORLD_W, type FramePlace } from './layout';

type Props = { activeId: string | null; doorActive: boolean; onOpen: (f: FramePlace) => void };

/** Everything that hangs on the wall or lies on the floor, at 1x parallax. Positions are world x, stage y. */
export function World({ activeId, doorActive, onOpen }: Props) {
  return (
    <>
      <Floor />
      <div className="g-skirting" style={{ width: WORLD_W, top: FLOOR_Y - 18 }} aria-hidden="true" />

      {LAMPS.map((x) => <At key={x} x={x - 50} y={0}><Lamp drop={96} /></At>)}

      {/* lobby */}
      <At x={DOOR_X - 65} y={FLOOR_Y - 18 - 250} className={`g-door${doorActive ? ' is-active' : ''}`}>
        <Door />
        <span className="g-door-sign">entrance</span>
        {doorActive ? <i className="look-hint">↑ back to the café</i> : null}
      </At>
      <At x={520} y={150} className="g-welcome" style={{ width: 620 }}>
        <h1>welcome.</h1>
        <p>18 coffees, 5 wings. walk in, look closer, learn what is in the glass.</p>
      </At>
      <At x={355} y={FLOOR_Y - 206}><Plant seed={1} /></At>
      <At x={880} y={FLOOR_Y - 90}><Bench /></At>
      <At x={LOBBY_W - 170} y={FLOOR_Y - 206}><Plant seed={2} /></At>

      {/* wings: an arch with the category tag, then the frames */}
      {WINGS.map((w) => (
        <div key={w.category}>
          <At x={w.archX} y={0}><Arch /></At>
          <span className="tag g-wing-tag" style={{ left: w.archX + 120 - 52, top: 66 }}>{w.category}</span>
          {w.frames.map((f) => <Frame key={f.id} f={f} active={f.id === activeId} onOpen={onOpen} />)}
        </div>
      ))}

      {/* end of the corridor */}
      <At x={WORLD_W - 140} y={FLOOR_Y - 18 - 250}>
        <Door />
        <span className="g-door-sign">testing room</span>
      </At>
      <At x={WORLD_W - 260} y={FLOOR_Y - 206}><Plant seed={3} /></At>
    </>
  );
}

/** Foreground props, drawn in front of her at 1.25x parallax: rope stanchions at the arch and the end of the wing. */
export function Foreground() {
  const last = FRAMES[FRAMES.length - 1].x;
  return (
    <>
      <At x={LOBBY_W * 1.25 - 330} y={730}><Stanchions gap={200} /></At>
      <At x={(last + 140) * 1.25} y={730}><Stanchions gap={200} /></At>
    </>
  );
}
