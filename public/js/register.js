window.onload = function(){
    document.querySelector(".register_submit").addEventListener("click", (e)=>{
        var fields = {
            email : document.querySelector("[name=email]").value,
            first_name: document.querySelector(["[name=first_name]"]).value,
            last_name: document.querySelector(["[name=last_name]"]).value,
            password : document.querySelector(["[name=password]"]).value,
            confirm_password : document.querySelector(["[name=confirm_password]"]).value
        }
        if(!fields.email || !fields.password || fields.password != fields.confirm_password){
            return;
        }
        fetch("/ua/data", {
            method : 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({
                "!user_register>reg" : [{
                    email : fields.email,
                    password : fields.password,
                    firstName : fields.first_name,
                    lastName : fields.last_name
                }]
            })
        }).then(resp=>{
            resp.json && resp.json().then(json=>{
                if(json.success){
                    location.pathname = "/user/confirm"
                }
            })
        });
    });
}