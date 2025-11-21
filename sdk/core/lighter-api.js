// Lighter REST API Client
import { TX_TYPES, ERRORS } from './constants.js';

// Custom API Error class with full context
export class LighterAPIError extends Error {
    constructor(message, endpoint, status, responseData) {
        super(message);
        this.name = 'LighterAPIError';
        this.endpoint = endpoint;
        this.status = status;
        this.responseData = responseData;
        this.timestamp = new Date().toISOString();
    }
}

export class LighterAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.marketCache = null; // Cache market data for symbol lookup
    }

    async _fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        console.log('[API] Request:', url);
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Accept': 'application/json',
                    ...options.headers
                }
            });

            const data = await response.json();
            console.log('[API] Response:', url, data);
            
            if (!response.ok || (data.code && data.code !== 200)) {
                console.error('[API] Error:', data);
                throw new LighterAPIError(
                    data.message || `API Error: ${response.status}`,
                    endpoint,
                    response.status,
                    data
                );
            }
            
            return data;
        } catch (error) {
            // If it's already our custom error, rethrow
            if (error instanceof LighterAPIError) {
                throw error;
            }
            
            // Network or parsing error
            console.error('[API] Request failed:', error);
            throw new LighterAPIError(
                error.message || 'Network request failed',
                endpoint,
                0,
                null
            );
        }
    }

    // === ACCOUNT ENDPOINTS ===
    
    // === MARKET LOOKUP HELPER ===
    
    async _getMarketLookup() {
        if (!this.marketCache) {
            console.log('[API] Building market lookup cache...');
            try {
                const markets = await this.getMarkets();
                this.marketCache = new Map();
                (markets.order_books || []).forEach(m => {
                    this.marketCache.set(m.market_id, m.symbol);
                });
                console.log(`[API] Market cache built with ${this.marketCache.size} markets`);
            } catch (error) {
                console.error('[API] Failed to build market cache:', error);
                this.marketCache = new Map(); // Empty map as fallback
            }
        }
        return this.marketCache;
    }
    
    // === ACCOUNT ENDPOINTS ===
    
    async getAccountByAddress(l1Address) {
        // Get account data by L1 Ethereum address
        return await this._fetch(`/api/v1/account?by=l1_address&value=${l1Address}`);
    }
    
    async getAccountsByL1Address(l1Address) {
        // Get all sub-accounts associated with an L1 address
        // Returns: { l1_address, sub_accounts: [{ index, ... }] }
        // The first sub_account is the main account
        return await this._fetch(`/api/v1/accountsByL1Address?l1_address=${l1Address}`);
    }
    
    async getAccount(accountIndex) {
        return await this._fetch(`/api/v1/account?by=index&value=${accountIndex}`);
    }

    async getAccountPositions(accountIndex) {
        // Positions are included in the main account endpoint
        const account = await this.getAccount(accountIndex);
        const accountData = account.accounts?.[0] || {};
        
        // Get market lookup for symbol enrichment
        const marketLookup = await this._getMarketLookup();
        
        // Normalize: always return array
        let positionsArray = accountData.positions || [];
        if (!Array.isArray(positionsArray)) {
            console.warn('[API] Positions not an array, converting:', typeof positionsArray);
            positionsArray = positionsArray ? [positionsArray] : [];
        }
        
        // Normalize positions data - COMPLETE normalization matching WebSocket
        const positions = positionsArray.map(p => {
            const positionSize = parseFloat(p.position || 0);
            const side = p.sign === 1 || positionSize > 0 ? 'LONG' : positionSize < 0 ? 'SHORT' : 'NONE';
            
            // Parse all numeric values
            const avgEntryPrice = parseFloat(p.avg_entry_price || 0);
            const positionValue = parseFloat(p.position_value || 0);
            const unrealizedPnl = parseFloat(p.unrealized_pnl || 0);
            const realizedPnl = parseFloat(p.realized_pnl || 0);
            const liquidationPrice = parseFloat(p.liquidation_price || 0);
            const initialMarginFraction = parseFloat(p.initial_margin_fraction || 0);
            const allocatedMargin = parseFloat(p.allocated_margin || 0);
            const totalFundingPaidOut = parseFloat(p.total_funding_paid_out || 0);
            
            return {
                // Keep original data
                ...p,
                
                // IDs & Symbol
                marketId: p.market_id,
                symbol: marketLookup.get(p.market_id) || p.symbol || `Market ${p.market_id}`,
                
                // Position details
                side: side,
                size: Math.abs(positionSize),
                sizeRaw: positionSize,
                sign: p.sign,
                
                // Prices & PnL - BOTH snake_case and camelCase for compatibility
                avg_entry_price: avgEntryPrice,
                avgEntryPrice: avgEntryPrice,
                position_value: positionValue,
                positionValue: positionValue,
                unrealized_pnl: unrealizedPnl,
                unrealizedPnl: unrealizedPnl,
                realized_pnl: realizedPnl,
                realizedPnl: realizedPnl,
                liquidation_price: liquidationPrice,
                liquidationPrice: liquidationPrice,
                
                // Margin - both formats
                margin_mode: p.margin_mode,
                marginMode: p.margin_mode === 0 ? 'CROSS' : p.margin_mode === 1 ? 'ISOLATED' : 'UNKNOWN',
                marginModeRaw: p.margin_mode,
                initial_margin_fraction: initialMarginFraction,
                initialMarginFraction: initialMarginFraction,
                allocated_margin: allocatedMargin,
                allocatedMargin: allocatedMargin,
                
                // Order counts - both formats
                open_order_count: p.open_order_count || 0,
                openOrderCount: p.open_order_count || 0,
                pending_order_count: p.pending_order_count || 0,
                pendingOrderCount: p.pending_order_count || 0,
                position_tied_order_count: p.position_tied_order_count || 0,
                positionTiedOrderCount: p.position_tied_order_count || 0,
                
                // Funding - both formats
                total_funding_paid_out: totalFundingPaidOut,
                totalFundingPaidOut: totalFundingPaidOut,
                
                // Flags
                hasPosition: Math.abs(positionSize) > 0,
                isLong: side === 'LONG',
                isShort: side === 'SHORT',
                isProfitable: parseFloat(p.unrealized_pnl || 0) > 0
            };
        });
        
        // Log summary
        const activePositions = positions.filter(p => p.hasPosition);
        console.log(`[API] Positions: ${activePositions.length} active (${positions.filter(p => p.isLong).length} long, ${positions.filter(p => p.isShort).length} short)`);
        
        return {
            account_positions: positions,
            positions: positions,
            activePositions: activePositions,
            positionCount: positions.length,
            activePositionCount: activePositions.length
        };
    }

    async getAccountBalance(accountIndex) {
        // Balance is included in the main account endpoint
        const account = await this.getAccount(accountIndex);
        const accountData = account.accounts?.[0] || {};
        return {
            total_balance: accountData.collateral || '0',
            available_balance: accountData.available_balance || '0'
        };
    }

    async getAccountLimits(accountIndex) {
        return await this._fetch(`/api/v1/accountLimits?account_index=${accountIndex}`);
    }

    async getAccountApiKeys(accountIndex) {
        return await this._fetch(`/api/v1/accountApiKeys?account_index=${accountIndex}`);
    }

    async getNextNonce(accountIndex, apiKeyIndex) {
        return await this._fetch(`/api/v1/nextNonce?account_index=${accountIndex}&api_key_index=${apiKeyIndex}`);
    }

    // === ORDER ENDPOINTS ===
    
    async getOrders(accountIndex, marketId = null, status = 'active') {
        const endpoint = status === 'active' ? 'accountActiveOrders' : 'accountInactiveOrders';
        let url = `/api/v1/${endpoint}?account_index=${accountIndex}`;
        if (marketId !== null) {
            url += `&market_id=${marketId}`;
        }
        const response = await this._fetch(url);
        
        // Normalize: ensure orders is an array
        let orders = response.orders || response || [];
        if (!Array.isArray(orders)) {
            console.warn('[API] Orders not an array, converting:', typeof orders);
            orders = orders ? [orders] : [];
        }
        
        console.log(`[API] Raw orders received: ${orders.length}`);
        
        // Log first order to see structure
        if (orders.length > 0) {
            console.log('[API] First order sample:', {
                status: orders[0].status,
                remaining: orders[0].remaining_base_amount,
                filled: orders[0].filled_base_amount,
                type: orders[0].type,
                market_index: orders[0].market_index
            });
        }
        
        // Enrich with market symbols and classification
        const marketLookup = await this._getMarketLookup();
        
        const enriched = orders.map(o => {
            const orderType = o.type || 'limit';
            const isConditional = ['stop-loss', 'stop-loss-limit', 'take-profit', 'take-profit-limit'].includes(orderType);
            const remainingSize = parseFloat(o.remaining_base_amount || 0);
            const filledSize = parseFloat(o.filled_base_amount || 0);
            const totalSize = parseFloat(o.initial_base_amount || 0);
            
            // Determine if this is an UNFILLED ORDER vs FILLED POSITION
            // UNFILLED: status='open' AND remaining_base_amount > 0
            // FILLED: status='filled' OR remaining_base_amount = 0
            const isUnfilled = o.status === 'open' && remainingSize > 0;
            const isFilled = o.status === 'filled' || remainingSize === 0;
            
            return {
                ...o,
                // Add symbol
                symbol: marketLookup.get(o.market_index) || `Market ${o.market_index}`,
                market_id: o.market_index, // Alias for consistency
                
                // Parse amounts
                size: remainingSize,
                filled: filledSize,
                total_size: totalSize,
                fill_percentage: totalSize > 0 ? (filledSize / totalSize) * 100 : 0,
                
                // Parse prices
                limit_price: parseFloat(o.price || 0),
                trigger_price: o.trigger_price ? parseFloat(o.trigger_price) : null,
                
                // Classify order
                side: o.is_ask ? 'SELL' : 'BUY',
                order_type: orderType,
                is_conditional: isConditional,
                is_stop_loss: orderType.includes('stop-loss'),
                is_take_profit: orderType.includes('take-profit'),
                is_reduce_only: o.reduce_only || false,
                
                // Grouping info
                has_parent: (o.parent_order_index || 0) > 0,
                has_children: !!(o.to_trigger_order_id_0 || o.to_trigger_order_id_1),
                is_oco: !!(o.to_cancel_order_id_0),
                parent_id: o.parent_order_index || null,
                child_tp_id: o.to_trigger_order_id_0 || null,
                child_sl_id: o.to_trigger_order_id_1 || null,
                
                // Status classification - CRITICAL
                order_status: o.status, // Raw status from API
                is_unfilled_order: isUnfilled, // True = waiting in orderbook
                is_filled_position: isFilled, // True = filled (now a position)
                is_active: o.status === 'open',
                is_triggered: o.trigger_status && o.trigger_status !== 'na' && o.trigger_status !== 'ready',
                trigger_status_type: o.trigger_status || 'na'
            };
        });
        
        // Log classification breakdown
        const unfilled = enriched.filter(o => o.is_unfilled_order);
        const filled = enriched.filter(o => o.is_filled_position);
        console.log(`[API] Order classification: ${unfilled.length} unfilled orders, ${filled.length} filled positions`);
        
        return { 
            orders: enriched,
            unfilled_count: unfilled.length,
            filled_count: filled.length
        };
    }

    async getOrderHistory(accountIndex, limit = 100, offset = 0) {
        // Order history is inactive orders
        return await this.getOrders(accountIndex, null, 'inactive');
    }

    async getOrder(orderId) {
        return await this._fetch(`/api/v1/order?order_id=${orderId}`);
    }

    // === MARKET ENDPOINTS ===
    
    async getMarkets() {
        return await this._fetch('/api/v1/orderBooks');
    }

    async getOrderBook(marketId, limit = 50) {
        const response = await this._fetch(`/api/v1/orderBookOrders?market_id=${marketId}&limit=${limit}`);
        
        // Normalize orderbook structure with consistent field names
        const normalizeOrder = (order) => {
            // Handle both object format and array format
            if (Array.isArray(order)) {
                return {
                    price: order[0],
                    size: order[1]
                };
            }
            // Server returns: remaining_base_amount, initial_base_amount, price
            const size = order.remaining_base_amount || order.base_amount || order.size || order.initial_base_amount;
            return {
                price: order.price,
                size: size
            };
        };
        
        const normalized = {
            asks: Array.isArray(response.asks) ? response.asks.map(normalizeOrder) : [],
            bids: Array.isArray(response.bids) ? response.bids.map(normalizeOrder) : [],
            market_id: marketId,
            timestamp: response.timestamp || Date.now()
        };
        
        return normalized;
    }

    async getOrderBookDetails(marketId) {
        return await this._fetch(`/api/v1/orderBookDetails?market_id=${marketId}`);
    }

    async getTrades(marketId, limit = 100) {
        return await this._fetch(`/api/v1/trades?market_id=${marketId}&limit=${limit}`);
    }

    async getCandlesticks(marketId, interval = '1h', limit = 100) {
        return await this._fetch(`/api/v1/candlesticks?market_id=${marketId}&interval=${interval}&limit=${limit}`);
    }
    
    async getRecentTrades(marketId, limit = 50) {
        return await this._fetch(`/api/v1/recentTrades?market_id=${marketId}&limit=${limit}`);
    }
    
    async getExchangeStats() {
        return await this._fetch('/api/v1/exchangeStats');
    }

    // === FUNDING ENDPOINTS ===
    
    async getFundingRates() {
        return await this._fetch('/api/v1/funding-rates');
    }

    async getFundingHistory(marketId, limit = 100) {
        return await this._fetch(`/api/v1/fundings?market_id=${marketId}&limit=${limit}`);
    }

    async getPositionFunding(accountIndex, limit = 100) {
        return await this._fetch(`/api/v1/positionFunding?account_index=${accountIndex}&limit=${limit}`);
    }

    // === BLOCKCHAIN ENDPOINTS ===
    
    async getBlocks(limit = 20) {
        return await this._fetch(`/api/v1/blocks?limit=${limit}`);
    }

    async getBlock(blockNumber) {
        return await this._fetch(`/api/v1/block?block_number=${blockNumber}`);
    }

    async getTransaction(txHash) {
        return await this._fetch(`/api/v1/transaction?tx_hash=${txHash}`);
    }

    // === ANNOUNCEMENT ENDPOINTS ===
    
    async getAnnouncements(limit = 10) {
        return await this._fetch(`/api/v1/announcements?limit=${limit}`);
    }

    async getAccountPnL(accountIndex) {
        const account = await this.getAccount(accountIndex);
        const accountData = account.accounts?.[0] || {};
        
        // Normalize positions to array
        let positions = accountData.positions || [];
        if (!Array.isArray(positions)) {
            positions = positions ? [positions] : [];
        }
        
        return {
            total_realized_pnl: accountData.total_realized_pnl || '0',
            total_unrealized_pnl: accountData.total_unrealized_pnl || '0',
            positions: positions
        };
    }

    // === REFERRAL ENDPOINTS ===
    
    async getReferralStats(accountIndex) {
        return await this._fetch(`/api/v1/referralStats?account_index=${accountIndex}`);
    }

    async getReferralCode(accountIndex) {
        return await this._fetch(`/api/v1/referralCode?account_index=${accountIndex}`);
    }

    // === REFERRAL ENDPOINTS ===
    
    async getReferralPoints(accountIndex, auth = null) {
        let url = `/api/v1/referral/points?account_index=${accountIndex}`;
        if (auth) {
            url += `&auth=${auth}`;
        }
        return await this._fetch(url);
    }

    // === TRANSACTION SUBMISSION ===
    
    async sendTx(txType, txInfo) {
        const formData = new FormData();
        formData.append('tx_type', txType.toString());
        formData.append('tx_info', txInfo);

        const response = await fetch(`${this.baseUrl}/api/v1/sendTx`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok || (data.code && data.code !== 200)) {
            throw new Error(data.message || `Transaction failed: ${JSON.stringify(data)}`);
        }
        
        return data;
    }

    async sendTxBatch(txTypes, txInfos) {
        const formData = new FormData();
        formData.append('tx_types', JSON.stringify(txTypes));
        formData.append('tx_infos', JSON.stringify(txInfos));

        const response = await fetch(`${this.baseUrl}/api/v1/sendTxBatch`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok || (data.code && data.code !== 200)) {
            throw new Error(data.message || `Batch transaction failed`);
        }
        
        return data;
    }
}
