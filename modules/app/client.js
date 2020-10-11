const QL = new (require("liteql"))();
QL.addResources({
    __delegate__(query){
        return new Promise((resolver)=>{
            var xmlHttpRequest = new XMLHttpRequest();
            xmlHttpRequest.addEventListener('load', ()=>{
                resolver(JSON.parse(xmlHttpRequest.responseText));
            });
            xmlHttpRequest.open('GET', '/data?query='+JSON.stringify(query));
            xmlHttpRequest.send();
        });	
    }
});
const modelFactory = require('./../../core/model');
function loadScript(path, cb){
    var script = document.createElement( "script" )
    script.type = "text/javascript";
    script.src = "/js/"+path+".js";
    script.onload = ()=>{
        cb();
    }
    document.getElementsByTagName( "head" )[0].appendChild( script );
}
function loadModel(name, arg){
    if(window.modelMgr.get(name)){
        return Promise.resolve(arg ? window.modelMgr.get(name).get(arg) : window.modelMgr.get(name));
    }
    if(~name.indexOf(".")){
        return new Promise((resolve, reject)=>{
            loadScript("models/"+name, ()=>{
                resolve(window.modelMgr.get(name));
            });
        });
    }
    else {
        return modelFactory.get(name, arg);
    }
}
module.exports = (path, param1, param2)=>{
    if(path == "QL") {
        return QL;
    }
    if(path == "model"){
        return loadModel(param1, param2);    
    }
    if(path == "script"){
        return new Promise((resolve, reject)=>{
            loadScript(param1, ()=>{
                resolve();
            });
        });
    }
}
