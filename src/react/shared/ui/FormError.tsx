type FormErrorProps = {
  message?: string | null;
  className?: string;
  'data-testid'?: string;
};

export function FormError({ message, className, 'data-testid': testId }: FormErrorProps) {
  if (!message) return null;

  return (
    <p className={`rf-ui-form-error${className ? ` ${className}` : ''}`} data-testid={testId}>
      {message}
    </p>
  );
}
