'use strict';

// Request objects exactly as they reach the app. Captured 2 September from a
// production node behind the load balancer, and from a local `npm start`.
const productionRequest = {
  protocol: 'http',
  host: 'app.atlas.example',
  headers: {
    host: 'app.atlas.example',
    'x-forwarded-proto': 'https',
    'x-forwarded-for': '203.0.113.44',
  },
};

const developmentRequest = {
  protocol: 'http',
  host: 'localhost:3000',
  headers: { host: 'localhost:3000' },
};

module.exports = { productionRequest, developmentRequest };
