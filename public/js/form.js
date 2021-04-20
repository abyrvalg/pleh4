window.onload = function(){
    function processCallback(cb, form, resp){
        cb = cb.split(":");
        ({
            route : ()=>window.location.pathname = cb[1],
            errorShow : (err)=>{
                if(err){
                    form.querySelector("[data-error="+cb[1]+"]").innerHTML = err;
                }
                form.querySelector("[data-error="+cb[1]+"]").classList.remove("hidden");
            }
        })[cb[0]](resp);
    }
    document.querySelector("body").addEventListener("submit", (e)=>{
        if(e.target.tagName == "FORM"){
            e.preventDefault();
            let elements = e.target.querySelectorAll("input,select"),
                params = {};
            elements.forEach(inp => {
                if(inp.type == "submit") return;
                params[inp.name] = inp.value
            }); 
            fetch("/ua/data", {
                method : 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify({
                    ["!"+e.target.dataset.target] : [params] 
                })
            }).then(resp=>{
                resp.json().then(json=>{
                    if(json.success) {
                        e.target.dataset["cbsuccess"] && processCallback(e.target.dataset["cbsuccess"], e.target);
                    }
                    else {
                        if(e.target.dataset["cberror_"+json.error]){
                            processCallback(e.target.dataset["cberror_"+json.error], e.target, json.msg);
                        }
                    }
                })
            });
        }
    });
}