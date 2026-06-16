// api/create-checkout-session.js
//
// This is a Vercel serverless function. Deploying this `api/` folder
// alongside your `index.html` to Vercel will automatically turn this
// file into a live endpoint at: /api/create-checkout-session
//
// SETUP STEPS:
// 1. Create a Stripe account at https://stripe.com
// 2. In the Stripe Dashboard, go to Developers > API keys and copy your
//    "Secret key" (starts with sk_live_... or sk_test_... while testing)
// 3. Set it as an environment variable named STRIPE_SECRET_KEY in your
//    hosting provider (Vercel: Project Settings > Environment Variables)
// 4. Deploy. The "Buy Now" button on the site will now create a real
//    Stripe Checkout session.
//
// TESTING:
// Use Stripe's test mode secret key first, and test card number
// 4242 4242 4242 4242 with any future expiry date and any CVC.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Update this once your site is live, e.g. "https://awakenedcomic.com"
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

module.exports = async (req, res) => {
  // Allow the frontend to call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { quantity } = req.body || {};
    const qty = Math.max(1, Math.min(10, parseInt(quantity, 10) || 1));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],

      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 2500, // $25.00 in cents
            product_data: {
              name: 'Awakened: Beginnings (Print Edition)',
              description: 'Issue 01 — Full-color print comic',
              // Optional: add a public image URL for the cover art here
              // images: ['https://yourdomain.com/images/cover-full.jpg'],
            },
          },
          quantity: qty,
        },
      ],

      // Collects the customer's shipping address during checkout
      shipping_address_collection: {
        allowed_countries: ['US'],
      },

      shipping_options: [
  { shipping_rate: 'shr_1Tik98KZaxtIdT8i6BWh5oAB' },
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
