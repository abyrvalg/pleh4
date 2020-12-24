window.onload = function(){
    document.querySelector(".appointment_list").addEventListener("click", (e)=>{
        fetch("/data", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({
                "!appointment_update" : [{id : e.target.dataset.id, status : +e.target.dataset.status}]
            })
        }).then(r=>{
            r && r.json && r.json().then(json=>{
                console.log(json);
                if(json.status == "ok") {
                    e.target.closest(".change_status").innerHTML = '<div class="status">'+(e.target.dataset.status == - 1 
                    ? '<input class="button_confirm" data-id="'+e.target.dataset.id+'" type="submit" data-status="1" value="V"/>' 
                    : 'V')+'</div><div class="status">'+(e.target.dataset.status ==  1 
                        ? '<input class="button_cancel" data-id="'+e.target.dataset.id+'" type="submit" data-status="-1" value="X"/>' 
                        : 'X')+'</div>';
                }
            });
        });
    });
} 