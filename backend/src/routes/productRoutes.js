const express = require('express');
const {
  getProducts,
  getFeaturedProducts,
  getProductById,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addOrUpdateReview,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validateRequest         = require('../middleware/validateRequest');
const {
  productIdValidator,
  createProductValidator,
  updateProductValidator,
  productFilterValidator,
  reviewValidator,
} = require('../validators/productValidators');

const router = express.Router();

router.get('/',          productFilterValidator, validateRequest, getProducts);
router.get('/featured',  getFeaturedProducts);
router.get('/:id',       productIdValidator, validateRequest, getProductById);
router.get('/:id/related', productIdValidator, validateRequest, getRelatedProducts);

router.post(
  '/',
  protect, authorize('admin'),
  createProductValidator, validateRequest,
  createProduct
);

router.put(
  '/:id',
  protect, authorize('admin'),
  [...productIdValidator, ...updateProductValidator], validateRequest,
  updateProduct
);

router.delete(
  '/:id',
  protect, authorize('admin'),
  productIdValidator, validateRequest,
  deleteProduct
);

router.post(
  '/:id/reviews',
  protect,
  reviewValidator, validateRequest,
  addOrUpdateReview
);

module.exports = router;
