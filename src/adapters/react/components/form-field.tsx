import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface FormFieldProps {
    label: string;
    htmlFor: string;
    error?: string;
    hint?: string;
    icon?: LucideIcon;
    className?: string;
    children: ReactNode;
}

export function FormField({ label, htmlFor, error, hint, icon: Icon, className, children }: FormFieldProps) {
    return (
        <div className={cn('grid gap-2', className)}>
            <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
                {label}
            </label>
            <div className={cn('relative', Icon && '[&_input]:pl-10 [&_textarea]:pl-10')}>
                {Icon && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Icon className="size-5 text-muted-foreground" />
                    </div>
                )}
                {children}
            </div>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
    );
}
