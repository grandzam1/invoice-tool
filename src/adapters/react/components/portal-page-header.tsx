import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';
import { PortalBackLink } from './portal-back-link';

export interface PortalPageBack {
    href: string;
    label: string;
}

interface PortalPageHeaderProps {
    title?: string;
    description?: string;
    /** Escape hatch — top-left. When set with title, uses fixed top bar on mobile. */
    back?: PortalPageBack;
    actions?: ReactNode;
    /** Hide title below md (tab bar already labels the screen). */
    hideTitleOnMobile?: boolean;
    className?: string;
}

export function PortalPageHeader({
    title,
    description,
    back,
    actions,
    hideTitleOnMobile = false,
    className,
}: PortalPageHeaderProps) {
    if (back && title) {
        return (
            <>
                <div className="portal-fixed-top-spacer h-14 shrink-0 sm:h-[3.75rem] md:hidden" aria-hidden />
                <header
                    className={cn(
                        'portal-fixed-top-bar z-30 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md supports-backdrop-filter:bg-background/80 md:px-6',
                        'fixed right-0 left-0 md:sticky md:top-0',
                        className,
                    )}
                >
                    <div className="relative min-w-0">
                        <div className="absolute top-1/2 left-0 z-10 max-w-[42%] -translate-y-1/2">
                            <PortalBackLink href={back.href} label={back.label} className="mb-0" />
                        </div>
                        {actions && (
                            <div className="absolute top-1/2 right-0 z-10 flex shrink-0 -translate-y-1/2 items-center gap-2 overflow-visible">
                                {actions}
                            </div>
                        )}
                        <div className="mx-auto min-w-0 max-w-xl px-14 text-center sm:px-20">
                            <h1 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
                            {description && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </header>
            </>
        );
    }

    if (!title && !actions) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex min-w-0 items-start justify-between gap-3',
                !title && actions && 'justify-end',
                className,
            )}
        >
            {title && (
                <div
                    className={cn(
                        'flex min-w-0 flex-1 flex-col gap-1',
                        hideTitleOnMobile && 'hidden md:flex',
                    )}
                >
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
            )}
            {actions && (
                <div
                    className={cn(
                        'flex shrink-0 items-center gap-2 overflow-visible pt-0.5',
                        Boolean(title) && 'ml-auto',
                    )}
                >
                    {actions}
                </div>
            )}
        </div>
    );
}
