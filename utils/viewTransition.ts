// utils/viewTransition.ts
// View Transitions API utility for smooth page transitions

/**
 * Check if View Transitions API is supported
 */
export const supportsViewTransitions = (): boolean => {
    return typeof document !== 'undefined' &&
        'startViewTransition' in document;
};

/**
 * Navigate to a new page with View Transition effect
 * Gracefully degrades on browsers without support
 */
export const navigateWithViewTransition = (url: string, options?: any) => {
    const doNavigation = () => {
        uni.navigateTo({ url, ...options });
    };

    if (supportsViewTransitions()) {
        (document as any).startViewTransition(() => {
            doNavigation();
        });
    } else {
        doNavigation();
    }
};

/**
 * Navigate back with View Transition effect
 */
export const navigateBackWithViewTransition = (options?: any) => {
    const doNavigation = () => {
        uni.navigateBack(options);
    };

    if (supportsViewTransitions()) {
        (document as any).startViewTransition(() => {
            doNavigation();
        });
    } else {
        doNavigation();
    }
};
