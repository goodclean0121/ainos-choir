#!/usr/bin/env bash
# Converts a real file with the locally installed tools: ./converter/integration.sh <file> <format>
set -euo pipefail
node --input-type=module -e "
import { convert } from './converter/convert.mjs';
const r = await convert(process.argv[1], process.argv[2]);
console.log(JSON.stringify(r));
" "$1" "$2"
