/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import type { YabgoAPI } from '../../main/preload';

declare global {
    interface Window {
        yabgo: YabgoAPI;
    }
}

export {};
