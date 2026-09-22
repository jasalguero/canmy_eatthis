import { View, type ViewProps } from 'react-native';

/**
 * A raised container. Elevation is one of exactly two levels (docs/06 §1) — `elevation-1` for
 * resting cards, `elevation-2` reserved for things that float above content (sheets).
 */
export interface CardProps extends ViewProps {
  className?: string;
  /** Flat cards sit on `surface.sunken` lists where a shadow would be noise. */
  flat?: boolean;
}

export function Card({ className, flat = false, ...rest }: CardProps) {
  return (
    <View
      className={[
        'rounded-md bg-surface-raised p-4',
        flat ? 'border border-line-subtle' : 'elevation-1',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}
