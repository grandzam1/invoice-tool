import {
    CircleCheck,
    Info,
    LoaderCircle,
    OctagonX,
    TriangleAlert,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** Shared neutral toast chrome — type color lives on icons only. */
const neutralToastClass =
    'group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg';

export interface PortalToasterProps extends ToasterProps {
    /** light | dark | system — host app supplies appearance */
    appearance?: string;
}

function resolveToastTheme(appearance: string | undefined): ToasterProps['theme'] {
    if (appearance === 'dark') {
        return 'dark';
    }

    if (appearance === 'light') {
        return 'light';
    }

    return 'system';
}

/**
 * Mount once at the app root. Do not pass `richColors` — that tints whole toasts.
 */
export function PortalToaster({ appearance = 'system', ...props }: PortalToasterProps) {
    return (
        <Sonner
            theme={resolveToastTheme(appearance)}
            className="toaster group"
            position="top-center"
            closeButton
            icons={{
                success: (
                    <CircleCheck className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                ),
                info: <Info className="size-4 shrink-0 text-muted-foreground" />,
                warning: (
                    <TriangleAlert className="size-4 shrink-0 text-muted-foreground" />
                ),
                error: <OctagonX className="size-4 shrink-0 text-destructive" />,
                loading: (
                    <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ),
            }}
            toastOptions={{
                classNames: {
                    toast: `group toast ${neutralToastClass}`,
                    description: 'group-[.toast]:text-muted-foreground',
                    actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                    cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
                    success: neutralToastClass,
                    error: neutralToastClass,
                    info: neutralToastClass,
                    warning: neutralToastClass,
                },
            }}
            {...props}
        />
    );
}
