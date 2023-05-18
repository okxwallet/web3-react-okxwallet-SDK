# web3-react-okxwallet-SDK
Support web3-react(https://github.com/Uniswap/web3-react)

# How to use it

1. Install web3-react first.
2. download the code or npm install @okwallet/web3-react-okxwallet
3. import it


# Example 
``` javascript
    import { initializeConnector } from '@web3-react/core'
    import { OKXWallet } from ' @okwallet/web3-react-okxwallet'

    export const [okxWallet, hooks] = initializeConnector<OKXWallet>((actions) => new OKXWallet({ actions }))
```