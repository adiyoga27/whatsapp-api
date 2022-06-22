import makeWASocket, { AnyMessageContent, delay, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, MessageRetryMap, useMultiFileAuthState } from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'
import MAIN_LOGGER from './src/utils/logger'
import * as fs from 'fs'
var pm2 = require('pm2');
require('dotenv').config()
const axios = require("axios");

const socketIO = require('socket.io')
const process2 = require('process');
const qrcode = require('qrcode');
const configs = {
    app_name: process2.env.APP_NAME,
    port: process2.env.APP_PORT,// custom port to access server
    app_socket: process2.env.APP_SOCKET,// custom port to access server

};
const { body, validationResult } = require('express-validator')
const { phoneNumberFormatter } = require('../helper/formatter')

const express = require('express'),
    app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
let server;
if(configs.app_socket === 'https'){
// Certificate
const privateKey = fs.readFileSync('/etc/letsencrypt/live/wabot.galkasoft.id/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/wabot.galkasoft.id/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/wabot.galkasoft.id/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

 server = http.createServer(credentials, app);
}else{
    var http = require('http')
     server = http.createServer(app)
    
}

const io = socketIO(server, {
    cors: {
        origin: "*"
    }
});
server.listen(configs.port, () => {
    console.log('\x1b[33m%s\x1b[0m', `Server listening on `+ configs.app_socket+" / "+ configs.port);
});



const logger = MAIN_LOGGER.child({})
// logger.level = 'trace'
logger.level = 'silent'



const useStore = !process.argv.includes('--no-store')
const doReplies = !process.argv.includes('--no-reply')
const msgRetryCounterMap: MessageRetryMap = {}

// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = useStore ? makeInMemoryStore({ logger }) : undefined
store?.readFromFile('./baileys_store_multi.json')
// save every 10s
setInterval(() => {
    store?.writeToFile('./baileys_store_multi.json')
}, 10_000)


const connectToWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
    const sock = makeWASocket({
        // can provide additional config here
        logger,
        printQRInTerminal: true,
        auth: state,
    })
    store?.bind(sock.ev)

  
    const user = await sock.user;
    

    sock.ev.on('creds.update', saveCreds)


    // =================== SOCKET IO =================================
    io.on("connection", function (socket) {
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr,isNewLogin } = update
                console.log('\x1b[33m%s\x1b[0m', 'connection ', connection, ', reconnecting : ',isNewLogin)
            
            if (connection === 'open') {
                io.emit('authenticated', "Hai,  "+user.name + "( "+ user.id +")")

                console.log('\x1b[33m%s\x1b[0m', 'opened connection')
            } else {
                
                if(connection === 'close') {
                    if((lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
                        connectToWhatsApp()
                        
                    }
                }
              
                
                // const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
                // console.log('\x1b[33m%s\x1b[0m', 'connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
                // // reconnect if not logged out
                // if (shouldReconnect) {
                // }
                fs.readdir('./baileys_auth_info', function(err, data) {
                  if(err){
                    try {
                        qrcode.toDataURL(qr, (err, url) => {
                            socket.emit('message', 'QR Code received, scan please!')
                            console.log('\x1b[33m%s\x1b[0m', qr)
                            socket.emit("qr", url)
                        })
                        } catch (error) {
                            console.log('\x1b[33m%s\x1b[0m', 'error catch'+ error)
                        }
                  }else{
                    if (data.length == 0 ) {
                        try {
                            qrcode.toDataURL(qr, (err, url) => {
                                socket.emit('message', 'QR Code received, scan please!')
                                console.log('\x1b[33m%s\x1b[0m', qr)
                                socket.emit("qr", url)
                            })
                            } catch (error) {
                                console.log('\x1b[33m%s\x1b[0m', 'error catch'+ error)
                            }
            
                    }
                  }
                    
                })
              
            }
        })
        
        socket.on('ready', async () => {
            io.emit('loader', '')

            fs.readdir('./baileys_auth_info', function(err, data) {
                if(err){
                    io.emit('isdelete', '<h2 class="text-center text-danger mt-4">Your whatsapp is not Running!,check Connection Anda ?!<h2>')

                }else{
                    if (data.length > 0) {
                        io.emit('authenticated', "Hai,  " + user.name + "( " + user.id + ")")
    
                    }else{
                     io.emit('isdelete', '<h2 class="text-center text-danger mt-4">Your whatsapp is not Running!,check Connection Anda ?!<h2>')
    
                    }
                }
               
            })
          
        })
        socket.on('logout', () => {
            console.log('\x1b[33m%s\x1b[0m', '=== socket logout ===')
			if (fs.existsSync("./baileys_auth_info")) {
                if (fs.existsSync("./baileys_auth_info.json")) {
				    fs.unlinkSync("./baileys_auth_info.json");
                }
                if (fs.existsSync("./baileys_store_multi.json")) {
				    fs.unlinkSync("./baileys_store_multi.json");
                }
				fs.rmSync("./baileys_auth_info", { recursive: true, force: true });
				socket.emit('isdelete', '<h2 class="text-center text-info mt-4">Logout Berhasil, Silahakan Refresh dan tunggu 15-30 detik untuk dapat melakukan broadcast<h2>')
                restartPm2();
            } else {
				socket.emit('isdelete', '<h2 class="text-center text-danger mt-4">Kamu belum melakukan scan, Scan terlebih dahulu!!<h2>')
			}
		})

        socket.on('scanqr', () => {
            fs.readdir('./baileys_auth_info', function(err, data) {
             if(err){
                io.emit('loader', '')
                socket.emit('message', 'Please wait..')
             }else{
                if (data.length == 0 ) {
                    io.emit('loader', '')
                    socket.emit('message', 'Please wait..')

                }else{
                    io.emit('isdelete', '<h2 class="text-center text-primary mt-4">Your whatsapp is Running! </h2> ' + user.name + ' ( ' + user.id + ' ) ')
                }
            }
            })
            
		})

        socket.on('cekstatus', async () => {
            console.log('\x1b[33m%s\x1b[0m', '========= RUN CHECK =============')

            fs.readdir('./baileys_auth_info', function(err, data) {
             
                if (data.length == 0 || err) {
                    io.emit('isdelete', '<h2 class="text-center text-danger mt-4">Your whatsapp is not Running!,check Connection Anda ?!<h2>')


                }else{
                    io.emit('isdelete', '<h2 class="text-center text-primary mt-4">Your whatsapp is Running! </h2> ' + user.name + ' ( ' + user.id + ' ) ')

                }
            })

         
		})

    })


    //API EXPRESS JS

    app.get("/v2/check-connection", async (req, res) =>  {
        
        fs.readdir('./baileys_auth_info', function(err, data) {
             
            if (data.length == 0 || err) {

                return res.status(200).json({
                    status: false,
                    message: user.name + " : Disconnected"
                });
            }else{
                return res.status(200).json({
                    status: true,
                    message: user.name + " : Connected"
                });
            }
        })

    });

    // send message
    app.post('/v2/send-message', [
        body('number').notEmpty(),
        body('message').notEmpty(),
    ], async (req, res) => {
        //validate input
        const errors = validationResult(req).formatWith(({
            msg
        }) => {
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
            if(err.output.statusCode === 428){
                restartPm2();
            }
            return res.status(500).json({
                status: false,
                response: err
            });
        });
    });

    
	// send media
	app.post('/v2/send-media', [
		body('number').notEmpty(),
		body('url').notEmpty(),
		body('filetype').notEmpty(),
	], async (req, res) => {
		const errors = validationResult(req).formatWith(({
			msg
		}) => {
			return msg;
		});
		if (!errors.isEmpty()) {
			return res.status(422).json({
				status: false,
				message: errors.mapped()
			});
		}
		const getBuffer = async (url, options = {}) => {
			try {
				options ? options : {}
				const res = await axios({
					method: "get",
					url,
					...options,
					responseType: 'arraybuffer'
				})
				return res.data
			} catch (e) {
				console.log(`Error : ${e}`)
			}
		}
			const number = phoneNumberFormatter(req.body.number);
			const url = req.body.url;
			const filetype = req.body.filetype;
			const filename = req.body.filename;
			const caption = req.body.caption;
			if (filetype == 'jpg' || filetype == 'jpeg' || filetype == 'png') {
	
					const buffer = await getBuffer(url)
					await sock.sendMessage(
						number, 
						{ 
							image: {url: url},
							caption: caption,
							
						}
					).then(response => {
						return res.status(200).json({
							status: true,
							response: response
						});
					}).catch(err => {
                        if(err.output.statusCode === 428){
                            restartPm2();
                        }
						return res.status(500).json({
							status: false,
							response: err
						});
						console.log('gagal')
					});
		
				}else if(filetype == 'mp4' || filetype == '3gp' || filetype == 'mkv'){
					const buffer = await getBuffer(url)
					await sock.sendMessage(
						number, 
						{ 
							video: {url: url},
							caption: caption,
							
						}
					).then(response => {
                        
						return res.status(200).json({
							status: true,
							response: response
						});
					}).catch(err => {
                        if(err.output.statusCode === 428){
                            restartPm2();
                        }
						return res.status(500).json({
							status: false,
							response: err
						});
						console.log('gagal')
					});
				}else if(filetype == 'mp3'){
					const buffer = await getBuffer(url)
					await sock.sendMessage(
						number, 
						{ 
							audio: {url: url},
							caption: caption,
							
						}
					).then(response => {
						return res.status(200).json({
							status: true,
							response: response
						});
					}).catch(err => {
                        if(err.output.statusCode === 428){
                            restartPm2();
                        }

						return res.status(500).json({
							status: false,
							response: err
						});
					});
				}
			
		});
}
connectToWhatsApp()


function restartPm2() {
	pm2.connect(function (err) {
		if (err) {
			console.log(err)
		}

		pm2.restart(configs.app_name, function (err, apps) {
			if (err) {
				console.log(err)
			}
			pm2.disconnect();
		});
	});
}

module.exports = app;