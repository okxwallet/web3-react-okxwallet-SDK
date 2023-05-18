"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OKXWallet = exports.NoOKXWalletError = void 0;
const types_1 = require("@web3-react/types");
class NoOKXWalletError extends Error {
    constructor() {
        super('OKXWallet not installed');
        this.name = NoOKXWalletError.name;
        Object.setPrototypeOf(this, NoOKXWalletError.prototype);
    }
}
exports.NoOKXWalletError = NoOKXWalletError;
function parseChainId(chainId) {
    return Number.parseInt(chainId, 16);
}
class OKXWallet extends types_1.Connector {
    constructor({ actions, options, onError }) {
        super(actions, onError);
        this.options = options;
    }
    isomorphicInitialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.eagerConnection)
                return;
            return (this.eagerConnection = Promise.resolve().then(() => __importStar(require('./detectEthereumProvider'))).then((m) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const provider = yield m.default(this.options);
                if (provider) {
                    this.provider = provider;
                    // handle the case when e.g. metamask and coinbase wallet are both installed
                    if ((_a = this.provider.providers) === null || _a === void 0 ? void 0 : _a.length) {
                        this.provider = (_b = this.provider.providers.find((p) => p.isOkxWallet)) !== null && _b !== void 0 ? _b : this.provider.providers[0];
                    }
                    this.provider.on('connect', ({ chainId }) => {
                        this.actions.update({ chainId: parseChainId(chainId) });
                    });
                    this.provider.on('disconnect', (error) => {
                        var _a;
                        // 1013 indicates that MetaMask is attempting to reestablish the connection
                        // https://github.com/MetaMask/providers/releases/tag/v8.0.0
                        if ((error === null || error === void 0 ? void 0 : error.code) === 1013) {
                            console.debug('MetaMask logged connection error 1013: "Try again later"');
                            return;
                        }
                        this.actions.resetState();
                        (_a = this.onError) === null || _a === void 0 ? void 0 : _a.call(this, error);
                    });
                    this.provider.on('chainChanged', (chainId) => {
                        this.actions.update({ chainId: parseChainId(chainId) });
                    });
                    this.provider.on('accountsChanged', (accounts) => {
                        if (accounts.length === 0) {
                            // handle this edge case by disconnecting
                            this.actions.resetState();
                        }
                        else {
                            this.actions.update({ accounts });
                        }
                    });
                }
            })));
        });
    }
    /** {@inheritdoc Connector.connectEagerly} */
    connectEagerly() {
        return __awaiter(this, void 0, void 0, function* () {
            const cancelActivation = this.actions.startActivation();
            try {
                yield this.isomorphicInitialize();
                if (!this.provider)
                    return cancelActivation();
                // Wallets may resolve eth_chainId and hang on eth_accounts pending user interaction, which may include changing
                // chains; they should be requested serially, with accounts first, so that the chainId can settle.
                const accounts = (yield this.provider.request({ method: 'eth_accounts' }));
                if (!accounts.length)
                    throw new Error('No accounts returned');
                const chainId = (yield this.provider.request({ method: 'eth_chainId' }));
                this.actions.update({ chainId: parseChainId(chainId), accounts });
            }
            catch (error) {
                console.debug('Could not connect eagerly', error);
                // we should be able to use `cancelActivation` here, but on mobile, metamask emits a 'connect'
                // event, meaning that chainId is updated, and cancelActivation doesn't work because an intermediary
                // update has occurred, so we reset state instead
                this.actions.resetState();
            }
        });
    }
    /**
     * Initiates a connection.
     *
     * @param desiredChainIdOrChainParameters - If defined, indicates the desired chain to connect to. If the user is
     * already connected to this chain, no additional steps will be taken. Otherwise, the user will be prompted to switch
     * to the chain, if one of two conditions is met: either they already have it added in their extension, or the
     * argument is of type AddEthereumChainParameter, in which case the user will be prompted to add the chain with the
     * specified parameters first, before being prompted to switch.
     */
    activate(desiredChainIdOrChainParameters) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let cancelActivation;
            if (!((_b = (_a = this.provider) === null || _a === void 0 ? void 0 : _a.isConnected) === null || _b === void 0 ? void 0 : _b.call(_a)))
                cancelActivation = this.actions.startActivation();
            return this.isomorphicInitialize()
                .then(() => __awaiter(this, void 0, void 0, function* () {
                if (!this.provider)
                    throw new NoOKXWalletError();
                // Wallets may resolve eth_chainId and hang on eth_accounts pending user interaction, which may include changing
                // chains; they should be requested serially, with accounts first, so that the chainId can settle.
                const accounts = (yield this.provider.request({ method: 'eth_requestAccounts' }));
                const chainId = (yield this.provider.request({ method: 'eth_chainId' }));
                const receivedChainId = parseChainId(chainId);
                const desiredChainId = typeof desiredChainIdOrChainParameters === 'number'
                    ? desiredChainIdOrChainParameters
                    : desiredChainIdOrChainParameters === null || desiredChainIdOrChainParameters === void 0 ? void 0 : desiredChainIdOrChainParameters.chainId;
                // if there's no desired chain, or it's equal to the received, update
                if (!desiredChainId || receivedChainId === desiredChainId)
                    return this.actions.update({ chainId: receivedChainId, accounts });
                const desiredChainIdHex = `0x${desiredChainId.toString(16)}`;
                // if we're here, we can try to switch networks
                return this.provider
                    .request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: desiredChainIdHex }],
                })
                    .catch((error) => {
                    var _a, _b;
                    // https://github.com/MetaMask/metamask-mobile/issues/3312#issuecomment-1065923294
                    const errorCode = ((_b = (_a = error.data) === null || _a === void 0 ? void 0 : _a.originalError) === null || _b === void 0 ? void 0 : _b.code) || error.code;
                    // 4902 indicates that the chain has not been added to MetaMask and wallet_addEthereumChain needs to be called
                    // https://docs.metamask.io/guide/rpc-api.html#wallet-switchethereumchain
                    if (errorCode === 4902 && typeof desiredChainIdOrChainParameters !== 'number') {
                        if (!this.provider)
                            throw new Error('No provider');
                        // if we're here, we can try to add a new network
                        return this.provider.request({
                            method: 'wallet_addEthereumChain',
                            params: [Object.assign(Object.assign({}, desiredChainIdOrChainParameters), { chainId: desiredChainIdHex })],
                        });
                    }
                    throw error;
                })
                    .then(() => this.activate(desiredChainId));
            }))
                .catch((error) => {
                cancelActivation === null || cancelActivation === void 0 ? void 0 : cancelActivation();
                throw error;
            });
        });
    }
    watchAsset({ address, symbol, decimals, image }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.provider)
                throw new Error('No provider');
            return this.provider
                .request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address,
                        symbol,
                        decimals,
                        image, // A string url of the token logo
                    },
                },
            })
                .then((success) => {
                if (!success)
                    throw new Error('Rejected');
                return true;
            });
        });
    }
}
exports.OKXWallet = OKXWallet;
