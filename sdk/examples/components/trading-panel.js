export class TradingPanelComponent {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = options;
        this.currentSide = 'buy';
        this.currentOrderType = 'limit';
        this.advancedMode = false;
        this.openOrders = [];
        this.render();
        this.attachListeners();
    }

    render() {
        this.container.innerHTML = `<div class="trading-panel">
            <div class="order-tabs">
                <button class="order-tab active" data-type="limit">Limit</button>
                <button class="order-tab" data-type="market">Market</button>
                <button class="order-tab" data-type="stop-loss">Stop Loss</button>
                <button class="order-tab" data-type="take-profit">Take Profit</button>
                <button class="order-tab" data-type="oco">OCO</button>
            </div>
            <div class="order-form">
                <div class="side-buttons">
                    <button class="side-btn buy active" data-side="buy">BUY</button>
                    <button class="side-btn sell" data-side="sell">SELL</button>
                </div>
                <div class="form-group" id="price-group">
                    <label class="form-label">Price (USD)</label>
                    <input type="number" class="form-input" id="tp-price-input" placeholder="0.00" step="0.01">
                </div>
                <div class="form-group" id="trigger-group" style="display: none;">
                    <label class="form-label">Trigger Price</label>
                    <input type="number" class="form-input" id="tp-trigger-input" placeholder="0.00" step="0.01">
                </div>
                <div class="form-group" id="limit-price-group" style="display: none;">
                    <label class="form-label">Limit Price (Optional)</label>
                    <input type="number" class="form-input" id="tp-limit-price-input" placeholder="0.00" step="0.01">
                </div>
                <div class="form-group" id="tp-price-group" style="display: none;">
                    <label class="form-label">Take Profit Price</label>
                    <input type="number" class="form-input" id="tp-tp-price-input" placeholder="0.00" step="0.01">
                </div>
                <div class="form-group" id="sl-price-group" style="display: none;">
                    <label class="form-label">Stop Loss Price</label>
                    <input type="number" class="form-input" id="tp-sl-price-input" placeholder="0.00" step="0.01">
                </div>
                <div class="form-group">
                    <label class="form-label">Amount</label>
                    <input type="number" class="form-input" id="tp-amount-input" placeholder="0.00" step="0.001">
                </div>
                <div class="form-group" id="bracket-group" style="display: none;">
                    <label class="form-checkbox">
                        <input type="checkbox" id="tp-add-tpsl"><span>+ Add TP/SL (Bracket)</span>
                    </label>
                    <div id="bracket-fields" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px solid #1a1f2e;">
                        <label class="form-label">Take Profit Price</label>
                        <input type="number" class="form-input" id="tp-bracket-tp-price" placeholder="0.00" step="0.01" style="margin-bottom: 10px;">
                        <label class="form-label">Stop Loss Price</label>
                        <input type="number" class="form-input" id="tp-bracket-sl-price" placeholder="0.00" step="0.01">
                    </div>
                </div>
                <div class="form-group">
                    <input type="range" class="amount-slider" id="tp-amount-slider" min="0" max="100" value="0">
                    <div class="percentage-labels"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
                </div>
                <div class="form-group">
                    <label class="form-label">Time in Force</label>
                    <select class="form-input" id="tp-tif-select">
                        <option value="1">Good Till Time (GTT)</option>
                        <option value="2">Post Only</option>
                        <option value="0">Immediate or Cancel (IOC)</option>
                    </select>
                </div>
                <div class="form-group"><label class="form-checkbox"><input type="checkbox" id="tp-reduce-only"><span>Reduce Only</span></label></div>
                <div class="form-group" id="advanced-toggle">
                    <button class="text-btn" id="tp-advanced-btn">⚙️ Advanced Options</button>
                </div>
                <div class="form-group" id="advanced-options" style="display: none;">
                    <label class="form-label">Order Expiry (ms)</label>
                    <input type="number" class="form-input" id="tp-expiry-input" placeholder="2419200000" step="1000">
                    <label class="form-label" style="margin-top: 10px;">Client Order ID</label>
                    <input type="number" class="form-input" id="tp-client-id-input" placeholder="Auto-generated">
                </div>
                <button class="submit-btn buy" id="tp-submit-btn">BUY</button>
                <div class="balance-info">
                    <div class="balance-row"><span>Available:</span><span class="balance-value" id="tp-available">--</span></div>
                    <div class="balance-row"><span>Max:</span><span class="balance-value" id="tp-max">--</span></div>
                </div>
            </div>
            <div class="open-orders">
                <div class="open-orders-header"><span>Open Orders</span><span id="tp-order-count">0</span></div>
                <div id="tp-orders-list"><div class="no-orders">No open orders</div></div>
            </div>
        </div>`;
    }

    attachListeners() {
        this.container.querySelectorAll('.order-tab').forEach(tab => tab.addEventListener('click', () => this.switchTab(tab.dataset.type)));
        this.container.querySelectorAll('.side-btn').forEach(btn => btn.addEventListener('click', () => this.selectSide(btn.dataset.side)));
        document.getElementById('tp-submit-btn').addEventListener('click', () => this.handleSubmit());
        document.getElementById('tp-advanced-btn')?.addEventListener('click', () => this.toggleAdvanced());
        document.getElementById('tp-add-tpsl')?.addEventListener('change', (e) => {
            document.getElementById('bracket-fields').style.display = e.target.checked ? 'block' : 'none';
        });
    }

    switchTab(type) {
        this.currentOrderType = type;
        this.container.querySelectorAll('.order-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.type === type));
        
        // Reset all conditional fields
        document.getElementById('price-group').style.display = 'none';
        document.getElementById('trigger-group').style.display = 'none';
        document.getElementById('limit-price-group').style.display = 'none';
        document.getElementById('tp-price-group').style.display = 'none';
        document.getElementById('sl-price-group').style.display = 'none';
        document.getElementById('bracket-group').style.display = 'none';
        
        // Show fields based on order type
        if (type === 'limit') {
            document.getElementById('price-group').style.display = 'block';
            document.getElementById('bracket-group').style.display = 'block';
        } else if (type === 'market') {
            document.getElementById('bracket-group').style.display = 'block';
        } else if (type === 'stop-loss') {
            document.getElementById('trigger-group').style.display = 'block';
            document.getElementById('limit-price-group').style.display = 'block';
        } else if (type === 'take-profit') {
            document.getElementById('trigger-group').style.display = 'block';
            document.getElementById('limit-price-group').style.display = 'block';
        } else if (type === 'oco') {
            document.getElementById('tp-price-group').style.display = 'block';
            document.getElementById('sl-price-group').style.display = 'block';
        }
    }
    
    toggleAdvanced() {
        this.advancedMode = !this.advancedMode;
        document.getElementById('advanced-options').style.display = this.advancedMode ? 'block' : 'none';
    }

    selectSide(side) {
        this.currentSide = side;
        this.container.querySelectorAll('.side-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.side === side));
        const submitBtn = document.getElementById('tp-submit-btn');
        submitBtn.className = `submit-btn ${side}`;
        submitBtn.textContent = `${side.toUpperCase()}`;
    }

    handleSubmit() {
        const data = {
            side: this.currentSide,
            orderType: this.currentOrderType,
            price: parseFloat(document.getElementById('tp-price-input').value) || 0,
            triggerPrice: parseFloat(document.getElementById('tp-trigger-input').value) || 0,
            limitPrice: parseFloat(document.getElementById('tp-limit-price-input').value) || 0,
            takeProfitPrice: parseFloat(document.getElementById('tp-tp-price-input').value) || 0,
            stopLossPrice: parseFloat(document.getElementById('tp-sl-price-input').value) || 0,
            amount: parseFloat(document.getElementById('tp-amount-input').value) || 0,
            reduceOnly: document.getElementById('tp-reduce-only').checked,
            timeInForce: parseInt(document.getElementById('tp-tif-select').value),
            orderExpiry: parseInt(document.getElementById('tp-expiry-input').value) || null,
            clientOrderIndex: parseInt(document.getElementById('tp-client-id-input').value) || null,
            addBracket: document.getElementById('tp-add-tpsl')?.checked || false,
            bracketTpPrice: parseFloat(document.getElementById('tp-bracket-tp-price')?.value) || 0,
            bracketSlPrice: parseFloat(document.getElementById('tp-bracket-sl-price')?.value) || 0
        };
        
        if (!data.amount || data.amount <= 0) return alert('Enter amount');
        
        // Validation based on order type
        if (data.orderType === 'limit' && !data.price) return alert('Enter limit price');
        if ((data.orderType === 'stop-loss' || data.orderType === 'take-profit') && !data.triggerPrice) return alert('Enter trigger price');
        if (data.orderType === 'oco' && (!data.takeProfitPrice || !data.stopLossPrice)) return alert('Enter both TP and SL prices');
        if (data.addBracket && (!data.bracketTpPrice || !data.bracketSlPrice)) return alert('Enter both TP and SL prices for bracket order');
        
        if (this.options.onPlaceOrder) this.options.onPlaceOrder(data);
    }

    setPrice(price) { document.getElementById('tp-price-input').value = price.toFixed(2); }
    updateBalance(available, max) { document.getElementById('tp-available').textContent = `$${available.toFixed(2)}`; document.getElementById('tp-max').textContent = max ? max.toFixed(4) : '--'; }
    
    updateOpenOrders(orders) {
        this.openOrders = orders || [];
        document.getElementById('tp-order-count').textContent = this.openOrders.length;
        const listDiv = document.getElementById('tp-orders-list');
        if (this.openOrders.length === 0) { listDiv.innerHTML = '<div class="no-orders">No open orders</div>'; return; }
        listDiv.innerHTML = this.openOrders.map(o => `<div class="order-item"><div class="order-item-header"><span class="order-symbol ${o.side === 'BUY' ? 'order-side-buy' : 'order-side-sell'}">${o.symbol} ${o.side}</span><button class="order-cancel-btn" onclick="window.tpCancelOrder(${o.marketId}, ${o.orderIndex})">Cancel</button></div><div class="order-details">${o.size.toFixed(4)} @ $${o.price.toFixed(2)}</div></div>`).join('');
        window.tpCancelOrder = (marketId, orderIndex) => { if (this.options.onCancelOrder) this.options.onCancelOrder(marketId, orderIndex); };
    }
}
