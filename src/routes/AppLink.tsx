import type { MouseEvent, ReactNode } from 'react';
import { navigateTo } from './location';

interface AppLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  title?: string;
  'aria-current'?: 'page' | 'true' | 'false' | undefined;
}

/**
 * Same-origin link. A plain left click updates history and the app view.
 * Modified clicks and "open in new tab" keep the real href.
 */
export function AppLink({ href, className, children, title, 'aria-current': ariaCurrent }: AppLinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.currentTarget.target;
    if (target && target !== '_self') return;
    event.preventDefault();
    navigateTo(href);
  };

  return (
    <a href={href} className={className} title={title} aria-current={ariaCurrent} onClick={onClick}>
      {children}
    </a>
  );
}
