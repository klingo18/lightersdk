/**
 * Chart Component
 * TradingView chart integration
 */

export class ChartComponent {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            symbol: options.symbol || 'BINANCE:BTCUSDT',
            interval: options.interval || '15',
            theme: options.theme || 'dark',
            ...options
        };
        
        this.widget = null;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="chart-panel">
                <div class="chart-container">
                    <div id="chart-widget"></div>
                    <div class="chart-loading">Loading chart...</div>
                </div>
            </div>
        `;
    }

    init() {
        if (typeof TradingView === 'undefined') {
            console.error('TradingView library not loaded');
            return;
        }

        this.widget = new TradingView.widget({
            container_id: 'chart-widget',
            library_path: 'https://s3.tradingview.com/tv.js',
            symbol: this.options.symbol,
            interval: this.options.interval,
            theme: this.options.theme,
            style: '1',
            locale: 'en',
            toolbar_bg: '#0f1419',
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            studies: ['Volume@tv-basicstudies'],
            disabled_features: ['header_symbol_search', 'header_compare'],
            enabled_features: ['study_templates'],
            overrides: {
                "paneProperties.background": "#0f1419",
                "paneProperties.backgroundType": "solid",
                "paneProperties.vertGridProperties.color": "#1a1f2e",
                "paneProperties.horzGridProperties.color": "#1a1f2e",
                "scalesProperties.textColor": "#666",
                "mainSeriesProperties.candleStyle.upColor": "#10b981",
                "mainSeriesProperties.candleStyle.downColor": "#ef4444",
                "mainSeriesProperties.candleStyle.borderUpColor": "#10b981",
                "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
                "mainSeriesProperties.candleStyle.wickUpColor": "#10b981",
                "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444"
            },
            loading_screen: { backgroundColor: "#0f1419" }
        });

        // Remove loading message
        setTimeout(() => {
            const loading = this.container.querySelector('.chart-loading');
            if (loading) loading.remove();
        }, 2000);
    }

    setSymbol(symbol) {
        if (this.widget) {
            this.widget.setSymbol(symbol, this.options.interval, () => {
                console.log('Chart symbol changed to:', symbol);
            });
        }
    }

    setInterval(interval) {
        if (this.widget) {
            this.widget.setInterval(interval);
            this.options.interval = interval;
        }
    }

    destroy() {
        if (this.widget) {
            this.widget.remove();
            this.widget = null;
        }
    }
}
