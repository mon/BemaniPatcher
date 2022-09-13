/*jshint esversion: 6 */
(function(window, document) {
"use strict";

// form labels often need unique IDs - this can be used to generate some
window.Patcher_uniqueid = 0;
var createID = function() {
    window.Patcher_uniqueid++;
    return "dllpatch_" + window.Patcher_uniqueid;
};

var bytesMatch = function(buffer, offset, bytes) {
    for(var i = 0; i < bytes.length; i++) {
        if(buffer[offset+i] != bytes[i])
            return false;
    }
    return true;
};

var replace = function(buffer, offset, bytes) {
    for(var i = 0; i < bytes.length; i++) {
        buffer[offset+i] = bytes[i];
    }
};

var whichBytesMatch = function(buffer, offset, bytesArray) {
    for(var i = 0; i < bytesArray.length; i++) {
        if(bytesMatch(buffer, offset, bytesArray[i]))
            return i;
    }
    return -1;
};

// shorthand functions
var createElementClass = function(elName, className, textContent, innerHTML) {
    var el = document.createElement(elName);
    el.className = className || '';
    el.textContent = textContent || ''; // optional
    // overrides textContent with HTML if provided
    if(innerHTML) {
        el.innerHTML = innerHTML;
    }
    return el;
};

var createInput = function(type, id, className) {
    var el = document.createElement('input');
    el.type = type;
    el.id = id;
    el.className = className || '';
    return el;
};

var createLabel = function(labelText, htmlFor, className) {
    var el = document.createElement('label');
    el.textContent = labelText;
    el.htmlFor = htmlFor;
    el.className = className || '';
    return el;
};

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI

class StandardPatch {
    constructor(options) {
        this.name = options.name;
        this.patches = options.patches;
        this.tooltip = options.tooltip;
        this.danger = options.danger;
    }

    createUI(parent) {
        var id = createID();
        var label = this.name;
        var patch = createElementClass('div', 'patch');
        this.checkbox = createInput('checkbox', id);
        patch.appendChild(this.checkbox);
        patch.appendChild(createLabel(label, id));
        if(this.tooltip) {
            patch.appendChild(createElementClass('div', 'tooltip', this.tooltip));
        }
        if(this.danger) {
            patch.appendChild(createElementClass('div', 'danger tooltip', this.danger));
        }
        parent.appendChild(patch);
    }

    updateUI(file) {
        this.checkbox.checked = this.checkPatchBytes(file) === "on";
    }

    validatePatch(file) {
        var status = this.checkPatchBytes(file);
        if(status === "on") {
            console.log('"' + this.name + '"', "is enabled!");
        } else if(status === "off") {
            console.log('"' + this.name + '"', "is disabled!");
        } else {
            return '"' + this.name + '" is neither on nor off! Have you got the right file?';
        }
    }

    applyPatch(file) {
        this.replaceAll(file, this.checkbox.checked);
    }

    replaceAll(file, featureOn) {
        for(var i = 0; i < this.patches.length; i++) {
            replace(file, this.patches[i].offset,
                    featureOn? this.patches[i].on : this.patches[i].off);
        }
    }

    checkPatchBytes(file) {
        var patchStatus = "";
        for(var i = 0; i < this.patches.length; i++) {
            var patch = this.patches[i];
            if(bytesMatch(file, patch.offset, patch.off)) {
                if(patchStatus === "") {
                    patchStatus = "off";
                } else if(patchStatus != "off"){
                    return "on/off mismatch within patch";
                }
            } else if(bytesMatch(file, patch.offset, patch.on)) {
                if(patchStatus === "") {
                    patchStatus = "on";
                } else if(patchStatus != "on"){
                    return "on/off mismatch within patch";
                }
            } else {
                return "patch neither on nor off";
            }
        }
        return patchStatus;
    }
}

class DynamicPatch {
    constructor(options) {
        this.name = options.name;
        this.patches = options.patches;
        this.tooltip = options.tooltip;
        this.danger = options.danger;
        this.mode = options.mode;
        this.target = options.target;
    }

    createUI(parent) {
        var id = createID();
        var label = this.name;
        this.ui = createElementClass('div', 'patch');
        this.checkbox = createInput('checkbox', id);
        this.ui.appendChild(this.checkbox);
        this.ui.appendChild(createLabel(label, id));
        if(this.tooltip) {
            this.ui.appendChild(createElementClass('div', 'tooltip', this.tooltip));
        }
        if(this.danger) {
            this.ui.appendChild(createElementClass('div', 'danger tooltip', this.danger));
        }
        parent.appendChild(this.ui);
    }

    updateUI(file) {
        if (this.mode === 'all') {
            this.checkbox.checked = this.checkPatchAll(file, true) === "on";
        } else {
            this.checkbox.checked = this.checkPatch(file, true) === "on";
        }
    }

    validatePatch(file) {
        var status = this.mode === 'all' ? this.checkPatchAll(file) : this.checkPatch(file);

        if(status === "on") {
            console.log('"' + this.name + '"', "is enabled!");
        } else if(status === "off") {
            console.log('"' + this.name + '"', "is disabled!");
        } else {
            return '"' + this.name + '" is neither on nor off! Have you got the right file?';
        }
    }

    applyPatch(file) {
        this.replaceAll(file, this.checkbox.checked);
    }

    replaceAll(file, featureOn) {
        for(let patch of this.patches) {
            if (Array.isArray(patch.offset)) {
                for(const offset of patch.offset) {
                    if (this.target === 'string') {
                        replace(file, offset,
                            new TextEncoder().encode(featureOn? patch.on : patch.off));
                    } else {
                        patch.on = patch.on.map((patch, idx) => patch === 'XX' ? file[offset + idx] : patch);
                        patch.off = patch.off.map((patch, idx) => patch === 'XX' ? file[offset + idx] : patch);
                        replace(file, offset,
                            featureOn? patch.on : patch.off);
                    }
                }
            } else {
                if (this.target === 'string') {
                    replace(file, patch.offset,
                        new TextEncoder().encode(featureOn? patch.on : patch.off));
                } else {
                    patch.on = patch.on.map((patch, idx) => patch === 'XX' ? file[patch.offset + idx] : patch);
                    patch.off = patch.off.map((patch, idx) => patch === 'XX' ? file[patch.offset + idx] : patch);
                    replace(file, patch.offset,
                        featureOn? patch.on : patch.off);
                }
            }
        }
    }

    checkPatch(file, updateUiFlag = false) {
        var patchStatus = "";
        let listUi;
        if (updateUiFlag) {
            listUi = document.createElement('ul');
            this.ui.appendChild(listUi);
        }
        for(var i = 0; i < this.patches.length; i++) {
            var patch = this.patches[i];
            var offOffset = this.searchPatchOffset(file, patch.off, i);
            var onOffset = this.searchPatchOffset(file, patch.on, i);
            this.patches[i].offset = offOffset === -1 ? onOffset : offOffset;
            if(offOffset > 0) {
                if (updateUiFlag) {
                    if (this.target === 'string') {
                        listUi.appendChild(createElementClass('li', 'patch-off', null, '0x' + offOffset.toString(16) + ' <b>' + patch.off + '</b> will be replaced with <b>'+ patch.on +'</b>'));
                    } else {
                        listUi.appendChild(createElementClass('li', 'patch-off', '0x' + offOffset.toString(16) + ' will be replaced'));
                    }
                }
                if(patchStatus === "") {
                    patchStatus = "off";
                }
            } else if(onOffset > 0) {
                if (updateUiFlag) {
                    if (this.target === 'string') {
                        listUi.appendChild(createElementClass('li', 'patch-on', null, '0x' + onOffset.toString(16) + ' <b>' + patch.on + '</b> will be replaced with <b>'+ patch.off +'</b>'));
                    } else {
                        listUi.appendChild(createElementClass('li', 'patch-on', '0x' + onOffset.toString(16) + ' will be replaced'));
                    }
                }
                if(patchStatus === "") {
                    patchStatus = "on";
                }
            } else if (this.mode === 'all') {
                continue;
            } else {
                return "patch string not found";
            }
        }
        return patchStatus;
    }

    checkPatchAll(file, updateUiFlag = false) {
        var patchStatus = "";
        let listUi;
        if (updateUiFlag) {
            listUi = document.createElement('ul');
            this.ui.appendChild(listUi);
        }
        for(let patch of this.patches) {
            var offOffset = this.searchPatchOffsetAll(file, patch.off);
            var onOffset = this.searchPatchOffsetAll(file, patch.on);
            patch.offset = offOffset.length === 0 ? onOffset : offOffset;

            if(offOffset.length > 0) {
                if (updateUiFlag) {
                    for(const offset of offOffset) {
                        listUi.appendChild(createElementClass('li', 'patch-off', '0x' + offset.toString(16) + ' will be replaced'));
                    }
                }
                if(patchStatus === "") {
                    patchStatus = "off";
                }
            } else if(onOffset.length > 0) {
                if (updateUiFlag) {
                    for(const offset of onOffset) {
                        listUi.appendChild(createElementClass('li', 'patch-on', '0x' + offset.toString(16) + ' will be replaced'));
                    }
                }
                if(patchStatus === "") {
                    patchStatus = "on";
                }
            } else {
                return "patch string not found";
            }
        }
        return patchStatus;
    }

    searchPatchOffset(file, search, offset) {
        let searchBytes;
        if (this.target === 'string') {
            searchBytes = new TextEncoder().encode(search);
        } else {
            searchBytes = search;
        }

        Uint8Array.prototype.indexOfArr = function(searchElements, fromIndex) {
            fromIndex = fromIndex || 0;

            var index = Array.prototype.indexOf.call(this, searchElements[0], fromIndex);
            if(searchElements.length === 1 || index === -1) {
                return {
                    match: false,
                    index: -1,
                };
            }

            for(var i = index, j = 0; j < searchElements.length && i < this.length; i++, j++) {
                if (this.target !== 'string' && searchElements[j] === 'XX') {
                    continue;
                }
                if(this[i] !== searchElements[j]) {
                    return {
                        match: false,
                        index,
                    };
                }
            }
            return {
                match: true,
                index,
            };
        };

        var idx = 0;
        var foundCount = 0;
        for (var i = 0; i < file.length; i++) {
          var result = file.indexOfArr(searchBytes, idx);
          if (result.match) {
            if (offset === foundCount) {
                return result.index;
            }
              foundCount++;
            } else if (result.index === -1) {
                break;
            }
          idx = result.index + 1;
        }
        return -1;
    }

    searchPatchOffsetAll(file, search) {
        let searchBytes;
        if (this.target === 'string') {
            searchBytes = new TextEncoder().encode(search);
        } else {
            searchBytes = search;
        }

        Uint8Array.prototype.indexOfArr = function(searchElements, fromIndex) {
            fromIndex = fromIndex || 0;

            var index = Array.prototype.indexOf.call(this, searchElements[0], fromIndex);
            if(searchElements.length === 1 || index === -1) {
                return {
                    match: false,
                    index: -1,
                };
            }

            for(var i = index, j = 0; j < searchElements.length && i < this.length; i++, j++) {
                if (this.target !== 'string' && searchElements[j] === 'XX') {
                    continue;
                }
                if(this[i] !== searchElements[j]) {
                    return {
                        match: false,
                        index,
                    };
                }
            }

            return {
                match: true,
                index,
            };
        };

        var idx = 0;
        var foundOffsetArray = [];
        for (var i = 0; i < file.length; i++) {
          var result = file.indexOfArr(searchBytes, idx);
          if (result.match) {
              foundOffsetArray.push(result.index);
          } else if (result.index === -1) {
            break;
          }
          idx = result.index + 1;
        }
        return foundOffsetArray;
    }
}

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI

// The DEFAULT state is always the 1st element in the patches array
class UnionPatch {
    constructor(options) {
        this.name = options.name;
        this.offset = options.offset;
        this.patches = options.patches;
        this.tooltip = options.tooltip;
        this.danger = options.danger;
    }

    createUI(parent) {
        this.radios = [];
        var radio_id = createID();

        var container =  createElementClass('div', 'patch-union');
        container.appendChild(createElementClass('span', 'patch-union-title', this.name + ':'));
        if(this.tooltip) {
            container.appendChild(createElementClass('div', 'tooltip', this.tooltip));
        }
        if(this.danger) {
            container.appendChild(createElementClass('div', 'danger tooltip', this.danger));
        }
        container.appendChild(document.createElement('span'));

        for(var i = 0; i < this.patches.length; i++) {
            var patch = this.patches[i];
            var id = createID();
            var label = patch.name;
            var patchDiv = createElementClass('div', 'patch');
            var radio = createInput('radio', id);
            radio.name = radio_id;
            this.radios.push(radio);

            patchDiv.appendChild(radio);
            patchDiv.appendChild(createLabel(label, id));
            if(patch.tooltip) {
                patchDiv.appendChild(createElementClass('div', 'tooltip', patch.tooltip));
            }
            if(patch.danger) {
                patchDiv.appendChild(createElementClass('div', 'danger tooltip', patch.danger));
            }
            container.appendChild(patchDiv);
        }
        parent.appendChild(container);
    }

    updateUI(file) {
        for(var i = 0; i < this.patches.length; i++) {
            if(bytesMatch(file, this.offset, this.patches[i].patch)) {
                this.radios[i].checked = true;
                return;
            }
        }
        // Default fallback
        this.radios[0].checked = true;
    }

    validatePatch(file) {
        for(var i = 0; i < this.patches.length; i++) {
            if(bytesMatch(file, this.offset, this.patches[i].patch)) {
                console.log(this.name, "has", this.patches[i].name, "enabled");
                return;
            }
        }
        return '"' + this.name + '" doesn\'t have a valid patch! Have you got the right file?';
    }

    applyPatch(file) {
        var patch = this.getSelected();
        replace(file, this.offset, patch.patch);
    }

    getSelected() {
        for(var i = 0; i < this.patches.length; i++) {
            if(this.radios[i].checked) {
                return this.patches[i];
            }
        }
        return null;
    }
}

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI
class NumberPatch {
    constructor(options) {
        this.name = options.name;
        this.tooltip = options.tooltip;
        this.danger = options.danger;

        this.offset = options.offset;
        this.size = options.size;
        this.min = options.min;
        this.max = options.max;
    }

    createUI(parent) {
        var id = createID();
        var label = this.name;
        var patch = createElementClass('div', 'patch');

        patch.appendChild(createLabel(label, id));

        this.number = createInput('number', id);
        if (this.min !== null) {
            this.number.min = this.min;
        }
        if (this.max) {
            this.number.max = this.max;
        }

        patch.appendChild(this.number);


        if (this.tooltip) {
            patch.appendChild(createElementClass('div', 'tooltip', this.tooltip));
        }
        if (this.danger) {
            patch.appendChild(createElementClass('div', 'danger tooltip', this.danger));
        }
        parent.appendChild(patch);

    }

    updateUI(file) {
        // This converts bytes from the file to big endian by shifting each
        // byte `i` bytes to the left then doing a bitwise OR to add the less
        // significant bytes that were gathered at earlier iterations of loop
        var val = 0;
        for (var i = 0; i < this.size; i++) {
            val = (file[this.offset + i] << (8 * i)) | val;
        }

        this.number.value = val;
    }

    validatePatch(file) {
        return;
    }

    applyPatch(file) {
        // Convert user inputted number to little endian
        const view = new DataView(new ArrayBuffer(this.size * 2));
        view.setInt32(1, this.number.value, true);

        for (var i = 0; i < this.size; i++) {
            var val = view.getInt32(1);

            // Shift off less significant bytes
            val = val >> ((this.size - 1 - i) * 8);

            // Mask off more significant bytes
            val = val & 0xFF;

            // Write this byte
            file[this.offset + i] = val;
        }
    }
}

var loadPatch = function(_this, self, patcher) {
    patcher.loadPatchUI();
    patcher.updatePatchUI();
    patcher.container.style.display = '';
    var successStr = patcher.filename;
    if (typeof _this.description === "string") {
        successStr += "(" + patcher.description + ")";
    }
    self.successDiv.innerHTML = successStr + " loaded successfully!";
};

class PatchContainer {
    constructor(patchers) {
        this.patchers = patchers;
        this.createUI();
    }

    getSupportedDLLs() {
        var dlls = [];
        for (var i = 0; i < this.patchers.length; i++) {
            var name = this.patchers[i].filename;
            if (dlls.indexOf(name) === -1) {
                dlls.push(name);
            }
        }
        return dlls;
    }

    createUI() {
        var self = this;
        var container = createElementClass('div', 'patchContainer');
        var header = this.getSupportedDLLs().join(", ");
        container.innerHTML = "<h3>" + header + "</h3>";

        var supportedDlls = document.createElement('ul');
        this.forceLoadTexts = [];
        this.forceLoadButtons = [];
        this.matchSuccessText = [];
        for (var i = 0; i < this.patchers.length; i++) {
            var checkboxId = createID();

            var listItem = document.createElement('li');
            listItem.appendChild(createLabel(this.patchers[i].description, checkboxId, 'patchPreviewLabel'));
            var matchPercent = createElementClass('span', 'matchPercent');
            this.forceLoadTexts.push(matchPercent);
            listItem.appendChild(matchPercent);
            var matchSuccess = createElementClass('span', 'matchSuccess');
            this.matchSuccessText.push(matchSuccess);
            listItem.appendChild(matchSuccess);
            var forceButton = createElementClass('button', '', 'Force load?');
            forceButton.style.display = 'none';
            this.forceLoadButtons.push(forceButton);
            listItem.appendChild(forceButton);

            var input = createInput('checkbox', checkboxId, 'patchPreviewToggle');
            listItem.appendChild(input);
            var patchPreviews = createElementClass('ul', 'patchPreview');
            for (var j = 0; j < this.patchers[i].mods.length; j++) {
                var patchName = this.patchers[i].mods[j].name;
                patchPreviews.appendChild(createElementClass('li', null, patchName));
            }
            listItem.appendChild(patchPreviews);

            supportedDlls.appendChild(listItem);
        }

        ["dragover", "dragenter"].forEach(function(n){
            document.documentElement.addEventListener(n,function (e) {
                container.classList.add("dragover");
                e.preventDefault();
                e.stopPropagation();
            });
        });
        ["dragleave", "dragend", "drop"].forEach(function(n){
            document.documentElement.addEventListener(n,function (e) {
                container.classList.remove("dragover");
                e.preventDefault();
                e.stopPropagation();
            });
        });

        container.addEventListener("drop", function (e) {
            var files = e.dataTransfer.files;
            if (files && files.length > 0)
                self.loadFile(files[0]);
        });

        var filepickerId = createID();
        this.fileInput = createInput('file', filepickerId, 'fileInput');
        var label = createLabel('', filepickerId, 'fileLabel');
        label.innerHTML = "<strong>Choose a file</strong> or drag and drop.";

        this.fileInput.addEventListener("change", function (e) {
            if (this.files && this.files.length > 0)
                self.loadFile(this.files[0]);
        });

        this.successDiv = createElementClass('div', 'success');
        this.errorDiv = createElementClass('div', 'error');

        container.appendChild(this.fileInput);
        container.appendChild(label);

        container.appendChild(createElementClass('h4', null, 'Supported Versions:'));
        container.appendChild(createElementClass('h5', null, 'Click name to preview patches'));
        container.appendChild(supportedDlls);
        container.appendChild(this.successDiv);
        container.appendChild(this.errorDiv);
        document.body.appendChild(container);
    }

    loadFile(file) {
        var reader = new FileReader();
        var self = this;

        reader.onload = function (e) {
            var found = false;
            // clear logs
            self.errorDiv.textContent = '';
            self.successDiv.textContent = '';
            for (var i = 0; i < self.patchers.length; i++) {
                // reset text and buttons
                self.forceLoadButtons[i].style.display = 'none';
                self.forceLoadTexts[i].textContent = '';
                self.matchSuccessText[i].textContent = '';
                var patcher = self.patchers[i];
                // remove the previous UI to clear the page
                patcher.destroyUI();
                // patcher UI elements have to exist to load the file
                patcher.createUI();
                patcher.container.style.display = 'none';
                patcher.loadBuffer(e.target.result);
                if (patcher.validatePatches()) {
                    found = true;
                    loadPatch(this, self, patcher);
                    // show patches matched for 100% - helps identify which version is loaded
                    var valid = patcher.validPatches;
                    self.matchSuccessText[i].textContent = ' ' + valid + ' of ' + valid + ' patches matched (100%) ';
                }
            }

            if (!found) {
                // let the user force a match
                for (let i = 0; i < self.patchers.length; i++) {
                    const patcher = self.patchers[i];

                    const valid = patcher.validPatches;
                    const percent = (valid / patcher.totalPatches * 100).toFixed(1);

                    self.forceLoadTexts[i].textContent = ' ' + valid + ' of ' + patcher.totalPatches + ' patches matched (' + percent + '%) ';
                    self.forceLoadButtons[i].style.display = '';
                    self.forceLoadButtons[i].onclick = function(i) {
                        // reset old text
                        for(var j = 0; j < self.patchers.length; j++) {
                            self.forceLoadButtons[j].style.display = 'none';
                            self.forceLoadTexts[j].textContent = '';
                        }


                        loadPatch(this, self, self.patchers[i]);
                    }.bind(this, i);
                }
                self.errorDiv.innerHTML = "No patch set was a 100% match.";
            }
        };

        reader.readAsArrayBuffer(file);
    }
}

class Patcher {
    constructor(fname, description, args) {
        this.mods = [];
        for(var i = 0; i < args.length; i++) {
            var mod = args[i];
            if(mod.type) {
                if(mod.type === "union") {
                    this.mods.push(new UnionPatch(mod));
                }
                if(mod.type === "number") {
                    this.mods.push(new NumberPatch(mod));
                }
                if(mod.type === "dynamic") {
                    this.mods.push(new DynamicPatch(mod));
                }
            } else { // standard patch
                this.mods.push(new StandardPatch(mod));
            }
        }

        this.filename = fname;
        this.description = description;
        this.multiPatcher = true;

        if (!this.description) {
            // old style patcher, use the old method to generate the UI
            this.multiPatcher = false;
            this.createUI();
            this.loadPatchUI();
        }
    }

    createUI() {
        var self = this;
        this.container = createElementClass('div', 'patchContainer');
        var header = this.filename;
        if(this.description === "string") {
            header += ' (' + this.description + ')';
        }
        this.container.innerHTML = '<h3>' + header + '</h3>';

        this.successDiv = createElementClass('div', 'success');
        this.errorDiv = createElementClass('div', 'error');
        this.patchDiv = createElementClass('div', 'patches');

        var saveButton = document.createElement('button');
        saveButton.disabled = true;
        saveButton.textContent = 'Load file First';
        saveButton.addEventListener('click', this.saveDll.bind(this));
        this.saveButton = saveButton;

        if (!this.multiPatcher) {
            ["dragover", "dragenter"].forEach(function(n){
                document.documentElement.addEventListener(n,function(e) {
                    self.container.classList.add('dragover');
                    e.preventDefault();
                    return true;
                });
            });
            ["dragleave", "dragend", "drop"].forEach(function(n){
                document.documentElement.addEventListener(n,function(e) {
                    self.container.classList.remove('dragover');
                    e.preventDefault();
                    return true;
                });
            });

            this.container.addEventListener('drop', function(e) {
                var files = e.dataTransfer.files;
                if(files && files.length > 0)
                    self.loadFile(files[0]);
            });

            var filepickerId = createID();
            this.fileInput = createInput('file', filepickerId, 'fileInput');
            var label = createLabel('', filepickerId, 'fileLabel');
            label.innerHTML = '<strong>Choose a file</strong> or drag and drop.';

            this.fileInput.addEventListener('change', function(e) {
                if(this.files && this.files.length > 0)
                    self.loadFile(this.files[0]);
            });

            this.container.appendChild(this.fileInput);
            this.container.appendChild(label);
        }

        this.container.appendChild(this.successDiv);
        this.container.appendChild(this.errorDiv);
        this.container.appendChild(this.patchDiv);
        this.container.appendChild(saveButton);
        document.body.appendChild(this.container);
    }

    destroyUI() {
        if (this.hasOwnProperty("container"))
            this.container.remove();
    }

    loadBuffer(buffer) {
        this.dllFile = new Uint8Array(buffer);
        if(this.validatePatches()) {
            this.successDiv.classList.remove("hidden");
            this.successDiv.innerHTML = "File loaded successfully!";
        } else {
            this.successDiv.classList.add("hidden");
        }
        // Update save button regardless
        this.saveButton.disabled = false;
        this.saveButton.textContent = 'Save Patched File';
        this.errorDiv.innerHTML = this.errorLog;
    }

    loadFile(file) {
        var reader = new FileReader();
        var self = this;

        reader.onload = function(e) {
            self.loadBuffer(e.target.result);
            self.updatePatchUI();
        };

        reader.readAsArrayBuffer(file);
    }

    downloadURI(uri, filename) {
        // http://stackoverflow.com/a/18197341
        var element = document.createElement('a');
        element.setAttribute('href', uri);
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    saveDll() {
        if(!this.dllFile || !this.mods || !this.filename)
            return;

        for(var i = 0; i < this.mods.length; i++) {
            this.mods[i].applyPatch(this.dllFile);
        }

        var blob = new Blob([this.dllFile], {type: "application/octet-stream"});
        var uri = URL.createObjectURL(blob);
        this.downloadURI(uri, this.filename);
        URL.revokeObjectURL(uri);
    }

    loadPatchUI() {
        for(var i = 0; i < this.mods.length; i++) {
            this.mods[i].createUI(this.patchDiv);
        }
    }

    updatePatchUI() {
        for(var i = 0; i < this.mods.length; i++) {
            this.mods[i].updateUI(this.dllFile);
        }
    }

    validatePatches() {
        this.errorLog = "";
        var success = true;
        this.validPatches = 0;
        this.totalPatches = this.mods.length;
        for(var i = 0; i < this.mods.length; i++) {
            var error = this.mods[i].validatePatch(this.dllFile);
            if(error) {
                this.errorLog += error + "<br/>";
                success = false;
            } else {
                this.validPatches++;
            }
        }
        return success;
    }
}

window.Patcher = Patcher;
window.PatchContainer = PatchContainer;

})(window, document);
