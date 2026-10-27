import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customerName: { type: String, required: true, trim: true, maxlength: 80 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  comment: { type: String, required: true, trim: true, maxlength: 1500 }
}, { timestamps: true });

reviewSchema.index({ product: 1, createdAt: -1 });
export default mongoose.model('Review', reviewSchema);
