#!/bin/bash
# Build Lighter WASM

echo "🔨 Building Lighter WASM..."

# Copy wasm_exec.js from Go installation
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" ../

# Build WASM
GOOS=js GOARCH=wasm go build -o ../lighter.wasm main.go

# Check size
SIZE=$(stat -f%z "../lighter.wasm" 2>/dev/null || stat -c%s "../lighter.wasm" 2>/dev/null)
SIZE_MB=$(echo "scale=2; $SIZE / 1024 / 1024" | bc)

echo "✅ Build complete!"
echo "📦 Size: ${SIZE_MB} MB"
echo "📁 Output: lighter.wasm"
echo ""
echo "🌐 To test, run:"
echo "   cd .. && python3 -m http.server 8000"
echo "   Then open: http://localhost:8000/place-order.html"
