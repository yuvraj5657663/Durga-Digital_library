import mongoose from 'mongoose';

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id, options = {}) {
    return this.model.findById(id, options.projection, options);
  }

  async findOne(filter = {}, options = {}) {
    return this.model.findOne(filter, options.projection, options);
  }

  async find(filter = {}, options = {}) {
    const { skip = 0, limit = 0, sort = {}, projection } = options;
    const query = this.model.find(filter, projection);
    
    if (skip) query.skip(skip);
    if (limit) query.limit(limit);
    if (Object.keys(sort).length > 0) query.sort(sort);
    
    return query.lean();
  }

  async create(data, options = {}) {
    return this.model.create([data], options);
  }

  async createMany(dataArray, options = {}) {
    return this.model.create(dataArray, options);
  }

  async updateById(id, data, options = {}) {
    return this.model.findByIdAndUpdate(id, data, { new: true, ...options });
  }

  async updateOne(filter, data, options = {}) {
    return this.model.findOneAndUpdate(filter, data, { new: true, ...options });
  }

  async updateMany(filter, data, options = {}) {
    return this.model.updateMany(filter, data, options);
  }

  async deleteById(id, options = {}) {
    return this.model.findByIdAndDelete(id, options);
  }

  async deleteOne(filter, options = {}) {
    return this.model.findOneAndDelete(filter, options);
  }

  async deleteMany(filter, options = {}) {
    return this.model.deleteMany(filter, options);
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async exists(filter = {}) {
    return this.model.exists(filter);
  }

  async paginate(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = {}, projection } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.find(filter, { skip, limit, sort, projection }),
      this.count(filter)
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async withSession(callback) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default BaseRepository;
