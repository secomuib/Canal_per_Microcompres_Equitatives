# Transferable Channels for Fair Micropurchases protocol

This repository contains the corresponding implementation and the corresponing tests for the Transferable Channels
for Fair Mucropurchases protocol published in the International Journal of Information Security (IJIS) journal with DOI: .

The implementation of the presented protocol is based in the usage of a defined smart contract jointly to a JSON Database that provides the abilities to execute the off-chain steps defined in the protocol. The protocol is based in the usage of hash chains to represent the $\mu$-coins and a set of corresponing proofs to ensure atomicity in the purchase operation. 

## Protocol introduction

This repository introduces a novel micropurchase protocol, implementing a new kind of channels, called transferable payment channels. Facilitating equitable and fair exchanges between minimal monetary units ($\mu$-coins) and desired goods or services, providing efficient payments of low values.

The protocol defines the process of:

- Performing purchases.
- Handling received payments.
- Incorporating functionalities for the transfer and reutilization of payment channels for both customers and merchants.
- Redeeming the earned $\mu$-coins by the merchant.
- Refunding the unused $\mu$-coins by the customer.

For a detailed explanation of the protocol check the presented paper in IJIS journal. 
## Execution with NodeJS

### Requirements for NodeJS execution

Requirements: [Node 12.13.0](https://nodejs.org/en/download/).

To install all dependencies, if necessary:
```
npm install
```

### Commands with NodeJS
To compile the smart contract:
```
npm run ethereum_compile
```

To deploy to Rinkeby test network:
```
npm run ethereum_deploy
```

To execute test:
```
npm run ethereum_test
```

To deploy to GitHub Pages:
```
npm run deploy
```

To start React JS development server:
```
npm run start
```

To start the json-server database: 
```
npm run json-server
```
