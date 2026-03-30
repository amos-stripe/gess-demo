/**
 * GESS Parents Portal — Main Controller
 */
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Demo families
const FAMILIES = {
  smith: {
    key: 'smith',
    customerId: 'cus_UDv6Hw8EuOdDOy',
    name: 'Smith Family',
    parent: 'Sarah Smith',
    initials: 'SS',
    invoice: 'INV-2026-0042',
    fees: [
      { student: 'John Smith', grade: 'Grade 5', description: 'Tuition — Term 2, 2026', name: 'John Smith — Grade 5 Tuition (Term 2, 2026)', amount: 390000 },
      { student: 'Emma Smith', grade: 'Grade 3', description: 'Tuition — Term 2, 2026', name: 'Emma Smith — Grade 3 Tuition (Term 2, 2026)', amount: 390000 },
    ],
  },
  rosen: {
    key: 'rosen',
    customerId: 'cus_UDvCsGCMNmYrSa',
    name: 'Rosen Family',
    parent: 'Ryan Rosen',
    initials: 'RR',
    invoice: 'INV-2026-0078',
    fees: [
      { student: 'Liam Rosen', grade: 'Grade 7', description: 'Tuition — Term 2, 2026', name: 'Liam Rosen — Grade 7 Tuition (Term 2, 2026)', amount: 390000 },
      { student: 'Mia Rosen', grade: 'Grade 4', description: 'Tuition — Term 2, 2026', name: 'Mia Rosen — Grade 4 Tuition (Term 2, 2026)', amount: 390000 },
    ],
  },
};

function formatSGD(cents) {
  return (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getFamily(req) {
  const key = req.query.family || req.body?.family || 'smith';
  return FAMILIES[key] || FAMILIES.smith;
}

// ── Login page ──────────────────────────────────────────────────────────────
router.get('/', function (req, res) {
  res.render('pages/login');
});

// ── Fee summary ──────────────────────────────────────────────────────────────
router.get('/fees', function (req, res) {
  const family = getFamily(req);
  const items = family.fees.map((f) => ({ ...f, displayAmount: formatSGD(f.amount) }));
  const total = family.fees.reduce((sum, f) => sum + f.amount, 0);

  res.render('pages/fees', {
    items,
    total: formatSGD(total),
    family: family.name,
    parent: family.parent,
    initials: family.initials,
    invoice: family.invoice,
    familyKey: family.key,
    studentCount: family.fees.length,
    families: Object.values(FAMILIES).map((f) => ({ key: f.key, name: f.name, selected: f.key === family.key })),
  });
});

// ── Create Checkout Session ───────────────────────────────────────────────────
router.post('/create-checkout', async function (req, res) {
  const family = getFamily(req);
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'sgd',
    line_items: family.fees.map((f) => ({
      price_data: {
        currency: 'sgd',
        product_data: { name: f.name },
        unit_amount: f.amount,
      },
      quantity: 1,
    })),
    adaptive_pricing: {
      enabled: true,
    },
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/fees?family=${family.key}`,
    metadata: {
      family: family.name,
      term: 'Term 2, 2026',
    },
  });

  res.redirect(303, session.url);
});

// ── Success page ─────────────────────────────────────────────────────────────
router.get('/success', async function (req, res) {
  const sessionId = req.query.session_id;
  if (!sessionId) return res.redirect('/fees');

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'payment_intent.latest_charge'],
  });

  const pi = session.payment_intent;
  const date = new Date(pi.created * 1000).toLocaleDateString('en-SG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const receiptUrl = pi.latest_charge?.receipt_url || null;

  res.render('pages/success', {
    amount: formatSGD(pi.amount_received),
    date,
    reference: pi.id,
    receipt_url: receiptUrl,
  });
});

// ── Reset demo ───────────────────────────────────────────────────────────────
router.get('/reset', function (req, res) {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
