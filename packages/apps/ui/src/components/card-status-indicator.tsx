import clsx from 'clsx';
import { ReactNode } from 'react';

export const LoadingIndicator = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <div className="rounded-xl border-2 border-blue-500 [animation:border-pulse_2s_ease-in-out_infinite]">
        {children}
      </div>
    </>
  );
};

const StatusBorder = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <>
      <div className={clsx('rounded-xl border-2', className)}>{children}</div>
    </>
  );
};

export type CardStatusIndicatorProps = {
  status?: 'loading' | 'success' | 'error' | 'initial';
  children: ReactNode;
};

export const CardStatusIndicator = ({
  status,
  children,
}: CardStatusIndicatorProps) => {
  switch (status) {
    case 'loading':
      return <LoadingIndicator>{children}</LoadingIndicator>;
    case 'success':
      return (
        <StatusBorder className="border-emerald-600">{children}</StatusBorder>
      );
    case 'error':
      return <StatusBorder className="border-red-400">{children}</StatusBorder>;
    default:
      return <>{children}</>;
  }
};
