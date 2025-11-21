//go:build js && wasm
// +build js,wasm

package main

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"syscall/js"
	"time"

	"github.com/elliottech/lighter-go/signer"
	"github.com/elliottech/lighter-go/types"
)

// signModifyOrder signs a modify order transaction
func signModifyOrder(this js.Value, args []js.Value) interface{} {
	handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
		resolve := promiseArgs[0]
		reject := promiseArgs[1]

		go func() {
			defer func() {
				if r := recover(); r != nil {
					reject.Invoke(fmt.Sprintf("Panic: %v", r))
				}
			}()

			if len(args) < 1 {
				reject.Invoke("Missing arguments")
				return
			}

			params := args[0]
			
			privateKeyHex := params.Get("privateKey").String()
			if len(privateKeyHex) > 2 && privateKeyHex[:2] == "0x" {
				privateKeyHex = privateKeyHex[2:]
			}
			
			privateKeyBytes, err := hex.DecodeString(privateKeyHex)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Invalid private key: %v", err))
				return
			}

			keyManager, err := signer.NewKeyManager(privateKeyBytes)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to create key manager: %v", err))
				return
			}

			chainId := uint32(params.Get("chainId").Int())
			accountIndex := int64(params.Get("accountIndex").Int())
			apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
			nonce := int64(params.Get("nonce").Int())
			expiredAt := int64(time.Now().Add(10 * time.Minute).UnixMilli())

			modifyReq := &types.ModifyOrderTxReq{
				MarketIndex:  uint8(params.Get("marketIndex").Int()),
				Index:        int64(params.Get("orderIndex").Int()),
				BaseAmount:   int64(params.Get("baseAmount").Int()),
				Price:        uint32(params.Get("price").Int()),
				TriggerPrice: uint32(params.Get("triggerPrice").Int()),
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructL2ModifyOrderTx(keyManager, chainId, modifyReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign modify: %v", err))
				return
			}

			txJSON, err := json.Marshal(signedTx)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to marshal JSON: %v", err))
				return
			}

			resolve.Invoke(string(txJSON))
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// signCancelAllOrders signs a cancel all orders transaction
func signCancelAllOrders(this js.Value, args []js.Value) interface{} {
	handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
		resolve := promiseArgs[0]
		reject := promiseArgs[1]

		go func() {
			defer func() {
				if r := recover(); r != nil {
					reject.Invoke(fmt.Sprintf("Panic: %v", r))
				}
			}()

			if len(args) < 1 {
				reject.Invoke("Missing arguments")
				return
			}

			params := args[0]
			
			privateKeyHex := params.Get("privateKey").String()
			if len(privateKeyHex) > 2 && privateKeyHex[:2] == "0x" {
				privateKeyHex = privateKeyHex[2:]
			}
			
			privateKeyBytes, err := hex.DecodeString(privateKeyHex)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Invalid private key: %v", err))
				return
			}

			keyManager, err := signer.NewKeyManager(privateKeyBytes)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to create key manager: %v", err))
				return
			}

			chainId := uint32(params.Get("chainId").Int())
			accountIndex := int64(params.Get("accountIndex").Int())
			apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
			nonce := int64(params.Get("nonce").Int())
			expiredAt := int64(time.Now().Add(10 * time.Minute).UnixMilli())

			cancelAllReq := &types.CancelAllOrdersTxReq{
				TimeInForce: uint8(params.Get("timeInForce").Int()),
				Time:        int64(params.Get("time").Int()),
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructL2CancelAllOrdersTx(keyManager, chainId, cancelAllReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign cancel all: %v", err))
				return
			}

			txJSON, err := json.Marshal(signedTx)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to marshal JSON: %v", err))
				return
			}

			resolve.Invoke(string(txJSON))
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// signCreateGroupedOrders signs a grouped orders transaction
func signCreateGroupedOrders(this js.Value, args []js.Value) interface{} {
	handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
		resolve := promiseArgs[0]
		reject := promiseArgs[1]

		go func() {
			defer func() {
				if r := recover(); r != nil {
					reject.Invoke(fmt.Sprintf("Panic: %v", r))
				}
			}()

			if len(args) < 1 {
				reject.Invoke("Missing arguments")
				return
			}

			params := args[0]
			
			privateKeyHex := params.Get("privateKey").String()
			if len(privateKeyHex) > 2 && privateKeyHex[:2] == "0x" {
				privateKeyHex = privateKeyHex[2:]
			}
			
			privateKeyBytes, err := hex.DecodeString(privateKeyHex)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Invalid private key: %v", err))
				return
			}

			keyManager, err := signer.NewKeyManager(privateKeyBytes)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to create key manager: %v", err))
				return
			}

			chainId := uint32(params.Get("chainId").Int())
			accountIndex := int64(params.Get("accountIndex").Int())
			apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
			nonce := int64(params.Get("nonce").Int())
			expiredAt := int64(time.Now().Add(10 * time.Minute).UnixMilli())

			// Parse orders array
			ordersJS := params.Get("orders")
			ordersLength := ordersJS.Length()
			orders := make([]*types.CreateOrderTxReq, ordersLength)

			for i := 0; i < ordersLength; i++ {
				orderJS := ordersJS.Index(i)
				orders[i] = &types.CreateOrderTxReq{
					MarketIndex:      uint8(orderJS.Get("marketIndex").Int()),
					ClientOrderIndex: int64(orderJS.Get("clientOrderIndex").Int()),
					BaseAmount:       int64(orderJS.Get("baseAmount").Int()),
					Price:            uint32(orderJS.Get("price").Int()),
					IsAsk:            uint8(orderJS.Get("isAsk").Int()),
					Type:             uint8(orderJS.Get("orderType").Int()),
					TimeInForce:      uint8(orderJS.Get("timeInForce").Int()),
					ReduceOnly:       uint8(orderJS.Get("reduceOnly").Int()),
					TriggerPrice:     uint32(orderJS.Get("triggerPrice").Int()),
					OrderExpiry:      int64(orderJS.Get("orderExpiry").Int()),
				}
			}

			groupedReq := &types.CreateGroupedOrdersTxReq{
				GroupingType: uint8(params.Get("groupingType").Int()),
				Orders:       orders,
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructL2CreateGroupedOrdersTx(keyManager, chainId, groupedReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign grouped orders: %v", err))
				return
			}

			txJSON, err := json.Marshal(signedTx)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to marshal JSON: %v", err))
				return
			}

			resolve.Invoke(string(txJSON))
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// signUpdateLeverage signs an update leverage transaction
func signUpdateLeverage(this js.Value, args []js.Value) interface{} {
	handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
		resolve := promiseArgs[0]
		reject := promiseArgs[1]

		go func() {
			defer func() {
				if r := recover(); r != nil {
					reject.Invoke(fmt.Sprintf("Panic: %v", r))
				}
			}()

			if len(args) < 1 {
				reject.Invoke("Missing arguments")
				return
			}

			params := args[0]
			
			privateKeyHex := params.Get("privateKey").String()
			if len(privateKeyHex) > 2 && privateKeyHex[:2] == "0x" {
				privateKeyHex = privateKeyHex[2:]
			}
			
			privateKeyBytes, err := hex.DecodeString(privateKeyHex)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Invalid private key: %v", err))
				return
			}

			keyManager, err := signer.NewKeyManager(privateKeyBytes)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to create key manager: %v", err))
				return
			}

			chainId := uint32(params.Get("chainId").Int())
			accountIndex := int64(params.Get("accountIndex").Int())
			apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
			nonce := int64(params.Get("nonce").Int())
			expiredAt := int64(time.Now().Add(10 * time.Minute).UnixMilli())

			leverageReq := &types.UpdateLeverageTxReq{
				MarketIndex:           uint8(params.Get("marketIndex").Int()),
				InitialMarginFraction: uint16(params.Get("initialMarginFraction").Int()),
				MarginMode:            uint8(params.Get("marginMode").Int()),
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructUpdateLeverageTx(keyManager, chainId, leverageReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign leverage update: %v", err))
				return
			}

			txJSON, err := json.Marshal(signedTx)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to marshal JSON: %v", err))
				return
			}

			resolve.Invoke(string(txJSON))
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// signUpdateMargin signs an update margin transaction
func signUpdateMargin(this js.Value, args []js.Value) interface{} {
	handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
		resolve := promiseArgs[0]
		reject := promiseArgs[1]

		go func() {
			defer func() {
				if r := recover(); r != nil {
					reject.Invoke(fmt.Sprintf("Panic: %v", r))
				}
			}()

			if len(args) < 1 {
				reject.Invoke("Missing arguments")
				return
			}

			params := args[0]
			
			privateKeyHex := params.Get("privateKey").String()
			if len(privateKeyHex) > 2 && privateKeyHex[:2] == "0x" {
				privateKeyHex = privateKeyHex[2:]
			}
			
			privateKeyBytes, err := hex.DecodeString(privateKeyHex)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Invalid private key: %v", err))
				return
			}

			keyManager, err := signer.NewKeyManager(privateKeyBytes)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to create key manager: %v", err))
				return
			}

			chainId := uint32(params.Get("chainId").Int())
			accountIndex := int64(params.Get("accountIndex").Int())
			apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
			nonce := int64(params.Get("nonce").Int())
			expiredAt := int64(time.Now().Add(10 * time.Minute).UnixMilli())

			marginReq := &types.UpdateMarginTxReq{
				MarketIndex: uint8(params.Get("marketIndex").Int()),
				USDCAmount:  int64(params.Get("usdcAmount").Int()),
				Direction:   uint8(params.Get("direction").Int()),
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructUpdateMarginTx(keyManager, chainId, marginReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign margin update: %v", err))
				return
			}

			txJSON, err := json.Marshal(signedTx)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to marshal JSON: %v", err))
				return
			}

			resolve.Invoke(string(txJSON))
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// signWithdraw signs a withdraw transaction
func signWithdraw(this js.Value, args []js.Value) interface{} {
	handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
		resolve := promiseArgs[0]
		reject := promiseArgs[1]

		go func() {
			defer func() {
				if r := recover(); r != nil {
					reject.Invoke(fmt.Sprintf("Panic: %v", r))
				}
			}()

			if len(args) < 1 {
				reject.Invoke("Missing arguments")
				return
			}

			params := args[0]
			
			privateKeyHex := params.Get("privateKey").String()
			if len(privateKeyHex) > 2 && privateKeyHex[:2] == "0x" {
				privateKeyHex = privateKeyHex[2:]
			}
			
			privateKeyBytes, err := hex.DecodeString(privateKeyHex)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Invalid private key: %v", err))
				return
			}

			keyManager, err := signer.NewKeyManager(privateKeyBytes)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to create key manager: %v", err))
				return
			}

			chainId := uint32(params.Get("chainId").Int())
			accountIndex := int64(params.Get("accountIndex").Int())
			apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
			nonce := int64(params.Get("nonce").Int())
			expiredAt := int64(time.Now().Add(10 * time.Minute).UnixMilli())

			withdrawReq := &types.WithdrawTxReq{
				USDCAmount: uint64(params.Get("usdcAmount").Int()),
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructWithdrawTx(keyManager, chainId, withdrawReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign withdrawal: %v", err))
				return
			}

			txJSON, err := json.Marshal(signedTx)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to marshal JSON: %v", err))
				return
			}

			resolve.Invoke(string(txJSON))
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// signTransfer signs a transfer transaction
func signTransfer(this js.Value, args []js.Value) interface{} {
	handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
		resolve := promiseArgs[0]
		reject := promiseArgs[1]

		go func() {
			defer func() {
				if r := recover(); r != nil {
					reject.Invoke(fmt.Sprintf("Panic: %v", r))
				}
			}()

			if len(args) < 1 {
				reject.Invoke("Missing arguments")
				return
			}

			params := args[0]
			
			privateKeyHex := params.Get("privateKey").String()
			if len(privateKeyHex) > 2 && privateKeyHex[:2] == "0x" {
				privateKeyHex = privateKeyHex[2:]
			}
			
			privateKeyBytes, err := hex.DecodeString(privateKeyHex)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Invalid private key: %v", err))
				return
			}

			keyManager, err := signer.NewKeyManager(privateKeyBytes)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to create key manager: %v", err))
				return
			}

			chainId := uint32(params.Get("chainId").Int())
			accountIndex := int64(params.Get("accountIndex").Int())
			apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
			nonce := int64(params.Get("nonce").Int())
			expiredAt := int64(time.Now().Add(10 * time.Minute).UnixMilli())

			// Convert memo string to [32]byte
			memoStr := params.Get("memo").String()
			var memoBytes [32]byte
			copy(memoBytes[:], []byte(memoStr))

			transferReq := &types.TransferTxReq{
				ToAccountIndex: int64(params.Get("toAccountIndex").Int()),
				USDCAmount:     int64(params.Get("usdcAmount").Int()),
				Fee:            int64(params.Get("fee").Int()),
				Memo:           memoBytes,
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructTransferTx(keyManager, chainId, transferReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign transfer: %v", err))
				return
			}

			txJSON, err := json.Marshal(signedTx)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to marshal JSON: %v", err))
				return
			}

			resolve.Invoke(string(txJSON))
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// signCreateSubAccount signs a create sub-account transaction
func signCreateSubAccount(this js.Value, args []js.Value) interface{} {
	handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
		resolve := promiseArgs[0]
		reject := promiseArgs[1]

		go func() {
			defer func() {
				if r := recover(); r != nil {
					reject.Invoke(fmt.Sprintf("Panic: %v", r))
				}
			}()

			if len(args) < 1 {
				reject.Invoke("Missing arguments")
				return
			}

			params := args[0]
			
			privateKeyHex := params.Get("privateKey").String()
			if len(privateKeyHex) > 2 && privateKeyHex[:2] == "0x" {
				privateKeyHex = privateKeyHex[2:]
			}
			
			privateKeyBytes, err := hex.DecodeString(privateKeyHex)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Invalid private key: %v", err))
				return
			}

			keyManager, err := signer.NewKeyManager(privateKeyBytes)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to create key manager: %v", err))
				return
			}

			chainId := uint32(params.Get("chainId").Int())
			accountIndex := int64(params.Get("accountIndex").Int())
			apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
			nonce := int64(params.Get("nonce").Int())
			expiredAt := int64(time.Now().Add(10 * time.Minute).UnixMilli())

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructCreateSubAccountTx(keyManager, chainId, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign sub-account creation: %v", err))
				return
			}

			txJSON, err := json.Marshal(signedTx)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to marshal JSON: %v", err))
				return
			}

			resolve.Invoke(string(txJSON))
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// signChangePubKey signs a change public key transaction
func signChangePubKey(this js.Value, args []js.Value) interface{} {
	handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
		resolve := promiseArgs[0]
		reject := promiseArgs[1]

		go func() {
			defer func() {
				if r := recover(); r != nil {
					reject.Invoke(fmt.Sprintf("Panic: %v", r))
				}
			}()

			if len(args) < 1 {
				reject.Invoke("Missing arguments")
				return
			}

			params := args[0]
			
			privateKeyHex := params.Get("privateKey").String()
			if len(privateKeyHex) > 2 && privateKeyHex[:2] == "0x" {
				privateKeyHex = privateKeyHex[2:]
			}
			
			privateKeyBytes, err := hex.DecodeString(privateKeyHex)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Invalid private key: %v", err))
				return
			}

			keyManager, err := signer.NewKeyManager(privateKeyBytes)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to create key manager: %v", err))
				return
			}

			chainId := uint32(params.Get("chainId").Int())
			accountIndex := int64(params.Get("accountIndex").Int())
			apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
			nonce := int64(params.Get("nonce").Int())
			expiredAt := int64(time.Now().Add(10 * time.Minute).UnixMilli())

			// Convert public key string to [40]byte
			pubKeyStr := params.Get("newPubKey").String()
			if len(pubKeyStr) > 2 && pubKeyStr[:2] == "0x" {
				pubKeyStr = pubKeyStr[2:]
			}
			pubKeyBytes, err := hex.DecodeString(pubKeyStr)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Invalid public key: %v", err))
				return
			}
			var pubKey [40]byte
			copy(pubKey[:], pubKeyBytes)

			changePubKeyReq := &types.ChangePubKeyReq{
				PubKey: pubKey,
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructChangePubKeyTx(keyManager, chainId, changePubKeyReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign pub key change: %v", err))
				return
			}

			txJSON, err := json.Marshal(signedTx)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to marshal JSON: %v", err))
				return
			}

			resolve.Invoke(string(txJSON))
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}
