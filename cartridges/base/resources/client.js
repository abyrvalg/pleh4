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
                therapistUserID : userID
            }
        })
    },
    remove(query) {
        return this.scope.$.call({
            "!storage_disableClient" : {id : query.id}
        }).then(r=>{
            return {success: true}
        });
    },
    getMyClientCard(id) {
        if(!this.scope.session.ensure("hasRole:therapist|manager")) {
            return {success : false, error : "not_authorized"}
        }
        return this.scope.$.call([{
            "storage_getMyClientCard>card" : [{userID : this.scope.session.getVar("currentProfile").id, clientID: id}]
            },
            {"therapyTest_getTestList>tests" : []},
        ]).then(r=>{
            r.card.prescriptions.map(el=>{
                r.tests.forEach(test=>{
                    if(test.id == el.testID) {
                        el.name = test.name;
                        el.details = test.details;
                    }
                });
                el.date = el.date.getDate()+"/"+(el.date.getMonth()+1)+"/"+(el.date.getFullYear())
            });
            r.card.results.map(el=>{
                r.tests.forEach(test=>{
                    if(test.id == el.testID) {
                        el.name = test.name;
                        el.testDetails = test.details;
                    }
                });
                el.date = el.date.getDate()+"/"+(el.date.getMonth()+1)+"/"+(el.date.getFullYear())
            });
            return r;
        });
    },
    getUnassignedClients() {
        if(!this.scope.session.ensure("hasRole:coordinator")) {
            return {success : false, error : "not_authorized"}
        }
        return this.scope.$.call({"!storage_getUnassignedClients" : []});
    },
    assignClientsToTherapists(data) {
        if(!this.scope.session.ensure("hasRole:coordinator")) {
            return {success : false, error : "not_authorized"}
        }
        return this.scope.$.call({"!storage_assignClientsToTherapists": data})
    }
}