import { Link } from 'react-router-dom';

/**
 * Breadcrumb – lightweight navigation trail.
 * Usage: <Breadcrumb items={[{ label:'Shop', to:'/products' }, { label:'T-Shirt' }]} />
 * The last item is treated as the current page (no link, aria-current).
 */
const Breadcrumb = ({ items = [] }) => {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-ink/55">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <svg
                  viewBox="0 0 6 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-2.5 w-2.5 shrink-0 text-ink/30"
                  aria-hidden="true"
                >
                  <path d="M1 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="max-w-[200px] truncate font-semibold text-ink/80"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="max-w-[140px] truncate transition hover:text-clay"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
