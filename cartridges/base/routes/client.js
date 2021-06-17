

module.exports = {
    list : (scope)=>{
        return scope.$.call([
            {"client_getMyCleints>clients" : []},
            {"!base_template":["myClients", {clients : "_clients"}]}
        ]);
    }
}