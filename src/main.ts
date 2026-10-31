import { boot } from './ui/app';
import type { GameState } from './engine/types';

const start = (data?: unknown) => boot((data ?? {}) as { state?: GameState });
const hot = window.claude?.hot;
if (hot?.ready) hot.ready(start); else start(hot?.data ?? {});
