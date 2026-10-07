export type ActiveVideo = 'original' | 'optimized';

export type ViewMode = 'ab' | 'side-by-side';

export type BlindMapping = {
  A: 'original' | 'optimized';
  B: 'original' | 'optimized';
};

export type Verdict = 'A' | 'B' | 'same';

export type Label = {
  videoAUrl: string;
  videoBUrl: string;
  time: number;
  frame: number;
  verdict: Verdict;
  activeVideo: 'A' | 'B';
  blindMode: boolean;
  blindMapping: BlindMapping;
  createdAt: string;
};