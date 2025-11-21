/**
 * Orderbook Component
 * Displays real-time order book with depth visualization
 */

export class OrderbookComponent {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            levels: options.levels || 15,
            onPriceClick: options.onPriceClick || null,
            ...options
        };
        
        this.currentData = null;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="orderbook-panel">
                <div class="orderbook-header">
                    <span>📖 Order Book</span>
                    <span id="ob-spread">Spread: --</span>
                </div>
                <div class="orderbook-header-row">
                    <span>Price</span>
                    <span>Size</span>
                    <span>Total</span>
                </div>
                <div class="orderbook-content" id="ob-asks">
                    <div class="orderbook-loading">Loading asks...</div>
                </div>
                <div class="spread-row" id="ob-spread-row">--</div>
                <div class="orderbook-content" id="ob-bids">
                    <div class="orderbook-loading">Loading bids...</div>
                </div>
            </div>
        `;
    }

    update(orderbookData) {
        if (!orderbookData) return;
        
        this.currentData = orderbookData;
        const asksDiv = document.getElementById('ob-asks');
        const bidsDiv = document.getElementById('ob-bids');
        const spreadDiv = document.getElementById('ob-spread-row');
        const spreadHeader = document.getElementById('ob-spread');

        // Process asks (reverse for display - lowest at bottom)
        const asks = (orderbookData.asks || []).slice(0, this.options.levels).reverse();
        const maxAskSize = Math.max(...asks.map(a => parseFloat(a.size)));
        
        asksDiv.innerHTML = asks.map(order => {
            const price = parseFloat(order.price);
            const size = parseFloat(order.size);
            const total = price * size;
            const depth = (size / maxAskSize) * 100;
            
            return `<div class="orderbook-row ask" style="--depth: ${depth}%" onclick="window.obPriceClick(${price})">
                <span class="ob-price ask">${price.toFixed(2)}</span>
                <span class="ob-size">${size.toFixed(4)}</span>
                <span class="ob-total">${total.toFixed(2)}</span>
            </div>`;
        }).join('');

        // Calculate spread
        if (orderbookData.asks?.length > 0 && orderbookData.bids?.length > 0) {
            const bestAsk = parseFloat(orderbookData.asks[0].price);
            const bestBid = parseFloat(orderbookData.bids[0].price);
            const spread = bestAsk - bestBid;
            const spreadPct = (spread / bestBid) * 100;
            
            spreadDiv.textContent = `$${spread.toFixed(2)} (${spreadPct.toFixed(3)}%)`;
            spreadHeader.textContent = `Spread: ${spreadPct.toFixed(3)}%`;
        }

        // Process bids
        const bids = (orderbookData.bids || []).slice(0, this.options.levels);
        const maxBidSize = Math.max(...bids.map(b => parseFloat(b.size)));
        
        bidsDiv.innerHTML = bids.map(order => {
            const price = parseFloat(order.price);
            const size = parseFloat(order.size);
            const total = price * size;
            const depth = (size / maxBidSize) * 100;
            
            return `<div class="orderbook-row bid" style="--depth: ${depth}%" onclick="window.obPriceClick(${price})">
                <span class="ob-price bid">${price.toFixed(2)}</span>
                <span class="ob-size">${size.toFixed(4)}</span>
                <span class="ob-total">${total.toFixed(2)}</span>
            </div>`;
        }).join('');

        // Setup price click handler
        window.obPriceClick = (price) => {
            if (this.options.onPriceClick) {
                this.options.onPriceClick(price);
            }
        };
    }

    getBestBid() {
        return this.currentData?.bids?.[0] ? parseFloat(this.currentData.bids[0].price) : null;
    }

    getBestAsk() {
        return this.currentData?.asks?.[0] ? parseFloat(this.currentData.asks[0].price) : null;
    }

    getSpread() {
        const bid = this.getBestBid();
        const ask = this.getBestAsk();
        return (bid && ask) ? ask - bid : null;
    }
}
