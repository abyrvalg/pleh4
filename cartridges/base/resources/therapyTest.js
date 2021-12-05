module.exports = {
    create : function(data){
        if(!this.scope.session.ensure("hasPermission:therapy.tests")) {
            return {success : false, error : "not_authorized"}
        }
        return this.scope.$.call([
            {"storage_localize>localizeResult" : [{locale : this.scope.locale, obj : data, regExp : "text"}, {id : -1}]},
            {"storage_createTherapyTest>testResult" : [{
                locale : this.scope.locale,
                test : "_localizeResult.test"
            },{id : "_localizeResult.transactionID"}]},
            {"storage_createTherapyTestQuestions>questionResult" : [{
                testID : "_testResult.id",
                questions : "_localizeResult.test.questions",
            }, {id : "_localizeResult.transactionID"}]},
            {"storage_createTherapyTestQuestionOptions>optionsResult" : ["_questionResult.options", 
                {id : "_localizeResult.transactionID"}]},
            {"storage_createTherapyTestTranscripts>transcriptResult" : [{
                testID : "_testResult.id",
                transcripts : "_localizeResult.test.transcripts",
            }, {id : "_localizeResult.transactionID", commit : true}]}
        ]).then(r=>{
            return {success : true}
        });
    },
    getTestList : function() {
        if(!this.scope.session.ensure("hasRole:therapist|manager")) {
            return {success : false, error : "not_authorized"}
        }
        return this.scope.$.call([{
            "!storage_getLocalizedTherapyTests" : [{locale : this.scope.locale}]
        }]).then(r=>{
            return r;
        });
    },
    prescript(data) {
        if(!this.scope.session.ensure("hasRole:therapist|manager")) {
            return {success : false, error : "not_authorized"}
        }
        if(!data || !data.clientID || !data.testID){
            return {success : false, error : "not_data_provided"}
        }
        return this.scope.$.call([{"storage_isMyClient>myClient": [{clientID : data.clientID, userID : this.scope.session.getVar("currentProfile").id}]},
            {"storage_getTestPrescriptions>notCompletedTest" : [{
                where : {
                    client : data.clientID,
                    test : data.testID,
                    result : null
                },
                fields : ["id"]
            }]}]).then(checkResult=>{
            if(!checkResult.myClient){
                return {success : false, "error": "action_is_not_allowed"}
            }
            if(checkResult.notCompletedTest && checkResult.notCompletedTest.length) {
                return {success : false, "error": "the_test_is_already_prescripted"};
            }
            return this.scope.$.call({"storage_prescriptTest" : [{clientID : data.clientID, testID : data.testID}]})
        })
    },
    getPrescriptedTest(data) {
        return this.scope.$.call([{
            "storage_getTestDetails>test" : [{prescription : data}]},
            {"!storage_getLocalized" : [{obj : "_test"}]
        }]);
    },
    getMyPrescriptions () {
        var profile = this.scope.session.getVar("currentProfile"),
            userID = (profile && profile.id);

        if(!this.scope.session.ensure("auth")){
            return {success: false, error: "not_available"}
        }
        
        return this.scope.$.call([
            {"storage_getPrescriptions>prescriptions" : [{client : {userID : userID}}]},
            {"!storage_getLocalized" : [{obj : "_prescriptions"}]}
        ])
    }
};
