const Pagination = ({ pagination, onChange }) => {
  if (!pagination || pagination.pages <= 1) return null;

  const pages = Array.from({ length: pagination.pages }, (_, idx) => idx + 1);

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onChange(page)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            page === pagination.page
              ? "bg-ink text-white"
              : "border border-ink/20 bg-white text-ink hover:border-ink/50"
          }`}
        >
          {page}
        </button>
      ))}
    </div>
  );
};

export default Pagination;
