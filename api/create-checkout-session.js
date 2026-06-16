const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { quantity, stripePrice, productName, unitAmount, lineItems } = req.body || {};
    let builtLineItems = [];

    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      // CART: multiple items
      builtLineItems = lineItems.map(item => {
        const qty = Math.max(1, Math.min(10, parseInt(item.quantity, 10) || 1));
        if (item.stripePrice && item.stripePrice !== 'price_REPLACE_ME') {
          return { price: item.stripePrice, quantity: qty };
        }
        return {
          price_data: {
            currency: 'usd',
            unit_amount: parseInt(item.unitAmount, 10),
            product_data: { name: item.productName || 'Awakened Product' },
          },
          quantity: qty,
        };
      });
    } else if (stripePrice && stripePrice !== 'price_REPLACE_ME') {
      // Single item with real Stripe Price ID
      builtLineItems = [{ price: stripePrice, quantity: Math.max(1, parseInt(quantity,10)||1) }];
    } else if (productName && unitAmount) {
      // Single item without Price ID
      builtLineItems = [{
        price_data: {
          currency: 'usd',
          unit_amount: parseInt(unitAmount, 10),
          product_data: { name: productName },
        },
        quantity: Math.max(1, parseInt(quantity,10)||1),
      }];
    } else {
      // Default: comic book
      builtLineItems = [{
        price_data: {
          currency: 'usd',
          unit_amount: 2500,
          product_data: { name: 'Awakened: Beginnings (Print Edition)', description: 'Issue 01 — Full-color print comic' },
        },
        quantity: Math.max(1, parseInt(quantity,10)||1),
      }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: builtLineItems,
      shipping_address_collection: { allowed_countries: ['US'] },
      // shipping_options: [{ shipping_rate: 'shr_xxxx' }],
      success_url: `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}&cleared=1`,
      cancel_url:  `${SITE_URL}/merch.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Unable to create checkout session' });
  }
};
