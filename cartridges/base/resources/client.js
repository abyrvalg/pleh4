module.exports = {
	getMyCleints(query){
        var profile = this.scope.session.getVar("currentProfile"),
            userID = (profile && profile.id) || query.therapist;
        return this.scope.$.call({
            "!storage_getClients" : {userID : userID}
        });
    },
    newClient(query){
        var profile = this.scope.session.getVar("currentProfile"),
			userID = (profile && profile.id) || query.therapist;
        return this.scope.$.call({
            "!storage_addClient" : {
                name : query.name,
                phone : query.phone,
                rate : query.rate,
                share : query.share,
                userID : userID
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