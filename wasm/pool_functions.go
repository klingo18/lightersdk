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

// signCreatePublicPool signs a create public pool transaction
func signCreatePublicPool(this js.Value, args []js.Value) interface{} {
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

			poolReq := &types.CreatePublicPoolTxReq{
				OperatorFee:           int64(params.Get("operatorFee").Int()),
				InitialTotalShares:    int64(params.Get("initialTotalShares").Int()),
				MinOperatorShareRate:  int64(params.Get("minOperatorShareRate").Int()),
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructCreatePublicPoolTx(keyManager, chainId, poolReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign pool creation: %v", err))
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

// signUpdatePublicPool signs an update public pool transaction
func signUpdatePublicPool(this js.Value, args []js.Value) interface{} {
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

			updatePoolReq := &types.UpdatePublicPoolTxReq{
				PublicPoolIndex:      int64(params.Get("publicPoolIndex").Int()),
				Status:               uint8(params.Get("status").Int()),
				OperatorFee:          int64(params.Get("operatorFee").Int()),
				MinOperatorShareRate: int64(params.Get("minOperatorShareRate").Int()),
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructUpdatePublicPoolTx(keyManager, chainId, updatePoolReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign pool update: %v", err))
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

// signMintShares signs a mint shares transaction
func signMintShares(this js.Value, args []js.Value) interface{} {
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

			mintReq := &types.MintSharesTxReq{
				PublicPoolIndex: int64(params.Get("publicPoolIndex").Int()),
				ShareAmount:     int64(params.Get("shareAmount").Int()),
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructMintSharesTx(keyManager, chainId, mintReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign mint shares: %v", err))
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

// signBurnShares signs a burn shares transaction
func signBurnShares(this js.Value, args []js.Value) interface{} {
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

			burnReq := &types.BurnSharesTxReq{
				PublicPoolIndex: int64(params.Get("publicPoolIndex").Int()),
				ShareAmount:     int64(params.Get("shareAmount").Int()),
			}

			ops := &types.TransactOpts{
				FromAccountIndex: &accountIndex,
				ApiKeyIndex:      &apiKeyIndex,
				Nonce:            &nonce,
				ExpiredAt:        expiredAt,
			}

			signedTx, err := types.ConstructBurnSharesTx(keyManager, chainId, burnReq, ops)
			if err != nil {
				reject.Invoke(fmt.Sprintf("Failed to sign burn shares: %v", err))
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
