window.onload = function(){
    document.getElementById("clients_table").addEventListener('click', (e)=>{
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
                    rate : document.querySelector("input[name=rate]").value
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
} 