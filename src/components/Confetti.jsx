import React, { useEffect } from 'react';
import { launchConfetti } from '../utils/confetti.js';

/**
 * Confetti canvas component.
 * Launches a confetti burst whenever `active` becomes true.
 * @param {boolean} active - whether confetti should be firing
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef - ref for the canvas element
 */
export default function Confetti({ active, canvasRef }) {
  useEffect(() => {
    if (!active) return;
    const cleanup = launchConfetti(canvasRef?.current);
    return cleanup;
  }, [active, canvasRef]);

  return <canvas id="confetti" ref={canvasRef} />;
}
