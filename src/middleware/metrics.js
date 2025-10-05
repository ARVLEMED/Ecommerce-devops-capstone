const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ 
  register,
  prefix: 'ecommerce_app_'
});

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'ecommerce_app_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestTotal = new promClient.Counter({
  name: 'ecommerce_app_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const activeUsers = new promClient.Gauge({
  name: 'ecommerce_app_active_users',
  help: 'Number of currently active users',
  registers: [register]
});

const dbQueryDuration = new promClient.Histogram({
  name: 'ecommerce_app_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  registers: [register]
});

// Middleware to track HTTP metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
  });
  
  next();
};

module.exports = {
  register,
  metricsMiddleware,
  httpRequestDuration,
  httpRequestTotal,
  activeUsers,
  dbQueryDuration
};