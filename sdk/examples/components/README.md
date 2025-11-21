# Modular Trading Terminal Components

## 📦 Component Structure

Each component is **completely independent** with its own CSS and JS file:

```
components/
├── orderbook.css          # Orderbook styles
├── orderbook.js           # Orderbook logic
├── chart.css              # Chart container styles
├── chart.js               # TradingView integration
├── trading-panel.css      # Trading form styles
├── trading-panel.js       # Order placement logic
├── terminal.css           # Main layout grid
└── README.md              # This file
```

---

## 🔌 Usage

### 1. **Import Components in HTML**
```html
<!-- Import CSS -->
<link rel="stylesheet" href="components/terminal.css">
<link rel="stylesheet" href="components/orderbook.css">
<link rel="stylesheet" href="components/chart.css">
<link rel="stylesheet" href="components/trading-panel.css">

<!-- Import JS modules -->
<script type="module">
  import { OrderbookComponent } from './components/orderbook.js';
  import { ChartComponent } from './components/chart.js';
  import { TradingPanelComponent } from './components/trading-panel.js';
</script>
```

### 2. **Initialize Components**
```javascript
// Create orderbook
const orderbook = new OrderbookComponent('container-id', {
    levels: 15,
    onPriceClick: (price) => console.log('Clicked price:', price)
});

// Create chart
const chart = new ChartComponent('chart-container', {
    symbol: 'BINANCE:BTCUSDT',
    interval: '15'
});
chart.init();

// Create trading panel
const tradingPanel = new TradingPanelComponent('panel-container', {
    onPlaceOrder: (orderData) => console.log('Place order:', orderData),
    onCancelOrder: (marketId, orderIndex) => console.log('Cancel:', marketId, orderIndex)
});
```

### 3. **Update Components**
```javascript
// Update orderbook with data from SDK
const orderbookData = await sdk.getOrderBook(marketId);
orderbook.update(orderbookData);

// Update trading panel orders
const orders = await sdk.getOrders();
tradingPanel.updateOpenOrders(orders);

// Update balance
tradingPanel.updateBalance(5000.50, 0.5);
```

---

## 🎨 Orderbook Component

### **API**
```javascript
class OrderbookComponent {
    constructor(containerId, options)
    update(orderbookData)
    getBestBid()
    getBestAsk()
    getSpread()
}
```

### **Options**
- `levels` - Number of orderbook levels (default: 15)
- `onPriceClick` - Callback when price is clicked

### **Features**
- ✅ Depth visualization with gradient bars
- ✅ Real-time ask/bid updates
- ✅ Spread calculation
- ✅ Click price to auto-fill order form

---

## 📊 Chart Component

### **API**
```javascript
class ChartComponent {
    constructor(containerId, options)
    init()
    setSymbol(symbol)
    setInterval(interval)
    destroy()
}
```

### **Options**
- `symbol` - TradingView symbol (default: 'BINANCE:BTCUSDT')
- `interval` - Chart interval (default: '15')
- `theme` - 'dark' or 'light' (default: 'dark')

### **Features**
- ✅ Full TradingView widget
- ✅ Dark theme matching terminal
- ✅ All indicators and drawing tools
- ✅ Symbol/interval switching

---

## 💼 Trading Panel Component

### **API**
```javascript
class TradingPanelComponent {
    constructor(containerId, options)
    setPrice(price)
    updateBalance(available, max)
    updateOpenOrders(orders)
}
```

### **Options**
- `onPlaceOrder` - Callback with order data
- `onCancelOrder` - Callback with marketId, orderIndex
- `marketSymbol` - Market symbol (default: 'BTC')

### **Features**
- ✅ 3 order types: Limit, Market, Stop
- ✅ Buy/Sell toggle
- ✅ Reduce-only & Post-only options
- ✅ Amount slider (0-100%)
- ✅ Live open orders list
- ✅ One-click cancel

---

## 🔧 Integration into Any Project

### **Step 1: Copy Component Files**
Copy the entire `components/` folder to your project.

### **Step 2: Import in Your HTML**
```html
<link rel="stylesheet" href="path/to/components/orderbook.css">
<script type="module">
  import { OrderbookComponent } from './path/to/components/orderbook.js';
</script>
```

### **Step 3: Use with Your SDK**
```javascript
// Initialize with your existing SDK instance
const orderbook = new OrderbookComponent('ob-container');

// Connect to your data feeds
setInterval(async () => {
    const data = await yourSDK.getOrderBook();
    orderbook.update(data);
}, 1000);
```

---

## 📐 Layout Grid

The terminal uses CSS Grid for responsive layout:

```css
.terminal-container {
    display: grid;
    grid-template-columns: 300px 1fr 350px;
    grid-template-rows: 60px 1fr;
}
```

Adjust column widths in `terminal.css` to fit your needs.

---

## 🎯 Benefits

1. **Modular** - Each component works independently
2. **Reusable** - Drop into any project
3. **Maintainable** - Update one component without touching others
4. **Portable** - Easy to integrate into v4prod or any app
5. **Clean** - Separate concerns (styling, logic, layout)

---

## 🚀 Full Example

See `trading-terminal-modular.html` for a complete working example with:
- All 3 components integrated
- Lighter SDK connected
- Real-time data feeds
- Order placement/cancellation

---

## 📝 Customization

### **Change Colors**
Edit CSS variables in component files:
- `orderbook.css` - Ask/bid colors
- `trading-panel.css` - Buy/sell button colors
- `terminal.css` - Background colors

### **Add Features**
Each component class is extensible:
```javascript
class MyOrderbook extends OrderbookComponent {
    update(data) {
        super.update(data);
        // Add custom logic
    }
}
```

### **Remove Components**
Don't need a component? Just don't import it:
```html
<!-- Only use orderbook + chart, no trading panel -->
<link rel="stylesheet" href="components/orderbook.css">
<link rel="stylesheet" href="components/chart.css">
```

---

## 🔄 Data Flow

```
SDK Data → Component.update() → Renders to DOM
User Action → Component callback → Your handler → SDK method
```

Each component is **stateless** - you control the data flow.
