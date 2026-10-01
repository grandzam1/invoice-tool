import { Check } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface SelectableCardProps {
    selected: boolean;
    onSelect: () => void;
    title: string;
    description?: string;
    icon?: ReactNode;
    className?: string;
}

export function SelectableCard({ selected, onSelect, title, description, icon, className }: SelectableCardProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'flex w-full cursor-pointer items-center rounded-lg border p-4 text-left transition-all',
                selected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'border-border bg-card hover:border-primary/40',
                className,
            )}
        >
            {icon && <div className="mr-3 shrink-0">{icon}</div>}
            <div className="min-w-0 flex-1">
                <p className="font-medium">{title}</p>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            <div
                className={cn(
                    'ml-2 flex size-5 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-background',
                )}
            >
                {selected && <Check className="size-3 text-primary-foreground" />}
            </div>
        </button>
    );
}
