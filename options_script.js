//----------------variables-----------------

let categoriesContainer;
let notesContainer;
let lineLoginButton;
let lineLogoutButton;
let exportNotesChatTodo;
let deleteAllNotesButton;

let lineCode;
let notes;

//----------------functions-----------------


function initGlobalElements() {
    categoriesContainer = document.getElementById('categoriesContainer');
    notesContainer = document.getElementById('notesContainer');
    lineLoginButton = document.getElementById('lineLoginButton');
    lineLogoutButton = document.getElementById('lineLogoutButton');
    exportNotesChatTodo = document.getElementById('exportNotesChatTodo');
    deleteAllNotesButton = document.getElementById('deleteAllNotesButton');

    if ((!categoriesContainer) ||
        (!notesContainer) ||
        (!lineLoginButton) ||
        (!lineLogoutButton) ||
        (!deleteAllNotesButton) ||
        (!exportNotesChatTodo)) {
        toastr.error('failing init global variables');
    }

    initGlobalListeners();
}

function initGlobalListeners() {
    lineLoginButton.addEventListener('click', lineLogin);
    lineLogoutButton.addEventListener('click', lineLogout);
    exportNotesChatTodo.addEventListener('click', exportNoteChatTodoApi);
    deleteAllNotesButton.addEventListener('click', deleteAllNotes);
}

function deleteAllNotes() {
    swal({
        title: '確認是否刪除全部筆記?',
        text: '目前無復原功能',
        icon: "warning",
        buttons: true,
        dangerMode: true,
    }).then((ifDelete) => {
        if (ifDelete) {
            chrome.runtime.sendMessage({
                message: 'deleteAllNotes',
            }, response => {
                handleResponseMessage(response, '刪除成功');
                initNotes();
            });
        }
    });
}

function initCategories() {
    chrome.runtime.sendMessage({
        message: 'getCategories',
    }, response => {
        if (response.message !== 'success') {
            toastr.error('initCategories message:' + response.message);

            return;
        }

        if (!Array.isArray(response.categories)) {
            toastr.error('categories is not array!');

            return;
        }

        categoriesContainer.innerHTML = '';
        if (response.categories.length > 0) {
            let display;
            response.categories.forEach(category => {
                display = document.createElement('div');
                display.innerText = category;
                categoriesContainer.appendChild(display);
            });
        }
    });
}

function initNotes() {
    chrome.runtime.sendMessage({
        message: 'getNotes',
    }, response => {
        if (response.message !== 'success') {
            toastr.error('');
        }

        if (!Array.isArray(response.notes)) {
            toastr.error('notes is not array!');

            return;
        }

        notesContainer.innerHTML = '';
        let noteContainer;
        let display;
        let deleteContainer;
        let deleteButton;
        notes = response.notes;
        response.notes.forEach((note, index) => {
            noteContainer = document.createElement('div');
            display = document.createElement('div');
            deleteButton = document.createElement('button');
            deleteContainer = document.createElement('div');

            noteContainer.classList.add('noteContainer');

            deleteContainer.classList.add('deleteContainer');

            deleteButton.innerText = '刪除';
            deleteButton.classList.add('noteDeleteButton');
            deleteButton.addEventListener('click', deleteNote(index, note.category, note.note));

            display.innerText = 'category: ' + note.category + ', note: ' + note.note;

            deleteContainer.appendChild(deleteButton);

            noteContainer.appendChild(deleteContainer);
            noteContainer.appendChild(display);

            notesContainer.appendChild(noteContainer);
        });
    });
}

function lineLogin() {
    chrome.runtime.sendMessage({
        message: 'generateLineLoginState'
    }, response => {
        if (response.message !== 'success') {
            handleResponseMessage(response);

            return;
        }

        if (!response.lineLoginState) {
            toastr.error('generateLineLoginState fail, unknown lineLoginState');

            return;
        }

        const lineLoginState = response.lineLoginState;
        window.location.href = 'https://access.line.me/oauth2/v2.1/authorize?' +
            'response_type=code&' +
            'client_id=1656172765&' +
            'state=' + lineLoginState + '&' +
            'scope=openid%20profile&' +
            'redirect_uri=https://www.google.com?noteExtension=loginToken';
    });
}

function handleParams() {
    const currentUrl = new URL(window.location.href);
    const redirectType = currentUrl.searchParams.get('redirectType');
    if (redirectType) {
        switch (redirectType) {
            case 'lineLogin':
                handleLineLogin(currentUrl);

                break;

            default:
                toastr.error('handle parms, unknown redirect type: ' + redirectType);

                break;
        }
    }
}

function handleLineLogin(currentUrl) {
    const loginStatus = currentUrl.searchParams.get('loginStatus');
    const loginMessage = currentUrl.searchParams.get('loginMessage');
    const code = currentUrl.searchParams.get('code');
    const state = currentUrl.searchParams.get('state');

    if (loginStatus !== 'success') {
        toastr.error('Line login fail, status: ' + loginStatus +
            ', login message: ' +
            ((loginMessage) ? loginMessage : ' no login message'));

        return;
    }

    if (!code) {
        toastr.error('Line logic status success, but code not found!');

        return;
    }

    if (!state) {
        toastr.error('Line logic status success, but state not found!');

        return;
    }

    chrome.runtime.sendMessage({
        message: 'storeLineCode',
        code: code,
        state: state,
    }, response => {
        if (response.message !== 'success') {
            toastr.error('message: ' + response.message + ', payload: ' + response.payload);

            return;
        }

        toastr.success('successfully set lineCode!');

        checkLineLogin(true);
    });
}

function checkLineLogin(hasBeLogin = false) {
    chrome.runtime.sendMessage({
        message: 'getLineCode',
    }, response => {
        if (response.message !== 'success') {
            toastr.error('message: ' + response.message + ', payload: ' + response.payload);

            return;
        }

        if ((hasBeLogin === true) && (!response.lineCode)) {
            toastr.error('line Code fetched, but value invalid: ' + response.lineCode);
        }

        lineCode = response.lineCode;
        if (lineCode) {
            lineLoginButton.disabled = true;
            lineLoginButton.innerText = 'already login';
            lineLogoutButton.disabled = false;

            return true;
        }

        lineLoginButton.disabled = false;
        lineLoginButton.innerText = 'Line Login';
        lineLogoutButton.disabled = true;

        return false;
    });
}

function lineLogout() {
    chrome.runtime.sendMessage({
        message: 'lineLogout',
    }, response => {
        if(handleResponseMessage(response, 'logged out')) {
            checkLineLogin();
        }
    });
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

function toastrSetting() {
    toastr.options = {
        "positionClass": 'toast-bottom-right',
    }
}

function deleteNote(index, category, note) {
    return () => {
        swal({
            title: '是否刪除該筆記?',
            text: 'index: ' + index + ', category: ' + category + ', note: ' + note,
            icon: "warning",
            buttons: true,
            dangerMode: true,
        }).then((ifDelete) => {
            if (ifDelete) {
                chrome.runtime.sendMessage({
                    message: 'deleteNote',
                    index: index,
                    category: category,
                    note: note,
                }, response => {
                    handleResponseMessage(response, '刪除成功');
                    initNotes();
                });
            }
        });
    }
}

function exportNoteChatTodoApi() {
    // todo 等 david backend
    if ((!notes) || (notes.length ===0)) {
        toastr.error('目前無任何筆記!');

        return false;
    }

    if (!lineCode) {
        toastr.error('請先登入 Line!');

        return false;
    }

    axios.post('todo', {
        lineCode: lineCode,
        notes: notes,
    }).then(response => {
        if (response.data !== 'success') {
            toastr.error('匯出失敗');

            return;
        }

        toastr.success('匯出成功');
    }).catch(error => {
        toastr.error('exportNoteChatTodoApi error!');
        toastr.error(error);
    });
}

//----------------script--------------------

toastrSetting();
handleParams();
initGlobalElements();
initCategories();
initNotes();
checkLineLogin();
