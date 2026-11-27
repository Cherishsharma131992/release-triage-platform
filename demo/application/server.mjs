// Demo storefront used to exercise the platform with real automation, Allure output and Playwright MCP re-runs.
// Bugs are injected with BUGS=vat,search (comma separated). Recommendations load with a random delay (flaky tests).
import http from 'node:http';

const PORT = Number(process.env.SHOP_PORT ?? 4100);
const BUGS = new Set((process.env.BUGS ?? '').split(',').map((s) => s.trim()).filter(Boolean));

const PRODUCTS = [
  { id: 'p1', name: 'Desk Lamp', price: 40 },
  { id: 'p2', name: 'Office Chair', price: 150 },
  { id: 'p3', name: 'Standing Desk', price: 400 },
  { id: 'p4', name: 'Monitor Arm', price: 60 },
];
const USERS = { 'qa@shop.test': { password: 'Passw0rd!', name: 'QA' } };
const VAT = { Germany: 0.19, France: 0.2, 'United States': 0 };

const layout = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${title} · Demo Shop</title>
<style>body{font-family:system-ui;margin:0}nav{background:#0f172a;padding:10px 20px}nav a{color:#fff;margin-right:16px}main{padding:20px}
.card{border:1px solid #ddd;border-radius:8px;padding:12px;margin:8px 0;max-width:420px}button{padding:6px 12px}label{display:block;margin:8px 0}</style>
<script>
const cart = () => JSON.parse(localStorage.getItem('cart') || '[]');
function add(id){ const c = cart(); c.push(id); localStorage.setItem('cart', JSON.stringify(c)); document.getElementById('flash').textContent = 'Added to cart'; }
</script>
</head><body><nav><a href="/">Home</a><a href="/products">Products</a><a href="/cart">Cart</a><a href="/login">Sign in</a></nav><main>${body}</main></body></html>`;

const money = (n) => `€${n.toFixed(2)}`;

function home() {
  return layout('Home', `<h1>Demo Shop</h1><p>Office furniture for focused work.</p>
<section class="card"><h2>Recommended for you</h2><div id="recs">Loading recommendations…</div></section>
<script>
setTimeout(async () => {
  const r = await fetch('/api/recommendations').then((x) => x.json());
  document.getElementById('recs').textContent = r.items.join(', ');
}, ${'2000 + Math.random() * 2000'});
</script>`);
}

function products(q) {
  const match = (p) => (BUGS.has('search') ? p.name.includes(q) : p.name.toLowerCase().includes(q.toLowerCase()));
  const list = q ? PRODUCTS.filter(match) : PRODUCTS;
  return layout('Products', `<h1>Products</h1>
<form><label>Search <input name="q" value="${q.replace(/"/g, '&quot;')}"></label><button>Search</button></form>
<div id="flash" role="status"></div>
${list.length ? list.map((p) => `<div class="card" data-testid="product-${p.id}"><h3>${p.name}</h3><span class="price">${money(p.price)}</span> <button onclick="add('${p.id}')">Add ${p.name} to cart</button></div>`).join('') : '<p>No products found</p>'}
<p>${list.length} result(s)</p>`);
}

function cartPage() {
  return layout('Cart', `<h1>Cart</h1><div id="items"></div>
<label>Country <select id="country" onchange="render()"><option>Germany</option><option>France</option><option>United States</option></select></label>
<p>Subtotal: <span id="subtotal"></span></p><p>VAT: <span id="vat"></span></p><p>Total: <strong id="total"></strong></p>
<button onclick="place()">Place order</button><div id="result" role="status"></div>
<script>
const PRODUCTS = ${JSON.stringify(PRODUCTS)};
const VAT = ${JSON.stringify(BUGS.has('vat') ? { ...VAT, Germany: 0.1 } : VAT)};
const fmt = (n) => '€' + n.toFixed(2);
function render(){
  const items = cart().map((id) => PRODUCTS.find((p) => p.id === id));
  document.getElementById('items').innerHTML = items.map((p) => '<div>' + p.name + ' ' + fmt(p.price) + '</div>').join('') || 'Your cart is empty';
  const sub = items.reduce((s, p) => s + p.price, 0);
  const vat = sub * VAT[document.getElementById('country').value];
  document.getElementById('subtotal').textContent = fmt(sub);
  document.getElementById('vat').textContent = fmt(vat);
  document.getElementById('total').textContent = fmt(sub + vat);
}
function place(){ document.getElementById('result').textContent = cart().length ? 'Order confirmed' : 'Your cart is empty'; }
render();
</script>`);
}

function login(error = '') {
  return layout('Sign in', `<h1>Sign in</h1><form method="post" action="/login">
<label>Email <input name="email" type="email"></label><label>Password <input name="password" type="password"></label>
<button id="sign-in">Sign in</button></form>${error ? `<p role="alert">${error}</p>` : ''}`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const html = (body, status = 200) => res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' }).end(body);
  if (req.method === 'POST' && url.pathname === '/login') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const form = new URLSearchParams(raw);
    const user = USERS[form.get('email') ?? ''];
    if (!user || user.password !== form.get('password')) return html(login('Invalid email or password'), 401);
    return html(layout('Account', `<h1>Welcome back, ${user.name}</h1><p>Your orders will appear here.</p>`));
  }
  if (url.pathname === '/') return html(home());
  if (url.pathname === '/products') return html(products(url.searchParams.get('q') ?? ''));
  if (url.pathname === '/cart') return html(cartPage());
  if (url.pathname === '/login') return html(login());
  if (url.pathname === '/api/recommendations') return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ items: ['Desk Lamp', 'Monitor Arm'] }));
  if (url.pathname === '/health') return res.writeHead(200).end('ok');
  html(layout('Not found', '<h1>Not found</h1>'), 404);
});

server.listen(PORT, '127.0.0.1', () => console.log(`Demo shop on http://127.0.0.1:${PORT} (bugs: ${[...BUGS].join(', ') || 'none'})`));
