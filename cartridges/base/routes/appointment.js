module.exports = {
	list : (scope)=>{   
        if(!scope.session.getVar("currentProfile")){
            return Promise.resolve({
                status : 'redirect', 
                path : "/user/login"
            });
        }
        return scope.$.call([
            {"storage_myAppointments>appointments" : []},
            {"!base_template" : ["appointmentList", {"appointments": "_appointments"}]}
        ])
    },
    unassigned(scope){
        if(!scope.session.getVar("currentProfile")){
            return Promise.resolve({
                status : 'redirect', 
                path : "/user/login"
            });
        }
        return scope.$.call([
            {"storage_unassignedAppointments>appointments" : []},
            {"storage_getUsersByRoles>therapists" : [["therapist"]]},
            {"!base_template" : ["appointmentList", {"appointments":"_appointments", "therapists" : "_therapists"}]}
        ])
    }
}