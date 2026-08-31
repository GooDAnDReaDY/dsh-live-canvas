// dsh-live-canvas: Smart Mock Data & Form State Generator (zero-dependency).

const FIRST_NAMES = ['Александр', 'Елена', 'Дмитрий', 'София', 'Максим', 'Анна', 'Артем', 'Виктория', 'Иван', 'Полина', 'Alex', 'Emma', 'David', 'Sophia', 'Lucas', 'Olivia'];
const LAST_NAMES = ['Смирнов', 'Иванова', 'Кузнецов', 'Попова', 'Соколов', 'Лебедева', 'Козлов', 'Новикова', 'Miller', 'Johnson', 'Smith', 'Williams', 'Brown', 'Davis'];
const ROLES = ['Lead Engineer', 'Product Designer', 'Frontend Architect', 'CTO', 'Product Manager', 'DevOps Lead', 'AI Researcher'];
const STATUSES = ['Active', 'Reviewing', 'Offline', 'Busy'];
const CATEGORIES = ['UI Kits', 'SaaS Tools', 'Developer Utilities', 'Design Systems', 'AI Plugins'];
const PRODUCT_TITLES = ['Live Canvas Pro Suite', 'Neon Mesh Gradient Pack', 'Bento Grid Component Kit', 'SaaS Analytics Dashboard', 'Lucide Icon Mega Bundle', 'Tailwind Micro-Animations Pack'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateUsers(count = 5) {
  const users = [];
  for (let i = 1; i <= count; i++) {
    const fn = randomItem(FIRST_NAMES);
    const ln = randomItem(LAST_NAMES);
    const role = randomItem(ROLES);
    const status = randomItem(STATUSES);
    const username = `${fn.toLowerCase()}.${ln.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
    users.push({
      id: `usr_${i}`,
      name: `${fn} ${ln}`,
      email: `${username}@goodandready.app`,
      role,
      status,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      joinedAt: '2026-0' + randomNumber(1, 8) + '-' + randomNumber(10, 28)
    });
  }
  return users;
}

export function generateProducts(count = 6) {
  const products = [];
  for (let i = 1; i <= count; i++) {
    const title = randomItem(PRODUCT_TITLES);
    const price = randomNumber(19, 299) * 10;
    const rating = (4 + Math.random()).toFixed(1);
    const category = randomItem(CATEGORIES);
    products.push({
      id: `prod_${i}`,
      title: `${title} v${randomNumber(1, 3)}`,
      category,
      price,
      currency: '₽',
      rating: parseFloat(rating),
      reviewsCount: randomNumber(12, 180),
      inStock: Math.random() > 0.15,
      badge: Math.random() > 0.6 ? 'Bestseller' : (Math.random() > 0.5 ? 'New' : '')
    });
  }
  return products;
}

export function generateAnalytics(days = 7) {
  const points = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    points.push({
      date: dateStr,
      visitors: randomNumber(1200, 4500),
      pageViews: randomNumber(3500, 12000),
      conversions: randomNumber(40, 190),
      revenue: randomNumber(45000, 210000)
    });
  }
  return points;
}

export function generateMockDataset(type = 'users', count = 5) {
  switch (type) {
    case 'products':
      return { products: generateProducts(count) };
    case 'analytics':
      return { analytics: generateAnalytics(count) };
    case 'users':
    default:
      return { users: generateUsers(count) };
  }
}

