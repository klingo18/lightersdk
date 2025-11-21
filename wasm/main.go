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
	curve "github.com/elliottech/poseidon_crypto/curve/ecgfp5"
	schnorr "github.com/elliottech/poseidon_crypto/signature/schnorr"
)

func main() {
	c := make(chan struct{})
	
	js.Global().Set("LighterWASM", js.ValueOf(map[string]interface{}{
		"ready":                  js.ValueOf(true),
		"generateKey":            js.FuncOf(generateKey),
		"signCreateOrder":        js.FuncOf(signCreateOrder),
		"signCancelOrder":        js.FuncOf(signCancelOrder),
		"signModifyOrder":        js.FuncOf(signModifyOrder),
		"signCancelAllOrders":    js.FuncOf(signCancelAllOrders),
		"signCreateGroupedOrders": js.FuncOf(signCreateGroupedOrders),
		"signUpdateLeverage":     js.FuncOf(signUpdateLeverage),
		"signUpdateMargin":       js.FuncOf(signUpdateMargin),
		"signWithdraw":           js.FuncOf(signWithdraw),
		"signTransfer":           js.FuncOf(signTransfer),
		"signCreateSubAccount":   js.FuncOf(signCreateSubAccount),
		"signChangePubKey":       js.FuncOf(signChangePubKey),
		"signCreatePublicPool":   js.FuncOf(signCreatePublicPool),
		"signUpdatePublicPool":   js.FuncOf(signUpdatePublicPool),
		"signMintShares":         js.FuncOf(signMintShares),
		"signBurnShares":         js.FuncOf(signBurnShares),
		"createAuthToken":        js.FuncOf(createAuthToken),
	}))
	
	println("✅ Lighter WASM Signer Ready!")
	<-c
}

// generateKey generates a new API key pair
func generateKey(this js.Value, args []js.Value) interface{} {
	handler := js.FuncOf(func(this js.Value, promiseArgs []js.Value) interface{} {
		resolve := promiseArgs[0]
		reject := promiseArgs[1]

		go func() {
			defer func() {
				if r := recover(); r != nil {
					reject.Invoke(fmt.Sprintf("Panic: %v", r))
				}
			}()

			key := curve.SampleScalar(nil)
			pk := schnorr.SchnorrPkFromSk(key)
			
			result := map[string]interface{}{
				"privateKey": "0x" + hex.EncodeToString(key.ToLittleEndianBytes()),
				"publicKey":  "0x" + hex.EncodeToString(pk.ToLittleEndianBytes()),
			}
			
			resolve.Invoke(js.ValueOf(result))
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// signCreateOrder signs a create order transaction
func signCreateOrder(this js.Value, args []js.Value) interface{} {
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
				reject.Invoke("Missing arguments: no parameters provided")
				return
			}

			params := args[0]
			
			// Extract parameters
			privateKeyHex := params.Get("privateKey").String()
			if len(privateKeyHex) > 2 && privateKeyHex[:2] == "0x" {
				privateKeyHex = privateKeyHex[2:]
			}
			
			privateKeyBytes, err := hex.DecodeString(privateKeyHex)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Invalid private key: %v", err))
				return
			}

			// Create signer
			keyManager, err := signer.NewKeyManager(privateKeyBytes)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to create key manager: %v", err))
				return
			}

			// Build transaction
			chainId := uint32(params.Get("chainId").Int())
			accountIndex := int64(params.Get("accountIndex").Int())
			apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
			nonce := int64(params.Get("nonce").Int())
			expiredAt := params.Get("expiredAt").Int()
			
			if expiredAt == 0 {
				expiredAt = int(time.Now().Add(10 * time.Minute).UnixMilli())
			}

			orderReq := &types.CreateOrderTxReq{
				MarketIndex:      uint8(params.Get("marketIndex").Int()),
				ClientOrderIndex: int64(params.Get("clientOrderIndex").Int()),
				BaseAmount:       int64(params.Get("baseAmount").Int()),
				Price:            uint32(params.Get("price").Int()),
				IsAsk:            uint8(params.Get("isAsk").Int()),
				Type:             uint8(params.Get("orderType").Int()),
				TimeInForce:      uint8(params.Get("timeInForce").Int()),
				ReduceOnly:       uint8(params.Get("reduceOnly").Int()),
				TriggerPrice:     uint32(params.Get("triggerPrice").Int()),
				OrderExpiry:      int64(params.Get("orderExpiry").Int()),
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        int64(expiredAt),
			}

			// Sign the order
			signedTx, err := types.ConstructCreateOrderTx(keyManager, chainId, orderReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign order: %v", err))
				return
			}

			// Convert to JSON
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

// signCancelOrder signs a cancel order transaction
func signCancelOrder(this js.Value, args []js.Value) interface{} {
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
				reject.Invoke("Missing arguments: no parameters provided")
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

			cancelReq := &types.CancelOrderTxReq{
				MarketIndex: uint8(params.Get("marketIndex").Int()),
				Index:       int64(params.Get("orderIndex").Int()),
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructL2CancelOrderTx(keyManager, chainId, cancelReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign cancel: %v", err))
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

// createAuthToken creates an authentication token
func createAuthToken(this js.Value, args []js.Value) interface{} {
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
				reject.Invoke("Missing arguments: no parameters provided")
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

			accountIndex := int64(params.Get("accountIndex").Int())
			apiKeyIndex := uint8(params.Get("apiKeyIndex").Int())
			expiryHours := params.Get("expiryHours").Int()
			
			if expiryHours == 0 {
				expiryHours = 8
			}
			
			deadline := time.Now().Add(time.Duration(expiryHours) * time.Hour)

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
			}

			authToken, err := types.ConstructAuthToken(keyManager, deadline, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to create auth token: %v", err))
				return
			}

			resolve.Invoke(authToken)
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}
