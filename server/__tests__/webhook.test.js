// server/__tests__/webhook.test.js
process.env.JWT_SECRET = "testsecretkey";
process.env.MONGO_URI = "mongodb://localhost:27017/test";
process.env.STRIPE_SECRET_KEY = "sk_test_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

// Mock stripe module before importing app/index
jest.mock("stripe", () => {
  const mockConstructEvent = jest.fn((body, sig, secret) => {
    if (secret !== "whsec_test_secret" || !sig) {
      throw new Error("Invalid signature or secret");
    }
    // Parse the mock body to simulate constructEvent return
    const parsed = JSON.parse(body.toString());
    return parsed;
  });

  return jest.fn().mockImplementation(() => {
    return {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    };
  });
});

const request = require("supertest");
const app = require("../index");
const db = require("./setup");
const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");

beforeAll(async () => await db.connect());
afterEach(async () => await db.clear());
afterAll(async () => await db.close());

describe("Stripe Webhook Handler", () => {
  let user;
  let order;
  let product;

  beforeEach(async () => {
    user = await User.create({
      name: "Webhook User",
      email: "webhook@example.com",
      password: "password123",
    });

    product = await Product.create({
      name: "Webhook Watch",
      price: 150.0,
      stock: 3, // Two units are already reserved by the pending checkout.
    });

    order = await Order.create({
      user: user._id,
      stripeSessionId: "cs_webhook_session_id",
      items: [
        {
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: 2,
        },
      ],
      subtotal: 300,
      total: 300,
      status: "pending",
    });
  });

  test("POST /api/webhook -> Should update Order status to paid on checkout.session.completed", async () => {
    const payload = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_webhook_session_id",
        },
      },
    };

    const res = await request(app)
      .post("/api/webhook")
      .set("stripe-signature", "t=123,v1=valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(payload))
      .expect(200);

    expect(res.body).toEqual({ received: true });

    // Verify order was marked paid
    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe("paid");
    expect(updatedOrder.paidAt).toBeDefined();
  });

  test("POST /api/webhook -> Should release stock and set status to cancelled on checkout.session.expired", async () => {
    const payload = {
      type: "checkout.session.expired",
      data: {
        object: {
          id: "cs_webhook_session_id",
        },
      },
    };

    const res = await request(app)
      .post("/api/webhook")
      .set("stripe-signature", "t=123,v1=valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(payload))
      .expect(200);

    expect(res.body).toEqual({ received: true });

    // Verify order status is cancelled
    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe("cancelled");

    // Stock should be released back to the pre-checkout level.
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(5);
  });

  test("POST /api/webhook -> Should return 400 if Stripe signature verification fails", async () => {
    const payload = {
      type: "checkout.session.completed",
      data: { object: { id: "cs_webhook_session_id" } },
    };

    const res = await request(app)
      .post("/api/webhook")
      .set("Content-Type", "application/json")
      // missing or invalid stripe-signature header
      .send(JSON.stringify(payload))
      .expect(400);

    expect(res.body.message).toContain("Webhook Error");
  });
});
