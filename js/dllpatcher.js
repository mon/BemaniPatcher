/*jshint esversion: 6 */
(function(window, document) {
"use strict";
	// Global variables to used for JSON creation
    let selectedContainer = '';
	const allDatecodes = [{}];
	let currentGame = '';
	let toolVersion = '';
    const containersList = [];
    const inputElArray = [];  
    let isJSONToggled = false;
    // form labels often need unique IDs - this can be used to generate some
window.Patcher_uniqueid = 0;
var createID = function() {
    window.Patcher_uniqueid++;
    return "dllpatch_" + window.Patcher_uniqueid;
};

window.Patcher_patcherid = 0;
var createPatcherID = function() {
    window.Patcher_patcherid++;
    return "container_" + window.Patcher_patcherid;
};

var bytesMatch = function(buffer, offset, bytes) {
    for(var i = 0; i < bytes.length; i++) {
        if(buffer[offset+i] != bytes[i])
            return false;
    }
    return true;
};

var bytesToHex = function(bytes) {
	var s = ''
	for(var i = 0; i < bytes.length; i++) {
        s += bytes[i].toString(16).toUpperCase().padStart(2, '0');
    }
	return s;
}

var hexToBytes = function(hex) {
	var bytes = [];
	for(var i = 0; i < hex.length; i += 2) {
		bytes.push(parseInt(hex.substr(i, 2), 16));
	}
	return bytes;
}

var decimalToHex = function(array) {
    return array
        .map((num) => num.toString(16).padStart(2, '0')) // Adds leading zero to hex if single digit/letter
        .join('')
        .toUpperCase();
}

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
class StandardJSON {
    constructor(data) {
        this.gameCode = data.gameCode || '';
        this.dateCode = data.dateCode || '';
        this.name = data.name || '';
        this.description = data.description || '';
        this.type = data.type || '';
        this.preset = data.preset || '';
        this.patches = data.patches || [];
    }
}
class newJSONMemory {
    constructor(data) {
        this.name = data.name || '';
        this.patches = data.patches || []; //THIS CAN HAVE MANY PATCHES!FIX THIS
        this.gameCode = data.gameCode || '';
        this.description = data.description || '';
        this.type = 'memory';
    }
}
class newJSONUnion {
    constructor(data) {
        this.type = 'union';
        this.name = data.name || '';
        this.description = data.description || '';
        this.gameCode = data.gameCode || '';
        this.patches = data.patches || [];
    }
}

const JSONObj = {};
class StandardPatch {
    constructor(options) {
        this.name = options.name;
        this.patches = options.patches;
        this.tooltip = options.tooltip;
        this.danger = options.danger;
        this.options = options;
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

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI
class HexPatch {
    constructor(options) {
        this.name = options.name;
        this.tooltip = options.tooltip;
        this.danger = options.danger;
		this.offset = options.offset;

		this.off = options.off;
    }

    createUI(parent) {
		this.radios = [];
		var radio_id = createID();

		// Title of the radio option.
        var container = createElementClass('div', 'patch-union');
        container.appendChild(createElementClass('span', 'patch-union-title', this.name + ':'));
        if(this.tooltip) {
            container.appendChild(createElementClass('div', 'tooltip', this.tooltip));
        }
        if(this.danger) {
            container.appendChild(createElementClass('div', 'danger tooltip', this.danger));
        }
        container.appendChild(document.createElement('span'));
		
		// Default option; tooltip shows default hex value.
		var id = createID();
		var patchDiv = createElementClass('div', 'patch');
		var radio = createInput('radio', id);
		radio.name = radio_id;
		this.radios.push(radio);
		
		patchDiv.appendChild(radio);
		patchDiv.appendChild(createLabel('Default', id));
		patchDiv.appendChild(createElementClass('div', 'tooltip', 'Value ' + bytesToHex(this.off)));
		container.appendChild(patchDiv);

		// Custom option.
		id = createID();
		patchDiv = createElementClass('div', 'patch');
		radio = createInput('radio', id);
		radio.name = radio_id;
		this.radios.push(radio);
		
		patchDiv.appendChild(radio);
		patchDiv.appendChild(createLabel('Custom ' + this.off.length + '-byte hex value: ', id));
		this.valueHex = document.createElement('input');
		this.valueHex.type = 'text';
		this.valueHex.id = id;
		patchDiv.appendChild(this.valueHex);
		
		patchDiv.appendChild(createElementClass('div', 'danger tooltip', 'Invalid values will not be applied.'));
		container.appendChild(patchDiv);

        parent.appendChild(container);

    }

    updateUI(file) {
		if(bytesMatch(file, this.offset, this.off)) {
			this.radios[0].checked = true;
			return;
		}
		this.valueHex.value = bytesToHex(file.slice(this.offset, this.offset + this.off.length));
		this.radios[1].checked = true;
    }

    validatePatch(file) {
		if(bytesMatch(file, this.offset, this.off)) {
			console.log(this.name, "has default hex value");
			return;
		}
		console.log(this.name, "has custom hex value");
    }

    applyPatch(file) {
        if(this.radios[0].checked) {
			replace(file, this.offset, this.off);
			return;
		}
		if(this.radios[1].checked) {
			if(!this.valueHex.value.match(/^[0-9a-fA-F]+$/)) {
				alert('Patch "' + this.name + '" not applied - invalid hex!');
				return;
			}
			if(this.valueHex.value.length != this.off.length * 2) {
				alert('Patch "' + this.name + '" not applied - invalid length!!');
				return;
			}
			replace(file, this.offset, hexToBytes(this.valueHex.value));
			return;
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
        this.createJSONObject('regular'); // Creates a JSON with the regular schema as default on pageload
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
    async createJSONObject(type) {
        function changeGameCode(filledJSON) {
            if (filledJSON.gameCode === 'bm2dx.dll') {
                filledJSON.gameCode = 'LDJ';
                currentGame = 'LDJ'; // Updates the global variable that will be used to name the .JSON file
            } else if (filledJSON.gameCode === 'soundvoltex.dll') {
                filledJSON.gameCode = 'KFC';
                currentGame = 'KFC';
            } else if (filledJSON.gameCode === 'game.dll') {
                filledJSON.gameCode = 'M32';
                currentGame = 'M32';
            } else if (filledJSON.gameCode === 'gamemdx.dll') {
                filledJSON.gameCode = 'MDX';
                currentGame = 'MDX';
            } else if (filledJSON.gameCode.includes('pop')) {
                filledJSON.gameCode = 'M39';
                currentGame = 'M39';
            } else if (filledJSON.gameCode === 'jubeat.dll') {
                filledJSON.gameCode = 'L44';
                currentGame = 'L44';
            } else if (filledJSON.gameCode === 'nostalgia.dll') {
                filledJSON.gameCode = 'PAN';
                currentGame = 'PAN';
            }
        }
        for (const patcher of this.patchers) {
            const gameCode = patcher.filename;
            const cabVersion = patcher.description; // for different game builds
            const dllName = patcher.filename;
            allDatecodes.push([gameCode,cabVersion]);
            const datecode = parseInt(
                // THIS IS FOUNDAMENTALLY BROKEN,BECAUSE DATECODES NOT ALWAYS END WITH 00,THOUGH THEY DO LIKE 80% OF THE TIME
                //  Default patcher used "Rev.1" to account for 01 instances of various datecodes
                //  So if that's the standard,we could use :  if (patcher.description.includes('Rev. 1')) {}
                patcher.description.replace(/-/g, '').slice(0, 8) + '00'
            );
            10;

            // Create a unique array for each cabVersion (full datecode)
            const JSONArray = [];
            let filledJSON;
            
            const patches = patcher.mods;
            for (const patch of patches) {
                if (patch instanceof StandardPatch) {
                    const offset = patch.patches[0].offset;
                    const off = patch.patches[0].off;
                    const on = patch.patches[0].on;
                    const name = (patch.name || '').replace(/"/g, "'");
                    const tooltip = (patch.tooltip || '').replace(/"/g, "'");

                    if (type === 'regular') {
                                                toolVersion = 'regular';
                        filledJSON = new StandardJSON({
                            gameCode: gameCode,
                            dateCode: datecode,
                            name: name,
                            description: tooltip,
                            type: 'memory',
                            preset: true,
                            patches: [
                                {
                                    dllName: dllName,
                                    dataDisabled: decimalToHex(off),
                                    dataEnabled: decimalToHex(on),
                                    dataOffset: offset,
                                },
                            ],
                        });
                    }
                    if (type === 'new') {
                        console.log("New fired");
                        toolVersion = 'new';
                        const patchesArray = [];
                        const patchesValues = patch.patches;
                        patchesValues.forEach((value) => {
                            patchesArray.push({
                                offset: value.offset,
                                dllName: dllName,
                                dataDisabled: decimalToHex(value.off),
                                dataEnabled: decimalToHex(value.on),
                            });
                        });
                        filledJSON = new newJSONMemory({
                            name: name,
                            patches: patchesArray,
                            gameCode: gameCode,
                            description: tooltip,
                            type: 'memory',
                        });
                    }

                    // Checks the name of the .dll and changes gameCode accordingly
                    changeGameCode(filledJSON); // Passes the object,and changes it's datecodes     
                    JSONArray.push(filledJSON);
                }
                if (patch instanceof UnionPatch) {
                    // This creates a new UnionPatch only if "Newest JSON Schema is selected"  - TODO : Veriry this 
                    if (type === "new"){
                    const name = (patch.name || '').replace(/"/g, "'");
                    const tooltip = (patch.tooltip || '').replace(/"/g, "'");
                    const offset = patch.offset;
                    const patchName = patch.patches;
                    if (type === 'new') {
                        let data;
                        let currentName;
                        const patchesArray = [];
                        patchName.forEach((patch) => {
                            currentName = patch.name;
                            data = decimalToHex(patch.patch);
                            patchesArray.push({
                                name: currentName,
                                type: 'union',
                                patch: {
                                    dllName: dllName,
                                    data: data,
                                    offset: offset,
                                },
                            });
                        });

                        filledJSON = new newJSONUnion({
                            type: 'union',
                            name: name,
                            description: tooltip,
                            gameCode: gameCode,
                            patches: patchesArray,
                        });
                        changeGameCode(filledJSON);
                        JSONArray.push(filledJSON);
                    }}
                }
            }
            // Adds all datecode's patches to JSONObj
            const index = patcher.filename.includes(cabVersion) ? index : `${patcher.filename} ${cabVersion}`; 
            JSONObj[index] = JSONArray;
        }
    }
    createUI() {
        var self = this;
        var container = createElementClass('div', 'patchContainer');
        var header = this.getSupportedDLLs().join(", ");
        container.id = createPatcherID();
        containersList.push(container);   
        container.innerHTML = "<h3>" + header + "</h3>";

        var supportedDlls = document.createElement('ul');
        this.forceLoadTexts = [];
        this.forceLoadButtons = [];
        this.matchSuccessText = [];
        this.containerIndex = containersList.length; // Used only for selecting the first container
        
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
            inputElArray.push(input);
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
        
        // Creating a top message
        
		const topMessage = document.createElement('h2');
		topMessage.className = 'top-message';
		topMessage.innerHTML =
			'Apply patches by providing a DLL file here, or download a ' +
            '<span class="JSONSpan" id="JSONSpan">JSON</span>' +
            ' instead.';


		// Creating a schema toggle
		
        const toggleOptions = ['Regular JSON Schema', 'Newest JSON Schema'];
		const toggleDiv = document.createElement('div');
		toggleDiv.className = 'toggle-div';

        // Creating a form for datecode selection
		
        const form = document.createElement('form');
		form.action = '#';
        form.className = 'dropdownMenu';
        const formLabel = document.createElement('label');
    
        // Creating a label for the form item
    
        formLabel.for = 'datecode';
        formLabel.className = 'dropdownTitle';
        formLabel.textContent = 'Choose a datecode :';

        // Creating a select element to append

        const select = document.createElement('select');
        select.name = 'datecode';
        select.className = 'dropdownOptions';
        select.id = `dropdownOptions-${header}`;
        select.style.textAlign = 'center';

        // Creating a download button for the .JSON file   

        const downloadButton = document.createElement('button');
        downloadButton.className = 'JSON';
        downloadButton.id = 'JSON';
        downloadButton.textContent = 'Download JSON';
        const selectElement = select;

        // Creating append/remove toggles functions

        const appendToggles = () => {
		    toggleOptions.forEach((option, index) => {
				const toggle = document.createElement('input');
				toggle.type = 'radio';
				toggle.id = 'toolToggle';
				toggle.className = `tool-toggle${index + 1}`;
				toggle.name = header;    // Assign the same name to both radios
				if (option === toggleOptions[0]) {
						toggle.checked = true; // Checks regular schema as default
				}
    	        const toggleLabel = document.createElement('label');
				toggleLabel.for = 'toolToggle';
				toggleLabel.innerText = option;
				toggleLabel.className = `toggle-text${index + 1}`;
				toggle.addEventListener('change', () => {	
					if (option === toggleOptions[0]) {
						this.createJSONObject('regular');
					} else if (option === toggleOptions[1]) {
						this.createJSONObject('new');
					}
				});
				return (
					toggleDiv.appendChild(toggle), toggleDiv.appendChild(toggleLabel)
				);
		});
		};
        
        const removeToggles = (container) => {
            const toggleDiv = container.getElementsByClassName("toggle-div")[0];
            const form = container.getElementsByTagName("form")[0];
            const downloadButton = container.getElementsByClassName("JSON")[0];     
            
            if (!form) {
                return;
            }
            container.removeChild(toggleDiv);       
            container.removeChild(form);        
            container.removeChild(downloadButton);   
        }

        // Set state of each container (active - inactive)

        const activateContainer = (container) => {
            selectedContainer = container;
            if (isJSONToggled === true) {
                appendJSONButton();
            }
            container.style.opacity = 1;
            container.style.userSelect = "auto";
            container.querySelectorAll('*').forEach(child => {
                child.style.pointerEvents = "auto";
            });
        };
        
        const deactivateContainer = (container) => {
            container.style.opacity = 0.4;
            container.style.userSelect = "none";
       
            setTimeout(() => {
                container.querySelectorAll('*').forEach(child => {
                    child.style.pointerEvents = "none";
                });
            }, 10); // Use async await instead 
            inputElArray.forEach((inputEl) => {
                inputEl.checked = false;   // Hide patches preview
            })
        };
        
        const handleContainerClick = (container) => {
            if (container === selectedContainer) {
                return;
            } else {
                activateContainer(container);
                containersList.forEach((inactiveContainer) => {
                    if (inactiveContainer !== container) {
                        deactivateContainer(inactiveContainer);
                        removeToggles(inactiveContainer);
                    }
                });
            }
        };
        
        //  On page load,we select the first container by default
        
        if (container.id === "container_1") {
            activateContainer(container);
        }else{
            deactivateContainer(container);
        }
        
        container.addEventListener("click",() => {
            handleContainerClick(container);
        });

    
        // This is used to populate the form with all datecodes
    
        function setDatecodeToDropdown() {
            allDatecodes.forEach((datecode) => {
                // Create an <option> element
                const name = datecode[0];
                const date = datecode[1];
                const option = document.createElement('option');
                option.value = name + " " + date;
                option.innerHTML = date;
                option.id = name;
                // If the .DLL for the datecode matches it's cointainer's header 
                if (name === header) { 
                    selectElement.appendChild(option);
                };
            });
        }
        
        setTimeout(() => {
            setDatecodeToDropdown(); // There has to be a better way,probably async await...Though this will work for now
        }, 50);
        
        // Downloads the actual file

        downloadButton.addEventListener('click', (event) => {
            event.preventDefault();
            const selectedDatecode = select;
            const selectedOption = select.value;
            const fileDatecode = selectedOption
                .split('-')
                .join('')
                .replace(' ', '_');
            const firstArray = JSONObj[selectedOption];           
            const jsonData = JSON.stringify(firstArray);          
            const blob = new Blob([jsonData], { type: 'application/json' });	
            const url = window.URL.createObjectURL(blob);

            // Create a link element and trigger the download
            
            const a = document.createElement('a');
            a.href = url;
            const fileName = () => {
                if (toolVersion === 'regular') {
                    return `OLD_${fileDatecode}.json`;
                } else if (toolVersion === 'new') {
                    return `NEW_${fileDatecode}.json`;
                }
            };
            a.download = fileName(); 
            a.click();

            // Clean up the URL object
            
            window.URL.revokeObjectURL(url);
        });

        // Appending inner container's elements

        if (this.containerIndex === 1) {
            document.body.appendChild(topMessage);
        }
        const JSONSpan = document.getElementById("JSONSpan");
        

        JSONSpan.addEventListener("click", () => {
            appendJSONButton();
        });
		
        container.appendChild(supportedDlls);
		container.appendChild(this.successDiv);
		container.appendChild(this.errorDiv);		
        
        appendToggles();     // TODO Append the toggles only to the selected container,make a removeToggle function as well
        
        const appendJSONButton = () => {
            if (container !== selectedContainer) {
                return;
            }
            isJSONToggled = true;
            if (container.contains(toggleDiv)){
                isJSONToggled = false;  // If the function fires,but the elements are already present :
                console.log("removed");
                container.removeChild(toggleDiv);
                container.removeChild(form);
                container.removeChild(downloadButton);
                return;
            }
            container.append(toggleDiv);
		    container.appendChild(form);
		    form.appendChild(formLabel);
		    form.appendChild(select);
		    container.appendChild(downloadButton);
        }
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
                if(mod.type === "hex") {
                    this.mods.push(new HexPatch(mod));
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
