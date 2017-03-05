(function(window, document) {
"use strict";

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI

var StandardPatch = function(options) {
    this.name = options.name;
    this.shortname = options.shortname;
    this.patches = options.patches;
};

StandardPatch.prototype.createUI = function(parent) {
    var id = this.shortname;
    var label = this.name;
    parent.append('<div class="patch"><input type="checkbox" id="' + id + '"><label for="' + id + '">' + label + '</label></div>');
};

StandardPatch.prototype.updateUI = function(file) {
    var id = this.shortname;
    var elem = document.getElementById(id);
    elem.checked = this.checkPatchBytes(file) == "on";
};

StandardPatch.prototype.validatePatch = function(file) {
    var status = this.checkPatchBytes(file);
    if(status == "on") {
        console.log('"' + this.name + '"', "is enabled!");
    } else if(status == "off") {
        console.log('"' + this.name + '"', "is disabled!");
    } else {
        return '"' + this.name + '" is neither on nor off! Have you got the right dll?';
    }
};

StandardPatch.prototype.applyPatch = function(file) {
    var id = this.shortname;
    var enabled = document.getElementById(id).checked;
    this.replaceAll(file, enabled);
    return enabled ? this.shortname : "";
};

StandardPatch.prototype.replaceAll = function(file, featureOn) {
    for(var i = 0; i < this.patches.length; i++) {
        replace(file, this.patches[i].offset,
                featureOn? this.patches[i].on : this.patches[i].off);
    }
}

StandardPatch.prototype.checkPatchBytes = function(file) {
    var patchStatus = "";
    for(var i = 0; i < this.patches.length; i++) {
        var patch = this.patches[i];
        if(bytesMatch(file, patch.offset, patch.off)) {
            if(patchStatus == "") {
                patchStatus = "off";
            } else if(patchStatus != "off"){
                return "on/off mismatch within patch";
            }
        } else if(bytesMatch(file, patch.offset, patch.on)) {
            if(patchStatus == "") {
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

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI

// The DEFAULT state is always the 1st element in the patches array
var UnionPatch = function(options) {
    this.name = options.name;
    this.shortname = options.shortname;
    this.offset = options.offset;
    this.patches = options.patches;
};

UnionPatch.prototype.createUI = function(parent) {
    var container = $("<div>", {"class": "patch-union"});
    container.append('<span class="patch-union-title">' + this.name + ':</span>');
    for(var i = 0; i < this.patches.length; i++) {
        var patch = this.patches[i];
        var id = this.shortname + '-' + patch.shortname;
        var label = patch.name;
        container.append('<div class="patch"><input type="radio" id="' + id + '" name="' + this.shortname + '"><label for="' + id + '">' + label + '</label></div>');
    }
    parent.append(container);
};

UnionPatch.prototype.updateUI = function(file) {
    for(var i = 0; i < this.patches.length; i++) {
        if(bytesMatch(file, this.offset, this.patches[i].patch)) {
            document.getElementById(this.shortname + '-' + this.patches[i].shortname).checked = true;
            return;
        }
    }
    // Default fallback
    document.getElementById(this.shortname + '-' + this.patches[0].shortname).checked = true;
};

UnionPatch.prototype.validatePatch = function(file) {
    for(var i = 0; i < this.patches.length; i++) {
        if(bytesMatch(file, this.offset, this.patches[i].patch)) {
            console.log(this.name, "has", this.patches[i].name, "enabled");
            return;
        }
    }
    return '"' + this.name + '" doesn\'t have a valid patch! Have you got the right dll?';
};

UnionPatch.prototype.applyPatch = function(file) {
    var patch = this.getSelected();
    var name = this.shortname + patch.shortname;
    replace(file, this.offset, patch.patch);
    return patch.shortname == "default" ? "" : name;
};

UnionPatch.prototype.getSelected = function() {
    for(var i = 0; i < this.patches.length; i++) {
        if(document.getElementById(this.shortname + '-' + this.patches[i].shortname).checked) {
            return this.patches[i];
        }
    }
    return null;
}

var DllPatcher = function(fname, args) {
    this.mods = [];
    for(var i = 0; i < args.length; i++) {
        var mod = args[i];
        if(mod.type) {
            if(mod.type == "union") {
                this.mods.push(new UnionPatch(mod));
            }
        } else { // standard patch
            this.mods.push(new StandardPatch(mod));
        }
    }
    this.filename = fname;
    this.createUI();
    this.loadPatchUI();
};

DllPatcher.prototype.createUI = function() {
    var self = this;
    var container = $("<div>", {"class": "patchContainer"});
    container.html('<h3>' + this.filename + '.dll</h3>');
    
    container.on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
    })
    .on('drop', function(e) {
        var files = e.originalEvent.dataTransfer.files;
        if(files && files.length > 0)
            self.loadFile(files[0]);
    })
    .on('dragover dragenter', function() {
        container.addClass('dragover');
    })
    .on('dragleave dragend drop', function() {
        container.removeClass('dragover');
    });
    
    this.fileInput = $("<input>",
        {"class": "fileInput",
         "id" : this.filename + '-file',
         "type" : 'file'});
    var label = $("<label>", {"class": "fileLabel", "for": this.filename + '-file'});
    label.html('<strong>Choose a file</strong> or drag and drop.');
    
    this.fileInput.on('change', function(e) {
        if(this.files && this.files.length > 0)
            self.loadFile(this.files[0]);
    });
    
    this.successDiv = $("<div>", {"class": "success"});
    this.errorDiv = $("<div>", {"class": "error"});
    this.patchDiv = $("<div>", {"class": "patches"});
    
    var saveButton = $("<button disabled>");
    saveButton.text('Load DLL First');
    saveButton.on('click', this.saveDll.bind(this));
    this.saveButton = saveButton;
    
    container.append(this.fileInput);
    container.append(label);
    container.append(this.successDiv);
    container.append(this.errorDiv);
    container.append(this.patchDiv);
    container.append(saveButton);
    $('body').append(container);
}

DllPatcher.prototype.loadFile = function(file) {
    var reader = new FileReader();
    var self = this;
    
    reader.onload = function(e) {
        self.dllFile = new Uint8Array(e.target.result);
        if(self.validatePatches()) {
            self.successDiv.removeClass("hidden");
            self.successDiv.html("DLL loaded successfully!");
        } else {
            self.successDiv.addClass("hidden");
        }
        // Update save button regardless
        self.saveButton.prop('disabled', false);
        self.saveButton.text('Save DLL');
        self.errorDiv.html(self.errorLog);
        self.updatePatchUI();
    };

    reader.readAsArrayBuffer(file);
};

DllPatcher.prototype.saveDll = function() {
    if(!this.dllFile || !this.mods || !this.filename)
        return;
    var fname = this.filename;
    
    for(var i = 0; i < this.mods.length; i++) {
        var enabledStr = this.mods[i].applyPatch(this.dllFile);
        if(enabledStr) {
            fname += '-' + enabledStr;
        }
    }
    fname += '.dll';
    
    var blob = new Blob([this.dllFile], {type: "application/octet-stream"});
    saveAs(blob, fname);
}

DllPatcher.prototype.loadPatchUI = function() {
    for(var i = 0; i < this.mods.length; i++) {
        this.mods[i].createUI(this.patchDiv);
    }
}

DllPatcher.prototype.updatePatchUI = function() {
    for(var i = 0; i < this.mods.length; i++) {
        this.mods[i].updateUI(this.dllFile);
    }
}

DllPatcher.prototype.validatePatches = function() {
    this.errorLog = "";
    var success = true;
    for(var i = 0; i < this.mods.length; i++) {
        var error = this.mods[i].validatePatch(this.dllFile);
        if(error) {
            this.errorLog += error + "<br/>";
            success = false;
        }
    }
    return success;
}

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

window.DllPatcher = DllPatcher;

})(window, document);