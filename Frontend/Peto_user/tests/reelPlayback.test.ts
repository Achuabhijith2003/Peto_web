import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ReelPlayback, type ReelVideo } from '../src/utils/reelPlayback';

class Video implements ReelVideo {
  muted = true;
  playing = false;
  attempts = 0;
  start: () => Promise<void> = async () => {};
  pause() { this.playing = false; }
  async play() { this.attempts++; await this.start(); this.playing = true; }
}

test('starts with sound and silences the previous reel before playing the next', async () => {
  const manager = new ReelPlayback();
  const first = new Video();
  const second = new Video();
  await manager.play(first, false);
  assert.equal(first.muted, false);
  second.start = async () => {
    assert.equal(first.playing, false);
    assert.equal(first.muted, true);
  };
  await manager.play(second, false);
  assert.equal(second.playing, true);
  assert.equal(second.muted, false);
});

test('a late play completion cannot restart an offscreen reel', async () => {
  const manager = new ReelPlayback();
  const first = new Video();
  let finish!: () => void;
  first.start = () => new Promise<void>((resolve) => { finish = resolve; });
  const pending = manager.play(first, false);
  const second = new Video();
  await manager.play(second, false);
  finish();
  assert.equal(await pending, 'superseded');
  assert.equal(first.playing, false);
  assert.equal(first.muted, true);
  assert.equal(second.playing, true);
});

test('autoplay restriction falls back to muted and a click can enable sound', async () => {
  const manager = new ReelPlayback();
  const video = new Video();
  video.start = async () => {
    if (!video.muted) throw Object.assign(new Error('Gesture required'), { name: 'NotAllowedError' });
  };
  assert.equal(await manager.play(video, false), 'muted');
  assert.equal(video.playing, true);
  video.start = async () => {};
  assert.equal(await manager.play(video, false), 'playing');
  assert.equal(video.muted, false);
});

test('muted preference and pending pause are respected', async () => {
  const manager = new ReelPlayback();
  const video = new Video();
  await manager.play(video, true);
  assert.equal(video.muted, true);
  let finish!: () => void;
  video.start = () => new Promise<void>((resolve) => { finish = resolve; });
  const pending = manager.play(video, false);
  manager.pause(video);
  finish();
  assert.equal(await pending, 'superseded');
  assert.equal(video.playing, false);
});
