// Lighter SDK Constants

export const ENDPOINTS = {
    mainnet: {
        http: 'https://mainnet.zklighter.elliot.ai',
        ws: 'wss://mainnet.zklighter.elliot.ai/stream',
        chainId: 304
    },
    testnet: {
        http: 'https://testnet.zklighter.elliot.ai',
        ws: 'wss://testnet.zklighter.elliot.ai/stream',
        chainId: 305
    }
};

export const TX_TYPES = {
    CHANGE_PUB_KEY: 8,
    CREATE_SUB_ACCOUNT: 9,
    CREATE_PUBLIC_POOL: 10,
    UPDATE_PUBLIC_POOL: 11,
    TRANSFER: 12,
    WITHDRAW: 13,
    CREATE_ORDER: 14,
    CANCEL_ORDER: 15,
    CANCEL_ALL_ORDERS: 16,
    MODIFY_ORDER: 17,
    MINT_SHARES: 18,
    BURN_SHARES: 19,
    UPDATE_LEVERAGE: 20,
    CREATE_GROUPED_ORDERS: 28,
    UPDATE_MARGIN: 29
};

export const ORDER_TYPES = {
    LIMIT: 0,
    MARKET: 1,
    STOP_LOSS: 2,
    TAKE_PROFIT: 3,
    STOP_LOSS_LIMIT: 4,
    TAKE_PROFIT_LIMIT: 5,
    TWAP: 6
};

export const TIME_IN_FORCE = {
    IMMEDIATE_OR_CANCEL: 0,
    GOOD_TILL_TIME: 1,
    POST_ONLY: 2
};

export const MARGIN_MODES = {
    CROSS: 0,
    ISOLATED: 1
};

export const MARGIN_DIRECTION = {
    REMOVE: 0,
    ADD: 1
};

export const GROUPING_TYPES = {
    NONE: 0,
    ONE_TRIGGERS_OTHER: 1,
    ONE_CANCELS_OTHER: 2,
    ONE_TRIGGERS_OCO: 3
};

export const CANCEL_ALL_TIF = {
    IMMEDIATE: 0,
    SCHEDULED: 1,
    ABORT: 2
};

export const ORDER_SIDES = {
    BUY: 0,
    SELL: 1
};

export const MARKETS = {
    ETH: 0,
    BTC: 1,
    SOL: 2,
    ARB: 3,
    AVAX: 4,
    MATIC: 5,
    OP: 6,
    DOGE: 7,
    PEPE: 8,
    WIF: 9,
    BONK: 10,
    TRUMP: 11,
    POPCAT: 12,
    BODEN: 13,
    TREMP: 14,
    MOG: 15,
    MOODENG: 16,
    FARTCOIN: 17,
    PNUT: 18
};

export const DECIMALS = {
    USDC: 6,
    BASE_AMOUNT: 5,
    PRICE: 1,
    LEVERAGE: 4
};

export const DEFAULTS = {
    ORDER_EXPIRY_28_DAYS: 28 * 24 * 60 * 60 * 1000,
    ORDER_EXPIRY_IOC: 60 * 1000, // 1 minute
    AUTH_EXPIRY_8_HOURS: 8 * 60 * 60 * 1000,
    AUTH_EXPIRY_10_MIN: 10 * 60 * 1000
};

export const WS_CHANNELS = {
    // Public channels
    ORDERBOOK: 'order_book',                    // order_book/{MARKET_INDEX}
    TRADE: 'trade',                             // trade/{MARKET_INDEX} - FIXED: was 'trades'
    MARKET_STATS: 'market_stats',               // market_stats/{MARKET_INDEX} or market_stats/all
    HEIGHT: 'height',                           // Blockchain height
    
    // Account channels (require auth)
    ACCOUNT_ALL: 'account_all',                 // account_all/{ACCOUNT_ID}
    ACCOUNT_MARKET: 'account_market',           // account_market/{MARKET_ID}/{ACCOUNT_ID}
    ACCOUNT_ALL_ORDERS: 'account_all_orders',   // account_all_orders/{ACCOUNT_ID}
    ACCOUNT_ORDERS: 'account_orders',           // account_orders/{MARKET_INDEX}/{ACCOUNT_ID}
    ACCOUNT_ALL_TRADES: 'account_all_trades',   // account_all_trades/{ACCOUNT_ID}
    ACCOUNT_ALL_POSITIONS: 'account_all_positions', // account_all_positions/{ACCOUNT_ID}
    ACCOUNT_TX: 'account_tx',                   // account_tx/{ACCOUNT_ID}
    USER_STATS: 'user_stats',                   // user_stats/{ACCOUNT_ID}
    NOTIFICATION: 'notification',               // notification/{ACCOUNT_ID}
    
    // Pool channels (require auth)
    POOL_DATA: 'pool_data',                     // pool_data/{ACCOUNT_ID}
    POOL_INFO: 'pool_info',                     // pool_info/{ACCOUNT_ID}
    
    // Legacy/deprecated (keep for compatibility)
    TRADES: 'trades',                           // Use TRADE instead
    USER_ORDERS: 'user_orders',
    USER_POSITIONS: 'user_positions',
    USER_BALANCE: 'user_balance',
    FUNDING: 'funding',
    CANDLES: 'candles'
};

export const POOL_STATUS = {
    INACTIVE: 0,
    ACTIVE: 1
};

export const ERRORS = {
    WASM_NOT_LOADED: 'WASM not loaded',
    MISSING_PRIVATE_KEY: 'Private key required',
    MISSING_NONCE: 'Nonce required',
    INVALID_NETWORK: 'Invalid network',
    INVALID_MARKET: 'Invalid market identifier',
    WS_NOT_CONNECTED: 'WebSocket not connected',
    WS_AUTH_FAILED: 'WebSocket authentication failed',
    INVALID_RESPONSE: 'Invalid API response format'
};
