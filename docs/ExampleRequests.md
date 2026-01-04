# Example Requests

Below are some example queries using curl to test the Rosetta API endpoints.

**Note:** The correct network identifiers are:
- Mainnet: `{"blockchain": "DigiByte", "network": "livenet"}`
- Testnet: `{"blockchain": "DigiByte", "network": "testnet"}`

---

## Data API Endpoints

### Retrieve Network List
```bash
curl -X POST http://localhost:8080/network/list \
  -H 'Content-Type: application/json' \
  -d '{"metadata":{}}'
```

### Retrieve Network Status
```bash
curl -X POST http://localhost:8080/network/status \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"}}'
```

### Retrieve Network Options
```bash
curl -X POST http://localhost:8080/network/options \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"}}'
```

### Get Genesis Block
```bash
curl -X POST http://localhost:8080/block \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"},"block_identifier":{"hash":"7497ea1b465eb39f1c8f507bc877078fe016d6fcb6dfad3a64c98dcc6e1e8496","index":0}}'
```

### Get Block with height=1
```bash
curl -X POST http://localhost:8080/block \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"},"block_identifier":{"hash":"4da631f2ac1bed857bd968c67c913978274d8aabed64ab2bcebc1665d7f4d3a0","index":1}}'
```

### Get Block by Index Only
```bash
curl -X POST http://localhost:8080/block \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"},"block_identifier":{"index":100000}}'
```

### Get Mempool Transaction IDs
```bash
curl -X POST http://localhost:8080/mempool \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"}}'
```

### Get Mempool Transaction (Detail)
```bash
# Replace with actual transaction hash from mempool
curl -X POST http://localhost:8080/mempool/transaction \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"},"transaction_identifier":{"hash":"REPLACE_WITH_TX_HASH"}}'
```

### Get Account Balance
```bash
curl -X POST http://localhost:8080/account/balance \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"},"account_identifier":{"address":"DBUdfo4FKrdcmmEc3i6twu5hdSojKx4LxY"}}'
```

### Get Account Balance at Specific Block Height
```bash
curl -X POST http://localhost:8080/account/balance \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"},"account_identifier":{"address":"DBUdfo4FKrdcmmEc3i6twu5hdSojKx4LxY"},"block_identifier":{"index":100000}}'
```

### Get Account Balance at Specific Block Hash
```bash
curl -X POST http://localhost:8080/account/balance \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"},"account_identifier":{"address":"DBUdfo4FKrdcmmEc3i6twu5hdSojKx4LxY"},"block_identifier":{"hash":"0be8462fa449f92486972d529a9cf48c49a81c78616e7ab5959d89b313550a60"}}'
```

---

## Construction API Endpoints

### Derive Address from Public Key
```bash
curl -X POST http://localhost:8080/construction/derive \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"},"public_key":{"hex_bytes":"022CE71A795A40C1FBBED4F7868BD57FDB0D6B1CD8156C7721050A851DE7C60F9E","curve_type":"secp256k1"}}'
```

### Preprocess Transaction
```bash
curl -X POST http://localhost:8080/construction/preprocess \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"},"operations":[{"operation_identifier":{"index":0},"type":"TRANSFER","account":{"address":"SOURCE_ADDRESS"},"amount":{"value":"-1000000","currency":{"symbol":"DGB","decimals":8}}},{"operation_identifier":{"index":1},"type":"TRANSFER","account":{"address":"DEST_ADDRESS"},"amount":{"value":"1000000","currency":{"symbol":"DGB","decimals":8}}}]}'
```

---

## Testing with jq (Pretty Print)

All examples can be piped through `jq` for better readability:

```bash
curl -X POST http://localhost:8080/network/status \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"}}' | jq
```

---

## Additional Resources

- [Rosetta API Specification](https://www.rosetta-api.org/docs/Reference.html)
- [Validation Examples](./Validation.md)
- [Rosetta Compliance Checklist](./ROSETTA_COMPLIANCE_CHECKLIST.md)