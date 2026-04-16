const { app, request, registerUser } = require('./setup');
const ecpayService = require('../src/services/ecpayService');

describe('Orders API', () => {
  let userToken;
  let productId;
  let orderId;

  beforeAll(async () => {
    // Register a user for order tests
    const { token } = await registerUser();
    userToken = token;

    // Get a product id
    const prodRes = await request(app).get('/api/products');
    productId = prodRes.body.data.products[0].id;

    // Add product to cart
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 1 });
  });

  it('should create an order from cart', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        recipientName: '測試收件人',
        recipientEmail: 'recipient@example.com',
        recipientAddress: '台北市測試路 123 號',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body).toHaveProperty('message');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('order_no');
    expect(res.body.data).toHaveProperty('total_amount');
    expect(res.body.data).toHaveProperty('status', 'pending');
    expect(res.body.data).toHaveProperty('items');
    expect(Array.isArray(res.body.data.items)).toBe(true);

    orderId = res.body.data.id;
  });

  it('should fail to create order with empty cart', async () => {
    // The cart was already cleared by the previous order
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        recipientName: '測試收件人',
        recipientEmail: 'recipient@example.com',
        recipientAddress: '台北市測試路 123 號',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('data', null);
    expect(res.body).toHaveProperty('error');
  });

  it('should fail to create order without auth', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        recipientName: '測試收件人',
        recipientEmail: 'recipient@example.com',
        recipientAddress: '台北市測試路 123 號',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).not.toBeNull();
  });

  it('should get order list', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body.data).toHaveProperty('orders');
    expect(Array.isArray(res.body.data.orders)).toBe(true);
    expect(res.body.data.orders.length).toBeGreaterThan(0);
  });

  it('should get order detail', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body.data).toHaveProperty('id', orderId);
    expect(res.body.data).toHaveProperty('order_no');
    expect(res.body.data).toHaveProperty('items');
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('should get ecpay checkout data for pending order', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/ecpay/checkout-data`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('error', null);
    expect(res.body.data).toHaveProperty('action');
    expect(res.body.data.action).toContain('/Cashier/AioCheckOut/V5');
    expect(res.body.data).toHaveProperty('fields');
    expect(res.body.data.fields).toHaveProperty('MerchantTradeNo');
    expect(res.body.data.fields).toHaveProperty('ChoosePayment', 'ALL');
    expect(res.body.data.fields).toHaveProperty('CheckMacValue');
  });

  it('should verify ecpay query and update order status to paid', async () => {
    const orderRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${userToken}`);
    const orderNo = orderRes.body.data.order_no;
    const merchantTradeNo = ecpayService.toMerchantTradeNo(orderNo);

    const queryResult = {
      MerchantID: process.env.ECPAY_MERCHANT_ID,
      MerchantTradeNo: merchantTradeNo,
      TradeNo: '2504161200001234',
      TradeAmt: String(orderRes.body.data.total_amount),
      PaymentDate: '2026/04/16 12:30:00',
      PaymentType: 'Credit_CreditCard',
      TradeDate: '2026/04/16 12:00:00',
      TradeStatus: '1'
    };
    queryResult.CheckMacValue = ecpayService.generateCheckMacValue(
      queryResult,
      process.env.ECPAY_HASH_KEY,
      process.env.ECPAY_HASH_IV
    );

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => new URLSearchParams(queryResult).toString()
    });

    let res;
    try {
      res = await request(app)
        .post(`/api/orders/${orderId}/ecpay/verify`)
        .set('Authorization', `Bearer ${userToken}`);
    } finally {
      global.fetch = originalFetch;
    }

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('error', null);
    expect(res.body.data).toHaveProperty('order');
    expect(res.body.data.order).toHaveProperty('status', 'paid');
    expect(res.body.data).toHaveProperty('ecpay');
    expect(res.body.data.ecpay).toHaveProperty('trade_status', '1');
    expect(res.body.data.ecpay).toHaveProperty('trade_no', '2504161200001234');
  });

  it('should return 404 for non-existent order', async () => {
    const res = await request(app)
      .get('/api/orders/non-existent-order-id')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('data', null);
    expect(res.body).toHaveProperty('error');
  });
});
