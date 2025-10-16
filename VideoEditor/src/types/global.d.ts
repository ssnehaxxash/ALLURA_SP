import type { RenderJob } from './render';

declare global {
  var renderJobs: Record<string, RenderJob> | undefined;
}

export {};