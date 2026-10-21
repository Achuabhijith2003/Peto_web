export interface ReelVideo {
  muted: boolean;
  pause(): void;
  play(): Promise<void>;
}

/** One owner, including while asynchronous play() calls are still pending. */
export class ReelPlayback {
  private owner: ReelVideo | null = null;
  private generation = 0;

  owns(video: ReelVideo) { return this.owner === video; }

  pause(video: ReelVideo) {
    if (this.owner === video) { this.owner = null; this.generation++; }
    video.muted = true;
    video.pause();
  }

  async play(video: ReelVideo, muted: boolean): Promise<'playing' | 'muted' | 'stopped' | 'superseded'> {
    if (this.owner && this.owner !== video) this.pause(this.owner);
    this.owner = video;
    const generation = ++this.generation;
    const current = () => this.owner === video && this.generation === generation;
    video.muted = muted;
    try {
      await video.play();
    } catch (error) {
      if (!current()) return 'superseded';
      if (!muted && (error as { name?: string })?.name === 'NotAllowedError') {
        video.muted = true;
        try { await video.play(); } catch { return 'stopped'; }
      } else { return 'stopped'; }
    }
    if (!current()) {
      // A newer request for this same element still owns its playback.
      if (this.owner !== video) { video.muted = true; video.pause(); }
      return 'superseded';
    }
    return video.muted && !muted ? 'muted' : 'playing';
  }
}

export const reelPlayback = new ReelPlayback();
