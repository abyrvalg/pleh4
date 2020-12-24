const fs = require("fs");
module.exports = {
	list(filter){
    	return fs.promises.readdir(APP_ROOT+"/logs").then(files=>{
            console.log(files);
            return files
        });
	},
}