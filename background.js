console.log('--------------- background ---------------');

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        name: "Jack"
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && /^http/.test(tab.url)) {
        chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ["./foreground_styles.css"]
        })
            .then(() => {
                console.log("INJECTED THE FOREGROUND STYLES.");

                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ["./foreground.js"]
                })
                    .then(() => {
                        console.log("INJECTED THE FOREGROUND SCRIPT.");
                    });
            })
            .catch(err => console.log(err));
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // current messageType
    // getCategories      取得類別 => output: array categories
    // getNotes           取得筆記
    // storeNote          存筆記
    // redirectOptionPage 跳轉 option page
    // storeLineCode      Line 登入
    // lineLogout         Line 登出
    // getLineCode        取得 Line token

    switch (request.message) {
        case 'getCategories':
            chrome.storage.local.get('categories', data => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'get categories fail',
                    });

                    return;
                }

                if (data.categories) {
                    sendResponse({
                        message: 'success',
                        categories: data.categories,
                    });
                }
            });

            break;

        case 'storeNote':
            if (
                (!request.payload) ||
                (request.payload.category === '') ||
                (request.payload.category === undefined) ||
                (request.payload.category === null) ||
                (request.payload.note === '') ||
                (request.payload.note === undefined) ||
                (request.payload.note === null)
            ) {
                sendResponse({
                    message: 'fail',
                    payload: 'value invalid',
                });

                return;
            }

            chrome.storage.local.get('categories', data => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing fetch categories',
                    });

                    return;
                }

                if (!data.categories) {
                    sendResponse({
                        message: 'fail',
                        payload: 'categories fetched, but data initial fail, got undefined',
                    });

                    return;
                }

                if (!data.categories.includes(request.payload.category)) {
                    data.categories.push(request.payload.category);

                    chrome.storage.local.set({
                        categories: data.categories,
                    }, () => {
                        if (chrome.runtime.lastError) {
                            sendResponse({
                                message: 'fail',
                                payload: 'failing add new category',
                            });
                        }
                    });
                }

                chrome.storage.local.get('notes', data => {
                    if (chrome.runtime.lastError) {
                        sendResponse({
                            message: 'fail',
                            payload: 'failing fetch notes',
                        });

                        return;
                    }

                    if (!data.notes) {
                        data.notes = [];
                    }

                    data.notes.push({
                        category: request.payload.category,
                        note: request.payload.note,
                    });


                    chrome.storage.local.set({
                        notes: data.notes,
                    }, () => {
                        if (chrome.runtime.lastError) {
                            sendResponse({
                                message: 'fail',
                                payload: 'falling set notes',
                            });

                            return;
                        }

                        sendResponse({
                            message: 'success',
                            payload: 'successfully store note, current note number: ' + data.notes.length,
                        });
                    });
                });
            });


            break;

        case 'getNotes':
            chrome.storage.local.get('notes', data => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing fetch notes',
                    });

                    return;
                }

                if (!data.notes) {
                    data.notes = [];
                }

                sendResponse({
                    message: 'success',
                    payload: 'successfully store note, current note number: ' + data.notes.length,
                    notes: data.notes,
                });
            });


            break;

        case 'redirectOptionPage':
            let optionUrl = 'chrome-extension://cdadaanaebagjggpghicohkangbioblk/options.html';
            let paramsChecking = ['redirectType', 'loginStatus', 'loginMessage', 'code', 'state'];

            sendResponse({
                message: 'fail',
                payload: 'fail redirect',
            });

            let params = [];
            paramsChecking.forEach((param) => {
                if (request[param]) {
                    params.push(param + '=' + request[param]);
                }
            });

            if (params.length > 0) {
                optionUrl += '?' + params.join('&');
            }

            if (request.targetBlank === true) {
                chrome.tabs.create({ url: optionUrl });
            } else {
                chrome.tabs.update({ url: optionUrl });
            }

            break;

        case 'storeLineCode':
            if (!request.code) {
                sendResponse({
                    message: 'fail',
                    payload: 'line code not found',
                });

                return;
            }

            if (!request.state) {
                sendResponse({
                    message: 'fail',
                    payload: 'line state not found',
                });

                return;
            }

            chrome.storage.local.get('lineLoginState', (data) => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing fetch lineLoginState',
                    });

                    return;
                }

                if (data.lineLoginState !== request.state) {
                    sendResponse({
                        message: 'fail',
                        payload: 'state unMatch',
                    });

                    return;
                }

                chrome.storage.local.set({
                    lineCode: request.code,
                }, () => {
                    if (chrome.runtime.lastError) {
                        sendResponse({
                            message: 'fail',
                            payload: 'failing set lineCode',
                        });

                        return;
                    }

                    sendResponse({
                        message: 'success',
                        payload: 'successfully set lineCode',
                    })
                });
            });

            break;

        case 'getLineCode':
            chrome.storage.local.get('lineCode', data => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing fetch lineCode',
                    });

                    return;
                }

                sendResponse({
                    message: 'success',
                    lineCode: data.lineCode,
                });
            });

            break;

        case 'lineLogout':
            chrome.storage.local.set({
                lineCode: null
            }, () => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing logout line',
                    });

                    return;
                }

                sendResponse({
                    message: 'success',
                    payload: 'line successfully logout',
                });
            });

            break;

        case 'switchAllFeatureOption':
            chrome.storage.local.get('allFeatureSetting', data => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing fetch allFeatureSetting',
                    });

                    return;
                }

                data.allFeatureSetting = data.allFeatureSetting === false;
                chrome.storage.local.set({
                    allFeatureSetting: data.allFeatureSetting,
                }, () => {
                    if (chrome.runtime.lastError) {
                        sendResponse({
                            message: 'fail',
                            payload: 'failing switch all feature setting',
                        });

                        return;
                    }

                    sendResponse({
                        message: 'success',
                        allFeatureSetting: data.allFeatureSetting,
                    });
                });
            });

            break;

        case 'getAllFeatureOption':
            chrome.storage.local.get('allFeatureSetting', data => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing fetch allFeatureSetting',
                    });

                    return;
                }

                sendResponse({
                    message: 'success',
                    allFeatureSetting: data.allFeatureSetting,
                });
            });

            break;

        case 'generateLineLoginState':
            const lineLoginState = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);

            chrome.storage.local.set({
                lineLoginState: lineLoginState,
            }, () => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing setting lineLoginState',
                    });

                    return;
                }

                sendResponse({
                    message: 'success',
                    lineLoginState: lineLoginState,
                });
            });

            break;

        case 'storeDefaultCategory':
            if ((!request.defaultCategory) && (request.defaultCategory !== 0)) {
                sendResponse({
                    message: 'fail',
                    payload: 'not getting valid default category request value',
                });

                return;
            }

            chrome.storage.local.set({
                defaultCategory: request.defaultCategory,
            }, () => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing setting default category',
                    });

                    return;
                }

                sendResponse({
                    message: 'success'
                });
            });

            break;

        case 'getDefaultCategory':
            chrome.storage.local.get('defaultCategory', data => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing getting default category',
                    });

                    return;
                }

                sendResponse({
                    message: 'success',
                    defaultCategory: data.defaultCategory,
                });
            });

            break;

        case 'getSettings':
            chrome.storage.local.get('defaultCategory', data => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing getting default category',
                    });

                    return;
                }

                sendResponse({
                    message: 'success',
                    defaultCategory: data.defaultCategory,
                });
            });

            break;

        case 'deleteAllNotes':
            chrome.storage.local.set({
                notes: [],
            }, () => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing deleteAllNotes',
                    });

                    return;
                }

                sendResponse({
                    message: 'success',
                    payload: 'successfully delete all notes',
                });
            });

            break;

        case 'deleteNote':
            chrome.storage.local.get('notes', data => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'deleting note, but failing fetch notes',
                    });

                    return;
                }

                if (!data.notes) {
                    sendResponse({
                        message: 'fail',
                        payload: 'deleting note, got empty notes',
                    });

                    return;
                }

                let deletingNote = data.notes[request.index];
                if (!deletingNote) {
                    sendResponse({
                        message: 'fail',
                        payload: 'deleting note, target note index not found',
                    });

                    return;
                }

                if ((deletingNote.category !== request.category) || (deletingNote.note !== request.note)) {
                    sendResponse({
                        message: 'fail',
                        payload: 'got deleting note, but content not match, request category: ' +
                            request.category + ', note: ' + request.note +
                            ', deleting category: ' + deletingNote.category +
                            ', note: ' + deletingNote.note,
                    });

                    return;
                }

                data.notes.splice(request.index, 1);
                chrome.storage.local.set({
                    notes: data.notes,
                }, () => {
                    if (chrome.runtime.lastError) {
                        sendResponse({
                            message: 'fail',
                            payload: 'restoring notes, but fail',
                        });

                        return;
                    }

                    sendResponse({
                        message: 'success',
                        payload: 'successfully delete note',
                    })
                });
            });


            break;

        case 'getOpacitySettings':
            chrome.storage.local.get('opacitySettings', data => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing fetch opacity settings'
                    });

                    return;
                }

                sendResponse({
                    message: 'success',
                    opacitySettings: data.opacitySettings,
                });
            });

            break;

        case 'setOpacity':
            if ((!request.type) || (request.opacity === null) || (request.opacity === undefined)) {
                sendResponse({
                    message: 'fail',
                    payload: 'missing params',
                });

                return;
            }

            chrome.storage.local.get('opacitySettings', data => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        message: 'fail',
                        payload: 'failing fetch opacity',
                    });

                    return;
                }

                if (!data.opacitySettings) {
                    data.opacitySettings = {};
                }

                data.opacitySettings[request.type] = request.opacity;
                chrome.storage.local.set({
                    opacitySettings: data.opacitySettings,
                }, () => {
                    if (chrome.runtime.lastError) {
                        sendResponse({
                            message: 'fail',
                            payload: 'failing set opacity',
                        });

                        return;
                    }

                    sendResponse({
                        message: 'success',
                    });
                });
            });


            break;

        default:
            sendResponse({
                message: 'fail',
                payload: 'method not found, origin message: ' + request.message,
                // originRequest: request,
            });

        return true;
    }

    return true;
});

function lineLogout() {
    chrome.storage.local.set({
        lineCode: null
    }, () => {});
}
