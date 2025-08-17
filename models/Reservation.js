const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  partySize: {
    type: Number,
    required: true,
    min: [1, 'Tamanho da mesa deve ser pelo menos 1'],
    max: [20, 'Tamanho da mesa não pode ser maior que 20']
  },
  specialRequests: {
    type: String,
    maxlength: [500, 'Pedidos especiais não podem ter mais de 500 caracteres']
  },
  dietaryRestrictions: [String],
  occasion: {
    type: String,
    enum: ['casual', 'business', 'romantic', 'celebration', 'anniversary', 'birthday', 'other']
  },
  contactInfo: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'pending'
  },
  confirmationCode: {
    type: String,
    unique: true
  },
  confirmedAt: Date,
  cancelledAt: Date,
  cancelledBy: {
    type: String,
    enum: ['user', 'restaurant', 'system']
  },
  cancellationReason: String,
  notes: {
    restaurant: String,
    user: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for reservation status
reservationSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const reservationDate = new Date(this.date);
  return reservationDate > now && this.status === 'confirmed';
});

// Virtual for reservation status text
reservationSchema.virtual('statusText').get(function() {
  const statusMap = {
    pending: 'Pendente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Concluída',
    no_show: 'Não Compareceu'
  };
  return statusMap[this.status] || this.status;
});

// Generate confirmation code before saving
reservationSchema.pre('save', function(next) {
  if (!this.confirmationCode) {
    this.confirmationCode = this.generateConfirmationCode();
  }
  next();
});

// Generate unique confirmation code
reservationSchema.methods.generateConfirmationCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Confirm reservation
reservationSchema.methods.confirm = function() {
  this.status = 'confirmed';
  this.confirmedAt = new Date();
  return this.save();
};

// Cancel reservation
reservationSchema.methods.cancel = function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  return this.save();
};

// Complete reservation
reservationSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

// Mark as no show
reservationSchema.methods.markNoShow = function() {
  this.status = 'no_show';
  return this.save();
};

// Indexes for search and performance
reservationSchema.index({ user: 1, date: -1 });
reservationSchema.index({ restaurant: 1, date: -1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ date: 1 });
reservationSchema.index({ confirmationCode: 1 });
reservationSchema.index({ isActive: 1 });

// Prevent double booking (same restaurant, date, time)
reservationSchema.index({ restaurant: 1, date: 1, time: 1, status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
