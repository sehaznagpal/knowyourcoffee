export function SpeakerIcon({ off }: { off: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path d="M3 10h4l6-5v16l-6-5H3Z" fill="#1e1e1e" stroke="#1e1e1e" strokeWidth="2" strokeLinejoin="round" />
      {off ? <path d="M17 9l7 8M24 9l-7 8" stroke="#1e1e1e" strokeWidth="2.5" strokeLinecap="round" /> : <path d="M17 9c2 2.5 2 5.500 0 8M20 6c4 4.500 4 10.500 0 15" stroke="#1e1e1e" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}
