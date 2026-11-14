/** Always visible: the store is a demonstration, so nobody mistakes it for a real shop. */
export function SimulatedBanner() {
  return (
    <div
      role="note"
      className="bg-amber-400 px-4 py-1 text-center text-sm font-medium text-black"
    >
      Simulated store: the products and people are invented and payments are in
      test mode. Nothing here is real.
    </div>
  );
}
