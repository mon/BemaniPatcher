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
}

var whichBytesMatch = function(buffer, offset, bytesArray) {
    for(var i = 0; i < bytesArray.length; i++) {
        if(bytesMatch(buffer, offset, bytesArray[i]))
            return i;
    }
    return -1;
}

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI

class StandardPatch {
    constructor(options) {
        this.name = options.name;
        this.patches = options.patches;
        this.tooltip = options.tooltip;
    }

    createUI(parent) {
        var id = createID();
        var label = this.name;
        var patch = $('<div>', {'class' : 'patch'});
        this.checkbox = $('<input type="checkbox" id="' + id + '">')[0];
        patch.append(this.checkbox);
        patch.append('<label for="' + id + '">' + label + '</label>');
        if(this.tooltip) {
            patch.append('<div class="tooltip">' + this.tooltip + '</div>');
        }
        parent.append(patch);
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

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI

// The DEFAULT state is always the 1st element in the patches array
class UnionPatch {
    constructor(options) {
        this.name = options.name;
        this.offset = options.offset;
        this.patches = options.patches;
    }

    createUI(parent) {
        this.radios = [];
        var radio_id = createID();

        var container = $("<div>", {"class": "patch-union"});
        container.append('<span class="patch-union-title">' + this.name + ':</span>');
        for(var i = 0; i < this.patches.length; i++) {
            var patch = this.patches[i];
            var id = createID();
            var label = patch.name;
            var patchDiv = $('<div>', {'class' : 'patch'});
            var radio = $('<input type="radio" id="' + id + '" name="' + radio_id + '">')[0];
            this.radios.push(radio);

            patchDiv.append(radio);
            patchDiv.append('<label for="' + id + '">' + label + '</label>');
            if(patch.tooltip) {
                patchDiv.append('<div class="tooltip">' + patch.tooltip + '</div>');
            }
            container.append(patchDiv);
        }
        parent.append(container);
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

var loadPatch = function(_this, self, patcher) {
    patcher.loadPatchUI();
    patcher.updatePatchUI();
    patcher.container.show();
    var successStr = patcher.filename;
    if ($.type(_this.description) === "string") {
        successStr += "(" + patcher.description + ")";
    }
    self.successDiv.html(successStr + " loaded successfully!");
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
        var container = $("<div>", {"class": "patchContainer"});
        var header = this.getSupportedDLLs().join(", ");
        container.html("<h3>" + header + "</h3>");

        var supportedDlls = $("<ul>");
        this.forceLoadTexts = [];
        this.forceLoadButtons = [];
        for (var i = 0; i < this.patchers.length; i++) {
            var checkboxId = createID();

            var listItem = $("<li>");
            $('<label>')
                .attr("for", checkboxId)
                .text(this.patchers[i].description)
                .addClass('patchPreviewLabel')
                .appendTo(listItem);
            var matchPercent = $('<span>').addClass('matchPercent');
            this.forceLoadTexts.push(matchPercent);
            matchPercent.appendTo(listItem);
            var forceButton = $('<button>').text('Force load?').hide();
            this.forceLoadButtons.push(forceButton);
            forceButton.appendTo(listItem);

            $("<input>", {
                "class": "patchPreviewToggle",
                "id": checkboxId,
                "type": "checkbox",
            }).appendTo(listItem);
            var patchPreviews = $("<ul>").addClass('patchPreview');
            for (var j = 0; j < this.patchers[i].mods.length; j++) {
                var patchName = this.patchers[i].mods[j].name;
                $('<li>').text(patchName).appendTo(patchPreviews);
            }
            patchPreviews.appendTo(listItem);

            listItem.appendTo(supportedDlls);
        }

        $("html").on("dragover dragenter", function () {
            container.addClass("dragover");
            return true;
        })
            .on("dragleave dragend drop", function () {
                container.removeClass("dragover");
                return true;
            })
            .on("dragover dragenter dragleave dragend drop", function (e) {
                e.preventDefault();
                e.stopPropagation();
            });

        container.on("drop", function (e) {
            var files = e.originalEvent.dataTransfer.files;
            if (files && files.length > 0)
                self.loadFile(files[0]);
        });

        var filepickerId = createID();
        this.fileInput = $("<input>",
            {
                "class": "fileInput",
                "id": filepickerId,
                "type": "file",
            });
        var label = $("<label>", {"class": "fileLabel", "for": filepickerId});
        label.html("<strong>Choose a file</strong> or drag and drop.");

        this.fileInput.on("change", function (e) {
            if (this.files && this.files.length > 0)
                self.loadFile(this.files[0]);
        });

        this.successDiv = $("<div>", {"class": "success"});
        this.errorDiv = $("<div>", {"class": "error"});

        container.append(this.fileInput);
        container.append(label);

        $("<h4>Supported Versions:</h4>").appendTo(container);
        $("<h5>Click name to preview patches</h5>").appendTo(container);
        container.append(supportedDlls);
        container.append(this.successDiv);
        container.append(this.errorDiv);
        $("body").append(container);
    }

    loadFile(file) {
        var reader = new FileReader();
        var self = this;

        reader.onload = function (e) {
            var found = false;
            // clear logs
            self.errorDiv.empty();
            self.successDiv.empty();
            for (var i = 0; i < self.patchers.length; i++) {
                var patcher = self.patchers[i];
                // remove the previous UI to clear the page
                patcher.destroyUI();
                // patcher UI elements have to exist to load the file
                patcher.createUI();
                patcher.container.hide();
                patcher.loadBuffer(e.target.result);
                if (patcher.validatePatches()) {
                    found = true;
                    loadPatch(this, self, patcher);
                }
            }

            if (!found) {
                // let the user force a match
                for (var i = 0; i < self.patchers.length; i++) {
                    var patcher = self.patchers[i];

                    var valid = patcher.validPatches;
                    var percent = (valid / patcher.totalPatches * 100).toFixed(1);

                    self.forceLoadTexts[i].text(' ' + valid + ' of ' + patcher.totalPatches + ' patches matched (' + percent + '%) ');
                    self.forceLoadButtons[i].show();
                    self.forceLoadButtons[i].off('click');
                    self.forceLoadButtons[i].click(function(i) {
                        // reset old text
                        for(var j = 0; j < self.patchers.length; j++) {
                            self.forceLoadButtons[j].hide();
                            self.forceLoadTexts[j].text('');
                        }


                        loadPatch(this, self, self.patchers[i]);
                    }.bind(this, i));
                }
                self.errorDiv.html("No patch set was a 100% match.");
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
        this.container = $("<div>", {"class": "patchContainer"});
        var header = this.filename;
        if(this.description === "string") {
            header += ' (' + this.description + ')';
        }
        this.container.html('<h3>' + header + '</h3>');

        this.successDiv = $("<div>", {"class": "success"});
        this.errorDiv = $("<div>", {"class": "error"});
        this.patchDiv = $("<div>", {"class": "patches"});

        var saveButton = $("<button disabled>");
        saveButton.text('Load file First');
        saveButton.on('click', this.saveDll.bind(this));
        this.saveButton = saveButton;

        if (!this.multiPatcher) {
            $('html').on('dragover dragenter', function() {
                self.container.addClass('dragover');
                return true;
            })
            .on('dragleave dragend drop', function() {
                self.container.removeClass('dragover');
                return true;
            })
            .on('dragover dragenter dragleave dragend drop', function(e) {
                e.preventDefault();
            });

            this.container.on('drop', function(e) {
                var files = e.originalEvent.dataTransfer.files;
                if(files && files.length > 0)
                    self.loadFile(files[0]);
            });

            var filepickerId = createID();
            this.fileInput = $("<input>",
                {"class": "fileInput",
                 "id" : filepickerId,
                 "type" : 'file'});
            var label = $("<label>", {"class": "fileLabel", "for": filepickerId});
            label.html('<strong>Choose a file</strong> or drag and drop.');

            this.fileInput.on('change', function(e) {
                if(this.files && this.files.length > 0)
                    self.loadFile(this.files[0]);
            });

            this.container.append(this.fileInput);
            this.container.append(label);
        }

        this.container.append(this.successDiv);
        this.container.append(this.errorDiv);
        this.container.append(this.patchDiv);
        this.container.append(saveButton);
        $("body").append(this.container);
    }

    destroyUI() {
        if (this.hasOwnProperty("container"))
            this.container.remove();
    }

    loadBuffer(buffer) {
        this.dllFile = new Uint8Array(buffer);
        if(this.validatePatches()) {
            this.successDiv.removeClass("hidden");
            this.successDiv.html("File loaded successfully!");
        } else {
            this.successDiv.addClass("hidden");
        }
        // Update save button regardless
        this.saveButton.prop('disabled', false);
        this.saveButton.text('Save Patched File');
        this.errorDiv.html(this.errorLog);
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

    saveDll() {
        if(!this.dllFile || !this.mods || !this.filename)
            return;

        for(var i = 0; i < this.mods.length; i++) {
            this.mods[i].applyPatch(this.dllFile);
        }

        var blob = new Blob([this.dllFile], {type: "application/octet-stream"});
        saveAs(blob, this.filename);
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
