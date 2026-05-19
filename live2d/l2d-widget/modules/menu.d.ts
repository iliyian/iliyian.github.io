import { MenuItem, Widget } from '../types.js';
export interface MenuHandle {
    el: HTMLElement;
    show: () => void;
    hide: () => void;
    destroy: () => void;
}
export declare function createMenu(items: MenuItem[], widget: Widget, { align, primaryColor }: {
    align?: 'left' | 'right';
    primaryColor: string;
}): MenuHandle;
