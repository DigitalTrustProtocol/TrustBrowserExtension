
var DTP = {};

DTP.trace = function (message) {
    console.log(message);
};

// function GetTargetAddress(target) {
//     var address = (target.id) ? GetAddress(target.id, target.sig, target.content) :
//                 GetIDFromContent(target.content);
//     return address;
// }

// function GetIDFromContent(content) {
//     return tce.bitcoin.crypto.hash160(new tce.buffer.Buffer(content, 'UTF8'));
// }


// tce.buffer.Buffer.prototype.toJSON = function() {
//     return this.toString('base64');
// }



// tce.buffer.Buffer.prototype.base64ToBuffer = function () {
//     return this;
// }

String.prototype.base64ToBuffer = function() {
    return new tce.buffer.Buffer(this.toString(), 'base64');
}


// tce.buffer.Buffer.prototype.toAddress = function (prefix) {
//     prefix = prefix || 0;
//     return tce.bitcoin.address.toBase58Check(this, prefix);
// }


String.prototype.toAddress = function() {
    return this.base64ToBuffer().toAddress();
}

String.prototype.toDTPAddress = function() {
    return this.base64ToBuffer().toDTPAddress();
}

// tce.buffer.Buffer.prototype.toBase64 = function () {
//     return this.toString('base64');
// }

String.prototype.toBase64 = function() {
    return this;
}


String.prototype.findSubstring = function(startText, endText, returnInner, ignoreCase) {
    let start = ignoreCase ? this.toLocaleLowerCase().indexOf(startText.toLocaleLowerCase()) : this.toString().indexOf(startText);
    if(start < 0)
        return null;

    if(returnInner) {
        start += startText.length;
    }
    
    let end = ignoreCase ? this.toLocaleLowerCase().indexOf(endText.toLocaleLowerCase(), start) : this.indexOf(endText, start);
    if(end < 0) {
        end = this.length;
    }

    if(!returnInner && end < this.length) {
        end += endText.length;
    }

    return this.substring(start, end);
}


function isNullOrWhitespace(input) {
    return !input || !input.trim();
}

// Create a hash160 of a string
// String.prototype.hash160 = function() {
//     return tce.bitcoin.crypto.hash160(new tce.buffer.Buffer(this.toString(), 'UTF8'));
// }



function getQueryParams(url) {
    var qparams = {},
        parts = (url || '').split('?'),
        qparts, qpart,
        i = 0;

    if (parts.length <= 1) {
        return qparams;
    } else {
        qparts = parts[1].split('&');
        for (i in qparts) {

            qpart = qparts[i].split('=');
            qparams[decodeURIComponent(qpart[0])] =
                           decodeURIComponent(qpart[1] || '');
        }
    }

    return qparams;
};


// function findPrefix() {
//     let id = "test";
//     let hash = id.hash160();
//     let count = 256*256*256*256;

//     let i = 0; 
//     var address = "";
//     while(address.indexOf("dtp") !== 0 && i < count) {
//         if((i % 256*256) === 0)
//             console.log(i);

//         address = hash.toAddress(i);
//         i++;
//     }
//     if(i < count) {
//         console.log("Found: "+(i-1));
//         console.log(address);
//     } else {
//         console.log("Nothing!");
//     }
// }
