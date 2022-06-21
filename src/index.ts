import express from 'express';
import makeWASocket, { AnyMessageContent, delay, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, MessageRetryMap, useMultiFileAuthState  } from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'

import MAIN_LOGGER from '../src/Utils/logger'

const logger = MAIN_LOGGER.child({ })
logger.level = 'trace'

const useStore = !process.argv.includes('--no-store')
const doReplies = !process.argv.includes('--no-reply')
const msgRetryCounterMap: MessageRetryMap = { }

// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = useStore ? makeInMemoryStore({ logger }) : undefined
store?.readFromFile('./baileys_store_multi.json')
// save every 10s
setInterval(() => {
	store?.writeToFile('./baileys_store_multi.json')
}, 10_000)

async function connectToWhatsApp () {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
    const sock = makeWASocket({
        // can provide additional config here
		logger,
        printQRInTerminal: true,
        auth: state,
    })
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === 'open') {
            console.log('opened connection')
        }
    })
    // sock.ev.on('messages.upsert', m => {
    //     console.log(JSON.stringify(m, undefined, 2))

    //     console.log('replying to', m.messages[0].key.remoteJid)
    //     await sock.sendMessage(m.messages[0].key.remoteJid!, { text: 'Hello there!' })
    // })
}
// run in main file
connectToWhatsApp()

const app = express();
const port = 3000;

app.get('/', (req: any, res: { send: (arg0: string) => void; }) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
