import type { BlindMapping } from '../types';

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${remainingSeconds
    .toFixed(3)
    .padStart(6, '0')}`;
};

export const getFrameNumber = (
  time: number,
  frameRate: number
) => {
  return Math.floor(time * frameRate);
};

export const createBlindMapping = (): BlindMapping => {
  const shouldSwap = Math.random() < 0.5;

  return shouldSwap
    ? { A: 'optimized', B: 'original' }
    : { A: 'original', B: 'optimized' };
};