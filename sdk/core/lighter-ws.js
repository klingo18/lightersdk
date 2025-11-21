// Lighter WebSocket Client
import { WS_CHANNELS, ERRORS } from './constants.js';

export class LighterWS {
    constructor(wsUrl, authToken = null, authRefreshCallback = null) {
        this.wsUrl = wsUrl;
        this.authToken = authToken;
        this.authRefreshCallback = authRefreshCallback; // Callback to get fresh auth token
        this.ws = null;
        this.subscriptions = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = Infinity; // Unlimited reconnects for 8+ hour stability
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 60000; // Cap at 60 seconds
        this.isConnected = false;
        this.shouldReconnect = true;
        this.isAuthenticated = false;
        this.messageQueue = [];
        this.maxQueueSize = 100;
        this.heartbeatInterval = null;
        this.heartbeatIntervalMs = 30000; // Send heartbeat every 30 seconds
        this.lastPongTime = Date.now();
        this.connectionTimeout = null;
    }

    async connect() {
        return new Promise(async (resolve, reject) => {
            console.log('[WS] Connecting to:', this.wsUrl);
            
            // Reset reconnect flag for manual connections
            this.shouldReconnect = true;
            
            // Get fresh auth token if this is a reconnect and we have a refresh callback
            if (this.reconnectAttempts > 0 && this.authRefreshCallback) {
                try {
                    console.log('[WS] Refreshing auth token for reconnect...');
                    this.authToken = await this.authRefreshCallback();
                    console.log('[WS] Auth token refreshed');
                } catch (error) {
                    console.error('[WS] Failed to refresh auth token:', error);
                }
            }
            
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                console.log('[WS] Connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.lastPongTime = Date.now();
                
                // Send auth if provided
                if (this.authToken) {
                    this.send({
                        type: 'auth',
                        token: this.authToken
                    });
                }
                
                // Re-subscribe to all channels (only if map has entries from reconnect)
                if (this.subscriptions.size > 0) {
                    this.resubscribeAll();
                }
                
                // Send queued messages
                this.flushMessageQueue();
                
                // Start heartbeat
                this.startHeartbeat();
                
                resolve();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.ws.onerror = (error) => {
                console.error('[WS] Error:', error);
                reject(error);
            };

            this.ws.onclose = () => {
                console.log('[WS] Disconnected');
                this.isConnected = false;
                this.isAuthenticated = false;
                
                // Stop heartbeat
                this.stopHeartbeat();
                
                // Only reconnect if not manually disconnected
                if (this.shouldReconnect) {
                    this.attemptReconnect();
                }
            };
        });
    }

    disconnect() {
        console.log('[WS] Disconnecting');
        this.isConnected = false;
        this.shouldReconnect = false;
        this.isAuthenticated = false;
        this.reconnectAttempts = this.maxReconnectAttempts;
        
        // Stop heartbeat
        this.stopHeartbeat();
        
        // Clear all subscriptions
        this.subscriptions.clear();
        
        // Clear message queue
        this.messageQueue = [];
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    attemptReconnect() {
        if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[WS] Max reconnect attempts reached or reconnect disabled');
            return;
        }

        this.reconnectAttempts++;
        // Exponential backoff with max cap
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelay
        );
        
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            if (this.shouldReconnect) {
                this.connect().catch(err => {
                    console.error('[WS] Reconnect failed:', err);
                });
            }
        }, delay);
    }
    
    startHeartbeat() {
        this.stopHeartbeat(); // Clear any existing interval
        
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                // Check if we've received a pong recently
                const timeSinceLastPong = Date.now() - this.lastPongTime;
                if (timeSinceLastPong > 90000) { // 90 seconds without pong
                    console.warn('[WS] No pong received for 90s, connection may be dead');
                    this.ws.close(); // Force reconnect
                    return;
                }
                
                // Send ping (server should respond with pong)
                this.send({ type: 'ping' });
            }
        }, this.heartbeatIntervalMs);
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    send(message) {
        if (!this.isConnected) {
            console.log('[WS] Not connected, queueing message');
            
            // Enforce queue size limit
            if (this.messageQueue.length < this.maxQueueSize) {
                this.messageQueue.push(message);
            } else {
                console.warn('[WS] Message queue full, dropping oldest message');
                this.messageQueue.shift();
                this.messageQueue.push(message);
            }
            return;
        }

        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('[WS] Send error:', error);
            if (this.messageQueue.length < this.maxQueueSize) {
                this.messageQueue.push(message);
            }
        }
    }

    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            console.log('[WS] Message received:', message);
            
            // Validate message structure
            if (!message || typeof message !== 'object') {
                console.warn('[WS] Invalid message format:', data);
                return;
            }
            
            const messageType = message.type;
            
            // Handle ping/pong heartbeat
            if (messageType === 'ping') {
                this.send({ type: 'pong' });
                this.lastPongTime = Date.now();
                console.log('[WS] Pong sent');
                return;
            }
            
            if (messageType === 'pong') {
                this.lastPongTime = Date.now();
                return;
            }
            
            // Handle connected event
            if (messageType === 'connected') {
                console.log('[WS] Server confirmed connection');
                return;
            }
            
            // Handle auth confirmation
            if (messageType === 'auth_success' || messageType === 'authenticated') {
                console.log('[WS] Authentication successful');
                this.isAuthenticated = true;
                return;
            }
            
            if (messageType === 'auth_failed' || messageType === 'auth_error') {
                console.error('[WS] Authentication failed');
                this.isAuthenticated = false;
                return;
            }
            
            // Handle subscribed confirmations
            if (messageType && messageType.startsWith('subscribed/')) {
                console.log('[WS] Subscription confirmed:', message.channel);
                if (message.channel) {
                    this._routeToCallbacks(message.channel, message);
                }
                return;
            }
            
            // Handle update messages
            if (messageType && messageType.startsWith('update/')) {
                if (message.channel) {
                    this._routeToCallbacks(message.channel, message);
                } else {
                    console.warn('[WS] Update message missing channel');
                }
                return;
            }
            
            // Handle error messages from server
            if (message.error) {
                console.error('[WS] Server error:', message.error);
                if (message.channel) {
                    console.error('[WS] Error on channel:', message.channel);
                }
                return;
            }
            
            // Fallback: route by channel if present
            if (message.channel) {
                this._routeToCallbacks(message.channel, message);
            }
        } catch (error) {
            console.error('[WS] Message parse error:', error);
        }
    }
    
    _routeToCallbacks(serverChannel, message) {
        // Server sends with colon but we store with slash
        // Try exact match first, then convert : to /
        let callbacks = this.subscriptions.get(serverChannel);
        
        if (!callbacks && serverChannel.includes(':')) {
            const slashChannel = serverChannel.replace(':', '/');
            callbacks = this.subscriptions.get(slashChannel);
        }
        
        if (callbacks && callbacks.length > 0) {
            // Execute callbacks with error handling
            callbacks.forEach(cb => {
                try {
                    cb(message);
                } catch (error) {
                    console.error('[WS] Callback execution error:', error);
                }
            });
        }
    }

    subscribe(channel, marketId, callback, auth = null) {
        // Validate marketId
        if (marketId === undefined || marketId === null || marketId === '') {
            console.error('[WS] Subscribe called with invalid marketId:', marketId, 'for channel:', channel);
            return;
        }
        
        // Server expects subscriptions with SLASH: "order_book/1"
        const subscriptionChannel = `${channel}/${marketId}`;
        
        // Store with SLASH to match what we send
        const storageKey = subscriptionChannel;
        
        if (!this.subscriptions.has(storageKey)) {
            this.subscriptions.set(storageKey, []);
        }
        
        this.subscriptions.get(storageKey).push(callback);
        
        // Build subscription message
        const subMessage = {
            type: 'subscribe',
            channel: subscriptionChannel
        };
        
        // Add auth if provided (required for account_all_orders, etc)
        if (auth) {
            subMessage.auth = auth;
        }
        
        // Send subscription
        this.send(subMessage);
        
        console.log(`[WS] Subscribed: ${subscriptionChannel}${auth ? ' (with auth)' : ''}`);
    }

    unsubscribe(channel, marketId) {
        const subscriptionChannel = `${channel}/${marketId}`;
        
        this.subscriptions.delete(subscriptionChannel);
        
        this.send({
            type: 'unsubscribe',
            channel: subscriptionChannel
        });
        
        console.log(`[WS] Unsubscribed from ${subscriptionChannel}`);
    }

    resubscribeAll() {
        console.log('[WS] Resubscribing to all channels');
        
        for (const [channelKey, callbacks] of this.subscriptions.entries()) {
            // channelKey is already in slash format
            this.send({
                type: 'subscribe',
                channel: channelKey
            });
            
            console.log(`[WS] Resubscribing to ${channelKey}`);
        }
    }

    // Convenience methods for common subscriptions
    
    subscribeOrderBook(marketId, callback) {
        this.subscribe(WS_CHANNELS.ORDERBOOK, marketId, callback);
    }

    subscribeTrades(marketId, callback) {
        this.subscribe(WS_CHANNELS.TRADES, marketId, callback);
    }

    subscribeAccountAll(accountIndex, callback) {
        // Use account_all channel which includes orders, positions, balance
        this.subscribe(WS_CHANNELS.ACCOUNT_ALL, accountIndex, callback);
    }

    subscribeAccountAllOrders(accountIndex, authToken, callback) {
        // This channel requires auth and returns ALL orders across ALL markets
        this.subscribe(WS_CHANNELS.ACCOUNT_ALL_ORDERS, accountIndex, callback, authToken);
    }
    
    subscribeAccountOrders(marketId, accountIndex, authToken, callback) {
        // This channel requires auth and returns orders for a specific market
        // Format: account_orders/{MARKET_INDEX}/{ACCOUNT_ID}
        const channel = `${WS_CHANNELS.ACCOUNT_ORDERS}/${marketId}`;
        const storageKey = `${channel}/${accountIndex}`;
        
        if (!this.subscriptions.has(storageKey)) {
            this.subscriptions.set(storageKey, []);
        }
        
        this.subscriptions.get(storageKey).push(callback);
        
        this.send({
            type: 'subscribe',
            channel: `${WS_CHANNELS.ACCOUNT_ORDERS}/${marketId}/${accountIndex}`,
            auth: authToken
        });
        
        console.log(`[WS] Subscribed: ${WS_CHANNELS.ACCOUNT_ORDERS}/${marketId}/${accountIndex} (with auth)`);
    }

    subscribeUserOrders(accountIndex, callback) {
        this.subscribe(WS_CHANNELS.USER_ORDERS, accountIndex, callback);
    }

    subscribeUserPositions(accountIndex, callback) {
        this.subscribe(WS_CHANNELS.USER_POSITIONS, accountIndex, callback);
    }

    subscribeUserBalance(accountIndex, callback) {
        this.subscribe(WS_CHANNELS.USER_BALANCE, accountIndex, callback);
    }
    
    subscribeUserStats(accountIndex, callback) {
        this.subscribe(WS_CHANNELS.USER_STATS, accountIndex, callback);
    }
    
    subscribeMarketStats(marketId, callback) {
        // marketId can be a number or 'all' for all markets
        this.subscribe(WS_CHANNELS.MARKET_STATS, marketId, callback);
    }
    
    subscribeAccountTx(accountIndex, authToken, callback) {
        this.subscribe(WS_CHANNELS.ACCOUNT_TX, accountIndex, callback, authToken);
    }
    
    subscribeNotifications(accountIndex, authToken, callback) {
        this.subscribe(WS_CHANNELS.NOTIFICATION, accountIndex, callback, authToken);
    }
    
    subscribeHeight(callback) {
        // Height channel has special handling - no market ID
        const channel = WS_CHANNELS.HEIGHT;
        
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, []);
        }
        
        this.subscriptions.get(channel).push(callback);
        
        this.send({
            type: 'subscribe',
            channel: channel
        });
        
        console.log(`[WS] Subscribed: ${channel}`);
    }
    
    subscribeTrade(marketId, callback) {
        // CORRECT: Uses 'trade' (singular) as per official docs
        this.subscribe(WS_CHANNELS.TRADE, marketId, callback);
    }
    
    subscribeAccountMarket(marketId, accountIndex, authToken, callback) {
        // account_market/{MARKET_ID}/{ACCOUNT_ID} - sends positions, orders, trades for a market
        const channel = `${WS_CHANNELS.ACCOUNT_MARKET}/${marketId}`;
        const storageKey = `${channel}/${accountIndex}`;
        
        if (!this.subscriptions.has(storageKey)) {
            this.subscriptions.set(storageKey, []);
        }
        
        this.subscriptions.get(storageKey).push(callback);
        
        this.send({
            type: 'subscribe',
            channel: `${WS_CHANNELS.ACCOUNT_MARKET}/${marketId}/${accountIndex}`,
            auth: authToken
        });
        
        console.log(`[WS] Subscribed: ${WS_CHANNELS.ACCOUNT_MARKET}/${marketId}/${accountIndex} (with auth)`);
    }
    
    subscribeAccountAllTrades(accountIndex, authToken, callback) {
        // account_all_trades/{ACCOUNT_ID} - all trades across all markets
        this.subscribe(WS_CHANNELS.ACCOUNT_ALL_TRADES, accountIndex, callback, authToken);
    }
    
    subscribeAccountAllPositions(accountIndex, authToken, callback) {
        // account_all_positions/{ACCOUNT_ID} - all positions across all markets
        this.subscribe(WS_CHANNELS.ACCOUNT_ALL_POSITIONS, accountIndex, callback, authToken);
    }
    
    subscribePoolData(accountIndex, authToken, callback) {
        // pool_data/{ACCOUNT_ID} - pool trades, orders, positions, shares, funding
        this.subscribe(WS_CHANNELS.POOL_DATA, accountIndex, callback, authToken);
    }
    
    subscribePoolInfo(accountIndex, authToken, callback) {
        // pool_info/{ACCOUNT_ID} - pool status, fees, APY, daily returns
        this.subscribe(WS_CHANNELS.POOL_INFO, accountIndex, callback, authToken);
    }

    subscribeFunding(marketId, callback) {
        this.subscribe(WS_CHANNELS.FUNDING, marketId, callback);
    }

    subscribeCandles(marketId, interval, callback) {
        this.subscribe(`${WS_CHANNELS.CANDLES}:${interval}`, marketId, callback);
    }
    
    // Legacy compatibility - use subscribeTrade instead
    subscribeTrades(marketId, callback) {
        console.warn('[WS] subscribeTrades is deprecated, use subscribeTrade (singular)');
        this.subscribe(WS_CHANNELS.TRADES, marketId, callback);
    }
}
