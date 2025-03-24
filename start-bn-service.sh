#!/bin/bash
cd "$(dirname "$0")"
export BINANCE_API_KEY="rLV9ffU8oyqanh5znqit08j8CnILLvDCkRgcxdx2ePdVBxmxSYqgvSNeybyx2mtL"
export BINANCE_API_SECRET="ukawP66HgMDvLnSJOYAk7qkJEbdIvlcDwQuc2WxoD7E0FZJ5TupKhP4WsCbAeECd"
node build/index.js
