import { landing } from '../art-loader';

type Props = { onStart: () => void; zooming: boolean };

// Door box in frame px, read from reference/landing.png.
const DOOR = { left: 632, top: 312, width: 136, height: 336 };

export function Landing({ onStart, zooming }: Props) {
  return (
    <div className={`landing${zooming ? ' zooming' : ''}`}>
      <div className="landing-art" dangerouslySetInnerHTML={{ __html: landing }} />
      <p className="landing-caption">tap on the door to start.</p>
      <button
        type="button"
        className="door-hit"
        style={DOOR}
        aria-label="Open the door and start"
        onClick={onStart}
        disabled={zooming}
      />
    </div>
  );
}
