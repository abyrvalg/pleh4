window.onload = function(){
    document.querySelector(".clients_primory").addEventListener('click', (e)=>{
        if(e.target.classList.contains('new_client')){
            document.querySelector('form.new_client_form').classList.remove('hidden');
            return;
        }
        if(e.target.classList.contains('cancel')) {
            document.querySelector('form.new_client_form').classList.add('hidden');
            return;
        }

        if(e.target.classList.contains('add_client')) {
            fetch("/ua/data", {
                method : 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body:JSON.stringify({"!client_newClient" : [{
                    name : document.querySelector("input[name=name]").value,
                    phone : document.querySelector("input[name=phone]").value,
                    rate : document.querySelector("input[name=rate]").value,
                    share : document.querySelector("input[name=share]").value
                }]})
            }).then(resp=>{
                resp.json && resp.json().then(json=>{
                    if(json && json.success){
                        location.reload();
                    }
                });
            });
        }
        if(e.target.classList.contains('remove_client')) {
            fetch("/ua/data", {
                method : 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body:JSON.stringify({"!client_remove" : [{
                    id : e.target.dataset.id
                }]})
            }).then(resp=>{
                resp.json && resp.json().then(json=>{
                    if(json && json.success){
                        location.reload();
                    }
                });
            });
        }
    });
    document.querySelector(".prescritp_test_submit").addEventListener("click", e=>{
        fetch("/ua/data", {
            method : 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body:JSON.stringify({"!therapyTest_prescript" : [{
                clientID : document.querySelector(".clients_primory").dataset.clientid,
                testID : document.querySelector(".prescript_test_select").value
            }]})
        }).then(resp=>{
            resp.json && resp.json().then(json=>{
                console.log(json);
            })
        })
    });
} 