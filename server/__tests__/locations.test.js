// server/__tests__/locations.test.js
process.env.JWT_SECRET = "testsecretkey";
process.env.MONGO_URI = "mongodb://localhost:27017/test";
process.env.STRIPE_SECRET_KEY = "sk_test_key";

const request = require("supertest");
const app = require("../index");
const db = require("./setup");

beforeAll(async () => await db.connect());
afterEach(async () => await db.clear());
afterAll(async () => await db.close());

describe("Location Endpoints", () => {
  test("GET /api/locations -> Should return delivery locations", async () => {
    const res = await request(app).get("/api/locations").expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      governorate: expect.any(String),
      shippingCost: expect.any(Number),
    });
  });

  test("GET /api/locations -> Should allow the local Vite dev origin", async () => {
    const res = await request(app)
      .get("/api/locations")
      .set("Origin", "http://127.0.0.1:5239")
      .expect(200);

    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://127.0.0.1:5239",
    );
  });
});
