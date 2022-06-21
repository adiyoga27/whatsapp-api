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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const baileys_1 = __importStar(require("@adiwajshing/baileys"));
const logger_1 = __importDefault(require("../src/Utils/logger"));
const logger = logger_1.default.child({});
logger.level = 'trace';
const useStore = !process.argv.includes('--no-store');
const doReplies = !process.argv.includes('--no-reply');
const msgRetryCounterMap = {};
// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = useStore ? (0, baileys_1.makeInMemoryStore)({ logger }) : undefined;
store === null || store === void 0 ? void 0 : store.readFromFile('./baileys_store_multi.json');
// save every 10s
setInterval(() => {
    store === null || store === void 0 ? void 0 : store.writeToFile('./baileys_store_multi.json');
}, 10000);
function connectToWhatsApp() {
    return __awaiter(this, void 0, void 0, function* () {
        const { state, saveCreds } = yield (0, baileys_1.useMultiFileAuthState)('baileys_auth_info');
        const sock = (0, baileys_1.default)({
            // can provide additional config here
            logger,
            printQRInTerminal: true,
            auth: state,
        });
        sock.ev.on('connection.update', (update) => {
            var _a, _b;
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = ((_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== baileys_1.DisconnectReason.loggedOut;
                console.log('connection closed due to ', lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error, ', reconnecting ', shouldReconnect);
                // reconnect if not logged out
                if (shouldReconnect) {
                    connectToWhatsApp();
                }
            }
            else if (connection === 'open') {
                console.log('opened connection');
            }
        });
        // sock.ev.on('messages.upsert', m => {
        //     console.log(JSON.stringify(m, undefined, 2))
        //     console.log('replying to', m.messages[0].key.remoteJid)
        //     await sock.sendMessage(m.messages[0].key.remoteJid!, { text: 'Hello there!' })
        // })
    });
}
// run in main file
connectToWhatsApp();
const app = (0, express_1.default)();
const port = 3000;
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
