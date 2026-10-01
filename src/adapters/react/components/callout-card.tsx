import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface CalloutCardProps {
    icon: LucideIcon;
    title: string;
    children: ReactNode;
    className?: string;
}

export function CalloutCard({ icon: Icon, title, children, className }: CalloutCardProps) {
    return (
        <div className={cn('flex items-start gap-3 rounded-lg border bg-muted/50 p-4', className)}>
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0">
                <h3 className="text-sm font-medium">{title}</h3>
                <div className="mt-1 text-sm text-muted-foreground">{children}</div>
            </div>
        </div>
    );
}
