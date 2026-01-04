## How to Validate Account Balance Retrieval

[CryptoID](https://chainz.cryptoid.info/) offers a great service when it comes to investigating history balances for different coins.

### Validate an Address with Many Transactions

Consider this public address: `DCzmzkMBqEz2tLn47W9YuNAV9cFzuWCydW`

This address contains 399k+ transactions (as of September 2020, likely more now). This is an excellent test case for the UTXO indexer.

**Note:** The following `curl` command may take several seconds to complete due to the large number of transactions:

```bash
curl -X POST http://127.0.0.1:8080/account/balance \
  -H 'Content-Type: application/json' \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"},"account_identifier":{"address":"DCzmzkMBqEz2tLn47W9YuNAV9cFzuWCydW"}}'
```

and yields this output:
```
{
    "block_identifier": {
        "index": 11489180,
        "hash": "00000000000000000915d818baeeb9cffb3e497e776cddb3a7045186d06731ca"
    },
    "balances": [
        {
            "value": "463275000",
            "currency": {
                "symbol": "DGB",
                "decimals": 8
            }
        }
    ]
} 
```    

which can be validated by looking at this url: [History Balances](https://chainz.cryptoid.info/dgb/address.dws?DCzmzkMBqEz2tLn47W9YuNAV9cFzuWCydW.htm)

Even after a block reorg (which occur several times a day) the balance remains correct.
By specifiying a block identifier in the request, history balances can be easily retrieved.
