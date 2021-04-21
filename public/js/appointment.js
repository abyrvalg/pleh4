window.onload = function(){
    document.querySelector(".appointment_table").addEventListener("click", (e)=>{
        if(e.target.parentNode.classList.contains("status")) {
            fetch("/data", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify({
                    "!storage_updateAppointment" : [{id : e.target.dataset.id, status : +e.target.dataset.status}]
                })
            }).then(r=>{
                r && r.json && r.json().then(json=>{
                    if(json.status == "ok") {
                        e.target.closest(".change_status").innerHTML = '<div class="status">'+(e.target.dataset.status == - 1 
                        ? '<input class="button_confirm" data-id="'+e.target.dataset.id+'" type="submit" data-status="1" value="V"/>' 
                        : 'V')+'</div><div class="status">'+(e.target.dataset.status ==  1 
                            ? '<input class="button_cancel" data-id="'+e.target.dataset.id+'" type="submit" data-status="-1" value="X"/>' 
                            : 'X')+'</div>';
                    }
                });
            });
        }
        else if(e.target.classList.contains("move_appointment") || e.target.classList.contains("new_appointment")){
            document.querySelectorAll(".appointment").forEach(el=>el.classList.remove("gray"));
            var row = e.target.closest(".appointment");
            row && row.classList.add("gray");
            document.querySelector(".appointment_form").classList.remove("hidden");
            if(e.target.dataset.id) {
                let appointmentRow = e.target.closest(".appointment");
                document.querySelector(".submit_appointment").dataset.appointment_id = e.target.dataset.id;
                document.getElementById("client_name").value = appointmentRow.querySelector(".name").innerHTML;
                document.getElementById("client_phone").value = appointmentRow.querySelector(".phone").innerHTML;
                document.getElementById("appiontment_time").value = appointmentRow.querySelector(".time").dataset.num;
                document.getElementById("how_to_call").value = appointmentRow.querySelector(".how_to_call").dataset.num;
                picker.setDate(new Date(appointmentRow.querySelector(".date").innerHTML.replace(/^(\d+)\.(\d+)./, "$2.$1.")));
            } else{
                document.querySelector(".submit_appointment").dataset.appointment_id = "new";
                document.getElementById("client_name").value = "";
                document.getElementById("client_phone").value = "";
                picker.setDate();
            }
        }
        else if(e.target.classList.contains("save_assignment")){
            var $assignTo = e.currentTarget.querySelectorAll(".assignTo");
            if(!$assignTo.length){
                alert("No therapist selected");
                return;
            };
            var query = {"!appointment_assign":[{}]};
            
            $assignTo.forEach(el=>{
                if(el.value){
                    query["!appointment_assign"][0][el.dataset.appid] = el.value;
                }
            });
            fetch("/ua/data", {
                method : 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body:JSON.stringify(query)
            }).then(resp=>{
                resp.json && resp.json().then(json=>{
                    if(json && json.success){
                        location.reload();
                    }
                });
            });
        }
    });    
    const picker = datepicker("#calendar_inp", {        
        startDay : 1,
        onSelect : (instance, selectedDate) =>{
            
        },
        minDate : new Date()
    });
    document.querySelector(".submit_appointment").addEventListener("click", e=>{
        if(!document.getElementById("appiontment_time").value || !document.getElementById("calendar_inp").value) return;
        var therapistParam = location.search.match(/therapist\=(\w+)/);
        fetch("/ua/data", {
            method : 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(e.target.dataset.appointment_id == 'new' ? {
                "!appointment_add" : [{
                    name : document.getElementById("client_name").value,
                    phone : document.getElementById("client_phone").value,
                    date : picker.dateSelected.toString().substr(0 ,24),
                    time : document.getElementById("appiontment_time").value,
                    howToCall : document.getElementById("how_to_call").value
                }]
            } : {
                "!storage_updateAppointment" : [{
                    id : e.target.dataset.appointment_id,
                    name : document.getElementById("client_name").value,
                    phone : document.getElementById("client_phone").value,
                    date : picker.dateSelected.toString().substr(0 ,24),
                    time : +document.getElementById("appiontment_time").value,
                    howToCall : +document.getElementById("how_to_call").value
                }]
            })
        }).then(resp=>{
            resp.json && resp.json().then(json=>{
                if(json.status == "ok" || json.success == true){
                    location.reload()
                }
                else {
                    alert(json.error);
                }
            });
        });
    });
} 