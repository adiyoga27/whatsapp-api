const TelegramLogger = require('node-telegram-logger')
let tg = new TelegramLogger('5431900903:AAHvqihPAu0_neKn-ixN-XVOu2EAP5bbbps','-1001657521948')
const winston = require('winston')
const process = require('process');
require('dotenv').config()


// DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL, ALERT, EMERGENCY

export const emergecyLog = function (message: any){
    tg.sendMessage('====== '+process.env.APP_NAME+'======\n\n'+message+'\n','EMERGENCY')

}

export const infoLog = function (message: any){

    tg.sendMessage('======'+process.env.APP_NAME+" : "+process.env.APP_PORT+'======\n\n'+message+'\n','INFO')
}

