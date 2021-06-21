function saveLocalStorage(key: string, value: string) {
    localStorage.setItem(key, value);
}

function getLocalStorage(key: string) {
    return localStorage.getItem(key);
}

export { saveLocalStorage, getLocalStorage };
