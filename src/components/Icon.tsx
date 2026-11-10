const P: Record<string, string> = {
  brush: 'M3 21c3 0 5-2 5-4.5S6.5 13 5 13s-2 1.5-2 3.5M8 16l12-12-2-2L6 14',
  eraser: 'M7 21h12M5.5 15.5l9-9 5 5-6.5 6.5H9z M9.5 11.5l5 5',
  eyedropper: 'M14 4l6 6M17 7l-10 10-4 1 1-4L14 4M12 6l6 6',
  palette: 'M12 3a9 9 0 100 18c1.2 0 1.8-.9 1.4-2-.5-1.3.3-2.5 1.7-2.5H18a3 3 0 003-3c0-5.5-4-10.5-9-10.5zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
  hand: 'M8 13V5.5a1.5 1.5 0 013 0V12M11 11V4a1.5 1.5 0 013 0v7M14 11V5.5a1.5 1.5 0 013 0V14c0 4-2.5 7-6 7-2.5 0-4-1-5.5-3L3 14.5a1.5 1.5 0 012.3-1.9L8 15',
  zoom: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5M11 8v6M8 11h6',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11',
  redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 000 11H13',
  media: 'M4 20l7-7M14 4l6 6-7 7-6-6zM9 9l6 6',
  focus: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6A17 17 0 002 12s3.5 7 10 7a9.6 9.6 0 005.4-1.6',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  clear: 'M5 5l14 14M19 5L5 19',
  reset: 'M4 4v6h6M20 20v-6h-6M5.6 15A8 8 0 0019 14M18.4 9A8 8 0 005 10',
  close: 'M6 6l12 12M18 6L6 18',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  replay: 'M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.7L3 8M3 3v5h5M10 9l5 3-5 3z',
  export: 'M12 3v12M7 8l5-5 5 5M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4',
  home: 'M3 11l9-7 9 7M5 10v10h14V10',
  swap: 'M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8',
  panel: 'M3 4h18v16H3zM15 4v16',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  open: 'M3 7h6l2 2h10v10H3z',
  upload: 'M12 21V9M7 14l5-5 5 5M4 3h16',
  fit: 'M4 4h6M4 4v6M20 20h-6M20 20v-6M20 4h-6M20 4v6M4 20h6M4 20v-6',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01',
};
export function Icon({ name, size }: { name: keyof typeof P | string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 20} height={size ?? 20} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? ''} />
    </svg>
  );
}
