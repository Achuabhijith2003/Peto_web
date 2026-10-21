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
import { VideoCapacity, videoCapacity } from '../src/media/videoCapacity';
import { processVideo } from '../src/media/video.service';
import { uploadVideo } from '../src/media/storage.service';
import { writeFile } from 'node:fs/promises';

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

test('4K 10-bit HEVC at 60fps converts with constrained decoder to at most 1080p/30fps', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'peto-video-4k-'));
  try {
    const input = path.join(dir, '4k-camera.mov');
    const output = path.join(dir, 'converted.mp4');
    await exec(ffmpegPath!, [
      '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=3840x2160:r=60',
      '-t', '0.2', '-c:v', 'libx265', '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p10le', '-threads', '1', '-filter_threads', '1',
      '-x265-params', 'pools=1:frame-threads=1:log-level=error', '-an', input,
    ], { timeout: 60000 });
    await compressVideo(input, output, false);
    const { stdout } = await exec(ffprobe.path, ['-v', 'error', '-show_streams', '-of', 'json', output]);
    const video = JSON.parse(stdout).streams.find((stream: any) => stream.codec_type === 'video');
    assert.equal(video.codec_name, 'h264');
    assert.equal(video.pix_fmt, 'yuv420p');
    assert.ok(video.width <= 1080 && video.height <= 1080);
    const [numerator, denominator] = video.avg_frame_rate.split('/').map(Number);
    assert.ok(numerator / denominator <= 30);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('capacity rejects overlapping pipelines without releasing an earlier permit', () => {
  const gate = new VideoCapacity();
  const first = gate.acquire();
  assert.throws(() => gate.acquire(), (error: any) => error.status === 503);
  first();
  const second = gate.acquire();
  first(); // An old release cannot unlock the active second request.
  assert.throws(() => gate.acquire());
  second();
  gate.acquire()();
});

test('busy pipeline returns retryable 503 and cleans its incoming temp file', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'peto-video-busy-'));
  const release = videoCapacity.acquire();
  try {
    const input = path.join(dir, 'incoming.mp4');
    await writeFile(input, 'incoming');
    await assert.rejects(processVideo('owner', { path: input } as Express.Multer.File),
      (error: any) => error.status === 503 && error.code === 'VIDEO_PROCESSING_BUSY');
    await assert.rejects(stat(input));
    assert.throws(() => videoCapacity.acquire());
  } finally { release(); await rm(dir, { recursive: true, force: true }); }
});

test('video storage receives a stream, not a full-file buffer', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'peto-video-stream-'));
  try {
    const input = path.join(dir, 'video.mp4');
    await writeFile(input, Buffer.alloc(2 * 1024 * 1024, 1));
    let stream: any;
    const storage: any = { from(bucket: string) {
      assert.equal(bucket, 'posts-videos');
      return {
        async upload(_path: string, body: any, options: any) {
          stream = body;
          assert.equal(Buffer.isBuffer(body), false);
          let bytes = 0;
          for await (const chunk of body) { bytes += chunk.length; assert.ok(chunk.length <= 65536); }
          assert.equal(bytes, 2 * 1024 * 1024);
          assert.equal(options.headers['Content-Length'], String(bytes));
          return { error: null };
        },
        getPublicUrl() { return { data: { publicUrl: 'https://example.com/video.mp4' } }; },
      };
    }};
    assert.equal(await uploadVideo(input, 'video.mp4', storage), 'https://example.com/video.mp4');
    assert.equal(stream.destroyed, true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
