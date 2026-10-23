import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { table, frames } from '../art-loader';
import { CATEGORIES, DRINKS } from '../data/drinks';
import { TAG_DEFAULT, TAG_POS, SLOT_PITCH } from '../data/layout';
import { COUNT, Mover, easeInOutCubic, easeOutCubic, slotX, slotsFor } from '../logic/loop';
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
  const slots = useMemo(() => slotsFor(viewLeft, viewW), [viewLeft, viewW]);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const scaleRef = useRef(scale);
  const activeRef = useRef(active);
  scaleRef.current = scale;
  activeRef.current = active;

  useLayoutEffect(() => {
    const apply = (pos: number) => {
      const sl = slotsRef.current;
      for (let i = 0; i < sl.count; i++) {
        const el = cupEls.current[i];
        if (el) el.style.transform = `translateX(${slotX(i, pos, sl)}px)`;
      }
      for (let r = 0; r < sl.count / COUNT; r++) {
        CATEGORIES.forEach((c, k) => {
          const el = tagEls.current[r * CATEGORIES.length + k];
          if (el) el.style.transform = `translateX(${slotX(r * COUNT + firstOfGroup[k], pos, sl) + (TAG_POS[c] ?? TAG_DEFAULT).dx}px)`;
        });
      }
    };
    mover.current = new Mover(apply);
    return () => mover.current?.dispose();
  }, []);

  // the cup list changes with the viewport size: put every cup back where the loop says it is
  useLayoutEffect(() => { mover.current?.refresh(); }, [slots]);

  const show = (i: number, pinned: boolean) => {
    clearTimeout(lingerTimer.current);
    setLingering(false);
    setOpen({ i, x: slotX(i, mover.current!.pos, slotsRef.current), pinned });
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
      closeNow();
      const m = mover.current!;
      m.set(m.pos + e.deltaX / scaleRef.current / SLOT_PITCH);
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
      <p className="hint">
        <span><span className="hint-hover">hover over any cup</span><span className="hint-tap">tap any cup</span></span>
        <span>to see what's inside</span>
      </p>
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
        <div className="cups" data-active={open || lingering ? '' : undefined} style={{ left: ZONE_PAD, top: -ZONE.top }}>
          {Array.from({ length: slots.count }, (_, i) => {
            const d = DRINKS[i % COUNT];
            const x = slotX(i, 0, slots);
            const slot = (x - viewLeft) / SLOT_PITCH; // 0 at the left screen edge
            return (
            <Cup
              key={`${d.id}-${Math.floor(i / COUNT)}`}
              drink={d}
              x={x}
              popDelay={slot > -1 && slot < viewW / SLOT_PITCH + 1 ? Math.max(0, slot) * 30 : undefined}
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
          {Array.from({ length: slots.count / COUNT }, (_, r) => CATEGORIES.map((c, k) => {
            const pos = TAG_POS[c] ?? TAG_DEFAULT;
            return (
              <span key={`${c}-${r}`} className="tag" ref={(el) => { tagEls.current[r * CATEGORIES.length + k] = el; }} style={{ left: 0, top: pos.y, transform: `translateX(${slotX(r * COUNT + firstOfGroup[k], 0, slots) + pos.dx}px)` }}>
                {c}
              </span>
            );
          }))}
        </div>
      </div>
      {open ? <DrinkCard drink={DRINKS[open.i % COUNT]} x={open.x} /> : null}
      <ArrowButton dir="left" onClick={() => nudge(-3, 600)} />
      <ArrowButton dir="right" onClick={() => nudge(3, 600)} />
      <Legend />
      <button type="button" className="btn test-btn" onClick={onTest}>test what you learned</button>
    </div>
  );
}
