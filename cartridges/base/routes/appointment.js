module.exports = {
	list : (scope)=>{   
        if(!scope.session.getVar("currentProfile")){
            return scope.res.redirect("/user/login");
        }
        return scope.$.call([
            {"storage_appointments>appointments" : []},
            {"!base_template" : ["appointmentList", "_appointments"]}
        ])
    }
}