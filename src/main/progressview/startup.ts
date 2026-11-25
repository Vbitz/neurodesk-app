export interface ITransferProgress {
  completed_bytes: number;
  total_bytes: number | null;
  rate_bytes_per_second: number | null;
  eta_seconds: number | null;
  planning_complete: boolean;
  artifacts: { artifact_id: string; state: string }[];
}

export interface IStartupProgress {
  step: 'image' | 'vm' | 'jupyter';
  title: string;
  detail: string;
  transfer?: {
    fraction?: number;
    amount: string;
    estimate: string;
    artifacts: { name: string; status: string }[];
  };
}

export function imageProgress(
  phase: string,
  progress?: ITransferProgress
): IStartupProgress {
  const download = phase === 'downloading';
  const preparing = phase === 'preparing';
  const result: IStartupProgress = {
    step: 'image',
    title: download
      ? 'Downloading Neurodesktop'
      : preparing
      ? 'Preparing Neurodesktop'
      : 'Checking the desktop image',
    detail: download
      ? 'Downloading the files required for this session.'
      : 'Preparing the Neurodesktop image and Linux kernel.'
  };
  if (!progress) {
    return result;
  }
  const { completed_bytes: received, total_bytes: total } = progress;
  const knownTotal = progress.planning_complete && total > 0;
  const artifacts = [
    { prefix: 'image:', name: 'Neurodesktop image' },
    { prefix: 'kernel:', name: 'Linux kernel' }
  ].flatMap(({ prefix, name }) => {
    const states = progress.artifacts
      .filter(artifact => artifact.artifact_id.startsWith(prefix))
      .map(artifact => artifact.state);
    if (!states.length) {
      return [];
    }
    let status = 'Checking';
    if (states.some(state => state === 'downloading' || state === 'retrying')) {
      status = 'Downloading';
    } else if (states.includes('verifying')) {
      status = 'Verifying';
    } else if (
      states.some(state => state === 'preparing' || state === 'unpacking')
    ) {
      status = 'Preparing';
    } else if (states.every(state => state === 'ready' || state === 'cached')) {
      status = states.includes('cached') ? 'Cached' : 'Ready';
    }
    return [{ name, status }];
  });
  const estimate = [];
  if (progress.rate_bytes_per_second > 0) {
    estimate.push(formatBytes(progress.rate_bytes_per_second) + '/s');
  }
  if (progress.eta_seconds > 0) {
    const seconds = Math.ceil(progress.eta_seconds);
    estimate.push(
      seconds < 60 ? `${seconds}s left` : `~${Math.ceil(seconds / 60)} min left`
    );
  }
  result.transfer = {
    fraction: knownTotal
      ? Math.min(1, Math.max(0, received / total))
      : undefined,
    amount: knownTotal
      ? `${formatBytes(received)} of ${formatBytes(total)}`
      : received > 0
      ? `${formatBytes(received)} downloaded`
      : '',
    estimate: estimate.join(' · '),
    artifacts
  };
  return result;
}

export function vmProgress(phase: string): IStartupProgress {
  switch (phase) {
    case 'preparing_storage':
      return {
        step: 'vm',
        title: 'Preparing the virtual machine',
        detail: 'Preparing storage and shared folders.'
      };
    case 'connecting_cvmfs':
      return {
        step: 'vm',
        title: 'Connecting to CVMFS',
        detail: 'Finding a mirror for the Neurodesk tools.'
      };
    case 'configuring_graphics':
      return {
        step: 'vm',
        title: 'Configuring graphics',
        detail: 'Preparing hardware acceleration in the virtual machine.'
      };
    case 'starting_jupyter':
      return {
        step: 'jupyter',
        title: 'Starting JupyterLab',
        detail: 'Starting the Jupyter server inside the virtual machine.'
      };
    default:
      return {
        step: 'vm',
        title: 'Starting the virtual machine',
        detail: 'Waiting for the Linux guest to boot.'
      };
  }
}

export const loadingJupyter: IStartupProgress = {
  step: 'jupyter',
  title: 'Opening JupyterLab',
  detail: 'Waiting for the workspace to appear.'
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value.toFixed(1)} ${units[index]}`;
}
