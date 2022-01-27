Node.prototype.addEventListeners = function (eventNames, eventFunction) {
    for (let eventName of eventNames.split(' '))
        this.addEventListener(eventName, eventFunction);
}
const forms = document.querySelectorAll('form.needs-validation:not([name="bug-report"])');
const localStorage = window.localStorage;
const serializeArray = (form) => {
    return Array.from(new FormData(form)
        .entries())
        .reduce(function (response, current) {
            response[current[0]] = current[1];
            return response
        }, {})
};
const checkFirstStep = (form) => {
    return !(form.id === "signalement-step-1" && null === form.querySelector('[type="radio"]:checked') || form.id === "signalement-step-1" && form.querySelectorAll('[type="checkbox"]:checked').length !== form.querySelectorAll('[type="radio"]:checked').length);
}
const checkFieldset = (form) => {
    let field = form.querySelector('fieldset[aria-required="true"]')
    if (field) {
        if (null === field.querySelector('[type="checkbox"]:checked')) {
            field.classList.add('fr-fieldset--error');
            field?.querySelector('.fr-error-text')?.classList.remove('fr-hidden');
            invalid = field.parentElement;
            return false;
        } else {
            field.classList.remove('fr-fieldset--error');
            field?.querySelector('.fr-error-text')?.classList.add('fr-hidden');
            return true;
        }
    } else
        return true;
}
const goToStep = (step) => {
    document.querySelector('#signalement-step-'+step).click();
}
forms.forEach((form) => {
    form?.querySelectorAll('.toggle-criticite input[type="radio"]')?.forEach((criticite) => {
        criticite.addEventListener('change', (event) => {
            event.currentTarget.parentElement.parentElement.parentElement.querySelector('.fr-toggle__input').checked = true;
            // parent.querySelector('[type="checkbox"]').checked = !parent.querySelector('[type="checkbox"]').checked;
        })
    })
    form?.querySelectorAll('.fr-toggle')?.forEach((t) => {
        t.addEventListener('change', (event) => {
            // console.log('toggle')
            if (!event.target.checked)
                event.currentTarget.nextElementSibling.querySelectorAll('.fr-collapse input[type="radio"]').forEach((radio) => {
                    radio.checked = false
                })
        })
    })
    form?.querySelectorAll('.fr-accordion__title')?.forEach((situation) => {
        situation.addEventListeners("click touchdown", (event) => {
            event.target.parentElement.parentElement.querySelectorAll('[type="radio"],[type="checkbox"]').forEach((ipt) => {
                ipt.checked = false;
            })
        })
    })
    form?.querySelectorAll('[data-fr-toggle-show],[data-fr-toggle-hide]')?.forEach((toggle) => {
        toggle.addEventListener('change', (event) => {
            let toShow = event.target.getAttribute('data-fr-toggle-show'),
                toHide = event.target.getAttribute('data-fr-toggle-hide'),
                toUnrequire = event.target.getAttribute('data-fr-toggle-unrequire'),
                toRequire = event.target.getAttribute('data-fr-toggle-require')
            toShow && toShow.split('|').map(targetId => {
                let target = form?.querySelector('#' + targetId);
                target.querySelectorAll('input:not([type="checkbox"]),textarea').forEach(ipt => {
                    ipt.required = true;
                })
                if (target.id === "signalement-methode-contact") {
                    target.querySelector('fieldset').setAttribute('aria-required', true)
                }
                target.classList.remove('fr-hidden')
            })
            toHide && toHide.split('|').map(targetId => {
                let target = form?.querySelector('#' + targetId);
                target.querySelectorAll('input:not([type="checkbox"]),textarea').forEach(ipt => {
                    ipt.required = false;
                })
                if (target.id === "signalement-methode-contact") {
                    target.querySelector('fieldset[aria-required="true"]').removeAttribute('aria-required')
                    target.querySelectorAll('[type="checkbox"]').forEach(chk => {
                        chk.checked = false;
                    })
                }
                target.classList.add('fr-hidden')
            })
            toUnrequire && toUnrequire.split('|').map(targetId => {
                let target = form?.querySelector('#' + targetId);
                console.log(target)
                target.required = false;
                target.labels[0].querySelector('sup') ? target.labels[0].querySelector('sup').innerHTML = '' : null;
            })
            toRequire && toRequire.split('|').map(targetId => {
                let target = form?.querySelector('#' + targetId);
                target.required = true;
                target?.labels[0]?.innerText.includes("*") || (target.labels[0].innerHTML = target.labels[0].innerText + '<sup class="fr-text-default--error">*</sup>');
            })
        })
    })
    form?.querySelectorAll('input[type="file"]')?.forEach((file) => {
        //TODO: Resize avant upload
        file.addEventListener('change', (event) => {
            if (event.target.files.length > 0) {
                let deleter = event.target.parentElement.parentElement.querySelector('.signalement-uploadedfile-delete')
                let src = URL.createObjectURL(event.target.files[0]);
                let preview = event.target?.parentElement?.querySelector('img')
                let fileIsOk = false;
                if (preview/*event.target.parentElement.classList.contains('fr-fi-instagram-line')*/) {
                    preview.src = src;
                    ['fr-fi-instagram-line', 'fr-py-7v'].map(v => event.target.parentElement.classList.toggle(v));
                    fileIsOk = true;
                } else if (event.target.parentElement.classList.contains('fr-fi-attachment-fill')) {
                    if (event.target.files[0].size > 2 * 1024 * 1024) {
                        event.target.value = "";
                        event.target.parentElement.parentElement.querySelector('small.fr-hidden').classList.remove('fr-hidden')
                    } else {
                        fileIsOk = true;
                        ['fr-fi-attachment-fill', 'fr-fi-checkbox-circle-fill'].map(v => event.target.parentElement.classList.toggle(v));
                    }
                }
                if (fileIsOk) {
                    [preview, deleter].forEach(el => el?.classList?.remove('fr-hidden'))
                    deleter.addEventListeners('click touchdown', (e) => {
                        e.preventDefault();
                        if (preview) {
                            preview.src = '#';
                            event.target.parentElement.classList.add('fr-fi-instagram-line')
                        } else if (event.target.parentElement.classList.contains('fr-fi-checkbox-circle-fill')) {
                            ['fr-fi-attachment-fill', 'fr-fi-checkbox-circle-fill'].map(v => event.target.parentElement.classList.toggle(v));
                        }
                        event.target.value = '';
                        [preview, deleter].forEach(el => el?.classList.add('fr-hidden'))
                    })
                }
            }
        })
    })
    form?.querySelectorAll('[data-fr-adresse-autocomplete]').forEach((autocomplete) => {
        autocomplete.addEventListener('keyup', () => {
            if (autocomplete.value.length > 10)
                fetch('https://api-adresse.data.gouv.fr/search/?q=' + autocomplete.value).then((res) => {
                    res.json().then((r) => {
                        let container = form.querySelector('#signalement-adresse-suggestion')
                        container.innerHTML = '';
                        for (let feature of r.features) {
                            let suggestion = document.createElement('div');
                            suggestion.classList.add('fr-col-12', 'fr-p-3v', 'fr-text-label--blue-france', 'fr-adresse-suggestion');
                            suggestion.innerHTML = feature.properties.label;
                            suggestion.addEventListener('click', () => {
                                // console.log(feature.geometry.coordinates)
                                form.querySelector('#signalement-adresse-occupant').value = feature.properties.name;
                                form.querySelector('#signalement-cp-occupant').value = feature.properties.postcode;
                                form.querySelector('#signalement-ville-occupant').value = feature.properties.city;
                                form.querySelector('#signalement-insee-occupant').value = feature.properties.citycode;
                                form.querySelector('#signalement-geoloc-lat-occupant').value = feature.geometry.coordinates[0];
                                form.querySelector('#signalement-geoloc-lng-occupant').value = feature.geometry.coordinates[1];
                                container.innerHTML = '';
                            })
                            container.appendChild(suggestion)
                        }
                    })
                })
        })
    })
    let invalid;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        /*    console.log(form.querySelectorAll('[type="checkbox"]:checked').length)*/
        if (!form.checkValidity() || !checkFirstStep(form) || !checkFieldset(form)) {
            event.stopPropagation();
            if (form.id === "signalement-step-1") {
                form.querySelector('[role="alert"]').classList.remove('fr-hidden')
                invalid = document.querySelector("div[role='alert']");
                form.addEventListener('change', () => {
                    if (checkFirstStep(form))
                        form.querySelector('[role="alert"]').classList.add('fr-hidden')
                })
            } else {
                form.querySelectorAll('input,textarea,select,fieldset[aria-required="true"]').forEach((field) => {
                    if (field.tagName === "FIELDSET") {
                        if (!checkFieldset(form)) {
                            field.addEventListener('change', () => {
                                checkFieldset(form);
                            })
                            invalid = field.parentElement;
                        }
                    } else if (!field.checkValidity()) {
                        /* console.log(field)*/
                        let parent = field.parentElement;
                        if (field.type === 'radio')
                            parent = field.parentElement.parentElement.parentElement;
                        [field.classList, parent.classList].forEach((f) => {
                            f.add(f[0] + '--error');
                        })
                        parent?.querySelector('.fr-error-text')?.classList.remove('fr-hidden');
                        field.addEventListener('input', () => {
                            if (field.checkValidity()) {
                                [field.classList, parent.classList].forEach((f) => {
                                    f.remove(f[0] + '--error');
                                })
                                parent.querySelector('.fr-error-text')?.classList.add('fr-hidden');
                            }
                        })
                        invalid = form?.querySelector('*:invalid:first-of-type')?.parentElement;
                    }

                })

            }
            if (invalid) {
                const y = invalid.getBoundingClientRect().top + window.scrollY;
                window.scroll({
                    top: y,
                    behavior: 'smooth'
                });
            }
        } else {
            form.querySelectorAll('input,textarea,select').forEach((field) => {
                let parent = field.parentElement;
                if (field.type === 'radio')
                    parent = field.parentElement.parentElement.parentElement;
                [field.classList, parent.classList].forEach((f) => {
                    f.remove(f[0] + '--error');
                })
                parent.querySelector('.fr-error-text')?.classList.add('fr-hidden');
            })
            if (form.name !== 'signalement')
                form.submit();
            else {
                let currentTabBtn = document.querySelector('.fr-tabs__list>li>button[aria-selected="true"]'),
                    nextTabBtn = currentTabBtn.parentElement?.nextElementSibling?.querySelector('button');
                if (nextTabBtn) {
                    if (nextTabBtn.hasAttribute('data-fr-last-step')) {
                        document.querySelector('#recap-signalement-situation').innerHTML = '';
                        forms.forEach((form) => {
                            form.querySelectorAll('input,textarea,select').forEach((input) => {
                                if (document.querySelector('#recap-' + input.id))
                                    document.querySelector('#recap-' + input.id).innerHTML = input.value;
                                else if (input.classList.contains('signalement-situation') && input.checked)
                                    document.querySelector('#recap-signalement-situation').innerHTML += '- ' + input.value + '<br>';
                            })
                        })
                    }
                    nextTabBtn.disabled = false;
                    /*form?.querySelectorAll('.fr-accordion__situation .fr-collapse')?.forEach((situation) => {
                        situation.removeEventListener("dsfr.conceal", handleTabConceal, true);
                    })*/
                    nextTabBtn.click();
                }
                if (!nextTabBtn) {
                    event.submitter.disabled = true;
                    ['fr-fi-checkbox-circle-fill', 'fr-fi-refresh-fill'].map(v => event.submitter.classList.toggle(v));
                    event.submitter.innerHTML = "En cours d'envoi..."
                    let formData = new FormData();
                    forms.forEach((form) => {
                        let data = serializeArray(form);
                        for (let i = 0; i < Object.keys(data).length; i++) {
                            let x = Object.keys(data)[i];
                            let y = Object.values(data)[i];
                            formData.append(x, y);
                        }
                    })
                    fetch('signalement/envoi', {
                        method: "POST",
                        body: formData
                    }).then((r) => {
                        if (r.ok) {
                            r.json().then((res) => {
                                if (res.response === "success") {
                                    document.querySelectorAll('#signalement-tabs,#signalement-success').forEach(el => {
                                        el.classList.toggle('fr-hidden')
                                    })
                                    localStorage.clear();
                                } else {
                                    event.submitter.disabled = false;
                                    event.submitter.innerHTML = "Confirmer";
                                    ['fr-fi-checkbox-circle-fill', 'fr-fi-refresh-fill'].map(v => event.submitter.classList.toggle(v));
                                    alert('Erreur signalement !')
                                }
                            })
                        } else {
                            event.submitter.disabled = false;
                            event.submitter.innerHTML = "Confirmer";
                            ['fr-fi-checkbox-circle-fill', 'fr-fi-refresh-fill'].map(v => event.submitter.classList.toggle(v));
                            alert('Erreur signalement !')
                        }
                    })
                }
            }
        }
    })
})
document?.querySelectorAll('[name="bo-filter-form"]').forEach((filterForm) => {
    filterForm.addEventListener('change', (evt) => {
        filterForm.submit();
    })
})
document?.querySelectorAll('[data-fr-select-target]')?.forEach(t => {
    let source = document?.querySelector('#' + t.getAttribute('data-fr-select-source'));
    let target = document?.querySelector('#' + t.getAttribute('data-fr-select-target'));
    t.addEventListeners('click touchdown', (event) => {
        let selected = [...source.selectedOptions]
        selected.map(s => {
            let groupPartenaire = s.parentElement.getAttribute('data-select-group-id'), group, count;
            /*target.append(s);*/
            if (!target.querySelector('[data-select-group-id="' + groupPartenaire + '"]')) {
                group = document.createElement('optgroup');
                group.setAttribute('data-select-group-id', groupPartenaire);
                group.label = s.parentElement.label;
            } else {
                group = target.querySelector('[data-select-group-id="' + groupPartenaire + '"]')
            }
            group.append(s)
            target.append(group)
        })
    })
})
document?.querySelector('#signalement-affectation-form-submit')?.addEventListeners('click touchdown', (e) => {
    e.preventDefault();
    e.target.disabled = true;
    e.target?.form?.querySelectorAll('option').forEach(o => {
        o.selected = true;
    })
    document?.querySelectorAll('#signalement-affectation-form-row,#signalement-affectation-loader-row').forEach(el => {
        el.classList.toggle('fr-hidden')
    })
    //POST
    let formData = new FormData(e.target.form);
    fetch(e.target.getAttribute('formaction'), {
        method: 'POST',
        body: formData
    }).then(r => {
        if (r.ok) {
            r.json().then(res => {
                window.location.reload(true)
            })
        }
    })
    console.log(e.target.form);
})
document?.querySelectorAll('.fr-input--file-signalement').forEach(inputFile => {
    inputFile.addEventListener('change', evt => {
        evt.target.form.submit();
    })
})
document?.querySelector('#partenaire_add_user,#situation_add_critere')?.addEventListeners('click touchdown', (event) => {
    event.preventDefault();
    let template, container, count, row, className;
    if (event.target.id === 'partenaire_add_user') {
        template = document.importNode(document.querySelector('#partenaire_add_user_row').content, true)
        container = document.querySelector('#partenaire_add_user_placeholder')
        className = 'partenaire-row-user'
        count = container.querySelectorAll('.' + className)?.length
    } else {
        template = document.importNode(document.querySelector('#situation_add_critere_row').content, true)
        container = document.querySelector('#situation_add_critere_placeholder')
        className = 'situation-row-critere';
        count = container.querySelectorAll('.' + className)?.length
    }
    row = document.createElement('div');
    row.classList.add('fr-grid-row', 'fr-grid-row--gutters', 'fr-grid-row--middle', 'fr-background-alt--blue-france', 'fr-mb-5v', className);
    template.querySelectorAll('label,input,select,button,textarea').forEach(field => {
        field.id = field?.id?.replaceAll('__ID__', count);
        field.name = field?.name?.replaceAll('__ID__', count);
        if (field.tagName === 'LABEL')
            field.setAttribute('for', field.getAttribute('for').replaceAll('__ID__', count))
        if (field.tagName === 'BUTTON')
            field.addEventListeners('click touchdown', (event) => {
                event.target.closest('.' + className).remove();
            })
    })
    row.appendChild(template);
    container.appendChild(row);
})
document?.querySelectorAll('[data-delete]')?.forEach(deleteBtn => {
    deleteBtn.addEventListeners('click touchdown', event => {
        event.preventDefault();
        let className;
        if (event.target.classList.contains('partenaire-user-delete'))
            className = '.partenaire-row-user';
        else if (event.target.classList.contains('situation-critere-delete'))
            className = '.situation-row-critere';
        else if (event.target.classList.contains('signalement-file-delete'))
            className = '.signalement-file-item';
        else if (event.target.classList.contains('signalement-row-delete'))
            className = '.signalement-row';
        else if (event.target.classList.contains('partenaire-row-delete'))
            className = '.partenaire-row';
        if (confirm('Voulez-vous vraiment supprimer cet élément ?')) {
            let formData = new FormData;
            formData.append('_token', deleteBtn.getAttribute('data-token'))
            fetch(deleteBtn.getAttribute('data-delete'), {
                method: 'POST',
                body: formData,
            }).then(r => {
                if (r.ok) {
                    deleteBtn.closest(className).remove();
                }
            })
        }
    })
})
document?.querySelector('#fr-bug-report-modal').addEventListeners('dsfr.disclose dsfr.conceal', (event) => {
    let form = event.target.querySelector('form[name="bug-report"]');
    let formData = new FormData(form);
    if (event.type === 'dsfr.disclose') {
        event.target.querySelector('#bug-report-success').classList.add('fr-hidden')
        form.classList.remove('fr-hidden');
        event.target.querySelector('#bug-report-submit').disabled = false;
        html2canvas(document.body).then(function (canvas) {
            canvas.toBlob(blob => {
                formData.append('capture', blob, 'capture.png');
            });
        });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            event.target.querySelector('#bug-report-submit').disabled = true;
            fetch(form.action, {
                method: 'POST',
                body: formData
            }).then(r => r.text().then(res => {
                console.log(res)
                form.classList.add('fr-hidden');
                event.target.querySelector('#bug-report-success').classList.remove('fr-hidden')
            }))
        })
    } else {
        formData = null;
        event.target.querySelector('textarea').value = '';
    }
})
document?.querySelectorAll('.fr-password-toggle')?.forEach(pwdToggle => {
    pwdToggle.addEventListeners('click touchdown', (event) => {
        ['fr-fi-eye-off-fill', 'fr-fi-eye-fill'].map(c => {
            event.target.classList.toggle(c);
        })
        let pwd = event.target.parentElement.querySelector('[name^="password"]');
        "text" !== pwd.type ? pwd.type = "text" : pwd.type = "password";
    })
})
document?.querySelector('form[name="login-creation-mdp-form"]')?.querySelectorAll('[name^="password"]').forEach(pwd => {
    pwd.addEventListener('input', event => {
        let pass = document?.querySelector('form[name="login-creation-mdp-form"] #login-password').value;
        let repeat = document?.querySelector('form[name="login-creation-mdp-form"] #login-password-repeat').value;
        let pwdMatchError = document?.querySelector('form[name="login-creation-mdp-form"] #password-match-error');
        let submitBtn = document?.querySelector('form[name="login-creation-mdp-form"] #submitter');
        if (pass !== repeat) {
            document?.querySelector('form[name="login-creation-mdp-form"]').querySelectorAll('.fr-input-group').forEach(iptGroup => {
                iptGroup.classList.add('fr-input-group--error')
                iptGroup.querySelector('.fr-input').classList.add('fr-input--error')
            })
            submitBtn.disabled = true;
            pwdMatchError.classList.remove('fr-hidden')
        } else {
            document?.querySelector('form[name="login-creation-mdp-form"]').querySelectorAll('.fr-input-group--error,.fr-input--error').forEach(iptError => {
                ['fr-input-group--error', 'fr-input--error'].map(c => {
                    iptError.classList.remove(c)
                });
            })
            pwdMatchError.classList.add('fr-hidden');
            submitBtn.disabled = false;
        }
    })
})
document?.querySelectorAll('.fr-tabs__panel')?.forEach((tab) => {
    tab.addEventListener("dsfr.conceal", event => {
        if (tab.id === "signalement-step-1-panel") {
            tab.querySelectorAll('[aria-expanded="true"]').forEach(opened => {
                localStorage.setItem(opened.id, 'true')
            })
        }
        const y = tab.getBoundingClientRect().top + window.scrollY;
        window.scroll({
            top: y,
            behavior: 'smooth'
        });
    });
})
document?.querySelector('#signalement-step-1-panel')?.addEventListener('dsfr.disclose', (ev => {
    ev.target.querySelectorAll('[aria-expanded]').forEach(exp => {
        if (localStorage.getItem(exp.id))
            document.querySelector('#' + exp.id).setAttribute('aria-expanded', "true"),localStorage.removeItem(exp.id)
    })
}))
document?.querySelectorAll('[data-goto-step]')?.forEach(stepper=>{
    stepper.addEventListeners('click touchdown',(evt)=>{
        evt.preventDefault();
        goToStep(stepper.getAttribute('data-goto-step'))
    })
})
document?.querySelectorAll('.toggle-criticite-smiley').forEach(iptSmiley=>{
    iptSmiley.addEventListener('change',(evt)=>{
        let icon = evt.target.labels[0]?.parentElement?.querySelector('.fr-radio-rich__img img');
        evt.target.parentElement.parentElement.querySelectorAll('.fr-radio-rich__img img').forEach(iptParentImg=>{
            iptParentImg.src = iptParentImg.getAttribute('data-fr-unchecked-icon')
        })
        if(evt.target.checked === true)
            icon.src = evt.target.parentElement.querySelector('.fr-radio-rich__img img').getAttribute('data-fr-checked-icon')
    })
})