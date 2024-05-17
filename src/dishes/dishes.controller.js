const path = require("path");

// Using the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Using this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// Middleware: Validation Functions for Create and Update functions
function bodyHasProperty(propertyName, errorMessage) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (!data[propertyName]) {
      return next({
        status: 400,
        message: errorMessage,
      });
    }
    res.locals.reqBody = data;
    return next();
  };
}

const bodyHasNameProperty = bodyHasProperty("name", "Dish must include a name.");
const bodyHasDescriptionProperty = bodyHasProperty("description", "Dish must include a description.");
const bodyHasImageUrlProperty = bodyHasProperty("image_url", "Dish must include an image_url.");

function bodyHasPriceProperty(req, res, next) {
  const { price } = res.locals.reqBody;
  if (price == null || typeof price !== "number" || price <= 0) {
    return next({
      status: 400,
      message: "Dish must include a price and it must be an integer greater than 0.",
    });
  }
  return next();
}

// Middleware: Validation Function for Read and Update functions
function dishExists(req, res, next) {
  const { dishId } = req.params;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (foundDish) {
    res.locals.dish = foundDish;
    res.locals.dishId = dishId;
    return next();
  }
  return next({
    status: 404,
    message: `Dish does not exist: ${dishId}.`,
  });
}

function bodyIdMatchesRouteId(req, res, next) {
  const { dishId } = res.locals;
  const { id } = res.locals.reqBody;
  if (id && id !== dishId) {
    return next({
      status: 400,
      message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`,
    });
  }
  return next();
}

// Route Handlers
function create(req, res) {
  const reqBody = res.locals.reqBody;
  const newDish = { ...reqBody, id: nextId() };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

function read(req, res) {
  res.json({ data: res.locals.dish });
}

function update(req, res) {
  const dish = res.locals.dish;
  const reqBody = res.locals.reqBody;

  // Update each property if there is a difference
  Object.keys(dish).forEach((key) => {
    if (key !== "id" && reqBody[key] !== undefined && dish[key] !== reqBody[key]) {
      dish[key] = reqBody[key];
    }
  });
  res.json({ data: dish });
}

function list(req, res) {
  res.json({ data: dishes });
}

// Exporting module
module.exports = {
  create: [
    bodyHasNameProperty,
    bodyHasDescriptionProperty,
    bodyHasPriceProperty,
    bodyHasImageUrlProperty,
    create,
  ],
  read: [dishExists, read],
  update: [
    dishExists,
    bodyHasNameProperty,
    bodyHasDescriptionProperty,
    bodyHasPriceProperty,
    bodyHasImageUrlProperty,
    bodyIdMatchesRouteId,
    update,
  ],
  list,
};
