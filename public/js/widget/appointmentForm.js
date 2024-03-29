(()=>{
    const getYearMonth = date=>(+((date.getYear() - 100)+(date.getMonth() < 9 ? "0" : "")+(date.getMonth())));
    const MIN_START_DATE_OFFSET = 2;
    function getStartDate(firstWorkingDate){
        var now = new Date();
        now.setDate(now.getDate() + MIN_START_DATE_OFFSET);
        return now > firstWorkingDate ? now : firstWorkingDate;
    }
    var query = [
            {"base_msg>msg":["calendar", ["\^month\\d\*", "\^dayofweakshort\\d"]]},
            {"?base_msg>form":["form", ["\\w\*"]]},
            {"base_template>tmpl":["widgets/appointmentForm", {form: "_form", therapistID : document.getElementById("appointment_form_container").dataset.therapist}]}
        ];
        if(document.getElementById("appointment_form_container").dataset.therapist) {
            query.push({
                "therapists_getSchedules>schedule":
                    [{"therapist": document.getElementById("appointment_form_container").dataset.therapist, "substractAppointments" : true}]
                })
        };
    fetch(document.getElementById("appointment_form_container").dataset.domain+'/'+document.getElementById("appointment_form_container").dataset.locale+'/data?query='+
        
        JSON.stringify(query)).then(res=>{
        res && res.text &&
            res.json().then(json=>{
                if(!json){
                    throw "no response"
                }
                var date = new Date(),
                    currentYearMonth = getYearMonth(date),
                    slots = {},
                    daysOff = [],
                    startDate;
                json.schedule && json.schedule.months.forEach(month=>{
                    let monthSlots = {},
                        schedule = BigInt(month.schedule),
                        currentMonth = date.getMonth();
                    for(let i = month.month == currentYearMonth ? date.getDate()-1 : 0; i<=31; i++){
                        let daySlots = [];
                        for(let j = 0; j<24; j++){
                            let counter = i*24+j;
                            if(schedule/BigInt(Math.pow(2, counter)) % 2n){
                                daySlots.push(j);
                            }
                        }
                        if(!daySlots.length){
                            daysOff.push(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
                        }
                        else{
                            startDate = startDate || getStartDate(date);
                            monthSlots["_"+i] = daySlots;
                        }
                        date.setDate(date.getDate()+1);
                        if(date.getMonth() != currentMonth) break;
                    }
                    slots["_"+currentMonth] = monthSlots;
                });
                document.querySelector("#appointment_form_container").innerHTML = json.tmpl;
                if(json.schedule) {
                    date.setDate(date.getDate());                    
                    window.picker = datepicker("#appointment_date", {
                        customDays: [json.msg.dayofweakshort1, json.msg.dayofweakshort2, json.msg.dayofweakshort3, json.msg.dayofweakshort4, json.msg.dayofweakshort5, json.msg.dayofweakshort6, json.msg.dayofweakshort7],
                        startDay : 1,
                        customMonths : [json.msg.month1, json.msg.month2, json.msg.month3, json.msg.month4, json.msg.month5, json.msg.month6, json.msg.month7, json.msg.month8, json.msg.month9, json.msg.month10, json.msg.month11, json.msg.month12],
                        customOverlayMonths : [json.msg.month1, json.msg.month2, json.msg.month3, json.msg.month4, json.msg.month5, json.msg.month6, json.msg.month7, json.msg.month8, json.msg.month9, json.msg.month10, json.msg.month11, json.msg.month12],
                        minDate : startDate,
                        maxDate : date,
                        disabledDates : daysOff,
                        onSelect : (instance, selectedDate) =>{
                            document.getElementById("appointment_date").value = instance.days[(selectedDate.getDay() || 7)-1]+" "
                                +selectedDate.getDate()+" "+instance.months[selectedDate.getMonth()]+ 
                                " "+selectedDate.getFullYear();
                            let $time = document.getElementById("appiontment_time"),
                                $options = $time.getElementsByTagName("option"),
                                month = selectedDate.getMonth(),
                                date = selectedDate.getDate()-1;
                            $time.disabled = false;
                            $time.getElementsByTagName("option")[0].selected = true;
                            for(let i = 0; i < $options.length; i++){                           
                                let enabled = slots["_"+month];
                                enabled = enabled && enabled["_"+date];
                                enabled = (enabled && ~enabled.indexOf(+$options[i].value));
                                $options[i].disabled = !enabled;
                                $options[i].style.display = enabled ? "block" : "none";
                            }   
                        }
                    });
                    document.getElementById("selectTime").addEventListener("change", e=>{
                        var removeAdd = e.target.checked ? "remove" : "add";
                        document.getElementById("appointment_date").classList[removeAdd]("hidden");
                        document.getElementById("appiontment_time").classList[removeAdd]("hidden");
                    });
                }
                var phoneCode = window.intlTelInput && window.intlTelInput(document.querySelector("#appointment_phone"), {
                    autoHideDialCode : false,
                    separateDialCode : true,
                    initialCountry : "ua"
                });
                document.querySelector("#appointment_phone").addEventListener("countrychange", (e)=>{
                    if(!phoneCode) return;
                    e.target.value = '';
                    var newLength = phoneCode.getSelectedCountryData().dialCode.length > 2 ? 9 : 10;
                    e.target.setAttribute('minlength', newLength);
                    e.target.setAttribute('maxlength', newLength);
                    e.target.dataset.pattern = "^\\d{"+newLength+"}$";
                });
                document.getElementById("appointment_submit").addEventListener("click", e=>{
                    e.preventDefault();
                    var inputs = e.target.closest("form").querySelectorAll("input,select"),
                        valid = true;
                    e.target.closest("form").querySelectorAll(".input_error").forEach(el=>{
                        el.innerHTML = "";
                    });
                    for(let i in inputs){
                        let inp = inputs[i];
                        if(inp.required && !inp.value && !inp.classList.contains("hidden")){
                           valid = false; 
                           inp.closest(".input_wrap").querySelector(".input_error").innerHTML = inp.dataset.missingerror;
                        } else if(inp.dataset && inp.dataset.pattern && !(new RegExp(inp.dataset.pattern)).test(inp.value)){
                            inp.closest(".input_wrap").querySelector(".input_error").innerHTML = inp.dataset.invaliderror;
                            valid = false;
                        }
                    }
                    if(!valid){
                        return;
                    }
                    var params = {
                            therapist : document.getElementById("appointment_form_container").dataset.therapist,
                            name : document.getElementById("appointment_name").value,
                            phone : (phoneCode ? '+'+phoneCode.getSelectedCountryData().dialCode :'')+document.getElementById("appointment_phone").value,                            
                            howToCall : document.getElementById("how_to_call").value
                        };
                    if(document.getElementById("selectTime") && document.getElementById("selectTime").checked){
                        params.date = picker.dateSelected && picker.dateSelected.getTime()+(5*1000*60*60); //adding 5 hours to compencate timezone difference. Should be rewritten with time zone adjustemnt
                        params.time = document.getElementById("appiontment_time").value;
                    }
                    fetch(document.getElementById("appointment_form").getAttribute("action"), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        body: JSON.stringify({
                            "!appointment_submit" : [params]
                        })
                    }).then(resp=>{
                        resp.json && resp.json().then(json=>{
                            if(json.success){
                                document.getElementById("appointment_form").innerHTML = document.querySelector(".confirm_container").innerHTML
                            }
                        })                        
                    }).catch(err=>{
                        console.log(err);
                    })
                })
            });
    });
})()