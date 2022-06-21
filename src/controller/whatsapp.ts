import makeWASocket, { AnyMessageContent, delay, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, MessageRetryMap, useMultiFileAuthState  } from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'
import MAIN_LOGGER from '../utils/logger'
const { body, validationResult } = require('express-validator');
const { phoneNumberFormatter } = require('../helper/formatter');
const express = require('express'),
app = express()

require('dotenv').config()
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
const connectToWhatsApp = async() => {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
    const sock = makeWASocket({
        // can provide additional config here
		logger,
        printQRInTerminal: true,
        auth: state,
    })
    store?.bind(sock.ev)

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

    sock.ev.on('creds.update', saveCreds)
 



    app.get('/', (req: any, res: any)=>{
        res.send('hello')
    })

    app.post('/v2/send-message', [
        body('number').notEmpty(),
        body('message').notEmpty(),
    ], async (req: { body: { number: any; message: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { status: boolean; message?: any; response?: any; }): any; new(): any; }; }; }) => {
        //validate input
        const errors = validationResult(req).formatWith((
            msg: any
        ) => {
            return msg;
        });
        if (!errors.isEmpty()) {
            return res.status(422).json({
                status: false,
                message: errors.mapped()
            });
        }
        //end validate
        var number = phoneNumberFormatter(req.body.number);
        const message = req.body.message;
        
        await sock.sendMessage(number, { text: message }).then(response => {
                return res.status(200).json({
                    status: true,
                    response: response
                });
            }).catch(err => {
                
                return res.status(500).json({
                    status: false,
                    response: err
                });
            });
    });
}
connectToWhatsApp()

module.exports = app;