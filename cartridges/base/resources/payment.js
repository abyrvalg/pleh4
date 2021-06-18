var crypto = require('crypto');
function checkSignature(obj){
    var values = [];
    Object.keys(obj).sort().forEach(key=>{
        if(obj[key] && key != "signature" && key != "response_signature_string") {
            values.push(obj[key]);
        }
    });            
    values.unshift(process.env.paymentMerchantSecret);
    var shasum = crypto.createHash('sha1');
    shasum.update(values.join("|"));
    return obj.signature === shasum.digest('hex');
}

module.exports = {
    load(query){
        return  query.transactionID ? this.scope.$.call({
            "!storage_getTransaction" : {id : quary.transactionID, fields : ['id', 'amount']}
        }).then(r=>{
            return {
                merchantID : +process.env.paymentMerchantID,
                transactionID : r && r.id,
                amount : r && r.amount
            }
        }) : this.scope.$.call({
            "!storage_getClient" : {fields : ["id", "rate", "therapist"], id : query.clientID}
        }).then(r=>{
            return {
                merchantID : +process.env.paymentMerchantID,
                clientID : r.id,
                amount : r.rate,
                therapistID : r.therapist
            }
        })
    },
    success(data, transaction){
        data = JSON.parse(JSON.stringify(data).replace(/\-\-underscore\-\-/g, "_"));
        var $ = this.scope.$,
            amount = (+data.amount)/100;
        if(!checkSignature(data)){
            return {success : false, error: "signature_not_match"}
        }
        return $.call({
            "!storage_fulfillPaymentTransaction" : {
                id : transaction.id,
                clientID : transaction.clientID,
                amount : amount,
                external : data.order_id.replace(/\_/g, "-")
            }
        }).then(transactionDetails => {
            if(!transactionDetails.success) {
                return {success : false}
            }
            return $.call({
                "!msg_send" : {
                    "tmplName" : "mails/paymentRecieved",
                    "contenxts" : [{
                        tgid : transactionDetails.data.tg_id,
                        clientName : transactionDetails.data.client_name,
                        phone : transactionDetails.data.client_phone,
                        amount: amount
                    }]
                }
            })
        });
    }
}