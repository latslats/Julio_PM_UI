const redisClient = require('../config/redis');

const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = null,
    skipCache = false
  } = options;

  return async (req, res, next) => {
    if (skipCache || !redisClient.isReady()) {
      return next();
    }

    const key = keyGenerator ? 
      keyGenerator(req) : 
      `cache:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;

    try {
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        console.log(`🎯 Cache HIT: ${key}`);
        return res.json(cachedData);
      }

      console.log(`🔍 Cache MISS: ${key}`);
      
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200 && data) {
          redisClient.set(key, data, ttl).catch(err => {
            console.error('Cache set error:', err);
          });
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

const invalidateCache = {
  async pattern(pattern) {
    try {
      await redisClient.delPattern(pattern);
      console.log(`🗑️ Cache invalidated: ${pattern}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  },

  async key(key) {
    try {
      await redisClient.del(key);
      console.log(`🗑️ Cache invalidated: ${key}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  },

  async projects() {
    await this.pattern('cache:*projects*');
    await this.pattern('cache:*project*');
  },

  async tasks(projectId = null) {
    if (projectId) {
      await this.pattern(`cache:*tasks*project=${projectId}*`);
      await this.pattern(`cache:*task*`);
    } else {
      await this.pattern('cache:*tasks*');
      await this.pattern('cache:*task*');
    }
  },

  async timeEntries() {
    await this.pattern('cache:*time*');
    await this.pattern('cache:*timer*');
    await this.pattern('cache:*report*');
  },

  async settings() {
    await this.pattern('cache:*settings*');
  },

  async waitingItems() {
    await this.pattern('cache:*waiting*');
  },

  async reports() {
    await this.pattern('cache:*report*');
  }
};

const timerCache = {
  async getActiveTimers() {
    return await redisClient.get('timers:active') || [];
  },

  async setActiveTimers(timers) {
    await redisClient.set('timers:active', timers, 3600); // 1 hour TTL
  },

  async addActiveTimer(timer) {
    const timers = await this.getActiveTimers();
    const updated = timers.filter(t => t.id !== timer.id);
    updated.push(timer);
    await this.setActiveTimers(updated);
  },

  async removeActiveTimer(timerId) {
    const timers = await this.getActiveTimers();
    const updated = timers.filter(t => t.id !== timerId);
    await this.setActiveTimers(updated);
  },

  async getTimerState(timerId) {
    return await redisClient.get(`timer:${timerId}`);
  },

  async setTimerState(timerId, state) {
    await redisClient.set(`timer:${timerId}`, state, 3600); // 1 hour TTL
  },

  async clearTimerState(timerId) {
    await redisClient.del(`timer:${timerId}`);
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  timerCache
};