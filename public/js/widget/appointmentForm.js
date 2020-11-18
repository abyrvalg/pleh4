
(()=>{
    const getYearMonth = date=>(+((date.getYear() - 100)+(date.getMonth() < 9 ? "0" : "")+(date.getMonth())));
    const MIN_START_DATE_OFFSET = 2;
    function getStartDate(firstWorkingDate){
        var now = new Date();
        now.setDate(now.getDate() + MIN_START_DATE_OFFSET);
        return now > firstWorkingDate ? now : firstWorkingDate;
    }
    //TODO: take url from server
    fetch('http://localhost/data?query=[{"base_template>tmpl":["widgets/appointmentForm"]},{"therapists_getSchedules>schedule":[{"therapist":"8a42f102-0e12-11eb-adc1-0242ac120002"}]}]').then(res=>{
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
                json.schedule.months.forEach(month=>{
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
                date.setDate(date.getDate()-1);
                document.querySelector("#appointment_form_container").innerHTML = json.tmpl;

                const picker = datepicker("#appointment_date", {
                    customDays: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
                    startDay : 1,
                    customMonths : ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
                    minDate : startDate,
                    maxDate : date,
                    disabledDates : daysOff,
                    onSelect : (instance, selectedDate) =>{
                        let $time = document.getElementById("appiontment_time"),
                            $options = $time.getElementsByTagName("option"),
                            month = selectedDate.getMonth(),
                            date = selectedDate.getDate() - 1;
                        $time.disabled = false;
                        $time.value= -1
                        for(let i = 0; i < $options.length; i++){                           
                            let enabled = slots["_"+month];
                            enabled = enabled && enabled["_"+date];
                            enabled = (enabled && ~enabled.indexOf(+$options[i].value));
                            $options[i].disabled = !enabled;
                            $options[i].style.display = enabled ? "block" : "none";
                        }   
                    }
                })

                document.getElementById("appointment_submit").addEventListener("click", e=>{
                    e.preventDefault();
                    var params = {
                            therapist : document.getElementById("appointment_form_container").dataset.therapist,
                            name : document.getElementById("appointment_name").value,
                            phone : document.getElementById("appointment_phone").value,
                            date : document.getElementById("appointment_date").value,
                            time : document.getElementById("appointment_time").value
                        };
                    fetch(document.getElementById("appointment_form").getAttribute("action"), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json;charset=utf-8'
                        },
                        body: JSON.stringify({
                            appointment_submit : [params]
                        })
                    }).then(resp=>{
                        
                    }).catch(err=>{
                        console.log(err);
                    })
                })
            });
    });
})()