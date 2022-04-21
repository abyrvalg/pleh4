(()=>{
    var cache = {};
    document.querySelector("body").addEventListener('change', e=>{
        if(e.target.tagName == 'INPUT' || e.target.tagName == 'SELECT'){
            e.target.classList.add('updated')
        }
    });
    document.querySelector("body").addEventListener('click', (e)=>{
        if(e.target.classList.contains("new_question")) {
            e.target.closest('div').querySelector('.js-test_questions').insertAdjacentHTML("beforeend", document.querySelector('#test_new_question').innerHTML);
        }
        if(e.target.classList.contains("js-new_question_option")) {
            e.target.closest('div').querySelector('.js-test_questions_options').insertAdjacentHTML("beforeend", document.querySelector('#new_question_option').innerHTML);
        }
        if(e.target.classList.contains("new_transcript")) {
            e.target.closest('div').querySelector('.transcripts_list').insertAdjacentHTML("beforeend", document.querySelector('#test_new_transcript').innerHTML);
            document.querySelector('.transcripts_list').classList.remove('hidden');
        }
        if(e.target.classList.contains('remove_row')) {
            e.preventDefault();
            let row = e.target.closest('div');
            if(row.querySelector('[data-id]')) {
                row.classList.add('hidden')
                if(row.querySelector('.js-test_question')) {
                    row.querySelector('.js-test_question').classList.add("deleted"); 
                } 
                else if(row.querySelector('.js-test_question_option_text')) {
                    row.querySelector('.js-test_question_option_text').classList.add("deleted"); 
                }
                else if(row.querySelector('.js-test_transcript')) {
                    row.querySelector('.js-test_transcript').classList.add("deleted");
                }
            } else {
                row.remove();
            }
        }
        if(e.target.classList.contains("save")) {
            var testID = e.target.closest('.new_client_form').dataset.id,
                isNew = testID === 'new';
            if(isNew) {
                var newTest = {
                        name : document.querySelector('.test_name_input').value,
                        description : '',
                        questions : [],
                        transcripts : [],
                        id : testID
                    };
                document.querySelectorAll(".js-test_question.updated").forEach(inp=>{
                    var question = {
                            text : inp.value,
                            options : []
                        };
                    inp.closest(".test_question_container").querySelectorAll(".js-test_question_option_text.updated").forEach(optionInp=>{
                        question.options.push({
                            text : optionInp.value,
                            id : optionInp.dataset.id,
                            points : optionInp.closest('.test_questions_options_container')
                                .querySelector('.js-test_question_option_points.updated').value,
                        });
                    });
                    newTest.questions.push(question)
                });

                document.querySelectorAll(".js-test_transcript.updated").forEach(inp=>{
                    newTest.transcripts.push({
                        text : inp.value,
                        id : inp.dataset.id,
                        frame : inp.closest('.test_transcript_container').querySelector('.js-test_transcript_frame.updated').value,
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
            else {
                let req = {
                        id : testID,
                        remove : {
                            questions : [], 
                            options : [], 
                            transcripts : []
                        },
                        add : {
                            questions : [],
                            options : [],
                            transcripts : []
                        },
                        edit : {
                            questions : [],
                            options : [],
                            transcripts : []
                        },
                        locale : "ua"
                    };
                
                document.querySelectorAll(".js-test_question.updated").forEach(el=>{
                    if(el.classList.contains('hidden')) {
                        return;
                    }
                    if(el.dataset.id == 'new') {
                        let question = {
                            text : el.value,
                            options : []
                        }
                        el.closest(".test_question_container").querySelectorAll(".js-test_question_option_text.updated").forEach(op=>{
                            if(op.classList.contains('hidden')) {
                                return;
                            }
                            question.options.push({
                                text : op.value,
                                id : op.dataset.id,
                                points : op.closest('.test_questions_options_container')
                                    .querySelector('.js-test_question_option_points.updated').value
                            });
                        });
                        req.add.questions.push(question);
                    }
                    else {
                        req.edit.questions.push({
                            id : el.dataset.id,
                            text : el.value
                        });
                    }
                });
                document.querySelectorAll(".js-test_question_option_text.updated").forEach(el=>{
                    if(el.classList.contains('hidden')) {
                        return;
                    }
                    var questionID  = el.closest('.test_question_container').querySelector('.js-test_question').dataset.id;
                    if(questionID == 'new') {
                        return;
                    }
                    if(el.dataset.id == 'new') {
                        req.add.options.push({
                            text : el.value,
                            question : questionID,
                            points : (+el.closest('.test_questions_options_container')
                                    .querySelector('.js-test_question_option_points.updated').value)
                        })
                    }
                    else {
                        req.edit.options.push({
                            text : el.value,
                            id : el.dataset.id,
                            points : (+el.closest('.test_questions_options_container')
                                    .querySelector('.js-test_question_option_points').value)
                        });
                    }
                });

                document.querySelectorAll(".js-test_transcript.updated").forEach(inp=>{
                    if(inp.classList.contains('hidden')) {
                        return;
                    }
                    req[inp.dataset.id == 'new' ? 'add' : 'edit'].transcripts.push({
                        text : inp.value,
                        id : inp.dataset.id,
                        frame : inp.closest('.test_transcript_container').querySelector('.js-test_transcript_frame').value,
                    });
                });
                document.querySelectorAll('input.deleted').forEach(el=>{
                    el.dataset.id !== 'new'
                        && req.remove[
                            el.classList.contains('js-test_question') ? 'questions' : (
                                el.classList.contains('js-test_question_option_text') ? 'options' : 'transcripts'
                            )
                        ].push(el.dataset.id)
                });
                window.liteQL.call([{"therapyTest_editTest": req}]).then(r=>{
                    console.log(r);
                })
            }
        }
        if(e.target.classList.contains("edit_test") || e.target.classList.contains("new_test")) {
            var isNewTest =  e.target.classList.contains("new_test"),
                query = !isNewTest ? [{"therapyTest_getTestDetails>test" : [{id : e.target.dataset.id, locales : "all"}]}] : []; 
            if(!cache.editTestTemplate) {
                query.push({"base_template>editTestTemplate" : ["parts/editTest"]})
            }
            if(!cache.locales) {
                query.push({"locale_getAll>locales" : []});
            }
            window.liteQL.call(query).then(json=>{
                if(!cache.editTestTemplate) {
                    cache.editTestTemplate = json.editTestTemplate;
                }
                if(!cache.locales) {
                    cache.locales = json.locales;
                }
                var defaultLocale = cache.locales.filter(el=>el.default)[0],
                    content = sqrl.render(cache.editTestTemplate, json.test ? 
                        {test : json.test, locales : cache.locales} : 
                        {test : {id : "new", name : "", questions : [], transcripts : []}, defaultlocale : defaultLocale});
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
        if(e.target.classList.contains('delete_test')) {
            if(window.confirm("are you sure you want delete the test")) {
                window.liteQL.call({"therapyTest_delete" : {id : e.target.dataset.id}})
            }
        }
    });
})()