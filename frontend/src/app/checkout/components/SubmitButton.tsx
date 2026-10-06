interface SubmitButtonProps {
  processing: boolean;
  disabled: boolean;
  label?: string;
}

export function SubmitButton({ processing, disabled, label = "Pay Securely" }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-full bg-toffee text-white py-4 hover:bg-toffee-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-sm uppercase tracking-[0.18em] shadow-[0_8px_24px_rgba(176,141,79,0.30)] transition-colors"
    >
      {processing ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Processing Payment...</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
