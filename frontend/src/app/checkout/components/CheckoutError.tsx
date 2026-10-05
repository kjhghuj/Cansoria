interface CheckoutErrorProps {
  error: string | null;
  onClear: () => void;
}

export function CheckoutError({ error, onClear }: CheckoutErrorProps) {
  if (!error) return null;
  return (
    <div className="mb-6 border border-red-200 bg-red-50 p-4 text-red-700">
      <p className="font-medium">We could not complete checkout.</p>
      <p className="mt-1 text-sm leading-6">{error}</p>
      <button
        onClick={onClear}
        type="button"
        className="mt-4 block text-sm font-medium text-red-700 underline hover:text-red-800"
      >
        Try Again
      </button>
    </div>
  );
}
