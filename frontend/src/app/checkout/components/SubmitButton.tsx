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
      className="w-full mt-8 bg-terracotta text-white py-4 hover:bg-terracotta-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm uppercase tracking-[0.2em]"
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
