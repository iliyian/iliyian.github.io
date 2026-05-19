import { L2D } from 'l2d';
export interface TipsConfig {
    offset?: {
        x?: number;
        y?: number;
    };
    typing?: {
        param?: string;
        speed?: number;
        minValue?: number;
        maxValue?: number;
    };
}
export interface TipsHandle {
    el: HTMLElement;
    show: (text: string, l2d?: L2D) => void;
    hide: () => void;
    destroy: () => void;
}
export declare function createTips(primaryColor: string, config?: TipsConfig): TipsHandle;
