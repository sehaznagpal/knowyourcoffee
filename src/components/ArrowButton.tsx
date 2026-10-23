type Props = { dir: 'left' | 'right'; onClick: () => void };

export function ArrowButton({ dir, onClick }: Props) {
  return (
    <button
      type="button"
      className={`arrow-btn arrow-${dir}`}
      aria-label={dir === 'left' ? 'Previous drinks' : 'Next drinks'}
      onClick={onClick}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d={dir === 'left' ? 'M13 3 6 10l7 7' : 'M7 3l7 7-7 7'} stroke="#1e1e1e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
