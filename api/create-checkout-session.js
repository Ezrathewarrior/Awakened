const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { quantity, stripePrice, productName, unitAmount } = req.body || {};
    const qty = Math.max(1, Math.min(10, parseInt(quantity, 10) || 1));

    let lineItem;

    if (stripePrice && stripePrice !== 'price_REPLACE_ME') {
      // Merch product with a real Stripe Price ID
      lineItem = { price: stripePrice, quantity: qty };
    } else if (productName && unitAmount) {
      // Merch product without a Price ID yet — build inline
      lineItem = {
        price_data: {
          currency: 'usd',
          unit_amount: parseInt(unitAmount, 10),
          product_data: { name: productName },
        },
        quantity: qty,
      };
    } else {
      // Default: comic book
      lineItem = {
        price_data: {
          currency: 'usd',
          unit_amount: 2500,
          product_data: {
            name: 'Awakened: Beginnings (Print Edition)',
            description: 'Issue 01 — Full-color print comic',
          },
        },
        quantity: qty,
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [lineItem],
      shipping_address_collection: { allowed_countries: ['US'] },
      shipping_options: [
        // { shipping_rate: 'shr_xxxxxxxxxxxx' }, // uncomment and add your rate ID
      ],
      success_url: `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/index.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Unable to create checkout session' });
  }
};
