dllFile = null;
mods = null;
filename = null;
errorLog = "";

DllPatcher = function(fname, args) {
    mods = args;
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
        id = mods[i].shortname;
        var enabled = document.getElementById(id).checked;
        replaceAll(dllFile, mods[i].patches, enabled);
        if(enabled) {
            fname += '-' + id;
        }
    }
    fname += '.dll';
    
    var blob = new Blob([dllFile], {type: "application/octet-stream"});
    saveAs(blob, fname);
}

loadPatchUI = function() {
    var patchDiv = $('#patches');
    for(var i = 0; i < mods.length; i++) {
        var id = mods[i].shortname;
        var name = mods[i].name;
        patchDiv.append('<div class="patch"><input type="checkbox" id="' + id + '"><label for="' + id + '">' + name + '</label></div>');
    }
}

updatePatchUI = function() {
    for(var i = 0; i < mods.length; i++) {
        var id = mods[i].shortname;
        var elem = document.getElementById(id);
        elem.checked = checkPatchBytes(mods[i].patches) == "on";
    }
}

buildError = function(patchName, message) {
    var msg = '"' + patchName + '" ' + message;
    console.log(msg);
    errorLog += msg + '<br/>';
}

validatePatches = function() {
    errorLog = "";
    success = true;
    for(var i = 0; i < mods.length; i++) {
        var patch = mods[i];
        var status = checkPatchBytes(patch.patches);
        if(status == "on") {
            console.log('"' + patch.name + '"', "is enabled!");
        } else if(status == "off") {
            console.log('"' + patch.name + '"', "is disabled!");
        } else {
            success = false;
            buildError(patch.name, "is neither on nor off! Have you got the right dll?");
        }
    }
    return success;
}

checkPatchBytes = function(patches) {
    var patchStatus = "";
    for(var i = 0; i < patches.length; i++) {
        patch = patches[i];
        if(bytesMatch(dllFile, patch.offset, patch.off)) {
            if(patchStatus == "") {
                patchStatus = "off";
            } else if(patchStatus != "off"){
                return "on/off mismatch within patch";
            }
        } else if(bytesMatch(dllFile, patch.offset, patch.on)) {
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

bytesMatch = function(buffer, offset, bytes) {
    for(var i = 0; i < bytes.length; i++) {
        if(buffer[offset+i] != bytes[i])
            return false;
    }
    return true;
};

replaceAll = function(buffer, patches, featureOn) {
    for(var i = 0; i < patches.length; i++) {
        replace(buffer, patches[i].offset, featureOn? patches[i].on : patches[i].off);
    }
}

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