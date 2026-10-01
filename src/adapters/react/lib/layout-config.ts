import type { CSSProperties } from 'react';

export type PortalMaxWidth = 'full' | '4xl' | '7xl' | '8xl';

export interface PortalThemeLayout {
    max_width?: string;
    max_width_class?: string;
    content_padding?: string;
    mobile_nav_clearance?: string;
    default_page_max_width?: string;
    pages?: Record<string, string>;
}

export const PORTAL_LAYOUT_DEFAULTS: PortalThemeLayout = {
    max_width: '88rem',
    max_width_class: 'max-w-[88rem]',
    content_padding: '1.5rem',
    mobile_nav_clearance: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
    default_page_max_width: '7xl',
    pages: {
        home: '8xl',
        list: '4xl',
        account: '4xl',
        settings: '4xl',
    },
};

export const PORTAL_MAX_WIDTH_CLASSES = {
    full: 'max-w-none',
    '4xl': 'mx-auto w-full max-w-4xl',
    '7xl': 'mx-auto w-full max-w-7xl',
    '8xl': 'mx-auto w-full max-w-[88rem]',
} as const;

export function resolvePortalMaxWidthClass(
    key: PortalMaxWidth | string | undefined,
    layout?: Partial<PortalThemeLayout> | null,
): string {
    if (key === 'full') {
        return PORTAL_MAX_WIDTH_CLASSES.full;
    }

    if (key && key in PORTAL_MAX_WIDTH_CLASSES) {
        if (key === '8xl' && layout?.max_width_class) {
            return `mx-auto w-full ${layout.max_width_class}`;
        }

        return PORTAL_MAX_WIDTH_CLASSES[key as PortalMaxWidth];
    }

    if (layout?.max_width_class) {
        return `mx-auto w-full ${layout.max_width_class}`;
    }

    return PORTAL_MAX_WIDTH_CLASSES['7xl'];
}

export function resolvePortalPageMaxWidth(
    pageKey: string,
    layout?: Partial<PortalThemeLayout> | null,
): PortalMaxWidth {
    const fromPage = layout?.pages?.[pageKey] ?? PORTAL_LAYOUT_DEFAULTS.pages?.[pageKey];
    const fallback = (layout?.default_page_max_width ??
        PORTAL_LAYOUT_DEFAULTS.default_page_max_width) as PortalMaxWidth;

    if (fromPage && fromPage in PORTAL_MAX_WIDTH_CLASSES) {
        return fromPage as PortalMaxWidth;
    }

    return fallback in PORTAL_MAX_WIDTH_CLASSES ? fallback : '7xl';
}

export function portalContentSpacingStyle(
    layout?: Partial<PortalThemeLayout> | null,
): CSSProperties {
    const clearance = layout?.mobile_nav_clearance ?? PORTAL_LAYOUT_DEFAULTS.mobile_nav_clearance;
    const padding = layout?.content_padding ?? PORTAL_LAYOUT_DEFAULTS.content_padding;

    return {
        ['--portal-content-padding' as string]: padding,
        ['--portal-mobile-clearance' as string]: clearance,
    };
}

/** Content wrapper classes — prevent mobile horizontal overflow. */
export const PORTAL_CONTENT_SPACING =
    'flex h-full min-w-0 max-w-full flex-1 flex-col gap-6 overflow-x-clip p-4 md:p-6';
