/** Decorative light-mode aurora, adapted to the app's existing CSS theme. */
export function AuroraBackground() {
  return (
    <div className="aurora-background" aria-hidden="true">
      <div className="aurora-lights" />
    </div>
  );
}
