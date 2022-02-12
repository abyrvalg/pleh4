(()=>{
    var cache = {};
    document.getElementById("test_table").addEventListener('click', (e)=>{
        if(e.target.classList.contains('new_test')){
            document.querySelector('.new_client_form').classList.remove('hidden');
        }
        if(e.target.classList.contains("new_question")) {
            document.querySelector('.js-test_questions').insertAdjacentHTML("beforeend", document.querySelector('#test_new_question').innerHTML);
        }
        if(e.target.classList.contains("js-new_question_option")) {
            e.target.closest('div').querySelector('.js-test_questions_options').insertAdjacentHTML("beforeend", document.querySelector('#new_question_option').innerHTML);
        }
        if(e.target.classList.contains("new_transcript")) {
            e.target.closest('div').querySelector('.transcripts_list').insertAdjacentHTML("beforeend", document.querySelector('#test_new_transcript').innerHTML);
            document.querySelector('.transcripts_list').classList.remove('hidden');
        }
        if(e.target.classList.contains("save")) {
            var newTest = {
                    name : document.querySelector('.test_name_input').value,
                    description : document.querySelector('.test_description_input').value,
                    questions : [],
                    transcripts : []
                };
            
            document.querySelectorAll(".js-test_question").forEach(inp=>{
                var question = {
                        text : inp.value,
                        options : []
                    };
                inp.closest(".test_question_container").querySelectorAll(".js-test_question_option_text").forEach(optionInp=>{
                    question.options.push({
                        text : optionInp.value,
                        points : optionInp.closest('.test_questions_options_container').querySelector('.js-test_question_option_points').value
                    });
                });
                newTest.questions.push(question)
            });

            document.querySelectorAll(".js-test_transcript").forEach(inp=>{
                newTest.transcripts.push({
                    text : inp.value,
                    frame : inp.closest('.test_transcript_container').querySelector('.js-test_transcript_frame').value
                });
            });
            fetch("/data", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify({"!therapyTest_create" : [newTest]})
            }).then(r=>{
                r.json && r.json().then(json=>{
                    if(json && json.success){
                        location.reload();
                    }
                });
            });
        }
        if(e.target.classList.contains("edit_test")) {
            var query = [{"therapyTest_getTestDetails>test" : [{id : e.target.dataset.id}]}];
            if(!cache.editTestTemplate) {
                query.push({"base_template>editTestTemplate" : ["parts/editTest"]})
            }
            window.liteQL.call(query).then(json=>{
                if(!cache.editTestTemplate) {
                    cache.editTestTemplate = json.editTestTemplate;
                }
                var content = sqrl.render(cache.editTestTemplate, json.test);
                var container = document.querySelector("#popup");
                if(!container) {
                    let popupElement = document.createElement("div");
                    popupElement.setAttribute("id", "popup");
                    document.querySelector("body").appendChild(popupElement);
                    container = document.querySelector("#popup");
                }
                container.innerHTML = content;
            });
        }
    });
})()