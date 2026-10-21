import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import { compressVideo, createThumbnail } from '../src/media/video.service';

const exec = promisify(execFile);

for (const withAudio of [false, true]) {
  test(`portrait phone HEVC converts to playable H264 MP4 (${withAudio ? 'with audio' : 'silent'})`, async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'peto-video-'));
    try {
      const input = path.join(dir, 'camera.mov');
      const output = path.join(dir, 'converted.mp4');
      const thumbnail = path.join(dir, 'thumbnail.jpg');
      await exec(ffmpegPath!, [
        '-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=720x1280:r=5',
        ...(withAudio ? ['-f', 'lavfi', '-i', 'sine=frequency=440'] : []),
        '-t', '0.6', '-c:v', 'libx265', '-pix_fmt', 'yuv420p10le',
        '-threads', '1', '-filter_threads', '1',
        '-x265-params', 'pools=1:frame-threads=1:log-level=error',
        ...(withAudio ? ['-c:a', 'aac'] : ['-an']), input,
      ], { timeout: 30000 });
      await compressVideo(input, output, withAudio);
      await createThumbnail(output, thumbnail);
      const { stdout } = await exec(ffprobe.path, ['-v', 'error', '-show_streams', '-of', 'json', output]);
      const streams = JSON.parse(stdout).streams;
      const video = streams.find((stream: any) => stream.codec_type === 'video');
      assert.equal(video.codec_name, 'h264');
      assert.equal(video.pix_fmt, 'yuv420p');
      assert.ok(video.width <= 1080 && video.height <= 1080);
      assert.equal(video.width % 2, 0);
      assert.equal(video.height % 2, 0);
      assert.equal(streams.some((stream: any) => stream.codec_type === 'audio'), withAudio);
      assert.ok((await stat(thumbnail)).size > 0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

test('invalid video rejects instead of reporting compression success', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'peto-video-invalid-'));
  try {
    await assert.rejects(compressVideo(path.join(dir, 'missing.mov'), path.join(dir, 'out.mp4')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
