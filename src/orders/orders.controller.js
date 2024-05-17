const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");

// Middleware: Validation Functions for POST and PUT requests
function bodyHasDeliverToProperty(req, res, next) {
  const { data = {} } = req.body;
  if (!data.deliverTo) {
    return next({
      status: 400,
      message: "Order must include a deliverTo property.",
    });
  }
  res.locals.reqBody = data;
  return next();
}

function bodyHasMobileNumProperty(req, res, next) {
  const { mobileNumber } = res.locals.reqBody;
  if (!mobileNumber) {
    return next({
      status: 400,
      message: "Order must include a mobileNumber property.",
    });
  }
  return next();
}

function bodyHasDishesProperty(req, res, next) {
  const { dishes } = res.locals.reqBody;
  if (!Array.isArray(dishes) || !dishes.length) {
    return next({
      status: 400,
      message: "Order must include at least one dish.",
    });
  }
  return next();
}

function bodyHasDishQuantityProperty(req, res, next) {
  const { dishes } = res.locals.reqBody;
  const invalidDishes = dishes
    .map((dish, index) => (!dish.quantity || typeof dish.quantity !== "number" || dish.quantity <= 0) ? index : null)
    .filter(index => index !== null);

  if (invalidDishes.length) {
    const message = invalidDishes.length > 1
      ? `Dishes ${invalidDishes.join(", ")} must have a quantity that is an integer greater than 0.`
      : `Dish ${invalidDishes[0]} must have a quantity that is an integer greater than 0.`;
    return next({
      status: 400,
      message,
    });
  }
  return next();
}

function bodyHasStatusProperty(req, res, next) {
  const { status } = res.locals.reqBody;
  const validStatuses = ["pending", "preparing", "out-for-delivery", "delivered"];
  if (!status || !validStatuses.includes(status)) {
    return next({
      status: 400,
      message: "Order must have a status of pending, preparing, out-for-delivery, or delivered.",
    });
  }
  if (status === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed.",
    });
  }
  return next();
}

function bodyIdMatchesRouteId(req, res, next) {
  const { orderId } = req.params;
  const { id } = res.locals.reqBody;
  if (id && id !== orderId) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`,
    });
  }
  return next();
}

// Middleware: Validation Functions for Read, Update, and Delete requests
function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    res.locals.orderId = orderId;
    return next();
  }
  return next({
    status: 404,
    message: `No matching order found for orderId ${orderId}.`,
  });
}

function orderStatusIsPending(req, res, next) {
  const { status } = res.locals.order;
  if (status !== "pending") {
    return next({
      status: 400,
      message: "An order cannot be deleted unless it is pending.",
    });
  }
  return next();
}

// Route Handlers
function create(req, res) {
  const reqBody = res.locals.reqBody;
  const newOrder = { ...reqBody, id: nextId() };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function update(req, res) {
  const reqBody = res.locals.reqBody;
  const order = res.locals.order;
  Object.keys(order).forEach((key) => {
    if (key !== "id" && reqBody[key] !== undefined && order[key] !== reqBody[key]) {
      order[key] = reqBody[key];
    }
  });
  res.json({ data: order });
}

function destroy(req, res) {
  const { orderId } = res.locals;
  const orderIndex = orders.findIndex((order) => order.id === orderId);
  orders.splice(orderIndex, 1);
  res.sendStatus(204);
}

function list(req, res) {
  res.json({ data: orders });
}

// Exporting module
module.exports = {
  create: [
    bodyHasDeliverToProperty,
    bodyHasMobileNumProperty,
    bodyHasDishesProperty,
    bodyHasDishQuantityProperty,
    create,
  ],
  read: [orderExists, read],
  update: [
    orderExists,
    bodyHasDeliverToProperty,
    bodyHasMobileNumProperty,
    bodyHasDishesProperty,
    bodyHasDishQuantityProperty,
    bodyIdMatchesRouteId,
    bodyHasStatusProperty,
    update,
  ],
  delete: [orderExists, orderStatusIsPending, destroy],
  list,
};
