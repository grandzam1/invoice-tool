import type { ReactNode } from 'react';
import { AppLink } from '../../../routes/AppLink';
import { cn } from '../../../lib/utils';

export interface MobileNavItem {
    key: string;
    title: string;
    url: string;
    /** Rendered icon node — host app maps icon names to components */
    icon: ReactNode;
    active?: boolean;
}

interface PortalMobileNavProps {
    items: MobileNavItem[];
    className?: string;
}

/**
 * Flat bottom tab bar. Host app decides visibility from theme `visibleOnRoutes`.
 */
export function PortalMobileNav({ items, className }: PortalMobileNavProps) {
    return (
        <nav
            className={cn(
                'portal-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden',
                className,
            )}
            aria-label="Primary"
        >
            <ul className="portal-mobile-nav__inner mx-auto flex max-w-lg items-stretch justify-around px-2">
                {items.map((item) => (
                    <li key={item.key} className="min-w-0 flex-1">
                        <AppLink
                            href={item.url}
                            aria-current={item.active ? 'page' : undefined}
                            className={cn(
                                'flex h-full min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium',
                                item.active ? 'text-foreground' : 'text-muted-foreground',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-9 items-center justify-center rounded-full',
                                    item.active && 'bg-muted',
                                )}
                            >
                                {item.icon}
                            </span>
                            <span className="truncate">{item.title}</span>
                        </AppLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
