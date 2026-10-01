import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface PageHeroProps {
    icon?: LucideIcon;
    /** Custom visual (e.g. avatar) instead of the icon circle. */
    visual?: ReactNode;
    title: string;
    description?: string;
    className?: string;
}

export function PageHero({ icon: Icon, visual, title, description, className }: PageHeroProps) {
    return (
        <div
            className={cn(
                'relative bg-gradient-to-r from-primary to-primary/80 px-6 py-8 text-primary-foreground',
                className,
            )}
        >
            <div className="flex flex-col items-center text-center">
                {visual ? (
                    <div className="mb-4">{visual}</div>
                ) : (
                    Icon && (
                        <div className="mb-4 rounded-full bg-primary-foreground/20 p-4 backdrop-blur-sm">
                            <Icon className="size-10" />
                        </div>
                    )
                )}
                <h2 className="text-2xl font-bold">{title}</h2>
                {description && <p className="mt-1 text-primary-foreground/80">{description}</p>}
            </div>
            <div className="absolute inset-x-0 bottom-0 translate-y-px">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 1200 120"
                    preserveAspectRatio="none"
                    className="h-6 w-full fill-card"
                >
                    <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" />
                </svg>
            </div>
        </div>
    );
}
