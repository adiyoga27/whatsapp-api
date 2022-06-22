import * as fs from 'fs'
const isCheckConnected = function (dir: any) {
    let status ;
    fs.readdir(dir, function(err, data) {
        if(err){
          status = false;
        }
        if (data.length > 0) {
            console.log(data.length)
            status = true;

        }
    })
    return status;

    
}

module.exports = {
    isCheckConnected
}