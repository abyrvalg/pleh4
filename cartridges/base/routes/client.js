

module.exports = {
    list : (scope)=>{
        if(!scope.session.getVar("currentProfile")){
            return Promise.resolve({
                status : 'redirect', 
                path : "/user/login"
            });
        }
        return scope.$.call([
            {"client_getMyCleints>clients" : []},
            {"!base_template":["myClients", {clients : "_clients"}]}
        ]);
    }
}