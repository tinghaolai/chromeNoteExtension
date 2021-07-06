// -----------------------global variable------------

let foregroundAllFeatureSwitch;
let defaultCategoryButton;
let defaultCategoryInput;
let defaultCategoryList;

let originDefaultCategoryInput;
let opacityAddNoteFormInput;
let opacityAddNoteFormButton;

//   ---------------------function-------------------

function toastrSetting() {
    toastr.options = {
        "positionClass": 'toast-bottom-right',
    }
}

function initDefaultElements() {
    foregroundAllFeatureSwitch = document.getElementById('foregroundAllFeatureSwitch');
    defaultCategoryButton = document.getElementById('defaultCategoryButton');
    defaultCategoryInput = document.getElementById('defaultCategoryInput');
    defaultCategoryList = document.getElementById('defaultCategoryList');
    opacityAddNoteFormInput = document.getElementById('opacityAddNoteFormInput');
    opacityAddNoteFormButton = document.getElementById('opacityAddNoteFormButton');
    if ((!foregroundAllFeatureSwitch) ||
        (!defaultCategoryButton) ||
        (!defaultCategoryInput) ||
        (!opacityAddNoteFormInput) ||
        (!opacityAddNoteFormButton) ||
        (!defaultCategoryList)) {
        toastr.error('Failing initDefaultElements');

        return false;
    }

    checkIfAllFeatureOption();
    initDefaultCategoryOptions();
    initDefaultCategoryInput();
    initOpacitySettings();

    initDefaultElementsListeners();
}

function initOpacitySettings() {
    chrome.runtime.sendMessage({
        message: 'getOpacitySettings',
    }, response => {
        handleResponseMessage(response);
        if ((response.message === 'success') &&
            (response.opacitySettings) &&
            (response.opacitySettings.addNoteForm !== undefined) &&
            (response.opacitySettings.addNoteForm !== null)) {
            opacityAddNoteFormInput.value = response.opacitySettings.addNoteForm;
        }
    });
}


function initDefaultElementsListeners() {
    foregroundAllFeatureSwitch.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            message: 'switchAllFeatureOption'
        }, response => {
            handleResponseMessage(response, 'switch successfully');
            initAllFeatureButton(response.allFeatureSetting);
        });
    });

    defaultCategoryButton.addEventListener('click', storeDefaultCategory);

    defaultCategoryInput.addEventListener('focusin', () => {
        originDefaultCategoryInput = defaultCategoryInput.value;
        defaultCategoryInput.value = '';
    });

    defaultCategoryInput.addEventListener('focusout', () => {
        if ((!defaultCategoryInput.value) && (defaultCategoryInput.value !== 0)) {
            defaultCategoryInput.value = originDefaultCategoryInput;
        }
    });

    opacityAddNoteFormButton.addEventListener('click', storeAddFormOpacity);
}

function storeAddFormOpacity() {
    if ((!opacityAddNoteFormInput.value) && (opacityAddNoteFormInput.value !== 0)) {
        toastr.error('invalid opacity');

        return;
    }

    chrome.runtime.sendMessage({
        message: 'setOpacity',
        type: 'addNoteForm',
        opacity: opacityAddNoteFormInput.value
    }, response => {
        handleResponseMessage(response, 'set successfully');
    });
}

function storeDefaultCategory() {
    if ((!defaultCategoryInput.value) && (defaultCategoryInput.value !== 0)) {
        toastr.error('不能為空!');

        return false;
    }

    chrome.runtime.sendMessage({
        message: 'storeDefaultCategory',
        defaultCategory: defaultCategoryInput.value,
    }, response => {
        handleResponseMessage(response, '修改預設類別成功');
        initDefaultCategoryOptions();
    });
}

function initDefaultCategoryOptions() {
    defaultCategoryList.innerHTML = '';
    let option = document.createElement('option');
    option.innerText = '無預設值';
    option.id = 'noDefaultCategoryList';
    defaultCategoryList.appendChild(option);

    chrome.runtime.sendMessage({
        message: 'getCategories',
    }, response => {
        handleResponseMessage(response);
        if ((response.message === 'success') && (response.categories)) {
            response.categories.forEach(category => {
                option = document.createElement('option');
                option.innerText = category;
                defaultCategoryList.appendChild(option);
            });
        }
    });
}

function initDefaultCategoryInput() {
    chrome.runtime.sendMessage({
        message: 'getDefaultCategory',
    }, response => {
        handleResponseMessage(response);
        if ((response.message === 'success') &&
            ((response.defaultCategory || response.defaultCategory === 0))) {
            defaultCategoryInput.value = response.defaultCategory;
        } else {
            defaultCategoryInput.value = '無預設值';
        }
    });
}

function checkIfAllFeatureOption() {
    chrome.runtime.sendMessage({
        message: 'getAllFeatureOption',
    }, response => {
        handleResponseMessage(response);
        initAllFeatureButton(response.allFeatureSetting);
    });
}

function initAllFeatureButton(allFeatureSetting) {
    foregroundAllFeatureSwitch.innerText = (allFeatureSetting === false) ? 'close' : 'open';
}

function handleResponseMessage(response, successMessage = false) {
    if (response.message !== 'success') {
        toastr.error('message: ' + response.message + ', payload: ' + response.payload);

        return false;
    }

    if (successMessage) {
        toastr.success(successMessage);
    }

    return true;
}

// -----------------------script-------------------

toastrSetting();
initDefaultElements();
