// Lighter Exchange - Browser App
// Pure client-side order placement using WASM

const CONFIG = {
    accountIndex: 316837,
    apiKeyIndex: 2,
    chainId: 304,
    baseUrl: "https://mainnet.zklighter.elliot.ai",
    marketId: 1, // BTC
};

let wasmReady = false;

// Load WASM on page load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadWASM();
    } catch (error) {
        showError(`Failed to load WASM: ${error.message}`);
    }
});

async function loadWASM() {
    const statusEl = document.getElementById('wasmStatus');
    
    try {
        console.log('========================================');
        console.log('LOADING WASM');
        console.log('========================================');
        
        statusEl.innerHTML = '<span class="spinner"></span> Loading WASM...';
        
        console.log('Fetching lighter.wasm...');
        const go = new Go();
        const result = await WebAssembly.instantiateStreaming(
            fetch('lighter.wasm'), 
            go.importObject
        );
        
        console.log('Running Go WASM instance...');
        go.run(result.instance);
        
        console.log('Waiting for LighterWASM to be ready...');
        // Wait for WASM to be ready
        await new Promise(resolve => {
            const checkReady = setInterval(() => {
                if (window.LighterWASM && window.LighterWASM.ready) {
                    clearInterval(checkReady);
                    console.log('LighterWASM is ready!');
                    resolve();
                }
            }, 100);
        });
        
        wasmReady = true;
        console.log('WASM loaded successfully!');
        console.log('Available functions:', Object.keys(window.LighterWASM));
        statusEl.className = 'status ready';
        statusEl.textContent = '✅ WASM Ready! You can place orders.';
        document.getElementById('orderForm').style.display = 'block';
        
    } catch (error) {
        statusEl.className = 'status error';
        statusEl.textContent = `❌ Failed to load WASM: ${error.message}`;
        throw error;
    }
}

async function placeOrder() {
    const resultsEl = document.getElementById('results');
    const placeBtn = document.getElementById('placeBtn');
    
    if (!wasmReady) {
        showError('WASM not ready yet. Please wait...');
        return;
    }
    
    try {
        placeBtn.disabled = true;
        resultsEl.innerHTML = '<div class="status loading"><span class="spinner"></span> Processing order...</div>';
        
        console.log('========================================');
        console.log('STARTING ORDER PLACEMENT');
        console.log('========================================');
        console.log('Config:', CONFIG);
        
        // Get form values
        const privateKey = document.getElementById('privateKey').value.trim();
        const btcAmount = parseFloat(document.getElementById('btcAmount').value);
        const leverage = parseInt(document.getElementById('leverage').value);
        
        console.log('Form inputs:');
        console.log('  BTC Amount:', btcAmount);
        console.log('  Leverage:', leverage);
        console.log('  Private key length:', privateKey.length);
        
        // Validate
        if (!privateKey) {
            throw new Error('Private key is required');
        }
        if (btcAmount < 0.0002) {
            throw new Error('Minimum BTC amount is 0.0002');
        }
        
        // Step 1: Fetch nonce
        console.log('Step 1: Fetching nonce...');
        resultsEl.innerHTML = '<div class="status loading"><span class="spinner"></span> Fetching nonce...</div>';
        const nonceUrl = `${CONFIG.baseUrl}/api/v1/nextNonce?account_index=${CONFIG.accountIndex}&api_key_index=${CONFIG.apiKeyIndex}`;
        console.log('  Nonce URL:', nonceUrl);
        
        const nonceResp = await fetch(nonceUrl);
        const nonceData = await nonceResp.json();
        console.log('  Nonce response:', nonceData);
        const nonce = nonceData.nonce;
        console.log('  Using nonce:', nonce);
        
        // Step 2: Get current BTC price
        console.log('Step 2: Fetching BTC price...');
        resultsEl.innerHTML = '<div class="status loading"><span class="spinner"></span> Fetching BTC price...</div>';
        const priceUrl = `${CONFIG.baseUrl}/api/v1/orderBookDetails?market_id=${CONFIG.marketId}`;
        console.log('  Price URL:', priceUrl);
        
        const priceResp = await fetch(priceUrl);
        const priceData = await priceResp.json();
        console.log('  Price response:', priceData);
        const currentPrice = parseFloat(priceData.order_book_details[0].last_trade_price);
        console.log('  Current BTC price:', currentPrice);
        
        // Calculate order params
        console.log('Step 3: Calculating order params...');
        const baseAmount = Math.floor(btcAmount * 100000); // 5 decimals precision
        const priceUnits = Math.floor(currentPrice * 10); // 1 decimal precision
        const notionalValue = btcAmount * currentPrice;
        const requiredMargin = notionalValue / leverage;
        
        console.log('  BTC amount:', btcAmount);
        console.log('  Base amount (contract units):', baseAmount);
        console.log('  Price:', currentPrice);
        console.log('  Price units (contract):', priceUnits);
        console.log('  Notional value:', notionalValue);
        console.log('  Required margin:', requiredMargin);
        
        // Show order summary
        showOrderSummary(btcAmount, currentPrice, notionalValue, leverage, requiredMargin);
        
        // Step 3: Sign order with WASM
        resultsEl.innerHTML += '<div class="status loading"><span class="spinner"></span> Signing order with WASM...</div>';
        
        const orderParams = {
            privateKey: privateKey,
            accountIndex: CONFIG.accountIndex,
            apiKeyIndex: CONFIG.apiKeyIndex,
            chainId: CONFIG.chainId,
            nonce: nonce,
            expiredAt: 0, // Will use default 10 min
            marketIndex: CONFIG.marketId,
            clientOrderIndex: Date.now(),
            baseAmount: baseAmount,
            price: priceUnits,
            isAsk: 0, // BUY (long)
            orderType: 0, // LIMIT
            timeInForce: 1, // GTT
            reduceOnly: 0,
            triggerPrice: 0,
            orderExpiry: Date.now() + (28 * 24 * 60 * 60 * 1000) // 28 days
        };
        
        console.log('Order params for WASM:', orderParams);
        
        const signedTxJSON = await window.LighterWASM.signCreateOrder(orderParams);
        console.log('Signed TX JSON from WASM:', signedTxJSON);
        
        const signedTx = JSON.parse(signedTxJSON);
        console.log('Parsed signed TX:', signedTx);
        
        // Step 4: Submit to Lighter
        console.log('Step 4: Submitting to Lighter API...');
        resultsEl.innerHTML += '<div class="status loading"><span class="spinner"></span> Submitting to Lighter...</div>';
        
        // API expects multipart/form-data, not JSON!
        const formData = new FormData();
        formData.append('tx_type', '14'); // CREATE_ORDER = 14
        formData.append('tx_info', signedTxJSON);
        
        console.log('  tx_type: 14 (CREATE_ORDER)');
        console.log('  tx_info (signed TX):', signedTxJSON);
        console.log('  Endpoint:', `${CONFIG.baseUrl}/api/v1/sendTx`);
        
        const submitResp = await fetch(`${CONFIG.baseUrl}/api/v1/sendTx`, {
            method: 'POST',
            body: formData
        });
        
        console.log('API Response status:', submitResp.status);
        console.log('API Response headers:', submitResp.headers);
        
        const submitData = await submitResp.json();
        console.log('API Response data:', submitData);
        
        if (submitData.code === 200 || submitResp.ok) {
            showSuccess(submitData, orderParams, currentPrice, btcAmount, leverage);
        } else {
            throw new Error(submitData.message || JSON.stringify(submitData));
        }
        
    } catch (error) {
        console.error('ERROR:', error);
        console.error('Error stack:', error.stack);
        showError(error.message);
    } finally {
        placeBtn.disabled = false;
    }
}

function showOrderSummary(btcAmount, price, notional, leverage, margin) {
    const summaryHTML = `
        <div class="order-summary">
            <h4>📊 Order Summary</h4>
            <div class="order-detail">
                <strong>BTC Amount:</strong>
                <span>${btcAmount} BTC</span>
            </div>
            <div class="order-detail">
                <strong>Entry Price:</strong>
                <span>$${price.toFixed(2)}</span>
            </div>
            <div class="order-detail">
                <strong>Notional Value:</strong>
                <span>$${notional.toFixed(2)}</span>
            </div>
            <div class="order-detail">
                <strong>Leverage:</strong>
                <span>${leverage}x</span>
            </div>
            <div class="order-detail">
                <strong>Required Margin:</strong>
                <span>$${margin.toFixed(2)}</span>
            </div>
        </div>
    `;
    
    document.getElementById('results').innerHTML = summaryHTML;
}

function showSuccess(response, params, price, amount, leverage) {
    const successHTML = `
        <div class="success">
            <h3>✅ Order Placed Successfully!</h3>
            <p><strong>Transaction Hash:</strong> ${response.tx_hash || response.data?.tx_hash || 'Pending'}</p>
            <p><strong>Order ID:</strong> ${params.clientOrderIndex}</p>
            <p><strong>Amount:</strong> ${amount} BTC</p>
            <p><strong>Price:</strong> $${price.toFixed(2)}</p>
            <p><strong>Leverage:</strong> ${leverage}x</p>
            <p><strong>Status:</strong> Order submitted to blockchain</p>
        </div>
        <div class="result">
            <h3>📋 Full Response:</h3>
            <pre>${JSON.stringify(response, null, 2)}</pre>
        </div>
    `;
    
    document.getElementById('results').innerHTML = successHTML;
}

function showError(message) {
    const errorHTML = `
        <div class="error-msg">
            <h3>❌ Error</h3>
            <p>${message}</p>
        </div>
    `;
    
    document.getElementById('results').innerHTML = errorHTML;
}

function clearResults() {
    document.getElementById('results').innerHTML = '';
}
