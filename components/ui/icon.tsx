'use client';

import { type ComponentProps, type ComponentType, type SVGProps } from 'react';
import { cn } from '@/lib/utils';

export type IconSize = 'sm' | 'md' | 'lg';
export type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

const sizePx: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

type PhosphorIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  weight?: IconWeight;
  mirrored?: boolean;
  alt?: string;
  color?: string;
};

export type PhosphorIcon = ComponentType<PhosphorIconProps>;

interface IconProps extends Omit<PhosphorIconProps, 'size' | 'weight'> {
  icon: PhosphorIcon;
  size?: IconSize;
  weight?: IconWeight;
  className?: string;
}

export function Icon({
  icon: Glyph,
  size = 'md',
  weight = 'regular',
  className,
  ...props
}: IconProps) {
  return (
    <Glyph
      size={sizePx[size]}
      weight={weight}
      className={cn('shrink-0', className)}
      {...props}
    />
  );
}

interface IconWellProps extends ComponentProps<'span'> {
  size?: 'md' | 'lg';
}

export function IconWell({ size = 'md', className, children, ...props }: IconWellProps) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-[var(--radius-control)] bg-brand-soft text-brand',
        size === 'md' ? 'size-10' : 'size-11',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

interface LoadingIconProps {
  size?: IconSize;
  className?: string;
  label?: string;
}

export function LoadingIcon({ size = 'md', className, label = 'Cargando' }: LoadingIconProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current/25 border-t-current motion-reduce:animate-none',
        size === 'sm' && 'size-4',
        size === 'md' && 'size-5',
        size === 'lg' && 'size-6',
        className,
      )}
    />
  );
}
