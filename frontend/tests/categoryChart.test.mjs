import test from 'node:test';
import assert from 'node:assert/strict';
import { categorySegments } from '../src/dashboard/categoryChartModel.ts';

const item = (id, amountMinor) => ({ id, name: id, amountMinor });

test('empty and zero categories produce no ring or invalid coordinates', () => {
  assert.deepEqual(categorySegments([]), []);
  assert.deepEqual(categorySegments([item('zero', 0)]), []);
});

test('category arcs cover the ring in money proportions without gaps', () => {
  const input = [item('cinema', 64000), item('music', 96000), item('study', 160000)];
  const before = structuredClone(input);
  const segments = categorySegments(input);
  assert.deepEqual(segments.map(({ start, end }) => [start, end]), [[0, 72], [72, 180], [180, 360]]);
  assert.deepEqual(input, before);
  assert.equal(new Set(segments.map(({ color }) => color)).size, 3);
  assert.ok(segments.every(({ path }) => !/NaN|Infinity/.test(path)));
});

test('one category makes a full donut with distinct arc endpoints and a smaller white centre', () => {
  const [segment] = categorySegments([item('all', 1)]);
  assert.equal(segment.start, 0);
  assert.equal(segment.end, 360);
  assert.equal((segment.path.match(/A 100 100/g) || []).length, 2);
  assert.equal((segment.path.match(/A 54 54/g) || []).length, 2);
  const oppositePoint = segment.path.match(/^M 100 0 A 100 100 0 0 1 ([\d.]+) ([\d.]+)/);
  assert.ok(oppositePoint);
  assert.ok(Math.abs(Number(oppositePoint[1]) - 100) < 1e-9);
  assert.ok(Math.abs(Number(oppositePoint[2]) - 200) < 1e-9);
});

test('zero entries do not create selectable slices or shift category colors', () => {
  const segments = categorySegments([item('zero', 0), item('positive', 12)]);
  assert.deepEqual(segments.map(({ category }) => category.id), ['positive']);
  assert.equal(segments[0].color, categorySegments([item('positive', 12)])[0].color);
});

test('fractional angles close exactly at 360 and repeated palette still provides every category', () => {
  const segments = categorySegments(Array.from({ length: 7 }, (_, index) => item(String(index), 1)));
  assert.equal(segments.length, 7);
  assert.equal(segments.at(-1).end, 360);
  for (let index = 1; index < segments.length; index += 1) assert.equal(segments[index].start, segments[index - 1].end);
  assert.ok(segments.every(({ path, color }) => !/NaN|Infinity/.test(path) && /^#[a-f0-9]{6}$/.test(color)));
});
