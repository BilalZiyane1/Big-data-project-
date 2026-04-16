const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const connectDB = require("../config/db");
const Product = require("../models/Product");
const User = require("../models/User");

const categoryImagePools = {
  men: [
    { folder: "mens-shirts", slug: "blue-&-black-check-shirt" },
    { folder: "mens-shirts", slug: "gigabyte-aorus-men-tshirt" },
    { folder: "mens-shirts", slug: "man-plaid-shirt" },
    { folder: "mens-shirts", slug: "man-short-sleeve-shirt" },
    { folder: "mens-shirts", slug: "men-check-shirt" },
  ],
  women: [
    { folder: "womens-dresses", slug: "black-women's-gown" },
    { folder: "womens-dresses", slug: "corset-leather-with-skirt" },
    { folder: "womens-dresses", slug: "corset-with-black-skirt" },
    { folder: "womens-dresses", slug: "dress-pea" },
    { folder: "womens-dresses", slug: "marni-red-&-black-suit" },
  ],
  kids: [
    { folder: "tops", slug: "girl-summer-dress" },
    { folder: "tops", slug: "blue-frock" },
    { folder: "tops", slug: "gray-dress" },
    { folder: "tops", slug: "short-frock" },
    { folder: "tops", slug: "tartan-dress" },
  ],
};

const imageFromPool = ({ folder, slug }, imageIndex = 1) =>
  `https://cdn.dummyjson.com/product-images/${folder}/${slug}/${imageIndex}.webp`;

const productImagesFor = (category, catalogIndex) => {
  const pool = categoryImagePools[category] || categoryImagePools.women;
  const item = pool[catalogIndex % pool.length];

  return [{ url: imageFromPool(item, 1) }, { url: imageFromPool(item, 2) }];
};

const categories = {
  men: [
    {
      item: "Overshirt",
      description: "Structured cotton overshirt with a relaxed silhouette for layered everyday styling.",
      basePrice: 58,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Black", "Olive", "Stone"],
      stockQuantity: 28,
    },
    {
      item: "Denim Jacket",
      description: "Stretch denim jacket with clean seams and a lightweight feel for transitional weather.",
      basePrice: 76,
      sizes: ["M", "L", "XL"],
      colors: ["Indigo", "Washed Blue"],
      stockQuantity: 22,
    },
    {
      item: "Tailored Trousers",
      description: "Slim tailored trousers with comfort stretch and polished drape for smart casual looks.",
      basePrice: 62,
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["Charcoal", "Navy", "Sand"],
      stockQuantity: 34,
    },
    {
      item: "Heavyweight Tee",
      description: "Premium heavyweight jersey tee with minimal branding and a modern fit.",
      basePrice: 27,
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["White", "Black", "Mocha"],
      stockQuantity: 52,
    },
    {
      item: "Wool Blend Coat",
      description: "Double-button wool blend coat built for winter layering and clean formal silhouettes.",
      basePrice: 142,
      sizes: ["M", "L", "XL"],
      colors: ["Camel", "Charcoal"],
      stockQuantity: 16,
    },
    {
      item: "Merino Polo",
      description: "Soft merino knit polo with ribbed edges for elevated day-to-night styling.",
      basePrice: 44,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Navy", "Beige", "Forest"],
      stockQuantity: 31,
    },
    {
      item: "Cargo Joggers",
      description: "Tapered cargo joggers with utility pockets and breathable woven fabric.",
      basePrice: 55,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Graphite", "Khaki"],
      stockQuantity: 37,
    },
    {
      item: "Puffer Vest",
      description: "Lightweight insulated vest with stand collar designed for cooler city mornings.",
      basePrice: 68,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Black", "Steel"],
      stockQuantity: 24,
    },
  ],
  women: [
    {
      item: "Tailored Blazer",
      description: "Single-breasted blazer with sculpted shoulders and fluid structure.",
      basePrice: 92,
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["Ivory", "Black"],
      stockQuantity: 23,
    },
    {
      item: "Pleated Midi Dress",
      description: "Flowing pleated midi dress with waist tie and soft movement.",
      basePrice: 83,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Rose", "Emerald", "Black"],
      stockQuantity: 29,
    },
    {
      item: "Wide Leg Trousers",
      description: "High-rise wide leg trousers finished with clean pleats and a relaxed line.",
      basePrice: 58,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Black", "Mocha", "Stone"],
      stockQuantity: 32,
    },
    {
      item: "Cropped Cardigan",
      description: "Soft-touch cropped cardigan with tonal buttons and ribbed cuffs.",
      basePrice: 47,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Cream", "Lilac", "Grey"],
      stockQuantity: 35,
    },
    {
      item: "Satin Shirt",
      description: "Satin finish shirt tailored for polished office and evening outfits.",
      basePrice: 54,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Champagne", "Black", "Wine"],
      stockQuantity: 28,
    },
    {
      item: "Classic Trench",
      description: "Water-repellent trench with storm flap details and adjustable belt.",
      basePrice: 126,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Stone", "Navy"],
      stockQuantity: 18,
    },
    {
      item: "Rib Knit Top",
      description: "Stretch rib knit top with slim fit and modern square neckline.",
      basePrice: 36,
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["Black", "Ivory", "Sage"],
      stockQuantity: 46,
    },
    {
      item: "Straight Jeans",
      description: "High-waist straight denim with subtle stretch and ankle cut.",
      basePrice: 63,
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["Indigo", "Washed Blue"],
      stockQuantity: 34,
    },
  ],
  kids: [
    {
      item: "Graphic Hoodie",
      description: "Warm fleece hoodie with playful graphics and a roomy kangaroo pocket.",
      basePrice: 34,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Blue", "Red", "Mint"],
      stockQuantity: 44,
    },
    {
      item: "Everyday Joggers",
      description: "Soft joggers with elastic waist and cuffed ankles for active days.",
      basePrice: 28,
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["Grey", "Navy", "Black"],
      stockQuantity: 50,
    },
    {
      item: "Puffer Vest",
      description: "Lightweight puffer vest for cool-weather layering at school or weekends.",
      basePrice: 41,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Orange", "Teal", "Black"],
      stockQuantity: 31,
    },
    {
      item: "Cotton Set",
      description: "Matching cotton t-shirt and shorts set designed for breathable comfort.",
      basePrice: 33,
      sizes: ["XS", "S", "M", "L"],
      colors: ["Sky", "Peach", "Mint"],
      stockQuantity: 42,
    },
    {
      item: "Denim Shirt",
      description: "Classic denim shirt with snap buttons and easy regular fit.",
      basePrice: 35,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Indigo", "Stone Blue"],
      stockQuantity: 26,
    },
    {
      item: "Rain Jacket",
      description: "Water-resistant hooded jacket built for rainy school mornings.",
      basePrice: 49,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Yellow", "Navy", "Teal"],
      stockQuantity: 24,
    },
    {
      item: "Printed Tee",
      description: "Soft cotton printed t-shirt with reinforced neckline and fun patterns.",
      basePrice: 22,
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: ["White", "Blue", "Coral"],
      stockQuantity: 58,
    },
    {
      item: "School Chinos",
      description: "Durable stretch chinos designed for daily school wear and movement.",
      basePrice: 31,
      sizes: ["S", "M", "L", "XL"],
      colors: ["Khaki", "Navy", "Black"],
      stockQuantity: 36,
    },
  ],
};

const collectionVariants = [
  { label: "Studio", priceOffset: 0, stockOffset: 0 },
  { label: "Urban", priceOffset: 4, stockOffset: 3 },
  { label: "Weekend", priceOffset: 2, stockOffset: 5 },
  { label: "Seasonal", priceOffset: 7, stockOffset: -2 },
];

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const buildCatalog = () => {
  const catalog = [];

  Object.entries(categories).forEach(([category, templates]) => {
    collectionVariants.forEach((variant, variantIndex) => {
      templates.forEach((template, templateIndex) => {
        const name = `${capitalize(category)} ${variant.label} ${template.item}`;
        const price = Number(
          (template.basePrice + variant.priceOffset + (templateIndex % 3) * 1.25).toFixed(2)
        );
        const stockQuantity = Math.max(5, template.stockQuantity + variant.stockOffset + (templateIndex % 4));
        const isFeatured = (variantIndex + templateIndex) % 5 === 0;
        const imageIndex = catalog.length;

        catalog.push({
          name,
          description: `${template.description} ${variant.label} edit.`,
          price,
          category,
          sizes: template.sizes,
          colors: template.colors,
          stockQuantity,
          isFeatured,
          images: productImagesFor(category, imageIndex),
        });
      });
    });
  });

  return catalog;
};

const catalog = buildCatalog();

const shouldReplace = process.argv.includes("--replace");

const seedProducts = async () => {
  try {
    await connectDB();

    const admin = await User.findOne({ role: "admin" }).select("_id").lean();

    const products = catalog.map((item) => ({
      ...item,
      ...(admin?._id ? { createdBy: admin._id } : {}),
    }));

    if (shouldReplace) {
      const deletion = await Product.deleteMany({});
      await Product.insertMany(products);

      // eslint-disable-next-line no-console
      console.log(`Products replaced. Deleted: ${deletion.deletedCount}, inserted: ${products.length}`);
    } else {
      const result = await Product.bulkWrite(
        products.map((product) => ({
          updateOne: {
            filter: { name: product.name },
            update: { $set: product },
            upsert: true,
          },
        })),
        { ordered: false }
      );

      // eslint-disable-next-line no-console
      console.log(
        `Seed completed. Inserted: ${result.upsertedCount || 0}, updated: ${result.modifiedCount || 0}, matched: ${result.matchedCount || 0}`
      );
    }

    const total = await Product.countDocuments();
    // eslint-disable-next-line no-console
    console.log(`Total products in DB: ${total}`);

    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to seed products", error);
    process.exit(1);
  }
};

seedProducts();
