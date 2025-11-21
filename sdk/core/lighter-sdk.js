// Lighter SDK - Main Entry Point
import { LighterAPI } from './lighter-api.js';
import { LighterWS } from './lighter-ws.js';
import { 
    ENDPOINTS,
    TX_TYPES,
    ORDER_TYPES,
    TIME_IN_FORCE,
    MARGIN_MODES,
    MARGIN_DIRECTION,
    GROUPING_TYPES,
    CANCEL_ALL_TIF,
    ORDER_SIDES,
    MARKETS,
    DECIMALS,
    DEFAULTS,
    POOL_STATUS,
    ERRORS
} from './constants.js';

export class LighterSDK {
    constructor(config = {}) {
        // Get network endpoints
        const networkName = config.network || 'mainnet';
        const endpoints = ENDPOINTS[networkName];
        
        if (!endpoints) {
            throw new Error(`Unknown network: ${networkName}`);
        }

        // Store config
        this.config = {
            privateKey: config.privateKey,
            accountIndex: config.accountIndex,
            apiKeyIndex: config.apiKeyIndex !== undefined ? config.apiKeyIndex : 0,
            network: networkName,
            autoFetchNonce: config.autoFetchNonce !== false
        };

        this.chainId = endpoints.chainId;
        this.apiUrl = endpoints.http;
        this.wsUrl = endpoints.ws;

        // Initialize components
        this.api = new LighterAPI(this.apiUrl);
        this.ws = null;
        this.wasmReady = false;
        this.currentNonce = null;

        // Expose helpers
        this.constants = { TX_TYPES, ORDER_TYPES, TIME_IN_FORCE, MARGIN_MODES, MARGIN_DIRECTION, GROUPING_TYPES, CANCEL_ALL_TIF, ORDER_SIDES, MARKETS, DECIMALS, DEFAULTS, POOL_STATUS };
    }

    // === INITIALIZATION ===

    async init() {
        console.log('[SDK] Initializing...');
        
        // Check if WASM is already loaded
        if (window.LighterWASM && window.LighterWASM.ready) {
            this.wasmReady = true;
            console.log('[SDK] WASM already loaded');
            return;
        }

        throw new Error('WASM not loaded. Load lighter.wasm and wasm_exec.js first.');
    }

    _ensureWASM() {
        if (!this.wasmReady && (!window.LighterWASM || !window.LighterWASM.ready)) {
            throw new Error(ERRORS.WASM_NOT_LOADED);
        }
    }

    async _getNonce() {
        if (!this.config.autoFetchNonce) {
            throw new Error('Auto nonce fetch disabled. Provide nonce manually.');
        }

        const data = await this.api.getNextNonce(this.config.accountIndex, this.config.apiKeyIndex);
        this.currentNonce = data.nonce;
        return this.currentNonce;
    }

    _getBaseParams(overrides = {}) {
        return {
            privateKey: this.config.privateKey,
            accountIndex: this.config.accountIndex,
            apiKeyIndex: this.config.apiKeyIndex,
            chainId: this.chainId,
            ...overrides
        };
    }

    // === TRADING OPERATIONS ===

    async placeOrder(params) {
        this._ensureWASM();

        const nonce = params.nonce !== undefined ? params.nonce : await this._getNonce();
        
        // Convert market symbol to ID
        const marketIndex = typeof params.market === 'string' ? MARKETS[params.market] : params.market;
        if (marketIndex === undefined) {
            throw new Error(ERRORS.INVALID_MARKET);
        }

        // Calculate amounts
        const baseAmount = Math.floor(params.amount * Math.pow(10, DECIMALS.BASE_AMOUNT));
        const priceUnits = params.price ? Math.floor(params.price * Math.pow(10, DECIMALS.PRICE)) : 0;
        
        // Market orders require orderExpiry = 0 and timeInForce = IOC
        const isMarketOrder = (params.orderType || ORDER_TYPES.LIMIT) === ORDER_TYPES.MARKET;
        
        const orderParams = this._getBaseParams({
            nonce: nonce,
            expiredAt: 0,
            marketIndex: marketIndex,
            clientOrderIndex: params.clientOrderIndex || Date.now(),
            baseAmount: baseAmount,
            price: priceUnits,
            isAsk: params.side === 'sell' ? ORDER_SIDES.SELL : ORDER_SIDES.BUY,
            orderType: params.orderType || ORDER_TYPES.LIMIT,
            timeInForce: isMarketOrder ? TIME_IN_FORCE.IMMEDIATE_OR_CANCEL : (params.timeInForce || TIME_IN_FORCE.GOOD_TILL_TIME),
            reduceOnly: params.reduceOnly ? 1 : 0,
            triggerPrice: params.triggerPrice ? Math.floor(params.triggerPrice * Math.pow(10, DECIMALS.PRICE)) : 0,
            orderExpiry: isMarketOrder ? 0 : (params.orderExpiry || (Date.now() + DEFAULTS.ORDER_EXPIRY_28_DAYS))
        });

        console.log('[SDK] Signing order:', orderParams);
        console.log('[SDK] Order params detailed:', {
            ...orderParams,
            orderType: orderParams.orderType,
            timeInForce: orderParams.timeInForce,
            orderExpiry: orderParams.orderExpiry,
            price: orderParams.price
        });
        const signedTx = await window.LighterWASM.signCreateOrder(orderParams);
        
        console.log('[SDK] Submitting order to API');
        const result = await this.api.sendTx(TX_TYPES.CREATE_ORDER, signedTx);
        
        return result;
    }

    async cancelOrder(params) {
        this._ensureWASM();

        const nonce = params.nonce !== undefined ? params.nonce : await this._getNonce();
        
        const marketIndex = typeof params.market === 'string' ? MARKETS[params.market] : params.market;

        const cancelParams = this._getBaseParams({
            nonce: nonce,
            marketIndex: marketIndex,
            orderIndex: params.orderIndex
        });

        console.log('[SDK] Signing cancel:', cancelParams);
        const signedTx = await window.LighterWASM.signCancelOrder(cancelParams);
        
        console.log('[SDK] Submitting cancel to API');
        const result = await this.api.sendTx(TX_TYPES.CANCEL_ORDER, signedTx);
        
        return result;
    }

    async modifyOrder(params) {
        this._ensureWASM();

        const nonce = params.nonce !== undefined ? params.nonce : await this._getNonce();
        
        const marketIndex = typeof params.market === 'string' ? MARKETS[params.market] : params.market;

        const modifyParams = this._getBaseParams({
            nonce: nonce,
            marketIndex: marketIndex,
            orderIndex: params.orderIndex,
            baseAmount: Math.floor(params.amount * Math.pow(10, DECIMALS.BASE_AMOUNT)),
            price: Math.floor(params.price * Math.pow(10, DECIMALS.PRICE)),
            triggerPrice: params.triggerPrice ? Math.floor(params.triggerPrice * Math.pow(10, DECIMALS.PRICE)) : 0
        });

        console.log('[SDK] Signing modify:', modifyParams);
        const signedTx = await window.LighterWASM.signModifyOrder(modifyParams);
        
        const result = await this.api.sendTx(TX_TYPES.MODIFY_ORDER, signedTx);
        
        return result;
    }

    async cancelAllOrders(params = {}) {
        this._ensureWASM();

        const nonce = params.nonce !== undefined ? params.nonce : await this._getNonce();

        const cancelAllParams = this._getBaseParams({
            nonce: nonce,
            timeInForce: params.timeInForce || TIME_IN_FORCE.GOOD_TILL_TIME,
            time: params.time || Date.now()
        });

        console.log('[SDK] Signing cancel all');
        const signedTx = await window.LighterWASM.signCancelAllOrders(cancelAllParams);
        
        const result = await this.api.sendTx(TX_TYPES.CANCEL_ALL_ORDERS, signedTx);
        
        return result;
    }

    async placeBatchOrders(orders, params = {}) {
        this._ensureWASM();

        const nonce = params.nonce !== undefined ? params.nonce : await this._getNonce();

        // Convert orders
        const convertedOrders = orders.map(order => ({
            marketIndex: typeof order.market === 'string' ? MARKETS[order.market] : order.market,
            clientOrderIndex: order.clientOrderIndex || Date.now() + Math.random(),
            baseAmount: Math.floor(order.amount * Math.pow(10, DECIMALS.BASE_AMOUNT)),
            price: order.price ? Math.floor(order.price * Math.pow(10, DECIMALS.PRICE)) : 0,
            isAsk: order.side === 'sell' ? ORDER_SIDES.SELL : ORDER_SIDES.BUY,
            orderType: order.orderType || ORDER_TYPES.LIMIT,
            timeInForce: order.timeInForce || TIME_IN_FORCE.GOOD_TILL_TIME,
            reduceOnly: order.reduceOnly ? 1 : 0,
            triggerPrice: order.triggerPrice ? Math.floor(order.triggerPrice * Math.pow(10, DECIMALS.PRICE)) : 0,
            orderExpiry: order.orderExpiry || (Date.now() + DEFAULTS.ORDER_EXPIRY_28_DAYS)
        }));

        const batchParams = this._getBaseParams({
            nonce: nonce,
            groupingType: params.groupingType || 0,
            orders: convertedOrders
        });

        console.log('[SDK] Signing batch orders');
        const signedTx = await window.LighterWASM.signCreateGroupedOrders(batchParams);
        
        const result = await this.api.sendTx(TX_TYPES.CREATE_GROUPED_ORDERS, signedTx);
        
        return result;
    }

    // === ACCOUNT MANAGEMENT ===

    async setLeverage(market, leverage, marginMode = MARGIN_MODES.CROSS) {
        this._ensureWASM();

        const nonce = await this._getNonce();
        const marketIndex = typeof market === 'string' ? MARKETS[market] : market;
        
        // Calculate initial margin fraction from leverage
        const imf = Math.floor(10000 / leverage);

        const leverageParams = this._getBaseParams({
            nonce: nonce,
            marketIndex: marketIndex,
            initialMarginFraction: imf,
            marginMode: marginMode
        });

        console.log('[SDK] Signing leverage update:', leverageParams);
        const signedTx = await window.LighterWASM.signUpdateLeverage(leverageParams);
        
        const result = await this.api.sendTx(TX_TYPES.UPDATE_LEVERAGE, signedTx);
        
        return result;
    }

    async updateMargin(market, amount, direction) {
        this._ensureWASM();

        const nonce = await this._getNonce();
        const marketIndex = typeof market === 'string' ? MARKETS[market] : market;
        const usdcAmount = Math.floor(amount * Math.pow(10, DECIMALS.USDC));

        const marginParams = this._getBaseParams({
            nonce: nonce,
            marketIndex: marketIndex,
            usdcAmount: usdcAmount,
            direction: direction // 0 = add, 1 = remove
        });

        console.log('[SDK] Signing margin update');
        const signedTx = await window.LighterWASM.signUpdateMargin(marginParams);
        
        const result = await this.api.sendTx(TX_TYPES.UPDATE_MARGIN, signedTx);
        
        return result;
    }

    async withdraw(amount) {
        this._ensureWASM();

        const nonce = await this._getNonce();
        const usdcAmount = Math.floor(amount * Math.pow(10, DECIMALS.USDC));

        const withdrawParams = this._getBaseParams({
            nonce: nonce,
            usdcAmount: usdcAmount
        });

        console.log('[SDK] Signing withdrawal');
        const signedTx = await window.LighterWASM.signWithdraw(withdrawParams);
        
        const result = await this.api.sendTx(TX_TYPES.WITHDRAW, signedTx);
        
        return result;
    }

    async transfer(toAccountIndex, amount, fee = 0, memo = '') {
        this._ensureWASM();

        const nonce = await this._getNonce();
        const usdcAmount = Math.floor(amount * Math.pow(10, DECIMALS.USDC));
        const feeAmount = Math.floor(fee * Math.pow(10, DECIMALS.USDC));

        const transferParams = this._getBaseParams({
            nonce: nonce,
            toAccountIndex: toAccountIndex,
            usdcAmount: usdcAmount,
            fee: feeAmount,
            memo: memo
        });

        console.log('[SDK] Signing transfer');
        const signedTx = await window.LighterWASM.signTransfer(transferParams);
        
        const result = await this.api.sendTx(TX_TYPES.TRANSFER, signedTx);
        
        return result;
    }

    async createSubAccount() {
        this._ensureWASM();

        const nonce = await this._getNonce();

        const subAccountParams = this._getBaseParams({
            nonce: nonce
        });

        console.log('[SDK] Signing sub-account creation');
        const signedTx = await window.LighterWASM.signCreateSubAccount(subAccountParams);
        
        const result = await this.api.sendTx(TX_TYPES.CREATE_SUB_ACCOUNT, signedTx);
        
        return result;
    }

    // === POOL OPERATIONS ===

    async createPublicPool(operatorFee, initialTotalShares, minOperatorShareRate) {
        this._ensureWASM();

        const nonce = await this._getNonce();

        const poolParams = this._getBaseParams({
            nonce: nonce,
            operatorFee: operatorFee,
            initialTotalShares: initialTotalShares,
            minOperatorShareRate: minOperatorShareRate
        });

        console.log('[SDK] Signing public pool creation');
        const signedTx = await window.LighterWASM.signCreatePublicPool(poolParams);
        
        const result = await this.api.sendTx(TX_TYPES.CREATE_PUBLIC_POOL, signedTx);
        
        return result;
    }

    async updatePublicPool(publicPoolIndex, status, operatorFee, minOperatorShareRate) {
        this._ensureWASM();

        const nonce = await this._getNonce();

        const updatePoolParams = this._getBaseParams({
            nonce: nonce,
            publicPoolIndex: publicPoolIndex,
            status: status,
            operatorFee: operatorFee,
            minOperatorShareRate: minOperatorShareRate
        });

        console.log('[SDK] Signing public pool update');
        const signedTx = await window.LighterWASM.signUpdatePublicPool(updatePoolParams);
        
        const result = await this.api.sendTx(TX_TYPES.UPDATE_PUBLIC_POOL, signedTx);
        
        return result;
    }

    async mintShares(publicPoolIndex, shareAmount) {
        this._ensureWASM();

        const nonce = await this._getNonce();

        const mintParams = this._getBaseParams({
            nonce: nonce,
            publicPoolIndex: publicPoolIndex,
            shareAmount: shareAmount
        });

        console.log('[SDK] Signing mint shares');
        const signedTx = await window.LighterWASM.signMintShares(mintParams);
        
        const result = await this.api.sendTx(TX_TYPES.MINT_SHARES, signedTx);
        
        return result;
    }

    async burnShares(publicPoolIndex, shareAmount) {
        this._ensureWASM();

        const nonce = await this._getNonce();

        const burnParams = this._getBaseParams({
            nonce: nonce,
            publicPoolIndex: publicPoolIndex,
            shareAmount: shareAmount
        });

        console.log('[SDK] Signing burn shares');
        const signedTx = await window.LighterWASM.signBurnShares(burnParams);
        
        const result = await this.api.sendTx(TX_TYPES.BURN_SHARES, signedTx);
        
        return result;
    }

    // === READ-ONLY API METHODS ===
    
    async getAccountIndexFromAddress(l1Address) {
        // Get account index from L1 Ethereum address
        // Returns the main account index (first sub_account)
        const response = await this.api.getAccountsByL1Address(l1Address);
        
        if (!response.sub_accounts || response.sub_accounts.length === 0) {
            throw new Error(`No account found for address: ${l1Address}`);
        }
        
        // First sub_account is the main account
        const mainAccount = response.sub_accounts[0];
        console.log(`[SDK] Found account index ${mainAccount.index} for address ${l1Address}`);
        console.log(`[SDK] Total sub-accounts: ${response.sub_accounts.length}`);
        
        return {
            accountIndex: mainAccount.index,
            mainAccount: mainAccount,
            subAccounts: response.sub_accounts,
            l1Address: response.l1_address
        };
    }
    
    async getAccount() {
        return await this.api.getAccount(this.config.accountIndex);
    }

    async getPositions() {
        return await this.api.getAccountPositions(this.config.accountIndex);
    }

    async getBalance() {
        return await this.api.getAccountBalance(this.config.accountIndex);
    }

    async getOrders(market = null, status = 'active') {
        const marketId = market ? (typeof market === 'string' ? MARKETS[market] : market) : null;
        return await this.api.getOrders(this.config.accountIndex, marketId, status);
    }

    async getOrderHistory(limit = 100, offset = 0) {
        return await this.api.getOrderHistory(this.config.accountIndex, limit, offset);
    }

    async getMarkets() {
        return await this.api.getMarkets();
    }

    async getOrderBook(market) {
        const marketId = typeof market === 'string' ? MARKETS[market] : market;
        return await this.api.getOrderBook(marketId);
    }

    async getMarketDetails(market) {
        const marketId = typeof market === 'string' ? MARKETS[market] : market;
        return await this.api.getOrderBookDetails(marketId);
    }

    async getTrades(market, limit = 100) {
        const marketId = typeof market === 'string' ? MARKETS[market] : market;
        return await this.api.getTrades(marketId, limit);
    }

    async getCandlesticks(market, interval = '1h', limit = 100) {
        const marketId = typeof market === 'string' ? MARKETS[market] : market;
        return await this.api.getCandlesticks(marketId, interval, limit);
    }

    async getExchangeStats() {
        return await this.api.getExchangeStats();
    }

    async getRecentTrades(market, limit = 100) {
        const marketId = typeof market === 'string' ? MARKETS[market] : market;
        return await this.api.getRecentTrades(marketId, limit);
    }

    async getFundingRates() {
        return await this.api.getFundingRates();
    }

    async getFundingHistory(market, limit = 100) {
        const marketId = typeof market === 'string' ? MARKETS[market] : market;
        return await this.api.getFundingHistory(marketId, limit);
    }

    async getPositionFunding(limit = 100) {
        return await this.api.getPositionFunding(this.config.accountIndex, limit);
    }

    async getPnL() {
        return await this.api.getAccountPnL(this.config.accountIndex);
    }
    
    // === REFERRAL ===
    
    async getReferralPoints(withAuth = false) {
        let auth = null;
        if (withAuth) {
            this._ensureWASM();
            const authParams = this._getBaseParams({
                expiryHours: 1
            });
            auth = await window.LighterWASM.createAuthToken(authParams);
        }
        
        const result = await this.api.getReferralPoints(this.config.accountIndex, auth);
        
        // Normalize response
        return {
            referrals: result.referrals || [],
            userTotalPoints: parseFloat(result.user_total_points || 0),
            userLastWeekPoints: parseFloat(result.user_last_week_points || 0),
            userTotalReferralRewardPoints: parseFloat(result.user_total_referral_reward_points || 0),
            userLastWeekReferralRewardPoints: parseFloat(result.user_last_week_referral_reward_points || 0),
            rewardPointMultiplier: parseFloat(result.reward_point_multiplier || 0),
            _raw: result
        };
    }

    // === WEBSOCKET ===

    async connectWebSocket(useAuth = false) {
        if (this.ws && this.ws.isConnected) {
            console.log('[SDK] WebSocket already connected');
            return this.ws;
        }

        console.log('[SDK] Connecting WebSocket...');
        
        let authToken = null;
        let authRefreshCallback = null;
        
        // If auth is needed for private channels (account updates)
        if (useAuth) {
            this._ensureWASM();
            const authParams = this._getBaseParams({
                expiryHours: 8
            });
            console.log('[SDK] Creating auth token for private channels');
            authToken = await window.LighterWASM.createAuthToken(authParams);
            
            // Create callback to refresh auth token on reconnect
            authRefreshCallback = async () => {
                this._ensureWASM();
                const params = this._getBaseParams({
                    expiryHours: 8
                });
                console.log('[SDK] Generating fresh auth token for reconnect');
                return await window.LighterWASM.createAuthToken(params);
            };
        }

        // Create WebSocket connection with auth refresh callback
        this.ws = new LighterWS(this.wsUrl, authToken, authRefreshCallback);
        await this.ws.connect();

        console.log('[SDK] WebSocket connected');
        return this.ws;
    }

    disconnectWebSocket() {
        if (this.ws) {
            this.ws.disconnect();
            this.ws = null;
        }
    }
    
    // === WEBSOCKET ORDER SUBSCRIPTIONS ===
    
    async subscribeToAllOrders(callback) {
        // Subscribe to account_all_orders channel to get ALL orders across ALL markets
        if (!this.ws) {
            throw new Error('WebSocket not connected. Call connectWebSocket() first.');
        }
        
        if (!this.config.accountIndex) {
            throw new Error('Account index required for order subscriptions');
        }
        
        // Create auth token for private channel
        this._ensureWASM();
        const authParams = this._getBaseParams({
            expiryHours: 8
        });
        console.log('[SDK] Creating auth token for account_all_orders subscription');
        const authToken = await window.LighterWASM.createAuthToken(authParams);
        
        // Wrap callback to normalize order data before passing to user
        const normalizedCallback = async (message) => {
            const normalized = await this._normalizeOrdersMessage(message);
            callback(normalized);
        };
        
        // Subscribe to account_all_orders channel
        this.ws.subscribeAccountAllOrders(this.config.accountIndex, authToken, normalizedCallback);
        
        console.log(`[SDK] Subscribed to all orders for account ${this.config.accountIndex}`);
    }
    
    async subscribeToAccountData(callbacks = {}) {
        // Subscribe to account_all channel - Gets EVERYTHING:
        // - orders (all markets)
        // - positions (all markets)
        // - trades (all markets)
        // - funding histories
        // - pool shares
        // - volume stats (daily/weekly/monthly/total)
        if (!this.ws) {
            throw new Error('WebSocket not connected. Call connectWebSocket() first.');
        }
        
        if (!this.config.accountIndex) {
            throw new Error('Account index required');
        }
        
        const normalizedCallback = async (message) => {
            const normalized = await this._normalizeAccountDataMessage(message);
            
            // Call individual callbacks if provided
            if (callbacks.onOrders && normalized.orders) {
                callbacks.onOrders(normalized.orders);
            }
            if (callbacks.onPositions && normalized.positions) {
                callbacks.onPositions(normalized.positions);
            }
            if (callbacks.onTrades && normalized.trades) {
                callbacks.onTrades(normalized.trades);
            }
            if (callbacks.onAll) {
                callbacks.onAll(normalized);
            }
        };
        
        // Subscribe to account_all channel (no auth required for this one)
        this.ws.subscribeAccountAll(this.config.accountIndex, normalizedCallback);
        
        console.log(`[SDK] Subscribed to account_all (orders + positions + trades) for account ${this.config.accountIndex}`);
    }
    
    async _normalizeOrdersMessage(message) {
        // Get market lookup cache
        const marketLookup = await this.api._getMarketLookup();
        
        // Message format: { "orders": { "market_id": [Order] }, "type": "subscribed/account_all_orders" }
        const ordersData = message.orders || {};
        const normalizedOrders = [];
        
        for (const marketId in ordersData) {
            const marketOrders = ordersData[marketId] || [];
            
            for (const order of marketOrders) {
                normalizedOrders.push(this._normalizeOrder(order, marketLookup));
            }
        }
        
        return {
            type: message.type,
            channel: message.channel,
            orders: normalizedOrders,
            orderCount: normalizedOrders.length
        };
    }
    
    async _normalizeAccountDataMessage(message) {
        // account_all channel returns: orders, positions, trades, funding_histories, shares, volume stats
        const marketLookup = await this.api._getMarketLookup();
        
        // Normalize orders (if present - but account_all doesn't include orders!)
        const normalizedOrders = [];
        const ordersData = message.orders || {};
        for (const marketId in ordersData) {
            const marketOrders = ordersData[marketId] || [];
            for (const order of marketOrders) {
                normalizedOrders.push(this._normalizeOrder(order, marketLookup));
            }
        }
        
        // Normalize positions
        const normalizedPositions = [];
        const positionsData = message.positions || {};
        for (const marketId in positionsData) {
            const position = positionsData[marketId];
            if (position) {
                normalizedPositions.push(this._normalizePosition(position, marketLookup));
            }
        }
        
        // Normalize trades
        const normalizedTrades = [];
        const tradesData = message.trades || {};
        for (const marketId in tradesData) {
            const marketTrades = tradesData[marketId] || [];
            for (const trade of marketTrades) {
                normalizedTrades.push(this._normalizeTrade(trade, marketLookup));
            }
        }
        
        return {
            type: message.type,
            channel: message.channel,
            account: message.account,
            
            // Normalized data
            orders: normalizedOrders,
            positions: normalizedPositions,
            trades: normalizedTrades,
            
            // Stats
            volumeStats: {
                daily: message.daily_volume || 0,
                weekly: message.weekly_volume || 0,
                monthly: message.monthly_volume || 0,
                total: message.total_volume || 0,
                dailyTradesCount: message.daily_trades_count || 0,
                weeklyTradesCount: message.weekly_trades_count || 0,
                monthlyTradesCount: message.monthly_trades_count || 0,
                totalTradesCount: message.total_trades_count || 0
            },
            
            // Raw data for advanced users
            fundingHistories: message.funding_histories || {},
            shares: message.shares || [],
            
            // Counts
            orderCount: normalizedOrders.length,
            positionCount: normalizedPositions.length,
            tradeCount: normalizedTrades.length
        };
    }
    
    _normalizePosition(rawPosition, marketLookup) {
        const marketId = rawPosition.market_id;
        const symbol = marketLookup.get(marketId) || rawPosition.symbol || `Market ${marketId}`;
        const positionSize = parseFloat(rawPosition.position || 0);
        const side = rawPosition.sign === 1 || positionSize > 0 ? 'LONG' : positionSize < 0 ? 'SHORT' : 'NONE';
        
        return {
            marketId: marketId,
            symbol: symbol,
            side: side,
            size: Math.abs(positionSize),
            sizeRaw: positionSize,
            sign: rawPosition.sign,
            
            // Prices & PnL
            avgEntryPrice: parseFloat(rawPosition.avg_entry_price || 0),
            positionValue: parseFloat(rawPosition.position_value || 0),
            unrealizedPnl: parseFloat(rawPosition.unrealized_pnl || 0),
            realizedPnl: parseFloat(rawPosition.realized_pnl || 0),
            liquidationPrice: parseFloat(rawPosition.liquidation_price || 0),
            
            // Margin
            marginMode: rawPosition.margin_mode === 0 ? 'CROSS' : rawPosition.margin_mode === 1 ? 'ISOLATED' : 'UNKNOWN',
            marginModeRaw: rawPosition.margin_mode,
            initialMarginFraction: parseFloat(rawPosition.initial_margin_fraction || 0),
            allocatedMargin: parseFloat(rawPosition.allocated_margin || 0),
            
            // Orders
            openOrderCount: rawPosition.open_order_count || 0,
            pendingOrderCount: rawPosition.pending_order_count || 0,
            positionTiedOrderCount: rawPosition.position_tied_order_count || 0,
            
            // Funding
            totalFundingPaidOut: parseFloat(rawPosition.total_funding_paid_out || 0),
            
            // Raw data
            _raw: rawPosition
        };
    }
    
    _normalizeTrade(rawTrade, marketLookup) {
        const marketId = rawTrade.market_id;
        const symbol = marketLookup.get(marketId) || `Market ${marketId}`;
        
        return {
            tradeId: rawTrade.trade_id,
            txHash: rawTrade.tx_hash,
            marketId: marketId,
            symbol: symbol,
            
            type: rawTrade.type,
            side: rawTrade.is_maker_ask ? 'SELL' : 'BUY',
            
            size: parseFloat(rawTrade.size || 0),
            price: parseFloat(rawTrade.price || 0),
            usdAmount: parseFloat(rawTrade.usd_amount || 0),
            
            askId: rawTrade.ask_id,
            bidId: rawTrade.bid_id,
            askAccountId: rawTrade.ask_account_id,
            bidAccountId: rawTrade.bid_account_id,
            isMakerAsk: rawTrade.is_maker_ask,
            
            blockHeight: rawTrade.block_height,
            timestamp: rawTrade.timestamp,
            
            // Fees & position data
            takerFee: rawTrade.taker_fee || 0,
            makerFee: rawTrade.maker_fee || 0,
            takerPositionSizeBefore: rawTrade.taker_position_size_before || null,
            makerPositionSizeBefore: rawTrade.maker_position_size_before || null,
            
            _raw: rawTrade
        };
    }
    
    _normalizeOrder(rawOrder, marketLookup) {
        // Parse order type
        const orderType = rawOrder.type || 'limit';
        const isConditional = ['stop-loss', 'stop-loss-limit', 'take-profit', 'take-profit-limit'].includes(orderType);
        
        // Parse amounts - WebSocket returns as strings
        const remainingSize = parseFloat(rawOrder.remaining_base_amount || 0);
        const filledSize = parseFloat(rawOrder.filled_base_amount || 0);
        const totalSize = parseFloat(rawOrder.initial_base_amount || 0);
        
        // Parse prices - WebSocket returns as strings
        const limitPrice = parseFloat(rawOrder.price || 0);
        const triggerPrice = parseFloat(rawOrder.trigger_price || 0);
        
        // Parse side - WebSocket uses is_ask boolean/int
        const side = (rawOrder.is_ask === true || rawOrder.is_ask === 1 || rawOrder.is_ask === '1') ? 'SELL' : 'BUY';
        
        // Get symbol from market lookup
        const marketId = rawOrder.market_index;
        const symbol = marketLookup.get(marketId) || `Market ${marketId}`;
        
        // Calculate fill percentage
        const fillPercentage = totalSize > 0 ? (filledSize / totalSize) * 100 : 0;
        
        // Parse time in force
        const tifMap = { 0: 'IOC', 1: 'GTC', 2: 'POST_ONLY' };
        const timeInForce = tifMap[rawOrder.time_in_force] || rawOrder.time_in_force || 'GTC';
        
        // Parse execution type for conditional orders
        let executionType = 'limit';
        if (orderType === 'stop-loss' || orderType === 'take-profit') {
            executionType = 'market'; // No limit price, executes at market
        } else if (orderType === 'stop-loss-limit' || orderType === 'take-profit-limit') {
            executionType = 'limit'; // Has limit price
        }
        
        // Parse trigger status for conditional orders
        const triggerStatusMap = {
            'na': 'Not Applicable',
            'ready': 'Ready to Trigger',
            'triggered': 'Triggered',
            'cancelled': 'Cancelled'
        };
        const triggerStatus = triggerStatusMap[rawOrder.trigger_status] || rawOrder.trigger_status || 'N/A';
        
        return {
            // IDs
            orderIndex: rawOrder.order_index,
            clientOrderIndex: rawOrder.client_order_index,
            orderId: rawOrder.order_id,
            clientOrderId: rawOrder.client_order_id,
            
            // Market info
            marketId: marketId,
            marketIndex: marketId,
            symbol: symbol,
            
            // Order details
            side: side,
            type: orderType,
            status: rawOrder.status,
            timeInForce: timeInForce,
            timeInForceRaw: rawOrder.time_in_force,
            
            // Sizes
            size: remainingSize,
            remainingSize: remainingSize,
            filledSize: filledSize,
            totalSize: totalSize,
            fillPercentage: fillPercentage,
            
            // Prices
            price: limitPrice,
            limitPrice: limitPrice,
            triggerPrice: triggerPrice > 0 ? triggerPrice : null,
            
            // Conditional order details
            executionType: executionType, // 'market' or 'limit'
            triggerStatus: triggerStatus,
            triggerStatusRaw: rawOrder.trigger_status,
            
            // Flags
            isAsk: rawOrder.is_ask,
            reduceOnly: rawOrder.reduce_only || false,
            postOnly: rawOrder.post_only || false,
            ioc: timeInForce === 'IOC',
            gtc: timeInForce === 'GTC',
            
            // Classification
            isConditional: isConditional,
            isStopLoss: orderType.includes('stop-loss'),
            isTakeProfit: orderType.includes('take-profit'),
            isLimit: orderType.includes('limit') || executionType === 'limit',
            isMarket: executionType === 'market',
            
            // Grouping (OCO, OTO, etc)
            parentOrderIndex: rawOrder.parent_order_index || null,
            hasParent: (rawOrder.parent_order_index || 0) > 0,
            childTpId: rawOrder.to_trigger_order_id_0 || null,
            childSlId: rawOrder.to_trigger_order_id_1 || null,
            cancelOrderId: rawOrder.to_cancel_order_id_0 || null,
            hasChildren: !!(rawOrder.to_trigger_order_id_0 || rawOrder.to_trigger_order_id_1),
            isOco: !!(rawOrder.to_cancel_order_id_0),
            
            // Timestamps
            createdAt: rawOrder.created_at,
            updatedAt: rawOrder.updated_at,
            expiresAt: rawOrder.expires_at || rawOrder.order_expiry || null,
            timestamp: rawOrder.timestamp,
            triggerTime: rawOrder.trigger_time || null,
            
            // Margin mode
            marginMode: rawOrder.margin_mode === 0 ? 'CROSS' : rawOrder.margin_mode === 1 ? 'ISOLATED' : 'UNKNOWN',
            marginModeRaw: rawOrder.margin_mode,
            
            // Account info
            ownerAccountIndex: rawOrder.owner_account_index,
            
            // Blockchain info
            blockHeight: rawOrder.block_height || null,
            nonce: rawOrder.nonce || null,
            
            // Raw sizes (before decimal conversion)
            baseSize: rawOrder.base_size || null,
            basePrice: rawOrder.base_price || null,
            
            // Filled amounts
            filledQuoteAmount: parseFloat(rawOrder.filled_quote_amount || 0),
            
            // Parent order ID (string version)
            parentOrderId: rawOrder.parent_order_id || null,
            
            // Raw data for advanced use
            _raw: rawOrder
        }
    }

    // === UTILITIES ===

    async generateApiKey() {
        this._ensureWASM();
        return await window.LighterWASM.generateKey();
    }

    // Helper to format amounts
    formatAmount(amount, decimals = DECIMALS.BASE_AMOUNT) {
        return amount / Math.pow(10, decimals);
    }

    // Helper to format prices
    formatPrice(price, decimals = DECIMALS.PRICE) {
        return price / Math.pow(10, decimals);
    }

    // === CONVENIENCE HELPERS ===

    async placeMarketOrder(market, side, amount, worstPrice = null) {
        return await this.placeOrder({
            market: market,
            side: side,
            amount: amount,
            price: worstPrice || 0,
            orderType: ORDER_TYPES.MARKET,
            timeInForce: TIME_IN_FORCE.IMMEDIATE_OR_CANCEL
        });
    }

    async placeLimitOrder(market, side, amount, price, postOnly = false) {
        return await this.placeOrder({
            market: market,
            side: side,
            amount: amount,
            price: price,
            orderType: ORDER_TYPES.LIMIT,
            timeInForce: postOnly ? TIME_IN_FORCE.POST_ONLY : TIME_IN_FORCE.GOOD_TILL_TIME
        });
    }

    async placeStopLoss(market, side, amount, triggerPrice, limitPrice = null) {
        return await this.placeOrder({
            market: market,
            side: side,
            amount: amount,
            price: limitPrice || triggerPrice,
            triggerPrice: triggerPrice,
            orderType: limitPrice ? ORDER_TYPES.STOP_LOSS_LIMIT : ORDER_TYPES.STOP_LOSS,
            timeInForce: limitPrice ? TIME_IN_FORCE.GOOD_TILL_TIME : TIME_IN_FORCE.IMMEDIATE_OR_CANCEL
        });
    }

    async placeTakeProfit(market, side, amount, triggerPrice, limitPrice = null) {
        return await this.placeOrder({
            market: market,
            side: side,
            amount: amount,
            price: limitPrice || triggerPrice,
            triggerPrice: triggerPrice,
            orderType: limitPrice ? ORDER_TYPES.TAKE_PROFIT_LIMIT : ORDER_TYPES.TAKE_PROFIT,
            timeInForce: limitPrice ? TIME_IN_FORCE.GOOD_TILL_TIME : TIME_IN_FORCE.IMMEDIATE_OR_CANCEL
        });
    }

    async placeOCOOrders(market, side, amount, takeProfitPrice, stopLossPrice) {
        const orders = [
            {
                market: market,
                side: side,
                amount: amount,
                price: takeProfitPrice,
                triggerPrice: takeProfitPrice,
                orderType: ORDER_TYPES.TAKE_PROFIT_LIMIT,
                clientOrderIndex: Date.now(),
                timeInForce: TIME_IN_FORCE.GOOD_TILL_TIME,
                reduceOnly: true
            },
            {
                market: market,
                side: side,
                amount: amount,
                price: stopLossPrice,
                triggerPrice: stopLossPrice,
                orderType: ORDER_TYPES.STOP_LOSS_LIMIT,
                clientOrderIndex: Date.now() + 1,
                timeInForce: TIME_IN_FORCE.GOOD_TILL_TIME,
                reduceOnly: true
            }
        ];

        return await this.placeBatchOrders(orders, { groupingType: GROUPING_TYPES.ONE_CANCELS_OTHER });
    }
}

// Export all constants for convenience
export {
    TX_TYPES,
    ORDER_TYPES,
    TIME_IN_FORCE,
    MARGIN_MODES,
    MARGIN_DIRECTION,
    GROUPING_TYPES,
    CANCEL_ALL_TIF,
    ORDER_SIDES,
    MARKETS,
    DECIMALS,
    DEFAULTS,
    POOL_STATUS
};
