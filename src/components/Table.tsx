import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { table, frames, board } from '../art-loader';
import { CATEGORIES, DRINKS } from '../data/drinks';
import { PITCH, TAG_TOP } from '../data/layout';
import { COUNT, Mover, cupX, easeInOutCubic, easeOutCubic, nearestStop, stopOffset, stripFor, tagX } from '../logic/loop';
import { ArrowButton } from './ArrowButton';
import { Cup } from './Cup';
import { DrinkCard } from './DrinkCard';
import { Legend } from './Legend';

type Props = { scale: number; entering: boolean; active: boolean; onHome: () => void; onTest: () => void };

const ZONE = { top: 333, height: 291 }; // 40% to 75% of the 832px frame
const ZONE_PAD = 2000; // the band spans the full viewport width, not just the stage
const DRAG_THRESHOLD = 6;
const LINGER_MS = 120; // others stay dimmed this long after the pointer leaves a cup, so crossing the gap does not flicker
const STAGE = { w: 1280, h: 832 };
const ARROW_INSET = 24; // arrows sit 24px inside the screen edges


export function Table({ scale, entering, active, onHome, onTest }: Props) {
  const cupEls = useRef<(HTMLDivElement | null)[]>([]);
  const tagEls = useRef<(HTMLSpanElement | null)[]>([]);
  const zoneEl = useRef<HTMLDivElement>(null);
  const mover = useRef<Mover | null>(null);
  // hovered / focused / tapped cup; `pinned` keeps it open until the next click elsewhere
  const [open, setOpen] = useState<{ i: number; x: number; pinned: boolean } | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const [lingering, setLingering] = useState(false);
  const lingerTimer = useRef(0);
  const [vw, setVw] = useState(window.innerWidth);
  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  // viewport in stage px: the strip is clipped by the screen, not by the stage
  const viewW = vw / scale;
  const viewLeft = (STAGE.w - viewW) / 2;
  const strip = useMemo(() => stripFor(viewLeft, viewW), [viewLeft, viewW]);
  const stripRef = useRef(strip);
  stripRef.current = strip;
  const scaleRef = useRef(scale);
  const activeRef = useRef(active);
  scaleRef.current = scale;
  activeRef.current = active;

  useLayoutEffect(() => {
    const apply = (pos: number) => {
      const st = stripRef.current;
      for (let i = 0; i < st.copies * COUNT; i++) {
        const el = cupEls.current[i];
        if (el) el.style.transform = `translateX(${cupX(i, pos, st)}px)`;
      }
      for (let t = 0; t < st.copies * CATEGORIES.length; t++) {
        const el = tagEls.current[t];
        if (el) el.style.transform = `translateX(${tagX(t, pos, st)}px)`;
      }
    };
    mover.current = new Mover(apply);
    return () => mover.current?.dispose();
  }, []);

  // the cup list changes with the viewport size: put every cup back where the loop says it is
  useLayoutEffect(() => { mover.current?.refresh(); }, [strip]);

  const show = (i: number, pinned: boolean) => {
    clearTimeout(lingerTimer.current);
    setLingering(false);
    setOpen({ i, x: cupX(i, mover.current!.pos, stripRef.current), pinned });
  };
  // pointer left the cup: the card closes now, the other cups stay dimmed for LINGER_MS
  const release = () => {
    setOpen(null);
    setLingering(true);
    clearTimeout(lingerTimer.current);
    lingerTimer.current = window.setTimeout(() => setLingering(false), LINGER_MS);
  };
  // drag, arrow, wheel, Esc, outside click: everything returns to full opacity at once
  const closeNow = () => {
    clearTimeout(lingerTimer.current);
    setLingering(false);
    setOpen(null);
  };

  const nudge = (n: number, dur: number) => {
    closeNow();
    const m = mover.current!;
    m.animateTo(stopOffset(nearestStop(m.target) + n), dur, easeInOutCubic); // n cups along, gaps included
  };
  const settle = () => {
    const m = mover.current!;
    m.animateTo(stopOffset(nearestStop(m.pos)), 300, easeOutCubic);
  };

  // keyboard, plus wheel (non-passive so the browser's horizontal swipe-back is suppressed inside the zone)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (e.key === 'ArrowRight') nudge(1, 350);
      else if (e.key === 'ArrowLeft') nudge(-1, 350);
    };
    let idle = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      closeNow();
      const m = mover.current!;
      m.set(m.pos + e.deltaX / scaleRef.current);
      clearTimeout(idle);
      idle = window.setTimeout(settle, 140);
    };
    const away = (e: PointerEvent) => { if (!(e.target as Element).closest('.cup')) closeNow(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeNow(); };
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    window.addEventListener('keydown', onKey);
    const zone = zoneEl.current!;
    zone.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc);
      window.removeEventListener('keydown', onKey);
      zone.removeEventListener('wheel', onWheel);
      clearTimeout(idle);
      clearTimeout(lingerTimer.current);
    };
  }, []);

  // drag / swipe: pointer events on the zone only
  const drag = useRef<{ id: number; x0: number; pos0: number; moved: boolean; samples: { t: number; x: number }[] } | null>(null);
  const suppressClick = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { id: e.pointerId, x0: e.clientX, pos0: mover.current!.pos, moved: false, samples: [{ t: e.timeStamp, x: e.clientX }] };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      d.moved = true;
      closeNow();
      mover.current!.cancel();
      zoneEl.current!.setPointerCapture(e.pointerId);
    }
    d.samples.push({ t: e.timeStamp, x: e.clientX });
    if (d.samples.length > 8) d.samples.shift();
    mover.current!.set(d.pos0 - dx / scaleRef.current);
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    const recent = d.samples.filter((s) => e.timeStamp - s.t < 120);
    const first = recent[0] ?? d.samples[0];
    const dt = Math.max(1, e.timeStamp - first.t);
    const v = -(e.clientX - first.x) / dt / scaleRef.current; // px per ms
    const m = mover.current!;
    const target = stopOffset(nearestStop(m.pos + v * 280)); // settle on the nearest cup centre
    const dur = Math.min(1100, 350 + (Math.abs(target - m.pos) / PITCH) * 140);
    m.animateTo(target, dur, easeOutCubic);
  };

  return (
    <div className={`table-screen${entering ? ' entering' : ''}${open ? ' has-card' : ''}`}>
      <div className="frames" dangerouslySetInnerHTML={{ __html: frames }} />
      <button type="button" className="wordmark" onClick={onHome}>know your coffee</button>
      <div className="board" role="img" aria-label="hover over any cup to see what's inside">
        {/* the board's strings continue up past the stage on tall windows; drawn as svg so they rasterise like the art */}
        <svg className="board-strings" width="244" height="202" viewBox="0 0 244 202" aria-hidden="true">
          <path d="M66.675 -3000H67.675V0H66.675ZM164.675 -3000H165.675V0H164.675Z" fill="#F7F5F1" />
        </svg>
        <div dangerouslySetInnerHTML={{ __html: board }} />
      </div>
      <div className="table-art" dangerouslySetInnerHTML={{ __html: table }} />
      {viewW > STAGE.w + 1 ? (
        <>
          {/* the art ends the table with a short vertical line at each stage edge; hide it where the band continues */}
          <div className="band-cap" style={{ left: 0 }} />
          <div className="band-cap" style={{ left: STAGE.w - 4 }} />
        </>
      ) : null}
      <div
        className="zone"
        ref={zoneEl}
        style={{ left: -ZONE_PAD, top: ZONE.top, width: 1280 + 2 * ZONE_PAD, height: ZONE.height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => { if (suppressClick.current) e.stopPropagation(); }}
      >
        <div className="cups" data-active={open || lingering ? '' : undefined} style={{ left: ZONE_PAD, top: -ZONE.top }}>
          {Array.from({ length: strip.copies * COUNT }, (_, i) => {
            const d = DRINKS[i % COUNT];
            const x = cupX(i, 0, strip);
            const slot = (x - viewLeft) / PITCH; // 0 at the left screen edge
            return (
            <Cup
              key={`${d.id}-${Math.floor(i / COUNT)}`}
              drink={d}
              x={x}
              popDelay={slot > -1 && slot < viewW / PITCH + 1 ? Math.max(0, slot) * 30 : undefined}
              active={open?.i === i}
              refCb={(el) => { cupEls.current[i] = el; }}
              onEnter={() => { if (!openRef.current?.pinned) show(i, false); }}
              onLeave={() => { if (!openRef.current?.pinned) release(); }}
              onTap={(type) => { if (type === 'touch' && openRef.current?.i === i && openRef.current.pinned) closeNow(); else show(i, true); }}
              onFocus={() => { if (!openRef.current?.pinned) show(i, false); }}
              onBlur={() => { if (!openRef.current?.pinned) release(); }}
            />
            );
          })}
          {Array.from({ length: strip.copies * CATEGORIES.length }, (_, t) => (
            <span key={`${CATEGORIES[t % CATEGORIES.length]}-${Math.floor(t / CATEGORIES.length)}`} className="tag" ref={(el) => { tagEls.current[t] = el; }} style={{ left: 0, top: TAG_TOP, transform: `translateX(${tagX(t, 0, strip)}px)` }}>
              {CATEGORIES[t % CATEGORIES.length]}
            </span>
          ))}
        </div>
      </div>
      {open ? <DrinkCard drink={DRINKS[open.i % COUNT]} x={open.x} /> : null}
      <ArrowButton dir="left" left={viewLeft + ARROW_INSET} onClick={() => nudge(-3, 600)} />
      <ArrowButton dir="right" left={viewLeft + viewW - ARROW_INSET - 56} onClick={() => nudge(3, 600)} />
      <Legend />
      <button type="button" className="btn test-btn" onClick={onTest}>test what you learned</button>
    </div>
  );
}
