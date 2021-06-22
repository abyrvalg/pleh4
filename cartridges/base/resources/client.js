module.exports = {
	getMyCleints(query){
        var profile = this.scope.session.getVar("currentProfile"),
			therapistID = (profile && profile.id) || query.therapist;
        return this.scope.$.call({
            "!storage_getClients" : {therapist : therapistID}
        });
    },
    newClient(query){
        var profile = this.scope.session.getVar("currentProfile"),
			therapistID = (profile && profile.id) || query.therapist;
        return this.scope.$.call({
            "!storage_addClient" : {
                name : query.name,
                phone : query.phone,
                rate : query.rate,
                therapist : therapistID
            }
        })
    },
    remove(query) {
        return this.scope.$.call({
            "!storage_disableClient" : {id : query.id}
        }).then(r=>{
            return {success: true}
        });
    }
}