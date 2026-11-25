import { imageProgress } from '../progressview/startup';

test('reports downloaded bytes without a percentage while transfers are planned', () => {
  const transfer = imageProgress('downloading', {
    completed_bytes: 1048576,
    total_bytes: 2097152,
    rate_bytes_per_second: 1048576,
    eta_seconds: null,
    planning_complete: false,
    artifacts: [{ artifact_id: 'kernel:linux', state: 'cached' }]
  }).transfer;

  expect(transfer.fraction).toBeUndefined();
  expect(transfer.amount).toBe('1.0 MiB downloaded');
  expect(transfer.estimate).toBe('1.0 MiB/s');
  expect(transfer.artifacts).toEqual([
    { name: 'Linux kernel', status: 'Cached' }
  ]);
});

test('reports a determinate transfer once all sizes are known', () => {
  const transfer = imageProgress('downloading', {
    completed_bytes: 1048576,
    total_bytes: 2097152,
    rate_bytes_per_second: 1048576,
    eta_seconds: 1,
    planning_complete: true,
    artifacts: []
  }).transfer;

  expect(transfer.fraction).toBe(0.5);
  expect(transfer.amount).toBe('1.0 MiB of 2.0 MiB');
  expect(transfer.estimate).toBe('1.0 MiB/s · 1s left');
});
