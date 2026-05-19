export interface StatusBarHandle {
    el: HTMLElement;
    showLoading: (label?: string) => void;
    showRest: (onWake: () => void) => void;
    hide: () => void;
    destroy: () => void;
}
export declare function createStatusBar(position: 'bottom-left' | 'bottom-right', transitionDuration: number, height: number, primaryColor: string): StatusBarHandle;
