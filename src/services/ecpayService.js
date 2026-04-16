const crypto = require('crypto');

function getConfig() {
  const merchantId = process.env.ECPAY_MERCHANT_ID;
  const hashKey = process.env.ECPAY_HASH_KEY;
  const hashIv = process.env.ECPAY_HASH_IV;
  const env = String(process.env.ECPAY_ENV || 'staging').toLowerCase();

  if (!merchantId || !hashKey || !hashIv) {
    const err = new Error('ECPAY 設定不完整');
    err.code = 'ECPAY_CONFIG_ERROR';
    throw err;
  }

  const paymentBaseUrl = (env === 'prod' || env === 'production')
    ? 'https://payment.ecpay.com.tw'
    : 'https://payment-stage.ecpay.com.tw';

  const baseUrl = String(process.env.BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

  return { merchantId, hashKey, hashIv, paymentBaseUrl, baseUrl };
}

function ecpayUrlEncode(source) {
  let encoded = encodeURIComponent(source)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27');

  encoded = encoded.toLowerCase();

  const replacements = {
    '%2d': '-',
    '%5f': '_',
    '%2e': '.',
    '%21': '!',
    '%2a': '*',
    '%28': '(',
    '%29': ')'
  };

  for (const [from, to] of Object.entries(replacements)) {
    encoded = encoded.split(from).join(to);
  }

  return encoded;
}

function generateCheckMacValue(params, hashKey, hashIv) {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([key, value]) => key !== 'CheckMacValue' && value !== undefined && value !== null)
  );

  const sortedKeys = Object.keys(filtered).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const paramString = sortedKeys.map((key) => `${key}=${filtered[key]}`).join('&');
  const raw = `HashKey=${hashKey}&${paramString}&HashIV=${hashIv}`;
  const encoded = ecpayUrlEncode(raw);

  return crypto.createHash('sha256').update(encoded, 'utf8').digest('hex').toUpperCase();
}

function verifyCheckMacValue(params, hashKey, hashIv) {
  const received = String(params.CheckMacValue || '');
  const expected = generateCheckMacValue(params, hashKey, hashIv);

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function formatMerchantTradeDate() {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/-/g, '/');
}

function toMerchantTradeNo(orderNo) {
  const normalized = String(orderNo || '').replace(/[^a-zA-Z0-9]/g, '');
  return normalized.slice(0, 20);
}

function buildItemName(items) {
  const names = (items || []).map((item) => item.product_name).filter(Boolean);
  const joined = names.length > 0 ? names.join('#') : 'Flower Order';
  return joined.slice(0, 200);
}

function buildAioCheckoutData({ order, items, choosePayment = 'ALL', returnPath, clientBackPath }) {
  const config = getConfig();
  const merchantTradeNo = toMerchantTradeNo(order.order_no);

  const fields = {
    MerchantID: config.merchantId,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: formatMerchantTradeDate(),
    PaymentType: 'aio',
    TotalAmount: String(order.total_amount),
    TradeDesc: 'Flower Order Payment',
    ItemName: buildItemName(items),
    ReturnURL: `${config.baseUrl}${returnPath}`,
    ClientBackURL: `${config.baseUrl}${clientBackPath}`,
    ChoosePayment: choosePayment,
    EncryptType: '1'
  };

  fields.CheckMacValue = generateCheckMacValue(fields, config.hashKey, config.hashIv);

  return {
    action: `${config.paymentBaseUrl}/Cashier/AioCheckOut/V5`,
    method: 'POST',
    fields
  };
}

function parseQueryTradeInfoResponse(text) {
  const raw = String(text || '').trim();

  if (!raw) return {};

  if (!raw.includes('=') && raw.includes('|')) {
    const [rtnCode, ...msgParts] = raw.split('|');
    return {
      RtnCode: rtnCode,
      RtnMsg: msgParts.join('|')
    };
  }

  return Object.fromEntries(new URLSearchParams(raw));
}

async function queryTradeInfo({ merchantTradeNo, timeStamp = Math.floor(Date.now() / 1000) }) {
  const config = getConfig();
  const payload = {
    MerchantID: config.merchantId,
    MerchantTradeNo: merchantTradeNo,
    TimeStamp: String(timeStamp)
  };

  payload.CheckMacValue = generateCheckMacValue(payload, config.hashKey, config.hashIv);

  const response = await fetch(`${config.paymentBaseUrl}/Cashier/QueryTradeInfo/V5`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(payload).toString()
  });

  if (!response.ok) {
    const err = new Error(`ECPay 查詢失敗 (${response.status})`);
    err.code = 'ECPAY_QUERY_FAILED';
    throw err;
  }

  const text = await response.text();
  const parsed = parseQueryTradeInfoResponse(text);

  if (parsed.CheckMacValue) {
    const valid = verifyCheckMacValue(parsed, config.hashKey, config.hashIv);
    if (!valid) {
      const err = new Error('ECPay 回應驗章失敗');
      err.code = 'ECPAY_INVALID_SIGNATURE';
      throw err;
    }
  }

  return parsed;
}

module.exports = {
  getConfig,
  ecpayUrlEncode,
  generateCheckMacValue,
  verifyCheckMacValue,
  toMerchantTradeNo,
  buildAioCheckoutData,
  parseQueryTradeInfoResponse,
  queryTradeInfo
};
