const buildPagination = (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const buildPaginationMeta = ({ total, page, limit }) => ({
  total,
  page,
  limit,
  pages: Math.max(Math.ceil(total / limit), 1),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

module.exports = {
  buildPagination,
  buildPaginationMeta,
};
