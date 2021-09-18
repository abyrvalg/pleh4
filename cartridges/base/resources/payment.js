const crypto = require('crypto');
const API_URL = "pay.fondy.eu";

function getSignature(obj, secret) {
    var values = [];
    Object.keys(obj).sort().forEach(key=>{
        if(obj[key] && key != "signature" && key != "response_signature_string" && key != "version") {
            values.push(obj[key]);
        }
    });             
    values.unshift(secret || process.env.paymentMerchantSecret);
    var shasum = crypto.createHash('sha1');
    shasum.update(values.join("|"));
    return shasum.digest('hex');
}

function checkSignature(obj, secret){
    return obj.signature === getSignature(obj, secret);
}
function splitTransaction(transactionDetails){
    var http = require("https");
    var data = {
        "request": {
            "version": "2.0",
            "data": Buffer.from(JSON.stringify({
                "order": {
                    "server_callback_url": ROOT_URL+"/payement/callback",
                    "currency": "UAH",
                    "amount": transactionDetails.amount*100,
                    "order_type": "settlement",
                    "order_id": transactionDetails.order_id,
                    "operation_id": transactionDetails.order_id,
                    "order_desc": "therapy session payment",
                    "merchant_id": transactionDetails.tech_merchant,
                    "receiver": [
                        {
                            "requisites": {
                            "amount": transactionDetails.therapistShare*100,
                            "settlement_description": "Session payment",
                            "merchant_id": transactionDetails.therapist_merchant
                            },
                            "type": "merchant"
                        },{
                            "requisites": {
                            "amount": transactionDetails.centerShare*100,
                            "settlement_description": "Session payment",
                            "merchant_id": transactionDetails.center_merchant
                            },
                            "type": "merchant"
                        }
                    ]
                } 
            })).toString('base64'),
        }
    }
    data.request.signature = getSignature(data.request, transactionDetails.tech_secret);
    var json = JSON.stringify(data);
    return new Promise((resolve, reject)=>{
        var req = http.request({
            host : API_URL,
            path : "/api/settlement",
            method : "POST",
            headers : {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(json)
            }
        }, (res)=>{
            res.on('data', (chunk) => {
                chunk = chunk && JSON.parse(chunk.toString());
                chunk && chunk.response && chunk.response.data && resolve(JSON.parse(new Buffer.from(chunk.response.data, 'base64').toString('ascii')));
            });
        });

        req.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
        });

        req.write(json);
        req.end();  
        
    });
}
const PAYMENT_TECH_ACCOUNT = 1;
const PAYMENT_COMPANY_ACCOUNT = 2;
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
        }) : this.scope.$.call([{
            "storage_getClient>client" : {fields : ["id", "rate", "therapist", "rate"], id : query.clientID}},
            {"storage_getPaymentAccount>accounts" : {fields : ["merchant"], roles : [PAYMENT_COMPANY_ACCOUNT], clientID : query.clientID}
        }]).then(r=>{
            return r ? {
                merchantID : +r.accounts.merchant,
                clientID : r.client.id,
                amount : r.client.rate,
                therapistID : r.client.therapist,
                redirectURL : process.env.paymentRedirectURL,
            } : {success : false, error: "no_client_found"}
        })
    },
    success(data, transaction){
        data = JSON.parse(JSON.stringify(data).replace(/\-\-underscore\-\-/g, "_"));
        var $ = this.scope.$,
            amount = (+data.amount)/100;

        return $.call({"!storage_getPaymentAccount" : {fields : ["secret"], roles : [PAYMENT_COMPANY_ACCOUNT], clientID : transaction.clientID}}).then(payment=>{
            if(!checkSignature(data, payment.secret)){
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
                //!payment.noSplit && $.call({"payment_split": transactionDetails.data.transactionID})
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
        });
    },
    split(id){
        var $ = this.scope.$;
        return $.call({
            "!storage_getExtendedPaymentTransaction" : id
        }).then(data => {
           return splitTransaction({
                amount : +data.amount,
                order_id : data.external_id,
                tech_merchant : data.tech_merchant,
                therapist_merchant : data.therapist_merchant,
                center_merchant : data.center_merchant,
                therapistShare : +(((+data.therapist_share)/100) * (+data.amount)).toFixed(2),
                centerShare : +((+data.amount) * (1 - (+data.therapist_share)/100)).toFixed(2),
                tech_secret : data.tech_secret,
            }).then(res=>{
                if(res && res.order) {
                    return $.call([
                        {"storage_settleTransaction" : id},
                        {"storage_getSplitTransactionReciever>tgid" : id},
                        {"!msg_send" : {
                            "tmplName" : "mails/paymentSplitted",
                            "contenxts" : [{
                                tgid : "_tgid",
                                therapist : data.therapist_first_name +" "+ data.therapist_last_name,
                                client : data.client_name,
                                amount : +((+data.amount) * (1 - (+data.therapist_share)/100)).toFixed(2)
                            }]
                        }}
                    ]);
                }
            });
        });
    }
}