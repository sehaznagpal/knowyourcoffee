import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { table, frames } from '../art-loader';
import { CATEGORIES, DRINKS } from '../data/drinks';
import { TAG_DEFAULT, TAG_POS, SLOT_PITCH, slotCenter } from '../data/layout';
import { Mover, easeInOutCubic, easeOutCubic, slotX } from '../logic/loop';
import { ArrowButton } from './ArrowButton';
import { Cup } from './Cup';
import { DrinkCard } from './DrinkCard';
import { Legend } from './Legend';

type Props = { scale: number; entering: boolean; active: boolean; onHome: () => void; onTest: () => void };

const ZONE = { top: 333, height: 291 }; // 40% to 75% of the 832px frame
const ZONE_PAD = 2000; // the band spans the full viewport width, not just the stage
const DRAG_THRESHOLD = 6;

const firstOfGroup = CATEGORIES.map((c) => DRINKS.findIndex((d) => d.category === c));

export function Table({ scale, entering, active, onHome, onTest }: Props) {
  const cupEls = useRef<(HTMLDivElement | null)[]>([]);
  const tagEls = useRef<(HTMLSpanElement | null)[]>([]);
  const zoneEl = useRef<HTMLDivElement>(null);
  const mover = useRef<Mover | null>(null);
  // hovered / focused / tapped cup; `pinned` keeps it open until the next click elsewhere
  const [open, setOpen] = useState<{ i: number; x: number; pinned: boolean } | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const scaleRef = useRef(scale);
  const activeRef = useRef(active);
  scaleRef.current = scale;
  activeRef.current = active;

  useLayoutEffect(() => {
    const apply = (pos: number) => {
      DRINKS.forEach((_, i) => {
        const el = cupEls.current[i];
        if (el) el.style.transform = `translateX(${slotX(i, pos)}px)`;
      });
      CATEGORIES.forEach((c, k) => {
        const el = tagEls.current[k];
        if (el) el.style.transform = `translateX(${slotX(firstOfGroup[k], pos) + (TAG_POS[c] ?? TAG_DEFAULT).dx}px)`;
      });
    };
    mover.current = new Mover(apply);
    return () => mover.current?.dispose();
  }, []);

  const show = (i: number, pinned: boolean) => setOpen({ i, x: slotX(i, mover.current!.pos), pinned });

  const nudge = (n: number, dur: number) => {
    setOpen(null);
    const m = mover.current!;
    m.animateTo(Math.round(m.target) + n, dur, easeInOutCubic);
  };
  const settle = () => {
    const m = mover.current!;
    m.animateTo(Math.round(m.pos), 300, easeOutCubic);
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
      setOpen(null);
      const m = mover.current!;
      m.set(m.pos + e.deltaX / scaleRef.current / SLOT_PITCH);
      clearTimeout(idle);
      idle = window.setTimeout(settle, 140);
    };
    const away = (e: PointerEvent) => { if (!(e.target as Element).closest('.cup')) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
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
      setOpen(null);
      mover.current!.cancel();
      zoneEl.current!.setPointerCapture(e.pointerId);
    }
    d.samples.push({ t: e.timeStamp, x: e.clientX });
    if (d.samples.length > 8) d.samples.shift();
    mover.current!.set(d.pos0 - dx / scaleRef.current / SLOT_PITCH);
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
    const v = -(e.clientX - first.x) / dt / scaleRef.current / SLOT_PITCH; // slots per ms
    const m = mover.current!;
    const target = Math.round(m.pos + v * 280);
    const dur = Math.min(1100, 350 + Math.abs(target - m.pos) * 140);
    m.animateTo(target, dur, easeOutCubic);
  };

  return (
    <div className={`table-screen${entering ? ' entering' : ''}${open ? ' has-card' : ''}`}>
      <div className="frames" dangerouslySetInnerHTML={{ __html: frames }} />
      <button type="button" className="wordmark" onClick={onHome}>know your coffee</button>
      <div className="table-art" dangerouslySetInnerHTML={{ __html: table }} />
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
        <div className="cups" style={{ left: ZONE_PAD, top: -ZONE.top }}>
          {DRINKS.map((d, i) => (
            <Cup
              key={d.id}
              drink={d}
              x={slotX(i, 0)}
              popDelay={i <= 6 ? i * 30 : undefined}
              active={open?.i === i}
              refCb={(el) => { cupEls.current[i] = el; }}
              onEnter={() => { if (!openRef.current?.pinned) show(i, false); }}
              onLeave={() => { if (!openRef.current?.pinned) setOpen(null); }}
              onTap={(type) => { if (type === 'touch' && openRef.current?.i === i && openRef.current.pinned) setOpen(null); else show(i, true); }}
              onFocus={() => { if (!openRef.current?.pinned) show(i, false); }}
              onBlur={() => { if (!openRef.current?.pinned) setOpen(null); }}
            />
          ))}
          {CATEGORIES.map((c, k) => {
            const pos = TAG_POS[c] ?? TAG_DEFAULT;
            return (
              <span key={c} className="tag" ref={(el) => { tagEls.current[k] = el; }} style={{ left: 0, top: pos.y, transform: `translateX(${slotCenter(firstOfGroup[k]) + pos.dx}px)` }}>
                {c}
              </span>
            );
          })}
        </div>
      </div>
      {open ? <DrinkCard drink={DRINKS[open.i]} x={open.x} /> : null}
      <ArrowButton dir="left" onClick={() => nudge(-3, 600)} />
      <ArrowButton dir="right" onClick={() => nudge(3, 600)} />
      <Legend />
      <button type="button" className="btn test-btn" onClick={onTest}>test what you learned</button>
    </div>
  );
}
