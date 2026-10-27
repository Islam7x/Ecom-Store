// server/controllers/locationController.js
const { DELIVERY_LOCATIONS } = require("../data/locations");

exports.getLocations = (_req, res) => {
  res.json(DELIVERY_LOCATIONS);
};
