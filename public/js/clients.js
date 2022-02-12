
document.querySelector(".clients_primory").addEventListener('click', (e)=>{
    if(document.querySelector("#popup")){
        document.querySelector("#popup").remove();
    }
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
    if(e.target.classList.contains("showResult")) {
        e.preventDefault();
        var resultID = e.target.dataset.resultid;
        fetch("/ua/data", {
            method : 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body:JSON.stringify([
                {"therapyTest_getTestResult>result" : [{id : resultID}]},
                {"base_template>rendered":["testResultDetails", "_result"]}
            ])
        }).then(resp=>{
            resp.json && resp.json().then(json=>{
                var container = document.querySelector("#popup");
                if(!container) {
                    let popupElement = document.createElement("div");
                    popupElement.setAttribute("id", "popup");
                    document.querySelector("body").appendChild(popupElement);
                    container = document.querySelector("#popup");
                }
                container.innerHTML = json.rendered;
            })
        });
    }
});
document.querySelector(".prescritp_test_submit") && document.querySelector(".prescritp_test_submit").addEventListener("click", e=>{
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
            if(json && json.success){
                location.reload();
            }
        })
    })
});
document.querySelector(".assign_clients") && document.querySelector(".assign_clients").addEventListener("click", e=>{
    var params = {};
    document.querySelectorAll(".assignment_val").forEach($select=>{
        $select.value && (params[$select.dataset.clientid] = $select.value);
    });
    console.log(params);
    fetch("/ua/data", {
        method : 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body:JSON.stringify({"!client_assignClientsToTherapists" : [params]})
    }).then(resp=>{
        resp.json && resp.json().then(json=>{
            if(json && json.success){
                location.reload();
            }
        });
    });
});