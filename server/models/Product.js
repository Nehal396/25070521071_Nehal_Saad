import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, required: true, maxlength: 3000 },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0 },
  images: [{ type: String, trim: true }],
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: String, trim: true, default: 'Atelier' },
  sku: { type: String, required: true, unique: true, trim: true },
  stock: { type: Number, required: true, min: 0, default: 0 },
  variants: [{ name: String, options: [String] }],
  specifications: { type: Map, of: String },
  ratingsAverage: { type: Number, min: 0, max: 5, default: 0 },
  ratingsCount: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1, price: 1, createdAt: -1 });

export default mongoose.model('Product', productSchema);
