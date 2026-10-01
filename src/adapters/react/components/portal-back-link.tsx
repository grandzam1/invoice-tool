import { ArrowLeft } from 'lucide-react';
import { AppLink } from '../../../routes/AppLink';
import { cn } from '../../../lib/utils';

interface PortalBackLinkProps {
    href: string;
    label: string;
    /** When true, only show below the md breakpoint. */
    mobileOnly?: boolean;
    className?: string;
}

/**
 * Escape hatch. Prefer `PortalPageHeader` `back` prop so the link sits
 * top-left with a centered title.
 */
export function PortalBackLink({ href, label, mobileOnly = false, className }: PortalBackLinkProps) {
    return (
        <AppLink
            href={href}
            className={cn(
                'inline-flex -ml-2 mb-2 w-fit items-center gap-1 rounded-md border border-primary/40 bg-background px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10',
                mobileOnly && 'md:hidden',
                className,
            )}
        >
            <ArrowLeft className="size-4" />
            {label}
        </AppLink>
    );
}
