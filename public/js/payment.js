(()=>{
    var url = "https://pleh4.herokuapp.com/data",
        transaction = window.location.search.match(/transaction\=(\w+)/),
        client = window.location.search.match(/client\=(\w+)/);
    transaction = transaction && transaction[1];
    client = client && client[1];
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({'!payment_load': {
            transactionID : transaction, 
            clientID : client
        }})
    }).then(resp=>{
        resp && resp.json().then(json=>{
            var button = $ipsp.get("button");
            button.setMerchantId(json.merchantID);
            json.amount && button.setAmount(+json.amount, 'UAH', true);
            button.setHost('pay.fondy.eu');
            button.setResponseUrl('https://4help.com');
            console.log(button.getUrl());
            json.transactionID && button.addParam('transactionID', json.transactionID); 
            json.clientID && button.addParam("clientID", json.clientID);
            json.therapistID && button.addParam('therapistID', json.therapistID); 
            $ipsp('checkout').scope(function(){
                this.setCheckoutWrapper('#payment_form');
                this.addCallback(data=>{
                    if(data.response_status == "success") {
                        return fetch(url, {
                            method : 'POST',
                            headers: {
                                'Content-Type': 'application/json;charset=utf-8'
                            },
                            body: JSON.stringify({'!payment_success': [JSON.parse(JSON.stringify(data.send_data).replace(/\_/g, "--underscore--")), {
                                clientID : json.clientID
                            }]})
                        }).then(r=>{
                            document.getElementById("payment_form").innerHTML = '<div class="confirm_window">Оплата Пройшла Успішно</div>'
                        })
                    }
                });
                this.loadUrl(button.getUrl());
            });
        });
    });
})();
