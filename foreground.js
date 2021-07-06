

// --------------------------global variable-------------------

let addNoteForm;
let categoryInput;
let addNoteSubmitButton;
let categoryOptionDatalist;
let noteInput;

let messageDiv;
let messageSpan;

let optionPageLink;

let defaultCategory;

// ------------------------functions------------------------

function loadGlobalVariableSetting() {
    chrome.runtime.sendMessage({
        message: 'getSettings',
    }, response => {
        if (response.status === 'fail') {
            alert('Failing load settings');

            return;
        }

        defaultCategory = response.defaultCategory;

        initDefaultElements();
        initGlobalListener();
    });
}

function initDefaultElements() {
    initFormElements();
    initResponseMessageElements();

    optionPageLink = document.createElement('button');
    optionPageLink.id = 'optionPageLink';
    optionPageLink.innerText = 'open option page';

    appendChildToWindow(optionPageLink);

    initDefaultElementsListener();
    initElementsDraggable();
    initElementsOpacity();
}

function initElementsOpacity() {
    chrome.runtime.sendMessage({
        message: 'getOpacitySettings',
    }, response => {
        console.log('initElementsOpacity');
        console.log(response);
        setResponseMessage(response);
        if ((response.message === 'success') &&
            (response.opacitySettings) &&
            (response.opacitySettings.addNoteForm !== null) &&
            (response.opacitySettings.addNoteForm !== undefined)) {
            addNoteForm.style.opacity = response.opacitySettings.addNoteForm + '%';
        }
    });
}

function initDefaultElementsListener() {
    optionPageLink.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            message: 'redirectOptionPage',
            targetBlank: true,
        });
    });
}

function initElementsDraggable() {
    draggable(addNoteForm, 10, 0);
}

function initFormElements() {
    addNoteForm = document.createElement('div');
    categoryInput = document.createElement('input');
    addNoteSubmitButton = document.createElement('button');
    categoryOptionDatalist = document.createElement('datalist');
    noteInput = document.createElement('textarea');

    addNoteForm.id = 'addNoteForm';

    categoryInput.id = 'categoryInput';
    categoryInput.innerText = 'no note now';
    categoryInput.type = 'text';
    categoryInput.setAttribute('list', 'categoryOptionDatalist');

    addNoteSubmitButton.id = 'addNoteSubmitButton';
    addNoteSubmitButton.innerText = '送出';
    addNoteSubmitButtonListener();

    categoryOptionDatalist.id = 'categoryOptionDatalist';

    noteInput.id = 'noteInput';
    noteInput.row = 4;
    noteInput.cols = 30;

    addNoteForm.appendChild(categoryInput);
    addNoteForm.appendChild(categoryOptionDatalist);
    addNoteForm.appendChild(noteInput);
    addNoteForm.appendChild(document.createElement('br'));
    addNoteForm.appendChild(addNoteSubmitButton);

    appendChildToWindow(addNoteForm);
    // init also init element, so need to do it after static element finish render
    initNoteData();
}


function initResponseMessageElements() {
    messageDiv = document.createElement('div');
    messageSpan = document.createElement('span');

    messageSpan.id = 'messageSpan';
    messageSpan.innerText = 'testMessage';

    messageDiv.id = 'messageDiv';
    messageDiv.appendChild(messageSpan);

    appendChildToWindow(messageDiv);
}

function initNoteData() {
    chrome.runtime.sendMessage({
        message: 'getCategories',
    }, response => {
        console.log('getCategories');
        console.log(response.message);
        console.log(response.categories);

        if (response.message !== 'success') {
            setResponseMessage(response);

            return;
        }

        if (!Array.isArray(response.categories)) {
            setResponseMessage('categories is not array!');

            return;
        }

        let usingDefaultCategory = false;
        if ((defaultCategory !== '無預設值') &&
            ((defaultCategory) && ((defaultCategory !== 0)))) {
            usingDefaultCategory = true;
            categoryInput.value = defaultCategory;
        }

        if (response.categories.length > 0) {
            categoryOptionDatalist.innerHTML = '';
            let option;
            let regex;
            response.categories.forEach((category) => {
                option = document.createElement('option');
                option.innerText = category;
                categoryOptionDatalist.appendChild(option);

                if (!usingDefaultCategory) {
                    regex = new RegExp('.*' + category + '.*', 'i');
                    if ((categoryInput.value === '')  && (document.title.match(regex))) {
                        console.log('successfully match');
                        categoryInput.value = category;
                        usingDefaultCategory = true;
                    }
                }
            });
        }
    });
}

function setResponseMessage(message, successMessage = false) {
    setTimeout(() => {
        messageSpan.innerText = '';
    }, 2000);

    if ((typeof message === 'string') || (Number.isInteger(message))) {
        messageSpan.innerText = message;
    } else if (message.message) {
        let errorMessage = message.message;
        successMessage = (errorMessage === 'success');
        if (message.payload) {
            errorMessage += message.payload;
        }

        messageSpan.innerText = errorMessage;

        return;
    } else {
        messageSpan.innerText = '未知轉換錯誤';
        successMessage = false;
    }

    if (successMessage) {
        messageDiv.style.backgroundColor = '#67C23A';
    } else {
        messageDiv.style.backgroundColor = '#F56C6C';
    }
}

function appendChildToWindow(element) {
    document.querySelector('body').appendChild(element);
}

function storeNote(category, note) {
    if (
        (category === '') ||
        (category === undefined) ||
        (note === '') ||
        (note === undefined)
    ) {
        setResponseMessage('類別或筆記不能為空');

        return false;
    }

    console.log('storeNote running');
    chrome.runtime.sendMessage({
        message: 'storeNote',
        payload: {
            category: category,
            note: note,
        },
    }, response => {
        console.log(response.message);
        console.log(response.payload);
        setResponseMessage(response, 'successfully store note');

        categoryInput.value = '';
        noteInput.value = '';
        initNoteData();
    });
}

// --------------listener----------

function addNoteSubmitButtonListener() {
    addNoteSubmitButton.addEventListener('click', () => {
        storeNote(categoryInput.value, noteInput.value);
    });
}

function initGlobalListener() {
    document.addEventListener('mouseup', () => {
        let copyText = document.getSelection().toString();
        if (copyText !== '') {
            noteInput.innerText = copyText;
        }
    });
}

function checkIfLineLoginCallback() {
    const currentUrl = new URL(window.location.href);
    const noteExtension = currentUrl.searchParams.get('noteExtension');
    if (noteExtension !== 'loginToken') {
        return;
    }

    let request = {
        redirectType: 'lineLogin',
        message: 'redirectOptionPage',
        loginStatus: 'fail',
    };

    let loginMessage = '';
    const state = currentUrl.searchParams.get('state');
    if (!state) {
        loginMessage += ' state invalid: ' . state;
    } else {
        request.state = state;
    }

    const code = currentUrl.searchParams.get('code');
    if (!code) {
        loginMessage += ' invalid: ' . state;
    } else {
        request.loginStatus = 'success';
        loginMessage += 'login success';
        request.code = code;
    }

    request.loginMessage = loginMessage;
    chrome.runtime.sendMessage(request, response => {
        setResponseMessage(response);
    });
}

function checkIfAllFeatureOption() {
    chrome.runtime.sendMessage({
        message: 'getAllFeatureOption',
    }, response => {
        if (response.message !== 'success') {
            alert('Failing getAllFeatureOption');

            return;
        }

        if (response.allFeatureSetting !== false) {
            checkIfLineLoginCallback();
            loadGlobalVariableSetting();
        }
    });
}

function draggable(element, topPercentage, leftPercentage) {
    let originTop = window.innerHeight * topPercentage / 100;
    let originLeft = window.innerHeight * leftPercentage / 100;
    let isMouseDown = false;

    element.style.position = 'fixed';
    element.style.top = originTop + 'px';
    element.style.left = originLeft + 'px';

    var mouseX;
    var mouseY;

    // var elementX = 0;
    // var elementY = 0;


    var elementX = originLeft;
    var elementY = originTop;

    element.addEventListener('mousedown', onMouseDown);
    function onMouseDown(event) {
        mouseX = event.clientX;
        mouseY = event.clientY;
        isMouseDown = true;
    }

    element.addEventListener('mouseup', onMouseUp);

    function onMouseUp(event) {
        isMouseDown = false;
        elementX = parseInt(element.style.left) || 0;
        elementY = parseInt(element.style.top) || 0;
    }

    document.addEventListener('mousemove', onMouseMove);

    function onMouseMove(event) {
        if (!isMouseDown) return;
        var deltaX = event.clientX - mouseX;
        var deltaY = event.clientY - mouseY;
        element.style.left = elementX + deltaX + 'px';
        element.style.top = elementY + deltaY + 'px';
    }
}

// -------------- script ------------------

checkIfAllFeatureOption();
