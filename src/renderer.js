const path = require("path");
const ipc = require("electron").ipcRenderer;
const { RuleCreator } = require("./rule-creator");
window.$ = window.jQuery = require("jquery");
const fs = require("fs");

const pathList = new Array(); //an array of loaded files' path
const invalidChars = /[~"#%&*:<>?/\\{|}]+/; //regex of invalid file name characters

//Handle open file button click event
const openFileBtn = document.getElementById("openFileBtn");
openFileBtn.addEventListener("click", function (event) {
    ipc.send("open-file-dialog"); //this send an asynchronous message from renderer process to main process
});

const openFileMenu = document.getElementById("option1");
openFileMenu.addEventListener("click", function (event) {
    ipc.send("open-file-dialog"); //this send an asynchronous message from renderer process to main process
});

//this listen "selected-file" channel, when new files are selected listener would load these files into the program 
ipc.on("selected-file", function (event, files) {
    let errMessage = ''
    for (let i = 0; i < files.length; i++) {
        try {

            for (let j = 0; j < pathList.length; j++) {
                if (files[i] === pathList[j]) {
                    throw `${path.basename(files[i])} already existed!`;
                }
            }
            addFileItem(files[i]);
        } catch (err) {
            errMessage += `${err}\n`
        }
    }
    if (errMessage !== '') {
        errorHandle(errMessage);
    }
});

//Handle open folder button click event
const openFolderBtn = document.getElementById("openFolderBtn");
openFolderBtn.addEventListener("click", function (event) {
    ipc.send("open-folder-dialog");
});

//Handle open folder button in the box
const openFolderMenu = document.getElementById("option2");
openFolderMenu.addEventListener("click", function (event) {
    ipc.send("open-folder-dialog");
});

//listener when folders are selected
ipc.on("selected-folder", function (event, folders) {
    let errMessage = ''
    for (let i = 0; i < folders.length; i++) {
        try {
            for (let j = 0; j < pathList.length; j++) {
                if (folders[i] === pathList[j]) {
                    throw `${path.basename(folders[i])} already existed!`;
                }
            }
            addFileItem(folders[i]);
        } catch (err) {
            errMessage += `${err}\n`
        }
    }
    if (errMessage !== '') {
        errorHandle(errMessage);
    }
});

//Handle save preset button click event
const savePresetBtn = document.getElementById("savePresetBtn");
savePresetBtn.addEventListener("click", savePreset);
ipc.on('save-preset', savePreset);

function savePreset() {
    const rules = order; //reference to the rule order array
    let factory = new RuleCreator();

    let JSONObj = []; //an array of JSON string, contains every thing we need to recreate a rule
    let JSONStr = null;

    try {
        if (rules.length === 0) {
            throw "No rules have been chosen!"
        }

        //this loop is to check if any rule occurs exception, if there is any then throw exception before going any further
        for (let j = 0; j < rules.length; j++) {
            if (rules[j] === "extension") {
                getExtensionParam();
            } else if (rules[j] === "add-prefix") {
                getPrefixParam();
            } else if (rules[j] === "add-suffix") {
                getSuffixParam();
            } else if (rules[j] === "counter") {
                getCounterParam();
            }
        }

        for (let j = 0; j < rules.length; j++) {
            if (rules[j] === "extension") {
                const params = getExtensionParam(); //get rule parameters
                if (params) {
                    JSONStr = factory.toJSON(rules[j], params[0], params[1]); //call toJSON function from factory, convert rule to JSON string
                    JSONObj.push(JSONStr); //push JSON string into an array
                }
            } else if (rules[j] === "replace-characters") {
                const params = getReplaceParam();
                if (params) {
                    JSONStr = factory.toJSON(rules[j], params[0], params[1]);
                    JSONObj.push(JSONStr);
                }
            } else if (rules[j] === "add-prefix") {
                const prefix = getPrefixParam();
                if (prefix) {
                    JSONStr = factory.toJSON(rules[j], prefix);
                    JSONObj.push(JSONStr);
                }
            } else if (rules[j] === "add-suffix") {
                const suffix = getSuffixParam();
                if (suffix) {
                    JSONStr = factory.toJSON(rules[j], suffix);
                    JSONObj.push(JSONStr);
                }
            } else {
                JSONStr = factory.toJSON(rules[j]);
                JSONObj.push(JSONStr);
            }
        }

        JSONStr = JSON.stringify(order); //convert the rule order array to JSON string
        JSONObj.push(JSONStr);

        const myJSON = JSON.stringify(JSONObj); //convert the array of JSON string into a JSON PRESET
        ipc.send("save-preset-dialog", myJSON); //send the JSON PRESET to the main process
    } catch (err) {
        errorHandle(err);
    }
}

//Handle load preset button event
const loadPresetBtn = document.getElementById("loadPresetBtn");
loadPresetBtn.addEventListener("click", function (event) {
    ipc.send("load-preset-dialog");
});

//function handle loaded preset
function handlePreset(preset) {
    const checkboxes = document.querySelectorAll(
        `input[name="renaming-rules"]:checked`
    );
    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = false;
    }

    const rulePreset = JSON.parse(preset); //parse the JSON PRESET to an array of rules

    for (let i = 0; i < rulePreset.length - 1; i++) {
        const obj = JSON.parse(rulePreset[i]); //parse JSON RULE to a rule object

        //handle for each rule detected in the JSON string
        if (obj.name === "Remove all space") {
            const cb = document.querySelector('input[id="remove-space"]');
            cb.checked = true;
        } else if (obj.name === "Replace characters") {
            const cb = document.querySelector('input[id="replace-characters"]');
            cb.checked = true;
            const params = document.querySelectorAll(
                `input[name="replace-parameter"]`
            );
            params[0].value = obj.needle;
            params[1].value = obj.replacement;

            params[0].disabled = false;
            params[1].disabled = false;
        } else if (obj.name === "Replace extension") {
            const cb = document.querySelector('input[id="extension"]');
            cb.checked = true;
            const params = document.querySelectorAll(
                `input[name="extension-parameter"]`
            );
            params[0].value = obj.needle;
            params[1].value = obj.replacement;

            params[0].disabled = false;
            params[1].disabled = false;
        } else if (obj.name === "Add prefix") {
            const cb = document.querySelector('input[id="add-prefix"]');
            cb.checked = true;
            const prefix = document.getElementById("prefix");
            prefix.value = obj.prefix;
            prefix.disabled = false;
        } else if (obj.name === "Add suffix") {
            const cb = document.querySelector('input[id="add-suffix"]');
            cb.checked = true;
            const suffix = document.getElementById("suffix");
            suffix.value = obj.suffix;
            suffix.disabled = false;
        } else if (obj.name === "Convert lowercase") {
            const cb = document.querySelector('input[id="lowercase"]');
            cb.checked = true;
        } else if (obj.name === "Convert to PascalCase") {
            const cb = document.querySelector('input[id="pascalcase"]');
            cb.checked = true;
        } else if (obj.name === "Add counter") {
            const cb = document.querySelector('input[id="counter"]');
            cb.checked = true;
            let params = document.querySelectorAll(`input[name="counter-parameter"]`);
            params.forEach((param) => {
                param.disabled = false;
            });
        }
    }

    order = JSON.parse(rulePreset[rulePreset.length - 1]);
    createList();
    addEventListener();
}

//listener when a preset is selected
ipc.on("selected-preset", function (event, preset) {
    handlePreset(preset);
});

//Error handles
const errorHandle = (message) => {
    ipc.send("error-handle", message);
};

const area = document.getElementById('drag-back');
const datatable = document.getElementById('batchtable');
const buttontable = document.getElementById('tablebutton');
const tablerow = document.getElementById('rowtable');

//files/folders drag and drop handle
area.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
        for (const f of event.dataTransfer.files) {
            for (let j = 0; j < pathList.length; j++) {
                if (f.path === pathList[j]) {
                    throw `${path.basename(f.path)} already existed!`;
                }
            }
            addFileItem(f.path);
        }
    } catch (err) {
        errorHandle(err);
    }
});

document.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
});

//rule preset drag and drop handle
const ruleContainer = document.getElementById('rule-list-container');
ruleContainer.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();

    for (const f of event.dataTransfer.files) {
        if (path.extname(f.path) === '.json') {
            const JSONStr = fs.readFileSync(f.path).toString();
            handlePreset(JSONStr);
        }
    }
});

//Function handle adding files/folders to program
const addFileItem = (__filepath) => {
    pathList.push(__filepath);

    if (pathList.length === 1) {
        area.innerHTML = '';
        area.style.background = 'aliceblue';
        $(datatable).appendTo(area);
        $(buttontable).appendTo(area);
        tablerow.display = 'initial';
        tablerow.marginRight = '100px';
    }

    //this add selected file to the table
    const container = document.querySelector("#file-list-container");
    const item = document.createElement("tr");
    item.setAttribute("path", __filepath);
    item.classList.add("item");
    item.innerHTML = `
    <td>${path.parse(__filepath).name}</td>
    <td>${path.extname(__filepath)}</td>
    `;
    addDelButton(item);
    addPreviewButton(item);
    addSelectCheckbox(item);
    container.appendChild(item);

    selectedFiles = getSelectedFiles();
};

//Function handle adding select checkbox for each loaded file
function addSelectCheckbox(parent) {
    const selectTd = parent.appendChild(document.createElement("td"));
    selectTd.classList.add("container-checkbox");
    const path = selectTd.parentElement.getAttribute("path");

    const selectLabel = document.createElement("label");

    const selectCheckbox = document.createElement("input");
    selectCheckbox.type = 'checkbox';
    selectCheckbox.name = 'file-select';
    selectCheckbox.id = path;
    selectCheckbox.value = path;
    selectCheckbox.checked = true;

    const selectCheckMark = document.createElement("span");
    selectCheckMark.classList.add("checkmark");
    selectTd.appendChild(selectLabel);
    selectLabel.appendChild(selectCheckbox);
    selectLabel.appendChild(selectCheckMark);
    selectTd.appendChild(selectLabel);
    selectCheckbox.onchange = function () {
        selectedFiles = getSelectedFiles();
    }
}

//Function handle adding delete button for each loaded file
function addDelButton(parent) {
    const delBtn = parent.appendChild(document.createElement("td"));
    delBtn.classList.add("delTrash");
    const delIcon = document.createElement("i");
    delIcon.classList.add("fa");
    delIcon.classList.add("fa-times");
    delBtn.appendChild(delIcon);
    delBtn.onclick = function () {
        const path = this.parentElement.getAttribute("path");
        pathList.splice(pathList.indexOf(path), 1);
        this.parentElement.remove();

        if (pathList.length === 0) {
            area.innerHTML = `
            <div class="drag-area" id="drag-area">
                <header>Drop files / folders here</header>
                <span>OR</span>
                <div class="dropdown">
                    <div class="title pointerCursor">Choose Files<i class="fa fa-angle-right"></i></div>
                    <div class="menu pointerCursor hide">
                        <div class="option" id="option1">Open file</div>
                        <div class="option" id="option2">Open folder</div>
                    </div>
                </div>
            </div>`;
            area.style.background = '#142532';
            $(datatable).appendTo('#rowtable');
            $(buttontable).appendTo('#rowtable');

            const openFileMenu = document.getElementById("option1");
            openFileMenu.addEventListener("click", function (event) {
                ipc.send("open-file-dialog"); //this send an asynchronous message from renderer process to main process
            });

            const openFolderMenu = document.getElementById("option2");
            openFolderMenu.addEventListener("click", function (event) {
                ipc.send("open-folder-dialog");
            });

            //get elements
            const dropdownTitle = document.querySelector('.dropdown .title');
            const dropdownOptions = document.querySelectorAll('.dropdown .option');

            //bind listeners to these elements
            dropdownTitle.addEventListener('click', toggleMenuDisplay);

            dropdownOptions.forEach(option => option.addEventListener('click', handleOptionSelected));

            document.querySelector('.dropdown .title').addEventListener('change', handleTitleChange);
        }
    };
}

//Function handle adding preview button for each loaded file
function addPreviewButton(parent) {
    const previewBtn = parent.appendChild(document.createElement("td"));
    previewBtn.classList.add("preview");
    const previewIcon = document.createElement("i");
    previewIcon.classList.add("fa");
    previewIcon.classList.add("fa-search");
    previewBtn.appendChild(previewIcon);
    previewBtn.onclick = function () {
        const rules = order;
        let factory = new RuleCreator();

        const __path = this.parentElement.getAttribute("path");
        const original = path.basename(__path);

        let name = path.parse(__path).name;
        let extension = path.extname(__path);

        try {
            if (rules.length === 0) {
                throw "No rules have been chosen!"
            }

            for (let j = 0; j < rules.length; j++) {
                if (rules[j] === "extension") {
                    getExtensionParam();
                } else if (rules[j] === "add-prefix") {
                    getPrefixParam();
                } else if (rules[j] === "add-suffix") {
                    getSuffixParam();
                } else if (rules[j] === "counter") {
                    getCounterParam();
                }
            }

            for (let j = 0; j < rules.length; j++) {
                if (rules[j] === "extension") {
                    const params = getExtensionParam();
                    if (params) {
                        extension = factory.invokeTransform(
                            rules[j],
                            extension,
                            params[0],
                            params[1]
                        );
                    }
                } else if (rules[j] === "replace-characters") {
                    const params = getReplaceParam();
                    if (params) {
                        name = factory.invokeTransform(rules[j], name, params[0], params[1]);
                    }
                } else if (rules[j] === "add-prefix") {
                    const prefix = getPrefixParam();
                    if (prefix) {
                        name = factory.invokeTransform(rules[j], name, prefix);
                    }
                } else if (rules[j] === "add-suffix") {
                    const suffix = getSuffixParam();
                    if (suffix) {
                        name = factory.invokeTransform(rules[j], name, suffix);
                    }
                } else if (rules[j] === "counter") {
                    const params = getCounterParam();
                    if (params) {
                        let start = parseInt(params[0]);
                        let steps = parseInt(params[1]) * i;
                        let digits = parseInt(params[2]);

                        let padding = start + steps;
                        padding = padding.toString();
                        while (padding.length < digits) padding = "0" + padding;

                        name = factory.invokeTransform(rules[j], name, padding);
                    }
                } else {
                    name = factory.invokeTransform(rules[j], name);
                }
            }

            let newPath = null;
            if (copyChk.checked) { //check if the option to copy renamed files to another directory is selected
                if (pathInput.value === '') {
                    throw 'Empty copy directory!'
                } else {
                    newPath = path.join(pathInput.value, `${name}${extension}`);
                }
            } else {
                newPath = path.join(__path, "..", `${name}${extension}`);
            }

            handlePreview(original, __path, name, extension, newPath); //handle preview
        } catch (err) {
            errorHandle(err);
        }

    }
}

//function handle preview operation, send message to main process to invoke a dialog
function handlePreview(original, oldPath, name, extension, newPath) {
    const message = `Original name: ${original}\nOriginal path: ${oldPath}\nNEW name: ${name}${extension}\nNEW path: ${newPath}`;
    ipc.send('preview-handle', message);
}

//function getting parameters for the change extension rule
function getExtensionParam() {
    const params = document.querySelectorAll(`input[name="extension-parameter"]`);
    let values = [];

    params.forEach((param) => {
        if (param.value === "") {
            throw 'Change Extension: Empty parameters!';
        }
        if (invalidChars.test(param.value)) {
            throw `Change Extension: A file name can't contain any of the following characters: \\/:*?"<>|`
        }
        values.push(param.value);
    });
    return values;

}

//FUNCTIONS GETTING RULES' PARAMETERS
function getReplaceParam() {
    const params = document.querySelectorAll(`input[name="replace-parameter"]`);
    let values = [];
    params.forEach((param) => {
        if (invalidChars.test(param.value)) {
            throw `Replace Rule: A file name can't contain any of the following characters: \\/:*?"<>|`
        }
        values.push(param.value);
    });
    return values;
}

function getCounterParam() {
    const params = document.querySelectorAll(`input[name="counter-parameter"]`);
    let values = [];

    if (
        parseInt(params[0].value) < 0 ||
        parseInt(params[1].value) < 1 ||
        parseInt(params[2].value) < 1
    ) {
        throw "Add counter: Invalid parameters!";
    }
    params.forEach((param) => {
        if (param.value === "") {
            values.push(1);
        } else {
            values.push(param.value);
        }
    });
    return values;
}

function getPrefixParam() {
    const prefix = document.getElementById("prefix");
    if (prefix.value === "") {
        throw "Add Prefix: Empty parameters!";
    }
    if (invalidChars.test(prefix.value)) {
        throw `Add Prefix: A file name can't contain any of the following characters: \\/:*?"<>|`
    }
    return prefix.value;

}

function getSuffixParam() {
    const suffix = document.getElementById("suffix");
    if (suffix.value === "") {
        throw "Add Suffix: Empty parameters!";
    }
    if (invalidChars.test(suffix.value)) {
        throw `Add Suffix: A file name can't contain any of the following characters: \\/:*?"<>|`
    }
    return suffix.value;

}

let order = []; //an array contains rule order

//handle rule selection
[].forEach.call(
    document.querySelectorAll(`input[name="renaming-rules"]`),
    function (checkbox) {
        "use strict";
        checkbox.addEventListener("change", function () {
            let rules = document.querySelectorAll(`input[name="renaming-rules"]`);
            let previousLi = checkbox.parentNode.parentNode.previousElementSibling;
            let index = 0;
            while (previousLi !== null) {
                previousLi = previousLi.previousElementSibling;
                index += 1;
            }

            if (checkbox.checked) {
                order.push(rules[index].value);
            } else {
                order.splice(order.indexOf(rules[index].value), 1);
            }

            createList();
            addEventListener();
        });
    }
);


const draggable_list = document.getElementById("draggable-list");
let dragStartIndex;

//SELECTED RULE LIST HANDLE
function createList() {
    draggable_list.innerHTML = "";
    const properNames = convertOrderToName();
    [...properNames].forEach((rule, index) => {
        const listItem = document.createElement("li");

        listItem.setAttribute("data-index", index);
        listItem.innerHTML = `
        <h5 class="number">${index + 1}</h5>
        <div class="draggable" draggable="true">
            <p class="rule-name">${properNames[index]}</p>
            <h5 class="material-icons">&#9776;</h5>
        </div>
        `;
        draggable_list.appendChild(listItem);
    });
}

//functions handle rules' order drag and drop events
function dragStart() {
    dragStartIndex = +this.closest("li").getAttribute("data-index");
    console.log(dragStartIndex);
}
function dragEnter() {
    this.classList.add("over");
}
function dragLeave() {
    this.classList.remove("over");
}
function dragOver(e) {
    e.preventDefault();
}
function dragDrop() {
    const dragEndIndex = +this.getAttribute("data-index");
    swapItems(dragStartIndex, dragEndIndex);

    this.classList.remove("over");
}

//function handle swapping two rule order
function swapItems(fromIndex, toIndex) {
    const itemOne = document.querySelector(`li[data-index='${fromIndex}']`);
    const itemTwo = document.querySelector(`li[data-index='${toIndex}']`);

    const draggableOne = itemOne.querySelector(".draggable");
    const draggableTwo = itemTwo.querySelector(".draggable");

    itemOne.appendChild(draggableTwo);
    itemTwo.appendChild(draggableOne);

    [order[fromIndex], order[toIndex]] = [order[toIndex], order[fromIndex]];
}

//function add drag and drop event to selected rules list
function addEventListener() {
    const draggables = document.querySelectorAll(".draggable");
    const dragListItems = document.querySelectorAll(".draggable-list li");

    draggables.forEach((draggable) => {
        draggable.addEventListener("dragstart", dragStart);
    });

    dragListItems.forEach((item) => {
        item.addEventListener("dragover", dragOver);
        item.addEventListener("drop", dragDrop);
        item.addEventListener("dragenter", dragEnter);
        item.addEventListener("dragleave", dragLeave);
    });
}

//convert button handle
const btn = document.querySelector("#btnConvert");
btn.addEventListener("click", () => {
    const rules = order;
    let factory = new RuleCreator();
    const items = document.querySelectorAll(`tr[class="item"]`);

    try {
        if (rules.length === 0) {
            throw "No rules have been chosen!"
        }
        if (selectedFiles.length === 0) {
            throw "No files have been selected!"
        }

        for (let i = 0; i < pathList.length; i++) {
            const checkbox = document.getElementById(pathList[i]);
            if (checkbox.checked) {
                let name = path.parse(pathList[i]).name;
                let extension = path.extname(pathList[i]);

                //this loop is to check if any rule occurs exception, if there is then throw operation before going any further
                for (let j = 0; j < rules.length; j++) {
                    if (rules[j] === "extension") {
                        getExtensionParam();
                    } else if (rules[j] === "add-prefix") {
                        getPrefixParam();
                    } else if (rules[j] === "add-suffix") {
                        getSuffixParam();
                    } else if (rules[j] === "counter") {
                        getCounterParam();
                    }
                }

                //processing files' name
                for (let j = 0; j < rules.length; j++) {
                    if (rules[j] === "extension") {
                        const params = getExtensionParam();
                        if (params) {
                            extension = factory.invokeTransform(
                                rules[j],
                                extension,
                                params[0],
                                params[1]
                            );
                        }
                    } else if (rules[j] === "replace-characters") {
                        const params = getReplaceParam();
                        if (params) {
                            name = factory.invokeTransform(rules[j], name, params[0], params[1]);
                        }
                    } else if (rules[j] === "add-prefix") {
                        const prefix = getPrefixParam();
                        if (prefix) {
                            name = factory.invokeTransform(rules[j], name, prefix);
                        }
                    } else if (rules[j] === "add-suffix") {
                        const suffix = getSuffixParam();
                        if (suffix) {
                            name = factory.invokeTransform(rules[j], name, suffix);
                        }
                    } else if (rules[j] === "counter") {
                        const params = getCounterParam();
                        if (params) {
                            let start = parseInt(params[0]);
                            let steps = parseInt(params[1]) * i;
                            let digits = parseInt(params[2]);

                            let padding = start + steps;
                            padding = padding.toString();
                            while (padding.length < digits) padding = "0" + padding;

                            name = factory.invokeTransform(rules[j], name, padding);
                        }
                    } else {
                        name = factory.invokeTransform(rules[j], name);
                    }
                }


                let newPath = null;
                if (copyChk.checked) { //checking if the copy renamed files to another folder is selected
                    if (pathInput.value === '') {
                        throw 'Empty copy directory!'
                    } else {
                        newPath = path.join(pathInput.value, `${name}${extension}`);
                        fs.copyFile(pathList[i], newPath, (err) => {
                            if (err) throw err;
                            pathList[i] = newPath;
                            items[i].setAttribute("path", newPath);
                            items[i].innerHTML = `
                    <td>${path.parse(newPath).name}</td>
                    <td>${path.extname(newPath)}</td>
                    `;
                            addDelButton(items[i]);
                            addPreviewButton(items[i]);
                            addSelectCheckbox(items[i]);
                        });
                    }
                } else { //if not, just rename the chosen files
                    newPath = path.join(pathList[i], "..", `${name}${extension}`);
                    fs.rename(pathList[i], newPath, function () {
                        pathList[i] = newPath;
                        items[i].setAttribute("path", newPath);
                        items[i].innerHTML = `
                <td>${path.parse(newPath).name}</td>
                <td>${path.extname(newPath)}</td>
                `;
                        addDelButton(items[i]);
                        addPreviewButton(items[i]);
                        addSelectCheckbox(items[i]);
                    });
                }
            }
        }
    } catch (err) {
        errorHandle(err);
    }
});

// ENABLE/DISABLE parameter input boxes when rules' checkbox is CHECKED/UNCHECKED
function EnableDisableSuffixParam() {
    const suffixChk = document.getElementById("add-suffix");
    let suffix = document.getElementById("suffix");
    suffix.disabled = suffixChk.checked ? false : true;
    if (suffix.disabled) {
        suffix.value = "";
    }
}

function EnableDisablePrefixParam() {
    const prefixChk = document.getElementById("add-prefix");
    let prefix = document.getElementById("prefix");
    prefix.disabled = prefixChk.checked ? false : true;
    if (prefix.disabled) {
        prefix.value = "";
    }
}

function EnableDisableExtensionParam() {
    const extensionChk = document.getElementById("extension");
    let params = document.querySelectorAll(`input[name="extension-parameter"]`);
    params.forEach((param) => {
        param.disabled = extensionChk.checked ? false : true;
        if (param.disabled) {
            param.value = "";
        }
    });
}

function EnableDisableReplaceParam() {
    const replaceChk = document.getElementById("replace-characters");
    let params = document.querySelectorAll(`input[name="replace-parameter"]`);
    params.forEach((param) => {
        param.disabled = replaceChk.checked ? false : true;
        if (param.disabled) {
            param.value = "";
        }
    });
}

function EnableDisableCounterParam() {
    const replaceChk = document.getElementById("counter");
    let params = document.querySelectorAll(`input[name="counter-parameter"]`);
    params.forEach((param) => {
        param.disabled = replaceChk.checked ? false : true;
        if (param.disabled) {
            param.value = "";
        }
    });
}

//add click event to rule checkboxes
const suffixCheckBox = document.getElementById("add-suffix");
suffixCheckBox.addEventListener("click", EnableDisableSuffixParam);

const prefixCheckBox = document.getElementById("add-prefix");
prefixCheckBox.addEventListener("click", EnableDisablePrefixParam);

const extensionCheckBox = document.getElementById("extension");
extensionCheckBox.addEventListener("click", EnableDisableExtensionParam);

const replaceCheckBox = document.getElementById("replace-characters");
replaceCheckBox.addEventListener("click", EnableDisableReplaceParam);

const counterCheckBox = document.getElementById("counter");
counterCheckBox.addEventListener("click", EnableDisableCounterParam);


//FUNCTIONS HANDLE SELECT/UNSELECT ALL RULES BUTTON
function check(checked = true) {
    const cbs = document.querySelectorAll(`input[name="renaming-rules"]`);
    cbs.forEach((cb) => {
        cb.checked = checked;
    });
}

const selectBtn = document.querySelector("#selectall");
selectBtn.onclick = checkAll;
selectBtn.addEventListener('mouseover', function () { selectBtn.style.color = "#1b3344"; });

// to check if all the checkbox is checked or not on click
document.querySelector(`input[id="extension"]`).onclick = vibeCheck();
function vibeCheck() {
    const allBoxesState = document.querySelectorAll(`input[name="renaming-rules"]:checked`);

    if (allBoxesState.length == 0) {
        selectBtn.title = "Select All Rules";
        selectBtn.addEventListener('mouseleave', function () { selectBtn.style.color = "aliceblue"; });
    }
    else {
        selectBtn.title = "Unselect All Rules";
        selectBtn.addEventListener('mouseleave', function () { selectBtn.style.color = "#f9cb6a"; });
        selectBtn.addEventListener('mouseover', function () { selectBtn.style.color = "#1b3344"; });
    }
}

function checkAll() {
    check();
    EnableDisableCounterParam();
    EnableDisableExtensionParam();
    EnableDisablePrefixParam();
    EnableDisableReplaceParam();
    EnableDisableSuffixParam();

    // reassign click event handler
    this.onclick = uncheckAll;

    order = getSelectedRules();
    createList();
    addEventListener();
    vibeCheck()
}

function uncheckAll() {
    check(false);
    EnableDisableCounterParam();
    EnableDisableExtensionParam();
    EnableDisablePrefixParam();
    EnableDisableReplaceParam();
    EnableDisableSuffixParam();
    // reassign click event handler
    this.onclick = checkAll;
    order = getSelectedRules();
    createList();
    addEventListener();
    vibeCheck()
}

//function getting rules that are selected
function getSelectedRules() {
    const checkboxes = document.querySelectorAll(
        `input[name="renaming-rules"]:checked`
    );
    let values = [];
    checkboxes.forEach((checkbox) => {
        values.push(checkbox.value);
    });
    return values;
}

let selectedFiles = [];
//function getting files path that are selected
function getSelectedFiles() {
    const checkboxes = document.querySelectorAll(
        `input[name="file-select"]:checked`
    );
    let values = [];
    checkboxes.forEach((checkbox) => {
        values.push(checkbox.value);
    });
    return values;
}

//function convert the html rule-checkbox value to proper rule names
function convertOrderToName() {
    let properNames = [];
    for (let i = 0; i < order.length; i++) {
        properNames.push(ruleMap.get(order[i]));
    }

    return properNames;
}

//a map to bind the rule checkboxes' values to a proper rule name
const ruleMap = new Map();

ruleMap.set("extension", "Change File Extension");
ruleMap.set("replace-characters", "Replace Characters");
ruleMap.set("add-prefix", "Add Prefix");
ruleMap.set("add-suffix", "Add Suffix");
ruleMap.set("counter", "Add Counter");
ruleMap.set("remove-space", "No Space");
ruleMap.set("lowercase", "Lower Case & No Space");
ruleMap.set("pascalcase", "PascalCase");

const screenmin1600 = window.matchMedia("(min-width: 1600px)"); //reference to screen
var x = document.getElementById("drag-back"); //reference to drag area

function openNav() {
    var e = document.getElementById("sideBar");
    var f = document.getElementById("menu");
    if (e.style.width == '250px') {
        e.style.width = '0px';
        f.style.marginLeft = e.style.width;
    } else {
        e.style.width = '250px';
        f.style.marginLeft = '250px';
    }
    document.getElementById("open").style.opacity = "0";
    document.getElementById("close").style.opacity = "1";
    document.getElementById("open").style.transition = "0s";
    document.getElementById("open").disabled = true;
    document.getElementById("open").style.cursor = "default";

    x.style.marginLeft = "30%"; //margin drag area and table when sidebar is opened

    if (screenmin1600.matches) {
        x.style.marginLeft = "23%"; //same but in fullscreen
    }
}

function closeNav() {
    document.getElementById("sideBar").style.width = "0";
    document.getElementById("menu").style.marginLeft = "0";
    document.getElementById("open").disabled = false;
    document.getElementById("open").style.cursor = "pointer";
    document.getElementById("open").style.transition = "0s";

    document.getElementById("menu").addEventListener("transitionend",
        function () {
            if (document.getElementById("sideBar").style.width == '0px') {
                document.getElementById("open").style.opacity = "1";
            }
        });

    x.style.marginLeft = "20%";

    if (screenmin1600.matches) {
        x.style.marginLeft = "15%";
    }
}

const openMenu = document.getElementById("open");
const closeMenu = document.getElementById("close");


openMenu.addEventListener("click", openNav);
closeMenu.addEventListener("click", closeNav);
//disable startup easteregg
document.getElementById("open").disabled = true;
document.getElementById("open").style.cursor = "default";

var acc = document.getElementsByClassName("btn_rule");
var i;

for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function () {
        this.classList.toggle("active");

        var panel = this.nextElementSibling;
        if (panel.style.maxHeight == "0px") {
            panel.style.maxHeight = "610px";
        } else {
            panel.style.maxHeight = "0px";
        }
    });
}

var lol = document.getElementsByClassName("btn_body");
var j;

for (j = 0; j < lol.length; j++) {
    lol[j].addEventListener("click", function () {
        this.classList.toggle("active");

        var panel = this.nextElementSibling;
        if (panel.style.maxHeight == "0px") {
            panel.style.maxHeight = "400px";
        } else {
            panel.style.maxHeight = "0px";
        }
    });
}

document.getElementById("ruleBtn").addEventListener('click', function () {
    const icon = this.querySelector("i");

    if (icon.classList.contains('fa-chevron-down')) {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
    } else {
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-down');
    }
})

document.getElementById("rulelistBtn").addEventListener('click', function () {
    const icon = this.querySelector("i");

    if (icon.classList.contains('fa-chevron-down')) {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-right');
    } else {
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-down');
    }
})

function toggleClass(elem, className) {
    if (elem.className.indexOf(className) !== -1) {
        elem.className = elem.className.replace(className, '');
    }
    else {
        elem.className = elem.className.replace(/\s+/g, ' ') + ' ' + className;
    }

    return elem;
}

function toggleMenuDisplay(e) {
    const dropdown = e.currentTarget.parentNode;
    const menu = dropdown.querySelector('.menu');
    const icon = dropdown.querySelector('.fa-angle-right');

    toggleClass(menu, 'hide');
    toggleClass(icon, 'rotate-90');

}

function handleOptionSelected(e) {
    toggleClass(e.target.parentNode, 'hide');

    const id = e.target.id;
    const newValue = e.target.textContent + ' ';
    const titleElem = document.querySelector('.dropdown .title');
    const icon = document.querySelector('.dropdown .title .fa');


    titleElem.textContent = newValue;
    titleElem.appendChild(icon);

    //trigger custom event
    document.querySelector('.dropdown .title').dispatchEvent(new Event('change'));
    //setTimeout is used so transition is properly shown
    setTimeout(() => toggleClass(icon, 'rotate-90', 0));
}

//get elements
const dropdownTitle = document.querySelector('.dropdown .title');
const dropdownOptions = document.querySelectorAll('.dropdown .option');

//bind listeners to these elements
dropdownTitle.addEventListener('click', toggleMenuDisplay);

dropdownOptions.forEach(option => option.addEventListener('click', handleOptionSelected));

//handle browse button
const browseBtn = document.getElementById('btnBrowse');
const pathInput = document.getElementById('copy-path');

//when clicked browse button, send message to main process to invoke open folder dialog
browseBtn.addEventListener("click", function (event) {
    ipc.send("open-browse-dialog");
});

//show the path in the input box after chosen a directory
ipc.on("selected-browse-path", function (event, folder) {
    pathInput.value = folder;
});

const copyChk = document.getElementById("convert-copy");
function EnableDisablePathInput() {
    let pathInput = document.getElementById('copy-path');
    browseBtn.disabled = copyChk.checked ? false : true;
    pathInput.disabled = copyChk.checked ? false : true;
    if (pathInput.disabled) {
        pathInput.value = "";
    }
}
copyChk.addEventListener("click", EnableDisablePathInput);