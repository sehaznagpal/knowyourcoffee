import { Frame } from './Frame';
import { Arch, At, Bench, Door, Floor, Lamp, Plant, Stanchions } from './props';
import {
  ARCH_W, DOOR_X, FLOOR_Y, FRAME_TOP_MIN, LAMPS, LOBBY_W, TEST_DOOR_X, TOUR_X, WINGS, WORLD_W, type FramePlace,
} from './layout';

type Props = {
  activeId: string | null;
  near: 'door' | 'tour' | 'testdoor' | null;
  tourAt: number | null; // a saved tour stop, so the sign can offer to continue
  onOpen: (f: FramePlace) => void;
  onTour: () => void;
};

/** Everything that hangs on the wall or lies on the floor, at 1x parallax. Positions are world x, stage y. */
export function World({ activeId, near, tourAt, onOpen, onTour }: Props) {
  return (
    <>
      <Floor />
      <div className="g-skirting" style={{ width: WORLD_W, top: FLOOR_Y - 18 }} aria-hidden="true" />
      {LAMPS.map((x) => <At key={x} x={x - 50} y={0}><Lamp drop={176} /></At>)}

      {/* lobby */}
      <At x={DOOR_X - 65} y={FLOOR_Y - 18 - 250} className={`g-door${near === 'door' ? ' is-active' : ''}`}>
        <Door />
        <span className="g-door-sign">entrance</span>
      </At>
      <At x={440} y={FLOOR_Y - 206}><Plant seed={1} /></At>
      <At x={400} y={110} className="g-welcome" style={{ width: 480 }}>
        <h1>welcome.</h1>
        <p>18 coffees, 5 wings. walk in, look closer, learn what is in the glass.</p>
      </At>
      <At x={TOUR_X - 110} y={288} className={`g-tour${near === 'tour' ? ' is-active' : ''}`}>
        <button type="button" className="g-tour-sign" onClick={onTour} aria-label="Take the tour: a guided walk past all 18 coffees">
          <b>{tourAt ? 'continue the tour' : 'take the tour'}</b><span>{tourAt ? `stop ${tourAt + 1} of 18` : 'a guided walk, 18 stops'}</span>
        </button>
      </At>
      <At x={TOUR_X - 115} y={FLOOR_Y - 90}><Bench /></At>
      <At x={1010} y={FLOOR_Y - 206}><Plant seed={2} /></At>

      {/* wings: an arch with the category tag, then the frames */}
      {WINGS.map((w, wi) => (
        <div key={w.category}>
          <At x={w.archX} y={0}><Arch /></At>
          <span className="tag g-wing-tag" style={{ left: w.archX + ARCH_W / 2 - 52, top: FRAME_TOP_MIN + 26 }}>{w.category}</span>
          {w.frames.map((f) => <Frame key={f.id} f={f} active={f.id === activeId} onOpen={onOpen} />)}
          <At x={w.end - 200} y={FLOOR_Y - 206}><Plant seed={4 + wi} /></At>
          {w.frames.length >= 6 ? <At x={w.frames[3].x + 192 - 115} y={FLOOR_Y - 90}><Bench /></At> : null}
        </div>
      ))}

      {/* end of the corridor */}
      <At x={TEST_DOOR_X - 65} y={FLOOR_Y - 18 - 250} className={`g-door${near === 'testdoor' ? ' is-active' : ''}`}>
        <Door />
        <span className="g-door-sign">testing room</span>
      </At>
    </>
  );
}

/** Foreground props, drawn in front of her at 1.25x parallax: rope stanchions at every arch and at the testing room. */
export function Foreground() {
  const xs = [...WINGS.map((w) => w.archX + ARCH_W / 2), TEST_DOOR_X - 150];
  return (
    <>
      {xs.map((x) => <At key={x} x={x * 1.25 - 100} y={730}><Stanchions gap={200} /></At>)}
    </>
  );
}
