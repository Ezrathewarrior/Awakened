const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// Any placeholder price ID we should treat as "no real ID yet"
function isPlaceholder(id) {
  return !id || id.startsWith('price_REPLACE') || id === 'price_REPLACE_WITH_COMIC_PRICE_ID';
}

function buildLineItem(stripePrice, productName, unitAmount, quantity) {
  const qty = Math.max(1, Math.min(10, parseInt(quantity, 10) || 1));
  if (!isPlaceholder(stripePrice)) {
    // Real Stripe Price ID — use it directly
    return { price: stripePrice, quantity: qty };
  }
  // No real Price ID yet — build inline from name + amount
  return {
    price_data: {
      currency: 'usd',
      unit_amount: parseInt(unitAmount, 10) || 0,
      product_data: { name: productName || 'Awakened Product' },
    },
    quantity: qty,
  };
}

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
      // Cart checkout — one or more items
      builtLineItems = lineItems.map(item =>
        buildLineItem(item.stripePrice, item.productName, item.unitAmount, item.quantity)
      );
    } else {
      // Single item (legacy / direct buy)
      builtLineItems = [
        buildLineItem(stripePrice, productName, unitAmount || 2500, quantity || 1)
      ];
    }

    console.log('Creating Stripe session with line items:', JSON.stringify(builtLineItems, null, 2));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: builtLineItems,
      shipping_address_collection: { allowed_countries: ['US'] },
      success_url: `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}&cleared=1`,
      cancel_url: `${SITE_URL}/merch.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message || 'Unable to create checkout session' });
  }
};
