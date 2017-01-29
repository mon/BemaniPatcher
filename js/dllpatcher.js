dllFile = null;
mods = null;
filename = null;
errorLog = "";

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI

StandardPatch = function(options) {
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
        success = false;
        return '"' + this.name + '" is neither on nor off! Have you got the right dll?';
    }
};

StandardPatch.prototype.applyPatch = function(file) {
    id = this.shortname;
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
UnionPatch = function(options) {
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

DllPatcher = function(fname, args) {
    mods = [];
    for(var i = 0; i < args.length; i++) {
        mod = args[i];
        if(mod.type) {
            if(mod.type == "union") {
                mods.push(new UnionPatch(mod));
            }
        } else { // standard patch
            mods.push(new StandardPatch(mod));
        }
    }
    filename = fname;
    loadPatchUI();
};

loadFile = function(file) {
    var reader = new FileReader();

    reader.onload = function(e) {
        dllFile = new Uint8Array(e.target.result);
        if(validatePatches()) {
            $("#success").removeClass("hidden");
            $("#success").html("DLL loaded successfully!");
        } else {
            $("#success").addClass("hidden");
        }
        $('#error').html(errorLog);
        updatePatchUI();
    };

    reader.readAsArrayBuffer(file);
};

saveDll = function() {
    if(!dllFile || !mods || !filename)
        return;
    var fname = filename;
    
    for(var i = 0; i < mods.length; i++) {
        var enabledStr = mods[i].applyPatch(dllFile);
        if(enabledStr) {
            fname += '-' + enabledStr;
        }
    }
    fname += '.dll';
    
    var blob = new Blob([dllFile], {type: "application/octet-stream"});
    saveAs(blob, fname);
}

loadPatchUI = function() {
    var patchDiv = $('#patches');
    for(var i = 0; i < mods.length; i++) {
        mods[i].createUI(patchDiv);
    }
}

updatePatchUI = function() {
    for(var i = 0; i < mods.length; i++) {
        mods[i].updateUI(dllFile);
    }
}

validatePatches = function() {
    errorLog = "";
    success = true;
    for(var i = 0; i < mods.length; i++) {
        var error = mods[i].validatePatch(dllFile);
        if(error) {
            errorLog += error + "<br/>";
            success = false;
        }
    }
    return success;
}

bytesMatch = function(buffer, offset, bytes) {
    for(var i = 0; i < bytes.length; i++) {
        if(buffer[offset+i] != bytes[i])
            return false;
    }
    return true;
};

replace = function(buffer, offset, bytes) {
    for(var i = 0; i < bytes.length; i++) {
        buffer[offset+i] = bytes[i];
    }
}

whichBytesMatch = function(buffer, offset, bytesArray) {
    for(var i = 0; i < bytesArray.length; i++) {
        if(bytesMatch(buffer, offset, bytesArray[i]))
            return i;
    }
    return -1;
}

$( document ).ready(function() {
    $('html').on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
    })
    .on('drop', function(e) {
        var files = e.originalEvent.dataTransfer.files;
        if(files && files.length > 0)
            loadFile(files[0]);
    });
    
    $('#file').on('change', function(e) {
        if(this.files && this.files.length > 0)
            loadFile(this.files[0]);
    });
});