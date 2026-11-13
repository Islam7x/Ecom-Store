// server/__tests__/auth.test.js
process.env.JWT_SECRET = "testsecretkey";
process.env.MONGO_URI = "mongodb://localhost:27017/test";
process.env.STRIPE_SECRET_KEY = "sk_test_key";

const request = require("supertest");
const app = require("../index");
const db = require("./setup");
const User = require("../models/User");

beforeAll(async () => await db.connect());
afterEach(async () => await db.clear());
afterAll(async () => await db.close());

describe("Auth Endpoints", () => {
  const testUser = {
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
  };

  test("POST /api/auth/register -> Should register a new user and return user details with cookie", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser)
      .expect(200);

    expect(res.body).toHaveProperty("_id");
    expect(res.body.email).toBe(testUser.email);
    expect(res.body.name).toBe(testUser.name);
    expect(res.body).not.toHaveProperty("password");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("POST /api/auth/register -> Should fail if email already exists", async () => {
    await User.create(testUser);

    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser)
      .expect(409);

    expect(res.body.message).toContain("registered");
  });

  test("POST /api/auth/login -> Should authenticate user and set cookie", async () => {
    await User.create(testUser);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    expect(res.body.email).toBe(testUser.email);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("POST /api/auth/login -> Should fail with wrong password", async () => {
    await User.create(testUser);

    await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: "wrongpassword" })
      .expect(401);
  });

  test("POST /api/auth/logout -> Should clear auth cookie", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .expect(200);

    expect(res.headers["set-cookie"][0]).toContain("token=;");
  });

  test("GET /api/auth/me -> Should return user profile when authenticated", async () => {
    await User.create(testUser);
    // Register or login to get cookie
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    const cookie = loginRes.headers["set-cookie"];

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(200);

    expect(res.body.email).toBe(testUser.email);
  });

  test("POST /api/auth/forgot-password -> Should not retain a reset token when mail is unavailable", async () => {
    const previousSmtpHost = process.env.SMTP_HOST;
    process.env.SMTP_HOST = "";
    await User.create(testUser);

    try {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: testUser.email })
        .expect(200);

      expect(res.body.message).toContain("If that email is registered");
      const user = await User.findOne({ email: testUser.email }).select(
        "+passwordResetToken +passwordResetExpires",
      );
      expect(user.passwordResetToken).toBeUndefined();
      expect(user.passwordResetExpires).toBeUndefined();
    } finally {
      if (previousSmtpHost === undefined) {
        delete process.env.SMTP_HOST;
      } else {
        process.env.SMTP_HOST = previousSmtpHost;
      }
    }
  });
});
