const Modal = ({ open, title, onClose, children, footer }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="card-surface w-full max-w-2xl p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ink/20 px-2 py-1 text-xs hover:border-ink/50"
          >
            Close
          </button>
        </div>

        <div>{children}</div>

        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </div>
  );
};

export default Modal;
