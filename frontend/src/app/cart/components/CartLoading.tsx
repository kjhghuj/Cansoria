import { LoadingSpinner } from "./utils";

export default function CartLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <LoadingSpinner />
      <p className="mt-4 text-charcoal-light">Loading your cart...</p>
    </div>
  );
}
