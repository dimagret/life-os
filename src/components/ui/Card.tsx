import * as React from 'react';

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

type CardProps = React.HTMLAttributes<HTMLDivElement>;
type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;
type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-xl border bg-[var(--surface-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1.5 p-4', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      data-slot="card-title"
      className={cn('text-sm font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-xs text-[var(--text-muted)]', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card-content"
      className={cn('p-4 pt-0', className)}
      {...props}
    />
  );
}
