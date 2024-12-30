const { Product } = require('../model/Product');

exports.createProduct = async (req, res) => {
  const product = new Product(req.body);
  product.discountPrice = Math.round(product.price * (1 - product.discountPercentage / 100));
  try {
    const doc = await product.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.fetchAllProducts = async (req, res) => {
  let condition = {};

  // Exclude deleted products if the admin flag is not set
  if (!req.query.admin) {
    condition.deleted = { $ne: true };
  }

  let query = Product.find(condition);
  let totalProductsQuery = Product.find(condition);

  // Handle category filtering
  if (req.query.category) {
    const categories = req.query.category.split(',').map((cat) => cat.trim());
    query = query.find({ category: { $in: categories } });
    totalProductsQuery = totalProductsQuery.find({ category: { $in: categories } });
  }

  // Handle brand filtering
  if (req.query.brand) {
    const brands = req.query.brand.split(',').map((brand) => brand.trim());
    query = query.find({ brand: { $in: brands } });
    totalProductsQuery = totalProductsQuery.find({ brand: { $in: brands } });
  }

  // Handle search query (search by name, description, or other fields)
  if (req.query.query) {
    const searchQuery = req.query.query.trim();
    if (searchQuery) {
      query = query.find({
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { brand: { $regex: searchQuery, $options: 'i' } },
          { category: { $regex: searchQuery, $options: 'i' } }
        ]
      });
      totalProductsQuery = totalProductsQuery.find({
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { brand: { $regex: searchQuery, $options: 'i' } },
          { category: { $regex: searchQuery, $options: 'i' } }
        ]
      });
    }
  }

  // Handle sorting by price, rating, or any other field
  if (req.query._sort && req.query._order) {
    query = query.sort({ [req.query._sort]: req.query._order });
  }

  // Handle pagination, ensuring the page number is valid
  const page = parseInt(req.query._page) || 1;
  const limit = parseInt(req.query._limit) || 10;
  const skip = (page - 1) * limit;

  const totalDocs = await totalProductsQuery.count().exec();

  // Handle pagination with skip and limit
  query = query.skip(skip).limit(limit);

  try {
    const docs = await query.exec();
    res.set('X-Total-Count', totalDocs);
    res.status(200).json(docs);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.fetchProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    res.status(200).json(product);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findByIdAndUpdate(id, req.body, { new: true });
    product.discountPrice = Math.round(product.price * (1 - product.discountPercentage / 100));
    const updatedProduct = await product.save();
    res.status(200).json(updatedProduct);
  } catch (err) {
    res.status(400).json(err);
  }
};
