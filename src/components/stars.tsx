/** Yulduzlar — JS'siz, box-shadow orqali (stillar globals.css'da: .star-l1, .star-l2) */
export function Stars({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <span className="star-layer star-l1" />
      <span className="star-layer star-l2" />
    </div>
  );
}
