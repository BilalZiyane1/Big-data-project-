const Loader = ({ fullPage = false, label = "Loading..." }) => {
  return (
    <div
      className={`${
        fullPage ? "min-h-[40vh]" : "py-8"
      } flex items-center justify-center gap-3 text-ink/80`}
      role="status"
      aria-live="polite"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
};

export default Loader;
