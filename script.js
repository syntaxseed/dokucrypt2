var crypt_keys=[];
var tag_enc="ENCRYPTED";
var tag_pt="SECRET";
var encryptForSubmitInUse=false;

/* ahmetsacan: this causes the edit toolbar to break. we moved it into action.php */
/* addInitEvent(function() { return(decryptEditSetup()); }); */

// the function here is borrowed from an anonymous function in
// lib/scripts/edit.js (initChangeCheck()).
// This should be replaced with some way that a plugin can request
// onSubmit handlers for a given form element
function editFormOnSubmit() {
   // begin plugin modified code
   // need the following to avoid 'msg is not defined' error. I'm not sure why
   var msg="Unsaved changes will be lost [edit].\nReally continue?";
   if(encryptForSubmit()===false) { return(false); }

   // Move the original wiki_text element out of the form like we used to do in decryptEditSetup().
   // To prevent accidental submission of unencrypted text.
   var wikitext=document.getElementById('wiki__text');
   var editform=document.getElementById('dw__editform');
   editform.parentNode.insertBefore(wikitext,editform);

   // end plugin modified code
   var rc = changeCheck(msg);

   if(window.event) { window.event.returnValue = rc; }
   return rc;
}

/* Set up the decrypt button and necessary functionality. */
function decryptEditSetup(msg) {
    //alert('setting up');
    var editform=null, wikitext=null, hiddentext=null, preview=null;
    if(!(editform=document.getElementById('dw__editform'))) {
      // alert("no form dw__editform\n");
      return(true);
    }
    if(!(wikitext=document.getElementById('wiki__text'))) {
     // alert("no wiki__text");
     return(false);
    }
    // if there is no preview button, then assume this is a
    // "Recover draft" page, dont do anything.
    if(!(preview=document.getElementById('edbtn__preview'))) {
      return(false);
    }

    // Create a hidden element with id 'wiki__text_submit' and
    // name wikitext (same as the wiki__text).

    if(!(hiddentext=document.createElement('input'))) {
     return(false);
    }

    hiddentext.setAttribute('id', 'wiki__text_submit');
    hiddentext.setAttribute('name', 'wikitext');
    hiddentext.setAttribute('type','hidden');
    editform.insertBefore(hiddentext,null);

    // Move the real wiki__text element out of the form (so it is not submitted and
    // any <SECRET> text left unencrypted).
    // Commented out for update 2021-05-18 to fix the broken insert link toolbar button.
    // Does this cause any issues? Can we submit unencrypted data?
    // Just in case we now do this in editFormOnSubmit().
    //editform.parentNode.insertBefore(wikitext,editform);


    if(!(decryptButton=document.createElement('input'))) {
     return(false);
    }
    decryptButton.setAttribute('id', 'decryptButton');
    decryptButton.setAttribute('name', 'decryptButton');
    decryptButton.setAttribute('type','Button');
    decryptButton.setAttribute('value','DecryptSecret');
    // decryptButton.setAttribute('onclick',decryptEditForm);
    decryptButton.onclick=decryptEditForm;
    decryptButton.setAttribute('class','button');
    decryptButton.setAttribute('className','button'); // required for IE
    preview.parentNode.insertBefore(decryptButton,preview);

    editform.onsubmit = function() {return editFormOnSubmit();};

    // The following is taken from lib/scripts/locktimer.js to make drafts work.
    // We override the locktimer refresh function to abort saving of drafts with unencrypted content.
    dw_locktimer.refresh = function(){

        var now = new Date(),
                params = 'call=lock&id=' + dw_locktimer.pageid + '&';

            // refresh every minute only
            if(now.getTime() - dw_locktimer.lasttime.getTime() <= 30*1000) {
                return;
            }

            // POST everything necessary for draft saving
            if(dw_locktimer.draft && jQuery('#dw__editform').find('textarea[name=wikitext]').length > 0){

                // *** BEGIN dokucrypt modified code
                // Do not allow saving of a draft, if this page needs some content to be encrypted on save.
                // Basically abort saving of drafts if this page has some content that needs encrypting.
                if(encryptForSubmit()===false) { return(false); }
                // *** END dokucrypt modified code

                params += jQuery('#dw__editform').find('input[name=prefix], ' +
                                                       'textarea[name=wikitext], ' +
                                                       'input[name=suffix], ' +
                                                       'input[name=date]').serialize();
            }

            jQuery.post(
                DOKU_BASE + 'lib/exe/ajax.php',
                params,
                dw_locktimer.refreshed,
                'html'
            );
            dw_locktimer.lasttime = now;


        /* // ---------------- PREVIOUS VERSION OF DOKUWIKI --------------
        var now = new Date();
        // refresh every minute only
        if(now.getTime() - dw_locktimer.lasttime.getTime() > 30*1000){ //FIXME decide on time
            var params = 'call=lock&id='+encodeURIComponent(dw_locktimer.pageid);
            if(dw_locktimer.draft){
                var dwform = $('dw__editform');
                // begin plugin modified code
                if(encryptForSubmit()===false) { return(false); }
                // end plugin modified code
                params += '&prefix='+encodeURIComponent(dwform.elements.prefix.value);
                params += '&wikitext='+encodeURIComponent(dwform.elements.wikitext.value);
                params += '&suffix='+encodeURIComponent(dwform.elements.suffix.value);
                params += '&date='+encodeURIComponent(dwform.elements.date.value);
            }
            dw_locktimer.sack.runAJAX(params);
            dw_locktimer.lasttime = now;
        }
        // ---------------------------------- Previous Version ---------------
        */
    };
}



function encryptForSubmit() {
   var wikitext=null, hiddentext=null;
   // bad semaphore like protection to avoid multiple calls to this code
   // at once (user pushing 'Submit' and draft save running, or multiple draft
   // save.  its not really safe
   while(encryptForSubmitInUse!==false) {
      // wish I had sleep here
   }
   encryptForSubmitInUse=true;

   if(!(wikitext=document.getElementById('wiki__text'))) {
      alert("failed to get wiki__text");
      encryptForSubmitInUse=false; return(false);
   }
   if(!(hiddentext=document.getElementById('wiki__text_submit'))) {
      alert("failed to get wiki__text_submit");
      encryptForSubmitInUse=false; return(false);
   }
   var tosubmit=encryptMixedText(wikitext.value);
   if(tosubmit===false) { encryptForSubmitInUse=false; return(false); }
   hiddentext.value=tosubmit;
   encryptForSubmitInUse=false; return(true);
}

function decryptEditForm() {
  var elem=null, newtext="";
  if(!(elem=document.getElementById('wiki__text'))) {
    // alert("no form wiki__text\n");
    return(true);
  }
  if((newtext=decryptMixedText(elem.value))===false) {
    alert("failed to decrypt wiki__text");
    return(false);
  }
  elem.value=newtext;
  return(true);
}

function setKeyFromAscii(pass) {
  var s = encode_utf8(pass);
  var i, kmd5e, kmd5o;

  if (s.length == 1) {
    s += s;
  }

  md5_init();
  for (i = 0; i < s.length; i += 2) {
    md5_update(s.charCodeAt(i));
  }
  md5_finish();
  kmd5e = byteArrayToHex(digestBits);

  md5_init();
  for (i = 1; i < s.length; i += 2) {
    md5_update(s.charCodeAt(i));
  }
  md5_finish();
  kmd5o = byteArrayToHex(digestBits);

  var hs = kmd5e + kmd5o;
  key =  hexToByteArray(hs);
  hs = byteArrayToHex(key);
  return(key);
}

function toggleElemVisibility(elemid) {
   elem=document.getElementById(elemid);
   if(elem.style.visibility=="visible") {
      elem.style.visibility="hidden";
      elem.style.position="absolute";
   } else {
      elem.style.visibility="visible";
      elem.style.position="relative";
   }
}

/*
  this is called from <A HREF=> links to decrypt the  inline html
*/
function toggleCryptDiv(elemid,lock,ctext) {
   var elem=null, atag=null, key="", ptext="";
   var ctStr="Decrypt Encrypted Text", ptStr="Hide Plaintext";
   elem=document.getElementById(elemid);
   atag=document.getElementById(elemid + "_atag");
   if(elem===null || atag===null) {
      alert("failed to find element id " + elemid);
   }
   if(atag.innerHTML==ptStr) {
      // encrypt text (set back to ctext, and forget key)
      elem.innerHTML=ctext;
      atag.innerHTML=ctStr;
      crypt_keys[lock]=undefined;
   } else if (atag.innerHTML==ctStr) {
      // decrypt text
      
      // create callback function for handling the submit button in the password prompt
	  verifyDecrypt_function = function(password) {
        key = password;
		if(key===null) { alert("unable to find key for lock " + lock); return; } // user hit cancel
		if(!(ptext=decryptTextString(ctext,key))) {
			alert("failed to decrypt with provided key");
			return;
		} else {
          crypt_keys[lock]=key;
          elem.innerHTML=ptext;
          atag.innerHTML=ptStr;
          // make it visible
          elem.style.visibility="visible";
          elem.style.position="relative";
	        
          if (JSINFO["plugin_dokucrypt2_CONFIG_copytoclipboard"] == 1) {
            //put it into the clipboard
            copyToClipboard(ptext).then(() => {
              if (JSINFO['plugin_dokucrypt2_CONFIG_hidepasswordoncopytoclipboard']) {
                elem.innerHTML = "{" + JSINFO['plugin_dokucrypt2_TEXT_copied_to_clipboard'] + "}";
              } else {
                elem.innerHTML += " {" + JSINFO['plugin_dokucrypt2_TEXT_copied_to_clipboard'] + "}";
              };
              console.log('Encrypted value has been copied to the clipboard.');
            }).catch(() => {
              console.log('Encrypted value could not be copied to the clipboard.');
            });
	      }
		}
      };
      
	  // now test if there is a key cached for the given lock - if no key can be determined, show password prompt
	  key = false;
      if(undefined!==crypt_keys[lock]) { key=crypt_keys[lock]; }
      if(key===false && (undefined===crypt_keys[lock])) {
          pw_prompt({
	      lm:"Enter passphrase for lock " + lock, 
		  elem:elem,
          callback:verifyDecrypt_function
        });
	  } else {
        var xkey=key;
        if(key===false) { xkey=crypt_keys[lock]; }
        if(!(ptext=decryptTextString(ctext,xkey))) {
          if(key!==false) { alert("failed to decrypt with provided key"); }
          return;
        } else {
          verifyDecrypt_function(key);
        }
      }
      
	  
   } else { alert("Broken"); return; }
}

function getEncryptionKeyForLock(lock) {
  // alert("crypt_keys[" + lock + "]=" + crypt_keys[lock] + "\n");
  if(undefined===crypt_keys[lock]) {
    var x,y;
    x=prompt("Enter passphrase key for lock " + lock);
    if(x===null) { return(false); }
    y=prompt("Verify passphrase key for lock " + lock);
    if(y===null) { return(false); }
    if(x!=y) { crypt_debug("passwords do not match\n"); return(false); }
    crypt_debug("x=" + x + " y=" + y);
    crypt_keys[lock]=x;
    return(x);
  } else {
    return(crypt_keys[lock]);
  }
}
var debugval="";
function crypt_debug(str) {
  // document.getElementById("debug_field").value+=str + "\n";
  debugval+=str;
}
/* decrypt the text between <CRYPT> and </CRYPT> */
function decryptMixedText(x) {
  var tag=tag_enc;
  var ret="", key="", ctext="";
  var tagend=0, opentag=0, blockend=0, pos=0;
  while((cur=x.indexOf("<" + tag,pos))!=-1) {
    if((opentag_end=x.indexOf(">",cur))==-1) {
      alert("unable to close to open tag"); return(false);
    }
    if((closetag=x.indexOf("</" + tag + ">",opentag_end))==-1) {
      alert("unable to find close of " + tag + " tag"); return(false);
    }
    if(!(ctext=decryptBlock(x.substring(cur,closetag+tag.length+3),false))) {
      return(false);
    }
    ret+=x.substring(pos,cur) + ctext;
    pos=closetag+tag.length+3;
  }
  ret+=x.substring(pos);
  return(ret);
}

function encryptMixedText(x) {
  var tag=tag_pt;
  var ret="", key="", ctext="";
  var tagend=0, opentag=0, blockend=0, pos=0;
  while((cur=x.indexOf("<" + tag,pos))!=-1) {
    if((opentag_end=x.indexOf(">",cur))==-1) {
      alert("unable to close to open tag"); return(false);
    }
    if((closetag=x.indexOf("</" + tag + ">",opentag_end))==-1) {
      x=x+"</" + tag + ">";
      // if there is no close tag, add one to the end.
      closetag=x.indexOf("</" + tag + ">",opentag_end);
      // alert("unable to find close of " + tag + " tag"); return(false);
    }
    if(!(ctext=encryptBlock(x.substring(cur,closetag+tag.length+3),false))) {
      alert("failed to encrypt text");
      return(false);
    }
    ret+=x.substring(pos,cur) + ctext;
    pos=closetag+tag.length+3;
  }
  ret+=x.substring(pos);
  return(ret);
}

/*function verifyDecrypt(ctext,lock,key) {
  var ptext=null;
  if(undefined!==crypt_keys[lock]) { key=crypt_keys[lock]; }
  if(key===false && (undefined===crypt_keys[lock])) {
    var key=prompt("Enter passphrase for lock " + lock);
    if(key===null) { return(false); } // user hit cancel
    if(!(ptext=decryptTextString(ctext,key))) {
      var pstr="Try again: Enter passphrase for lock " + lock;
      while(null!==(key=prompt(pstr))) {
        ptext=decryptTextString(ctext,key);
        if(ptext) {
          break;
        }
      }
      if(key==null) { return(false); } // user hit cancel
    }
    crypt_keys[lock]=key;
  } else {
    var xkey=key;
    if(key===false) { xkey=crypt_keys[lock]; }
    if(!(ptext=decryptTextString(ctext,xkey))) {
      if(key!==false) { alert("failed to decrypt with provided key"); }
      return(false);
    }
  }
  return(ptext);
}*/
function decryptBlock(data,key) {
  var tagend=0, ptend=0, lock=null, ptext;
  if((tagend=data.indexOf(">"))==-1) {
    crypt_debug("no > in " + data);
    return(false);
  }
  if((ptend=data.lastIndexOf("</"))==-1) {
    crypt_debug(" no </ in " + data);
    return(false);
  }
  lock=getTagAttr(data.substring(0,tagend+1),"LOCK");
  if(lock===null) { lock="default"; }

  collapsed=getTagAttr(data.substring(0,tagend+1),"COLLAPSED");
  if(collapsed===null || collapsed=="null") { collapsed="1"; }

  if(!(ptext=verifyDecrypt(data.substring(tagend+1,ptend),lock,key))) {
    return(false);
  }
  return("<" + tag_pt + " LOCK=" + lock + " " +
     "COLLAPSED=" + collapsed + ">" + ptext + "</" + tag_pt + ">");
}

// for getTagAttr("<FOO ATTR=val>","ATTR"), return "val"
function getTagAttr(opentag,attr) {
  var loff=0;
  if((loff=opentag.indexOf(attr + "=" ))!=-1) {
    if((t=opentag.indexOf(" ",loff+attr.length+1))!=-1) {
      return(opentag.substring(loff+attr.length+1,t));
    } else {
      return(opentag.substring(loff+attr.length+1,opentag.length-1));
    }
  }
  return(null);
}

function encryptBlock(data,key) {
  var tagend=0, ptend=0, lock=null, ctext;
  var collapsed = "1";

  if((tagend=data.indexOf(">"))==-1) {
    crypt_debug("no > in " + data);
    return(false);
  }
  if((ptend=data.lastIndexOf("</"))==-1) {
    crypt_debug(" no </ in " + data);
    return(false);
  }
  lock=getTagAttr(data.substring(0,tagend+1),"LOCK");
  if(lock===null) { lock="default"; }

  collapsed=getTagAttr(data.substring(0,tagend+1),"COLLAPSED");
  if(collapsed===null || collapsed=="null") { collapsed="1"; }

  if(key===false) {
    key=getEncryptionKeyForLock(lock);
    if(key===false) { return(false); }
  }
  if(!(ctext=encryptTextString(data.substring(tagend+1,ptend),key))) {
    return(false);
  }
  return("<ENCRYPTED LOCK=" + lock + " " +
     "COLLAPSED=" + collapsed + ">" + ctext + "</ENCRYPTED>");
}


/* encrypt the string in text with ascii key in akey
  modified from Encrypt_Text to expect ascii key and take input params
  and to return base64 encoded
*/
function encryptTextString(ptext,akey) {
  var v, i, ret, key;
  var prefix = "#####  Encrypted: decrypt with ";
  prefix+="http://www.fourmilab.ch/javascrypt/\n";
  suffix = "#####  End encrypted message\n";

  if (akey.length === 0) {
    alert("Please specify a key with which to encrypt the message.");
    return;
  }
  if (ptext.length === 0) {
    alert("No plain text to encrypt!");
    return;
  }
  ret="";
  key=setKeyFromAscii(akey);

  // addEntroptyTime eventually results in setting of global entropyData
  // which is used by keyFromEntropy
  addEntropyTime();
  prng = new AESprng(keyFromEntropy());
  var plaintext = encode_utf8(ptext);

  //  Compute MD5 sum of message text and add to header

  md5_init();
  for (i = 0; i < plaintext.length; i++) {
    md5_update(plaintext.charCodeAt(i));
  }
  md5_finish();
  var header = "";
  for (i = 0; i < digestBits.length; i++) {
    header += String.fromCharCode(digestBits[i]);
  }

  //  Add message length in bytes to header

  i = plaintext.length;
  header += String.fromCharCode(i >>> 24);
  header += String.fromCharCode(i >>> 16);
  header += String.fromCharCode(i >>> 8);
  header += String.fromCharCode(i & 0xFF);

  /*  The format of the actual message passed to rijndaelEncrypt
  is:
     Bytes  Content
     0-15   MD5 signature of plaintext
     16-19  Length of plaintext, big-endian order
     20-end Plaintext

  Note that this message will be padded with zero bytes
  to an integral number of AES blocks (blockSizeInBits / 8).
  This does not include the initial vector for CBC
  encryption, which is added internally by rijndaelEncrypt.
  */

  var ct = rijndaelEncrypt(header + plaintext, key, "CBC");
  delete prng;
  return(prefix + armour_base64(ct) + suffix);
}

function decryptTextString(ctext,akey) {
  key=setKeyFromAscii(akey);
  var ct=[];

  // remove line breaks
  ct=disarm_base64(ctext);
  var result=rijndaelDecrypt(ct,key,"CBC");
  var header=result.slice(0,20);
  result=result.slice(20);
  var dl=(header[16]<<24)|(header[17]<<16)|(header[18]<<8)|header[19];

  if((dl<0)||(dl>result.length)) {
   // alert("Message (length "+result.length+") != expected (" + dl + ")");
   dl=result.length;
  }

  var i,plaintext="";
  md5_init();

  for(i=0;i<dl;i++) {
    plaintext+=String.fromCharCode(result[i]);
    md5_update(result[i]);
  }

  md5_finish();

  successful = true;

  for(i=0;i<digestBits.length;i++) {
    if(digestBits[i]!=header[i]) {
      crypt_debug("Invalid decryption key.");
      return(false);
    }
  }
  return(decode_utf8(plaintext));
}

// BEGIN: javascript/aes.js
// Rijndael parameters --  Valid values are 128, 192, or 256

var keySizeInBits = 256;
var blockSizeInBits = 128;

//
// Note: in the following code the two dimensional arrays are indexed as
//       you would probably expect, as array[row][column]. The state arrays
//       are 2d arrays of the form state[4][Nb].


// The number of rounds for the cipher, indexed by [Nk][Nb]
var roundsArray = [ undefined, undefined, undefined, undefined,[ undefined, undefined, undefined, undefined,10, undefined, 12, undefined, 14], undefined,
                        [ undefined, undefined, undefined, undefined, 12, undefined, 12, undefined, 14], undefined,
                        [ undefined, undefined, undefined, undefined, 14, undefined, 14, undefined, 14] ];

// The number of bytes to shift by in shiftRow, indexed by [Nb][row]
var shiftOffsets = [ undefined, undefined, undefined, undefined,[ undefined,1, 2, 3], undefined,[ undefined,1, 2, 3], undefined,[ undefined,1, 3, 4] ];

// The round constants used in subkey expansion
var Rcon = [
0x01, 0x02, 0x04, 0x08, 0x10, 0x20,
0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8,
0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc,
0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4,
0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91 ];

// Precomputed lookup table for the SBox
var SBox = [
 99, 124, 119, 123, 242, 107, 111, 197,  48,   1, 103,  43, 254, 215, 171,
118, 202, 130, 201, 125, 250,  89,  71, 240, 173, 212, 162, 175, 156, 164,
114, 192, 183, 253, 147,  38,  54,  63, 247, 204,  52, 165, 229, 241, 113,
216,  49,  21,   4, 199,  35, 195,  24, 150,   5, 154,   7,  18, 128, 226,
235,  39, 178, 117,   9, 131,  44,  26,  27, 110,  90, 160,  82,  59, 214,
179,  41, 227,  47, 132,  83, 209,   0, 237,  32, 252, 177,  91, 106, 203,
190,  57,  74,  76,  88, 207, 208, 239, 170, 251,  67,  77,  51, 133,  69,
249,   2, 127,  80,  60, 159, 168,  81, 163,  64, 143, 146, 157,  56, 245,
188, 182, 218,  33,  16, 255, 243, 210, 205,  12,  19, 236,  95, 151,  68,
23,  196, 167, 126,  61, 100,  93,  25, 115,  96, 129,  79, 220,  34,  42,
144, 136,  70, 238, 184,  20, 222,  94,  11, 219, 224,  50,  58,  10,  73,
  6,  36,  92, 194, 211, 172,  98, 145, 149, 228, 121, 231, 200,  55, 109,
141, 213,  78, 169, 108,  86, 244, 234, 101, 122, 174,   8, 186, 120,  37,
 46,  28, 166, 180, 198, 232, 221, 116,  31,  75, 189, 139, 138, 112,  62,
181, 102,  72,   3, 246,  14,  97,  53,  87, 185, 134, 193,  29, 158, 225,
248, 152,  17, 105, 217, 142, 148, 155,  30, 135, 233, 206,  85,  40, 223,
140, 161, 137,  13, 191, 230,  66, 104,  65, 153,  45,  15, 176,  84, 187,
 22 ];

// Precomputed lookup table for the inverse SBox
var SBoxInverse = [
 82,   9, 106, 213,  48,  54, 165,  56, 191,  64, 163, 158, 129, 243, 215,
251, 124, 227,  57, 130, 155,  47, 255, 135,  52, 142,  67,  68, 196, 222,
233, 203,  84, 123, 148,  50, 166, 194,  35,  61, 238,  76, 149,  11,  66,
250, 195,  78,   8,  46, 161, 102,  40, 217,  36, 178, 118,  91, 162,  73,
109, 139, 209,  37, 114, 248, 246, 100, 134, 104, 152,  22, 212, 164,  92,
204,  93, 101, 182, 146, 108, 112,  72,  80, 253, 237, 185, 218,  94,  21,
 70,  87, 167, 141, 157, 132, 144, 216, 171,   0, 140, 188, 211,  10, 247,
228,  88,   5, 184, 179,  69,   6, 208,  44,  30, 143, 202,  63,  15,   2,
193, 175, 189,   3,   1,  19, 138, 107,  58, 145,  17,  65,  79, 103, 220,
234, 151, 242, 207, 206, 240, 180, 230, 115, 150, 172, 116,  34, 231, 173,
 53, 133, 226, 249,  55, 232,  28, 117, 223, 110,  71, 241,  26, 113,  29,
 41, 197, 137, 111, 183,  98,  14, 170,  24, 190,  27, 252,  86,  62,  75,
198, 210, 121,  32, 154, 219, 192, 254, 120, 205,  90, 244,  31, 221, 168,
 51, 136,   7, 199,  49, 177,  18,  16,  89,  39, 128, 236,  95,  96,  81,
127, 169,  25, 181,  74,  13,  45, 229, 122, 159, 147, 201, 156, 239, 160,
224,  59,  77, 174,  42, 245, 176, 200, 235, 187,  60, 131,  83, 153,  97,
 23,  43,   4, 126, 186, 119, 214,  38, 225, 105,  20,  99,  85,  33,  12,
125 ];

// This method circularly shifts the array left by the number of elements
// given in its parameter. It returns the resulting array and is used for
// the ShiftRow step. Note that shift() and push() could be used for a more
// elegant solution, but they require IE5.5+, so I chose to do it manually.

function cyclicShiftLeft(theArray, positions) {
  var temp = theArray.slice(0, positions);
  theArray = theArray.slice(positions).concat(temp);
  return theArray;
}

// Cipher parameters ... do not change these
var Nk = keySizeInBits / 32;
var Nb = blockSizeInBits / 32;
var Nr = roundsArray[Nk][Nb];

// Multiplies the element "poly" of GF(2^8) by x. See the Rijndael spec.

function xtime(poly) {
  poly <<= 1;
  return ((poly & 0x100) ? (poly ^ 0x11B) : (poly));
}

// Multiplies the two elements of GF(2^8) together and returns the result.
// See the Rijndael spec, but should be straightforward: for each power of
// the indeterminant that has a 1 coefficient in x, add y times that power
// to the result. x and y should be bytes representing elements of GF(2^8)

function mult_GF256(x, y) {
  var bit, result = 0;

  for (bit = 1; bit < 256; bit *= 2, y = xtime(y)) {
    if (x & bit) { result ^= y; }
  }
  return result;
}

// Performs the substitution step of the cipher.  State is the 2d array of
// state information (see spec) and direction is string indicating whether
// we are performing the forward substitution ("encrypt") or inverse
// substitution (anything else)

function byteSub(state, direction) {
  var S;
  if (direction == "encrypt") { S = SBox; } // Point S to the SBox we're using
  else { S = SBoxInverse; }
  for (var i = 0; i < 4; i++) { // Substitute for every byte in state
    for (var j = 0; j < Nb; j++) { state[i][j] = S[state[i][j]]; }
  }
}

// Performs the row shifting step of the cipher.

function shiftRow(state, direction) {
  for (var i=1; i<4; i++) {             // Row 0 never shifts
    if (direction == "encrypt") {
       state[i] = cyclicShiftLeft(state[i], shiftOffsets[Nb][i]);
    } else {
       state[i] = cyclicShiftLeft(state[i], Nb - shiftOffsets[Nb][i]);
    }
  }

}

// Performs the column mixing step of the cipher. Most of these steps can
// be combined into table lookups on 32bit values (at least for encryption)
// to greatly increase the speed.

function mixColumn(state, direction) {
  var b = [];                            // Result of matrix multiplications
  var i = 0;
  for (var j = 0; j < Nb; j++) {         // Go through each column...
    for (i = 0; i < 4; i++) {        // and for each row in the column...
      if (direction == "encrypt") {
        b[i] = mult_GF256(state[i][j], 2) ^          // perform mixing
               mult_GF256(state[(i+1)%4][j], 3) ^
               state[(i+2)%4][j] ^
               state[(i+3)%4][j];
      } else {
        b[i] = mult_GF256(state[i][j], 0xE) ^
               mult_GF256(state[(i+1)%4][j], 0xB) ^
               mult_GF256(state[(i+2)%4][j], 0xD) ^
               mult_GF256(state[(i+3)%4][j], 9);
      }
    }
    for (i = 0; i < 4; i++) {        // Place result back into column
      state[i][j] = b[i];
    }
  }
}

// Adds the current round key to the state information. Straightforward.

function addRoundKey(state, roundKey) {
  for (var j = 0; j < Nb; j++) {                 // Step through columns...
    state[0][j] ^= (roundKey[j] & 0xFF);         // and XOR
    state[1][j] ^= ((roundKey[j]>>8) & 0xFF);
    state[2][j] ^= ((roundKey[j]>>16) & 0xFF);
    state[3][j] ^= ((roundKey[j]>>24) & 0xFF);
  }
}

// This function creates the expanded key from the input (128/192/256-bit)
// key. The parameter key is an array of bytes holding the value of the key.
// The returned value is an array whose elements are the 32-bit words that
// make up the expanded key.

function keyExpansion(key) {
  var expandedKey = [];
  var temp;

  // in case the key size or parameters were changed...
  Nk = keySizeInBits / 32;
  Nb = blockSizeInBits / 32;
  Nr = roundsArray[Nk][Nb];

  for (var j=0; j < Nk; j++) {   // Fill in input key first
    expandedKey[j] =
      (key[4*j]) | (key[4*j+1]<<8) | (key[4*j+2]<<16) | (key[4*j+3]<<24);
  }

  // Now walk down the rest of the array filling in expanded key bytes as
  // per Rijndael's spec
  for (j = Nk; j < Nb * (Nr + 1); j++) {    // For each word of expanded key
    temp = expandedKey[j - 1];
    if (j % Nk === 0) {
      temp = ( (SBox[(temp>>8) & 0xFF]) |
               (SBox[(temp>>16) & 0xFF]<<8) |
               (SBox[(temp>>24) & 0xFF]<<16) |
               (SBox[temp & 0xFF]<<24) ) ^ Rcon[Math.floor(j / Nk) - 1];
    } else if (Nk > 6 && j % Nk == 4) {
      temp = (SBox[(temp>>24) & 0xFF]<<24) |
             (SBox[(temp>>16) & 0xFF]<<16) |
             (SBox[(temp>>8) & 0xFF]<<8) |
             (SBox[temp & 0xFF]);
    }
    expandedKey[j] = expandedKey[j-Nk] ^ temp;
  }
  return expandedKey;
}

// Rijndael's round functions...

function jcRound(state, roundKey) {
  byteSub(state, "encrypt");
  shiftRow(state, "encrypt");
  mixColumn(state, "encrypt");
  addRoundKey(state, roundKey);
}

function inverseRound(state, roundKey) {
  addRoundKey(state, roundKey);
  mixColumn(state, "decrypt");
  shiftRow(state, "decrypt");
  byteSub(state, "decrypt");
}

function finalRound(state, roundKey) {
  byteSub(state, "encrypt");
  shiftRow(state, "encrypt");
  addRoundKey(state, roundKey);
}

function inverseFinalRound(state, roundKey){
  addRoundKey(state, roundKey);
  shiftRow(state, "decrypt");
  byteSub(state, "decrypt");
}

// encrypt is the basic encryption function. It takes parameters
// block, an array of bytes representing a plaintext block, and expandedKey,
// an array of words representing the expanded key previously returned by
// keyExpansion(). The ciphertext block is returned as an array of bytes.

function encrypt(block, expandedKey) {
  var i;
  if (!block || block.length*8 != blockSizeInBits) { return; }
  if (!expandedKey) { return; }

  block = packBytes(block);
  addRoundKey(block, expandedKey);
  for (i=1; i<Nr; i++) { jcRound(block, expandedKey.slice(Nb*i, Nb*(i+1))); }
  finalRound(block, expandedKey.slice(Nb*Nr));
  return unpackBytes(block);
}

// decrypt is the basic decryption function. It takes parameters
// block, an array of bytes representing a ciphertext block, and expandedKey,
// an array of words representing the expanded key previously returned by
// keyExpansion(). The decrypted block is returned as an array of bytes.

function decrypt(block, expandedKey) {
  var i;
  if (!block || block.length*8 != blockSizeInBits) { return; }
  if (!expandedKey) { return; }

  block = packBytes(block);
  inverseFinalRound(block, expandedKey.slice(Nb*Nr));
  for (i = Nr - 1; i>0; i--) {
    inverseRound(block, expandedKey.slice(Nb*i, Nb*(i+1)));
  }
  addRoundKey(block, expandedKey);
  return unpackBytes(block);
}

/* !NEEDED
// This method takes a byte array (byteArray) and converts it to a string by
// applying String.fromCharCode() to each value and concatenating the result.
// The resulting string is returned. Note that this function SKIPS zero bytes
// under the assumption that they are padding added in formatPlaintext().
// Obviously, do not invoke this method on raw data that can contain zero
// bytes. It is really only appropriate for printable ASCII/Latin-1
// values. Roll your own function for more robust functionality :)

function byteArrayToString(byteArray) {
  var result = "";
  for(var i=0; i<byteArray.length; i++)
    if (byteArray[i] != 0)
      result += String.fromCharCode(byteArray[i]);
  return result;
}
*/

// This function takes an array of bytes (byteArray) and converts them
// to a hexadecimal string. Array element 0 is found at the beginning of
// the resulting string, high nibble first. Consecutive elements follow
// similarly, for example [16, 255] --> "10ff". The function returns a
// string.

function byteArrayToHex(byteArray) {
  var result = "";
  if (!byteArray) { return; }
  for (var i=0; i<byteArray.length; i++) {
    result += ((byteArray[i]<16) ? "0" : "") + byteArray[i].toString(16);
  }

  return result;
}

// This function converts a string containing hexadecimal digits to an
// array of bytes. The resulting byte array is filled in the order the
// values occur in the string, for example "10FF" --> [16, 255]. This
// function returns an array.

function hexToByteArray(hexString) {
  var byteArray = [];
  if (hexString.length % 2) { return; } // must have even length
  if (hexString.indexOf("0x") === 0 || hexString.indexOf("0X") === 0) {
    hexString = hexString.substring(2);
  }
  for (var i = 0; i<hexString.length; i += 2) {
    byteArray[Math.floor(i/2)] = parseInt(hexString.slice(i, i+2), 16);
  }
  return byteArray;
}

// This function packs an array of bytes into the four row form defined by
// Rijndael. It assumes the length of the array of bytes is divisible by
// four. Bytes are filled in according to the Rijndael spec (starting with
// column 0, row 0 to 3). This function returns a 2d array.

function packBytes(octets) {
  var state = [];
  if (!octets || octets.length % 4) { return; }

  state[0] = []; state[1] = [];
  state[2] = []; state[3] = [];
  for (var j=0; j<octets.length; j+= 4) {
    state[0][j/4] = octets[j];
    state[1][j/4] = octets[j+1];
    state[2][j/4] = octets[j+2];
    state[3][j/4] = octets[j+3];
  }
  return state;
}

// This function unpacks an array of bytes from the four row format preferred
// by Rijndael into a single 1d array of bytes. It assumes the input "packed"
// is a packed array. Bytes are filled in according to the Rijndael spec.
// This function returns a 1d array of bytes.

function unpackBytes(packed) {
  var result = [];
  for (var j=0; j<packed[0].length; j++) {
    result[result.length] = packed[0][j];
    result[result.length] = packed[1][j];
    result[result.length] = packed[2][j];
    result[result.length] = packed[3][j];
  }
  return result;
}

// This function takes a prospective plaintext (string or array of bytes)
// and pads it with pseudorandom bytes if its length is not a multiple of the block
// size. If plaintext is a string, it is converted to an array of bytes
// in the process. The type checking can be made much nicer using the
// instanceof operator, but this operator is not available until IE5.0 so I
// chose to use the heuristic below.

function formatPlaintext(plaintext) {
  var bpb = blockSizeInBits / 8;               // bytes per block
  var i;

  // if primitive string or String instance
  if ((!((typeof plaintext == "object") &&
        ((typeof (plaintext[0])) == "number"))) &&
      ((typeof plaintext == "string") || plaintext.indexOf)) {
    plaintext = plaintext.split("");
    // Unicode issues here (ignoring high byte)
    for (i=0; i<plaintext.length; i++) {
      plaintext[i] = plaintext[i].charCodeAt(0) & 0xFF;
    }
  }

  i = plaintext.length % bpb;
  if (i > 0) {
    plaintext = plaintext.concat(getRandomBytes(bpb - i));
  }

  return plaintext;
}

// Returns an array containing "howMany" random bytes.

function getRandomBytes(howMany) {
  var i, bytes = [];

  for (i = 0; i < howMany; i++) {
    bytes[i] = prng.nextInt(255);
  }
  return bytes;
}

// rijndaelEncrypt(plaintext, key, mode)
// Encrypts the plaintext using the given key and in the given mode.
// The parameter "plaintext" can either be a string or an array of bytes.
// The parameter "key" must be an array of key bytes. If you have a hex
// string representing the key, invoke hexToByteArray() on it to convert it
// to an array of bytes. The third parameter "mode" is a string indicating
// the encryption mode to use, either "ECB" or "CBC". If the parameter is
// omitted, ECB is assumed.
//
// An array of bytes representing the cihpertext is returned. To convert
// this array to hex, invoke byteArrayToHex() on it.

function rijndaelEncrypt(plaintext, key, mode) {
  var expandedKey, i, aBlock;
  var bpb = blockSizeInBits / 8;          // bytes per block
  var ct;                                 // ciphertext

  if (!plaintext || !key) { return; }
  if (key.length*8 != keySizeInBits) { return; }
  if (mode == "CBC") {
    ct = getRandomBytes(bpb);             // get IV
//dump("IV", byteArrayToHex(ct));
  } else {
    mode = "ECB";
    ct = [];
  }

  // convert plaintext to byte array and pad with zeros if necessary.
  plaintext = formatPlaintext(plaintext);

  expandedKey = keyExpansion(key);

  for (var block = 0; block < plaintext.length / bpb; block++) {
    aBlock = plaintext.slice(block * bpb, (block + 1) * bpb);
    if (mode == "CBC") {
      for (i = 0; i < bpb; i++) {
        aBlock[i] ^= ct[(block * bpb) + i];
      }
    }
    ct = ct.concat(encrypt(aBlock, expandedKey));
  }

  return ct;
}

// rijndaelDecrypt(ciphertext, key, mode)
// Decrypts the using the given key and mode. The parameter "ciphertext"
// must be an array of bytes. The parameter "key" must be an array of key
// bytes. If you have a hex string representing the ciphertext or key,
// invoke hexToByteArray() on it to convert it to an array of bytes. The
// parameter "mode" is a string, either "CBC" or "ECB".
//
// An array of bytes representing the plaintext is returned. To convert
// this array to a hex string, invoke byteArrayToHex() on it. To convert it
// to a string of characters, you can use byteArrayToString().

function rijndaelDecrypt(ciphertext, key, mode) {
  var expandedKey;
  var bpb = blockSizeInBits / 8;          // bytes per block
  var pt = [];                   // plaintext array
  var aBlock;                             // a decrypted block
  var block;                              // current block number

  if (!ciphertext || !key || typeof ciphertext == "string") { return; }
  if (key.length*8 != keySizeInBits) { return; }
  if (!mode) { mode = "ECB"; } // assume ECB if mode omitted

  expandedKey = keyExpansion(key);

  // work backwards to accomodate CBC mode
  for (block=(ciphertext.length / bpb)-1; block>0; block--) {
    aBlock =
     decrypt(ciphertext.slice(block*bpb,(block+1)*bpb), expandedKey);
    if (mode == "CBC") {
      for (var i=0; i<bpb; i++) {
        pt[(block-1)*bpb + i] = aBlock[i] ^ ciphertext[(block-1)*bpb + i];
      }
    } else {
      pt = aBlock.concat(pt);
    }
  }

  // do last block if ECB (skips the IV in CBC)
  if (mode == "ECB") {
    pt = decrypt(ciphertext.slice(0, bpb), expandedKey).concat(pt);
  }

  return pt;
}

// END: javascrypt/aes.js
// BEGIN: javascrypt/entropy.js

//  Entropy collection utilities

/* Start by declaring static storage and initialise
   the entropy vector from the time we come through
   here. */

var entropyData = []; // Collected entropy data
var edlen = 0;        // Keyboard array data length

addEntropyTime();     // Start entropy collection with page load time
ce();                 // Roll milliseconds into initial entropy

//  Add a byte to the entropy vector

function addEntropyByte(b) {
  entropyData[edlen++] = b;
}

/*  Capture entropy.  When the user presses a key or performs
  various other events for which we can request
  notification, add the time in 255ths of a second to the
  entropyData array.  The name of the function is short
  so it doesn't bloat the form object declarations in
  which it appears in various "onXXX" events.  */

function ce() {
  addEntropyByte(Math.floor((((new Date()).getMilliseconds()) * 255) / 999));
}

//  Add a 32 bit quantity to the entropy vector

function addEntropy32(w) {
  var i;

  for (i = 0; i < 4; i++) {
    addEntropyByte(w & 0xFF);
    w >>= 8;
  }
}

/*  Add the current time and date (milliseconds since the epoch,
    truncated to 32 bits) to the entropy vector.  */

function addEntropyTime() {
  addEntropy32((new Date()).getTime());
}
/*  Start collection of entropy from mouse movements. The
  argument specifies the  number of entropy items to be
  obtained from mouse motion, after which mouse motion
  will be ignored.  Note that you can re-enable mouse
  motion collection at any time if not already underway.  */

var mouseMotionCollect = 0;
var oldMoveHandler;    // For saving and restoring mouse move handler in IE4

function mouseMotionEntropy(maxsamp) {
  if (mouseMotionCollect <= 0) {
    mouseMotionCollect = maxsamp;
    if ((document.implementation.hasFeature("Events", "2.0")) &&
        document.addEventListener) {
      //  Browser supports Document Object Model (DOM) 2 events
      document.addEventListener("mousemove", mouseMoveEntropy, false);
    } else {
      if (document.attachEvent) {
        //  Internet Explorer 5 and above event model
        document.attachEvent("onmousemove", mouseMoveEntropy);
      } else {
        //  Internet Explorer 4 event model
        oldMoveHandler = document.onmousemove;
        document.onmousemove = mouseMoveEntropy;
      }
    }
    //dump("Mouse enable", mouseMotionCollect);
  }
}

/*  Collect entropy from mouse motion events.  Note that
  this is craftily coded to work with either DOM2 or Internet
  Explorer style events.  Note that we don't use every successive
  mouse movement event.  Instead, we XOR the three bytes collected
  from the mouse and use that to determine how many subsequent
  mouse movements we ignore before capturing the next one.  */

var mouseEntropyTime = 0;      // Delay counter for mouse entropy collection

function mouseMoveEntropy(e) {
  if (!e) {
    e = window.event;      // Internet Explorer event model
  }
  if (mouseMotionCollect > 0) {
    if (mouseEntropyTime-- <= 0) {
      addEntropyByte(e.screenX & 0xFF);
      addEntropyByte(e.screenY & 0xFF);
      ce();
      mouseMotionCollect--;
      mouseEntropyTime = (entropyData[edlen - 3] ^ entropyData[edlen - 2] ^
                          entropyData[edlen - 1]) % 19;
      //dump("Mouse Move", byteArrayToHex(entropyData.slice(-3)));
    }
    if (mouseMotionCollect <= 0) {
      if (document.removeEventListener) {
        document.removeEventListener("mousemove", mouseMoveEntropy, false);
      } else if (document.detachEvent) {
        document.detachEvent("onmousemove", mouseMoveEntropy);
      } else {
        document.onmousemove = oldMoveHandler;
      }
      //dump("Spung!", 0);
    }
  }
}

/*  Compute a 32 byte key value from the entropy vector.
  We compute the value by taking the MD5 sum of the even
  and odd bytes respectively of the entropy vector, then
  concatenating the two MD5 sums.  */

function keyFromEntropy() {
  var i, k = [];

  if (edlen === 0) {
    alert("Blooie!  Entropy vector void at call to keyFromEntropy.");
  }
  //dump("Entropy bytes", edlen);

  md5_init();
  for (i = 0; i < edlen; i += 2) {
    md5_update(entropyData[i]);
  }
  md5_finish();
  for (i = 0; i < 16; i++) {
    k[i] = digestBits[i];
  }

  md5_init();
  for (i = 1; i < edlen; i += 2) {
    md5_update(entropyData[i]);
  }
  md5_finish();
  for (i = 0; i < 16; i++) {
    k[i + 16] = digestBits[i];
  }

  //dump("keyFromEntropy", byteArrayToHex(k));
  return k;
}
// END: javascrypt/entropy.js
// BEGIN: javascrypt/aesprng.js
//  AES based pseudorandom number generator

/*  Constructor.  Called with an array of 32 byte (0-255) values
  containing the initial seed.  */

function AESprng(seed) {
  this.key = [];
  this.key = seed;
  this.itext = hexToByteArray("9F489613248148F9C27945C6AE62EECA3E3367BB14064E4E6DC67A9F28AB3BD1");
  this.nbytes = 0;          // Bytes left in buffer

  this.next = AESprng_next;
  this.nextbits = AESprng_nextbits;
  this.nextInt = AESprng_nextInt;
  this.round = AESprng_round;

  /*  Encrypt the initial text with the seed key
      three times, feeding the output of the encryption
      back into the key for the next round.  */

  bsb = blockSizeInBits;
  blockSizeInBits = 256;
  var i, ct;
  for (i = 0; i < 3; i++) {
    this.key = rijndaelEncrypt(this.itext, this.key, "ECB");
  }

  /*  Now make between one and four additional
      key-feedback rounds, with the number determined
      by bits from the result of the first three
      rounds.  */

  var n = 1 + (this.key[3] & 2) + (this.key[9] & 1);
  for (i = 0; i < n; i++) {
    this.key = rijndaelEncrypt(this.itext, this.key, "ECB");
  }
  blockSizeInBits = bsb;
}

function AESprng_round() {
  bsb = blockSizeInBits;
  blockSizeInBits = 256;
  this.key = rijndaelEncrypt(this.itext, this.key, "ECB");
  this.nbytes = 32;
  blockSizeInBits = bsb;
}

//  Return next byte from the generator
function AESprng_next() {
  if (this.nbytes <= 0) {
    this.round();
  }
  return(this.key[--this.nbytes]);
}

//  Return n bit integer value (up to maximum integer size)
function AESprng_nextbits(n) {
  var i, w = 0, nbytes = Math.floor((n + 7) / 8);

  for (i = 0; i < nbytes; i++) {
    w = (w << 8) | this.next();
  }
  return w & ((1 << n) - 1);
}

//  Return integer between 0 and n inclusive
function AESprng_nextInt(n) {
  var p = 1, nb = 0;

  //  Determine smallest p,  2^p > n
  //  nb = log_2 p

  while (n >= p) {
    p <<= 1;
    nb++;
  }
  p--;

  /*  Generate values from 0 through n by first generating
      values v from 0 to (2^p)-1, then discarding any results v > n.
      For the rationale behind this (and why taking
      values mod (n + 1) is biased toward smaller values, see
      Ferguson and Schneier, "Practical Cryptography",
      ISBN 0-471-22357-3, section 10.8).  */

  while (true) {
    var v = this.nextbits(nb) & p;

    if (v <= n) {
      return v;
    }
  }
}
// END: javascrypt/aesprng.js
// BEGIN: javascrypt/lecuyer.js
/*
   L'Ecuyer's two-sequence generator with a Bays-Durham shuffle
  on the back-end.  Schrage's algorithm is used to perform
  64-bit modular arithmetic within the 32-bit constraints of
  JavaScript.

  Bays, C. and S. D. Durham.  ACM Trans. Math. Software: 2 (1976)
    59-64.

  L'Ecuyer, P.  Communications of the ACM: 31 (1968) 742-774.

  Schrage, L.  ACM Trans. Math. Software: 5 (1979) 132-138.

*/

// Schrage's modular multiplication algorithm
function uGen(old, a, q, r, m) {
  var t;

  t = Math.floor(old / q);
  t = a * (old - (t * q)) - (t * r);
  return Math.round((t < 0) ? (t + m) : t);
}

// Return next raw value
function LEnext() {
  var i;

  this.gen1 = uGen(this.gen1, 40014, 53668, 12211, 2147483563);
  this.gen2 = uGen(this.gen2, 40692, 52774, 3791, 2147483399);

  /* Extract shuffle table index from most significant part
     of the previous result. */

  i = Math.floor(this.state / 67108862);

  // New state is sum of generators modulo one of their moduli

  this.state = Math.round((this.shuffle[i] + this.gen2) % 2147483563);

  // Replace value in shuffle table with generator 1 result

  this.shuffle[i] = this.gen1;

  return this.state;
}

//  Return next random integer between 0 and n inclusive

function LEnint(n) {
  var p = 1;

  //  Determine smallest p,  2^p > n

  while (n >= p) {
    p <<= 1;
  }
  p--;

  /*  Generate values from 0 through n by first masking
    values v from 0 to (2^p)-1, then discarding any results v > n.
  For the rationale behind this (and why taking
  values mod (n + 1) is biased toward smaller values, see
  Ferguson and Schneier, "Practical Cryptography",
  ISBN 0-471-22357-3, section 10.8).  */

    while (true) {
      var v = this.next() & p;

      if (v <= n) {
      return v;
    }
  }
}

//  Constructor.  Called with seed value
function LEcuyer(s) {
  var i;

  this.shuffle = [];
  this.gen1 = this.gen2 = (s & 0x7FFFFFFF);
  for (i = 0; i < 19; i++) {
    this.gen1 = uGen(this.gen1, 40014, 53668, 12211, 2147483563);
  }

  // Fill the shuffle table with values

  for (i = 0; i < 32; i++) {
    this.gen1 = uGen(this.gen1, 40014, 53668, 12211, 2147483563);
    this.shuffle[31 - i] = this.gen1;
  }
  this.state = this.shuffle[0];
  this.next = LEnext;
  this.nextInt = LEnint;
}
// END:  javascrypt/lecuyer.js
// BEGIN: javascrypt/md5.js
function array(n) {
    for (i = 0; i < n; i++) {
        this[i] = 0;
    }
    this.length = n;
}

/* Some basic logical functions had to be rewritten because of a bug in
 * Javascript.. Just try to compute 0xffffffff >> 4 with it..
 * Of course, these functions are slower than the original would be, but
 * at least, they work!
 */

function integer(n) {
    return n % (0xffffffff + 1);
}

function shr(a, b) {
    a = integer(a);
    b = integer(b);
    if (a - 0x80000000 >= 0) {
        a = a % 0x80000000;
        a >>= b;
        a += 0x40000000 >> (b - 1);
    } else {
        a >>= b;
    }
    return a;
}

function shl1(a) {
    a = a % 0x80000000;
    if (a & 0x40000000 == 0x40000000) {
        a -= 0x40000000;
        a *= 2;
        a += 0x80000000;
    } else {
        a *= 2;
    }
    return a;
}

function shl(a, b) {
    a = integer(a);
    b = integer(b);
    for (var i = 0; i < b; i++) {
        a = shl1(a);
    }
    return a;
}

function and(a, b) {
    a = integer(a);
    b = integer(b);
    var t1 = a - 0x80000000;
    var t2 = b - 0x80000000;
    if (t1 >= 0) {
        if (t2 >= 0) {
            return ((t1 & t2) + 0x80000000);
        } else {
            return (t1 & b);
        }
    } else {
        if (t2 >= 0) {
            return (a & t2);
        } else {
            return (a & b);
        }
    }
}

function or(a, b) {
    a = integer(a);
    b = integer(b);
    var t1 = a - 0x80000000;
    var t2 = b - 0x80000000;
    if (t1 >= 0) {
        if (t2 >= 0) {
            return ((t1 | t2) + 0x80000000);
        } else {
            return ((t1 | b) + 0x80000000);
        }
    } else {
        if (t2 >= 0) {
            return ((a | t2) + 0x80000000);
        } else {
            return (a | b);
        }
    }
}

function xor(a, b) {
  a = integer(a);
  b = integer(b);
  var t1 = a - 0x80000000;
  var t2 = b - 0x80000000;
  if (t1 >= 0) {
    if (t2 >= 0) {
      return (t1 ^ t2);
    } else {
      return ((t1 ^ b) + 0x80000000);
    }
  } else {
    if (t2 >= 0) {
      return ((a ^ t2) + 0x80000000);
    } else {
      return (a ^ b);
    }
  }
}

function not(a) {
  a = integer(a);
  return 0xffffffff - a;
}

/* Here begin the real algorithm */

var state = [];
var count = [];
    count[0] = 0;
    count[1] = 0;
var buffer = [];
var transformBuffer = [];
var digestBits = [];

var S11 = 7;
var S12 = 12;
var S13 = 17;
var S14 = 22;
var S21 = 5;
var S22 = 9;
var S23 = 14;
var S24 = 20;
var S31 = 4;
var S32 = 11;
var S33 = 16;
var S34 = 23;
var S41 = 6;
var S42 = 10;
var S43 = 15;
var S44 = 21;

function jcF(x, y, z) {
  return or(and(x, y), and(not(x), z));
}

function jcG(x, y, z) {
  return or(and(x, z), and(y, not(z)));
}

function jcH(x, y, z) {
  return xor(xor(x, y), z);
}

function jcI(x, y, z) {
  return xor(y ,or(x , not(z)));
}

function rotateLeft(a, n) {
  return or(shl(a, n), (shr(a, (32 - n))));
}

function jcFF(a, b, c, d, x, s, ac) {
  a = a + jcF(b, c, d) + x + ac;
  a = rotateLeft(a, s);
  a = a + b;
  return a;
}

function jcGG(a, b, c, d, x, s, ac) {
  a = a + jcG(b, c, d) + x + ac;
  a = rotateLeft(a, s);
  a = a + b;
  return a;
}

function jcHH(a, b, c, d, x, s, ac) {
  a = a + jcH(b, c, d) + x + ac;
  a = rotateLeft(a, s);
  a = a + b;
  return a;
}

function jcII(a, b, c, d, x, s, ac) {
  a = a + jcI(b, c, d) + x + ac;
  a = rotateLeft(a, s);
  a = a + b;
  return a;
}

function transform(buf, offset) {
  var a = 0, b = 0, c = 0, d = 0;
  var x = transformBuffer;

  a = state[0];
  b = state[1];
  c = state[2];
  d = state[3];

  for (i = 0; i < 16; i++) {
    x[i] = and(buf[i * 4 + offset], 0xFF);
    for (j = 1; j < 4; j++) {
      x[i] += shl(and(buf[i * 4 + j + offset] ,0xFF), j * 8);
    }
  }

  /* Round 1 */
  a = jcFF( a, b, c, d, x[ 0], S11, 0xd76aa478); /* 1 */
  d = jcFF( d, a, b, c, x[ 1], S12, 0xe8c7b756); /* 2 */
  c = jcFF( c, d, a, b, x[ 2], S13, 0x242070db); /* 3 */
  b = jcFF( b, c, d, a, x[ 3], S14, 0xc1bdceee); /* 4 */
  a = jcFF( a, b, c, d, x[ 4], S11, 0xf57c0faf); /* 5 */
  d = jcFF( d, a, b, c, x[ 5], S12, 0x4787c62a); /* 6 */
  c = jcFF( c, d, a, b, x[ 6], S13, 0xa8304613); /* 7 */
  b = jcFF( b, c, d, a, x[ 7], S14, 0xfd469501); /* 8 */
  a = jcFF( a, b, c, d, x[ 8], S11, 0x698098d8); /* 9 */
  d = jcFF( d, a, b, c, x[ 9], S12, 0x8b44f7af); /* 10 */
  c = jcFF( c, d, a, b, x[10], S13, 0xffff5bb1); /* 11 */
  b = jcFF( b, c, d, a, x[11], S14, 0x895cd7be); /* 12 */
  a = jcFF( a, b, c, d, x[12], S11, 0x6b901122); /* 13 */
  d = jcFF( d, a, b, c, x[13], S12, 0xfd987193); /* 14 */
  c = jcFF( c, d, a, b, x[14], S13, 0xa679438e); /* 15 */
  b = jcFF( b, c, d, a, x[15], S14, 0x49b40821); /* 16 */

  /* Round 2 */
  a = jcGG( a, b, c, d, x[ 1], S21, 0xf61e2562); /* 17 */
  d = jcGG( d, a, b, c, x[ 6], S22, 0xc040b340); /* 18 */
  c = jcGG( c, d, a, b, x[11], S23, 0x265e5a51); /* 19 */
  b = jcGG( b, c, d, a, x[ 0], S24, 0xe9b6c7aa); /* 20 */
  a = jcGG( a, b, c, d, x[ 5], S21, 0xd62f105d); /* 21 */
  d = jcGG( d, a, b, c, x[10], S22,  0x2441453); /* 22 */
  c = jcGG( c, d, a, b, x[15], S23, 0xd8a1e681); /* 23 */
  b = jcGG( b, c, d, a, x[ 4], S24, 0xe7d3fbc8); /* 24 */
  a = jcGG( a, b, c, d, x[ 9], S21, 0x21e1cde6); /* 25 */
  d = jcGG( d, a, b, c, x[14], S22, 0xc33707d6); /* 26 */
  c = jcGG( c, d, a, b, x[ 3], S23, 0xf4d50d87); /* 27 */
  b = jcGG( b, c, d, a, x[ 8], S24, 0x455a14ed); /* 28 */
  a = jcGG( a, b, c, d, x[13], S21, 0xa9e3e905); /* 29 */
  d = jcGG( d, a, b, c, x[ 2], S22, 0xfcefa3f8); /* 30 */
  c = jcGG( c, d, a, b, x[ 7], S23, 0x676f02d9); /* 31 */
  b = jcGG( b, c, d, a, x[12], S24, 0x8d2a4c8a); /* 32 */

  /* Round 3 */
  a = jcHH( a, b, c, d, x[ 5], S31, 0xfffa3942); /* 33 */
  d = jcHH( d, a, b, c, x[ 8], S32, 0x8771f681); /* 34 */
  c = jcHH( c, d, a, b, x[11], S33, 0x6d9d6122); /* 35 */
  b = jcHH( b, c, d, a, x[14], S34, 0xfde5380c); /* 36 */
  a = jcHH( a, b, c, d, x[ 1], S31, 0xa4beea44); /* 37 */
  d = jcHH( d, a, b, c, x[ 4], S32, 0x4bdecfa9); /* 38 */
  c = jcHH( c, d, a, b, x[ 7], S33, 0xf6bb4b60); /* 39 */
  b = jcHH( b, c, d, a, x[10], S34, 0xbebfbc70); /* 40 */
  a = jcHH( a, b, c, d, x[13], S31, 0x289b7ec6); /* 41 */
  d = jcHH( d, a, b, c, x[ 0], S32, 0xeaa127fa); /* 42 */
  c = jcHH( c, d, a, b, x[ 3], S33, 0xd4ef3085); /* 43 */
  b = jcHH( b, c, d, a, x[ 6], S34,  0x4881d05); /* 44 */
  a = jcHH( a, b, c, d, x[ 9], S31, 0xd9d4d039); /* 45 */
  d = jcHH( d, a, b, c, x[12], S32, 0xe6db99e5); /* 46 */
  c = jcHH( c, d, a, b, x[15], S33, 0x1fa27cf8); /* 47 */
  b = jcHH( b, c, d, a, x[ 2], S34, 0xc4ac5665); /* 48 */

  /* Round 4 */
  a = jcII( a, b, c, d, x[ 0], S41, 0xf4292244); /* 49 */
  d = jcII( d, a, b, c, x[ 7], S42, 0x432aff97); /* 50 */
  c = jcII( c, d, a, b, x[14], S43, 0xab9423a7); /* 51 */
  b = jcII( b, c, d, a, x[ 5], S44, 0xfc93a039); /* 52 */
  a = jcII( a, b, c, d, x[12], S41, 0x655b59c3); /* 53 */
  d = jcII( d, a, b, c, x[ 3], S42, 0x8f0ccc92); /* 54 */
  c = jcII( c, d, a, b, x[10], S43, 0xffeff47d); /* 55 */
  b = jcII( b, c, d, a, x[ 1], S44, 0x85845dd1); /* 56 */
  a = jcII( a, b, c, d, x[ 8], S41, 0x6fa87e4f); /* 57 */
  d = jcII( d, a, b, c, x[15], S42, 0xfe2ce6e0); /* 58 */
  c = jcII( c, d, a, b, x[ 6], S43, 0xa3014314); /* 59 */
  b = jcII( b, c, d, a, x[13], S44, 0x4e0811a1); /* 60 */
  a = jcII( a, b, c, d, x[ 4], S41, 0xf7537e82); /* 61 */
  d = jcII( d, a, b, c, x[11], S42, 0xbd3af235); /* 62 */
  c = jcII( c, d, a, b, x[ 2], S43, 0x2ad7d2bb); /* 63 */
  b = jcII( b, c, d, a, x[ 9], S44, 0xeb86d391); /* 64 */

  state[0] += a;
  state[1] += b;
  state[2] += c;
  state[3] += d;

}

function md5_init() {
  count[0] = count[1] = 0;
  state[0] = 0x67452301;
  state[1] = 0xefcdab89;
  state[2] = 0x98badcfe;
  state[3] = 0x10325476;
  for (i = 0; i < digestBits.length; i++) {
    digestBits[i] = 0;
  }
}

function md5_update(b) {
  var index, i;

  index = and(shr(count[0],3) , 0x3F);
  if (count[0] < 0xFFFFFFFF - 7) {
    count[0] += 8;
  } else {
    count[1]++;
    count[0] -= 0xFFFFFFFF + 1;
    count[0] += 8;
  }
  buffer[index] = and(b, 0xff);
  if (index  >= 63) {
    transform(buffer, 0);
  }
}

function md5_finish() {
  var bits = [];
  var padding;
  var i = 0, index = 0, padLen = 0;

  for (i = 0; i < 4; i++) {
    bits[i] = and(shr(count[0], (i * 8)), 0xFF);
  }
  for (i = 0; i < 4; i++) {
    bits[i + 4] = and(shr(count[1], (i * 8)), 0xFF);
  }
  index = and(shr(count[0], 3), 0x3F);
  padLen = (index < 56) ? (56 - index) : (120 - index);
  padding = [];
  padding[0] = 0x80;
  for (i = 0; i < padLen; i++) {
    md5_update(padding[i]);
  }
  for (i = 0; i < 8; i++) {
  md5_update(bits[i]);
  }

  for (i = 0; i < 4; i++) {
    for (j = 0; j < 4; j++) {
      digestBits[i * 4 + j] = and(shr(state[i], (j * 8)) , 0xFF);
    }
  }
}

/* End of the MD5 algorithm */
// END: javascyprt/md5.js
// BEGIN: javscrypt/armour.js

//  Varieties of ASCII armour for binary data

var maxLineLength = 64; // Maximum line length for armoured text

/* Hexadecimal Armour

   A message is encoded in Hexadecimal armour by expressing its
   bytes as a hexadecimal string which is prefixed by a sentinel
   of "?HX?" and suffixed by "?H", then broken into lines no
   longer than maxLineLength.  Armoured messages use lower case
   letters for digits with decimal values of 0 through 15, but
   either upper or lower case letters are accepted when decoding
   a message.  The hexadecimal to byte array interconversion
   routines in aes.js do most of the heavy lifting here.  */

var hexSentinel = "?HX?", hexEndSentinel = "?H";

//  Encode byte array in hexadecimal armour

function armour_hex(b) {
  var h = hexSentinel + byteArrayToHex(b) + hexEndSentinel;
  var t = "";
  while (h.length > maxLineLength) {
    //dump("h.length", h.length);
    t += h.substring(0, maxLineLength) + "\n";
    h = h.substring(maxLineLength, h.length);
  }
  //dump("h.final_length", h.length);
  t += h + "\n";
  return t;
}

/* Decode string in hexadecimal armour to byte array.  If the
   string supplied contains a start and/or end sentinel,
   only characters within the sentinels will be decoded.
   Non-hexadecimal digits are silently ignored, which
   automatically handles line breaks.  We might want to
   diagnose invalid characters as opposed to ignoring them.  */

function disarm_hex(s) {
  var hexDigits = "0123456789abcdefABCDEF";
  var hs = "", i;

  //  Extract hexadecimal data between sentinels, if present
  if ((i = s.indexOf(hexSentinel)) >= 0) {
    s = s.substring(i + hexSentinel.length, s.length);
  }
  if ((i = s.indexOf(hexEndSentinel)) >= 0) {
    s = s.substring(0, i);
  }

  //  Assemble string of valid hexadecimal digits

  for (i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (hexDigits.indexOf(c) >= 0) {
      hs += c;
    }
  }
//dump("hs", hs);
  return hexToByteArray(hs);
}

  /*  Codegroup Armour
      Codegroup armour encodes a byte string into a sequence of five
  letter code groups like spies used in the good old days.  The
  first group of a message is always "ZZZZZ" and the last "YYYYY";
  the decoding process ignores any text outside these start and
  end sentinels.  Bytes are encoded as two letters in the range
  "A" to "X", each encoding four bits of the byte.  Encoding uses
  a pseudorandomly generated base letter and wraps around modulo
  24 to spread encoded letters evenly through the alphabet.  (This
  refinement is purely aesthetic; the base letter sequence is
  identical for all messages and adds no security.  If the message
  does not fill an even number of five letter groups, the last
  group is padded to five letters with "Z" characters, which are
  ignored when decoding.  */

var acgcl, acgt, acgg;

// Output next codegroup, flushing current line if it's full

function armour_cg_outgroup() {
  if (acgcl.length > maxLineLength) {
    acgt += acgcl + "\n";
    acgcl = "";
  }
  if (acgcl.length > 0) {
    acgcl += " ";
  }
  acgcl += acgg;
  acgg = "";
}

/* Add a letter to the current codegroup, emitting it when
   it reaches five letters.  */

function armour_cg_outletter(l) {
  if (acgg.length >= 5) {
    armour_cg_outgroup();
  }
  acgg += l;
}

var codegroupSentinel = "ZZZZZ";

function armour_codegroup(b) {
  var charBase = ("A").charCodeAt(0);

  acgcl = codegroupSentinel;
  acgt = "";
  acgg = "";

  var cgrng = new LEcuyer(0xbadf00d);
  for (i = 0; i < b.length; i++) {
    var r = cgrng.nextInt(23);
    armour_cg_outletter(String.fromCharCode(charBase + ((((b[i] >> 4) & 0xF)) + r) % 24));
    r = cgrng.nextInt(23);
    armour_cg_outletter(String.fromCharCode(charBase + ((((b[i] & 0xF)) + r) % 24)));
  }
  delete cgrng;

  //  Generate nulls to fill final codegroup if required

  while (acgg.length < 5) {
    armour_cg_outletter("Z");
  }
  armour_cg_outgroup();

  //  Append terminator group

  acgg = "YYYYY";
  armour_cg_outgroup();

  //  Flush last line

  acgt += acgcl + "\n";

  return acgt;
}

var dcgs, dcgi;

  /*  Obtain next "significant" character from message.  Characters
    other than letters are silently ignored; both lower and upper
    case letters are accepted.  */

function disarm_cg_insig() {
  while (dcgi < dcgs.length) {
    var c = dcgs.charAt(dcgi++).toUpperCase();
    if ((c >= "A") && (c <= "Z")) {
      //dump("c", c);
      return c;
    }
  }
  return "";
}

// Decode a message in codegroup armour

function disarm_codegroup(s) {
  var b = [];
  var nz = 0, ba, bal = 0, c;

  dcgs = s;
  dcgi = 0;

  //  Search for initial group of "ZZZZZ"

  while (nz < 5) {
    c = disarm_cg_insig();

    if (c == "Z") {
      nz++;
    } else if (c === "") {
      nz = 0;
      break;
    } else {
      nz = 0;
    }
  }

  if (nz === 0) {
      alert("No codegroup starting symbol found in message.");
      return "";
  }

  /*  Decode letter pairs from successive groups
      and assemble into bytes.  */

  var charBase = ("A").charCodeAt(0);
  var cgrng = new LEcuyer(0xbadf00d);
  for (nz = 0; nz < 2; ) {
    c = disarm_cg_insig();
    //dump("c", c);

    if ((c == "Y") || (c === "")) {
      break;
    } else if (c != "Z") {
      var r = cgrng.nextInt(23);
      var n = c.charCodeAt(0) - charBase;
      n = (n + (24 - r)) % 24;
      //dump("n", n);
      if (nz === 0) {
        ba = (n << 4);
        nz++;
      } else {
        ba |= n;
        b[bal++] = ba;
        nz = 0;
      }
    }
  }
  delete cgrng;

  /*  Ponder how we escaped from the decoder loop and
      issue any requisite warnings.  */

  var kbo = "  Attempting decoding with data received.";
  if (nz !== 0) {
    alert("Codegroup data truncated." + kbo);
  } else {
    if (c == "Y") {
      nz = 1;
      while (nz < 5) {
        c = disarm_cg_insig();
        if (c != "Y") {
          break;
        }
        nz++;
      }
      if (nz != 5) {
        alert("Codegroup end group incomplete." + kbo);
      }
    } else {
      alert("Codegroup end group missing." + kbo);
    }
  }

  return b;
}

    /*  Base64 Armour

  Base64 armour encodes a byte array as described in RFC 1341.  Sequences
  of three bytes are encoded into groups of four characters from a set
  of 64 consisting of the upper and lower case letters, decimal digits,
  and the special characters "+" and "/".  If the input is not a multiple
  of three characters, the end of the message is padded with one or two
  "=" characters to indicate its actual length.  We prefix the armoured
  message with "?b64" and append "?64b" to the end; if one or both
  of these sentinels are present, text outside them is ignored.  You can
  suppress the generation of sentinels in armour by setting base64addsent
  false before calling armour_base64.  */


var base64code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  base64sent = "?b64", base64esent = "?64b", base64addsent = true;

function armour_base64(b) {
  var b64t = "";
  var b64l = base64addsent ? base64sent : "";

  var i;
  for (i = 0; i <= b.length - 3; i += 3) {
    if ((b64l.length + 4) > maxLineLength) {
      b64t += b64l + "\n";
      b64l = "";
    }
    b64l += base64code.charAt(b[i] >> 2);
    b64l += base64code.charAt(((b[i] & 3) << 4) | (b[i + 1] >> 4));
    b64l += base64code.charAt(((b[i + 1] & 0xF) << 2) | (b[i + 2] >> 6));
    b64l += base64code.charAt(b[i + 2] & 0x3F);
  }

  //dump("b.length", b.length);  dump("i", i); dump("(b.length - i)", (b.length - i));
  if ((b.length - i) == 1) {
    b64l += base64code.charAt(b[i] >> 2);
    b64l += base64code.charAt(((b[i] & 3) << 4));
    b64l += "==";
  } else if ((b.length - i) == 2) {
    b64l += base64code.charAt(b[i] >> 2);
    b64l += base64code.charAt(((b[i] & 3) << 4) | (b[i + 1] >> 4));
    b64l += base64code.charAt(((b[i + 1] & 0xF) << 2));
    b64l += "=";
  }

  if ((b64l.length + 4) > maxLineLength) {
    b64t += b64l + "\n";
    b64l = "";
  }
  if (base64addsent) {
    b64l += base64esent;
  }
  b64t += b64l + "\n";
  return b64t;
}

function disarm_base64(s) {
  var b = [];
  var i = 0, j, c, shortgroup = 0, n = 0;
  var d = [];

  if ((j = s.indexOf(base64sent)) >= 0) {
    s = s.substring(j + base64sent.length, s.length);
  }
  if ((j = s.indexOf(base64esent)) >= 0) {
    s = s.substring(0, j);
  }

  /*  Ignore any non-base64 characters before the encoded
      data stream and skip the type sentinel if present.  */

  while (i < s.length) {
    if (base64code.indexOf(s.charAt(i)) != -1) {
      break;
    }
    i++;
  }

  /*  Decode the base64 data stream.  The decoder is
      terminated by the end of the input string or
      the occurrence of the explicit end sentinel.  */

  while (i < s.length) {
    for (j = 0; j < 4; ) {
      if (i >= s.length) {
        if (j > 0) {
          alert("Base64 cipher text truncated.");
          return b;
        }
        break;
      }
      c = base64code.indexOf(s.charAt(i));
      if (c >= 0) {
        d[j++] = c;
      } else if (s.charAt(i) == "=") {
        d[j++] = 0;
        shortgroup++;
      } else if (s.substring(i, i + base64esent.length) == base64esent) {
        //dump("s.substring(i, i + base64esent.length)", s.substring(i, i + base64esent.length));
        //dump("esent", i);
        i = s.length;
        continue;
      } else {
        //dump("s.substring(i, i + base64esent.length)", s.substring(i, i + base64esent.length));
        //dump("usent", i);
        // Might improve diagnosis of improper character in else clause here
      }
      i++;
    }
    //dump("d0", d[0]); dump("d1", d[1]); dump("d2", d[2]); dump("d3", d[3]);
    //dump("shortgroup", shortgroup);
    //dump("n", n);
    if (j == 4) {
      b[n++] = ((d[0] << 2) | (d[1] >> 4)) & 0xFF;
      if (shortgroup < 2) {
        b[n++] = ((d[1] << 4) | (d[2] >> 2)) & 0xFF;
        //dump("(d[1] << 4) | (d[2] >> 2)", (d[1] << 4) | (d[2] >> 2));
        if (shortgroup < 1) {
          b[n++] = ((d[2] << 6) | d[3]) & 0xFF;
        }
      }
    }
  }
  return b;
}
// END: javascrypt/armour.js
// BEGIN: javscrypt/utf-8.js

/*  Encoding and decoding of Unicode character strings as
    UTF-8 byte streams.  */

//  UNICODE_TO_UTF8  --  Encode Unicode argument string as UTF-8 return value

function unicode_to_utf8(s) {
  var utf8 = "";
  for (var n = 0; n < s.length; n++) {
    var c = s.charCodeAt(n);

    if (c <= 0x7F) {
      //  0x00 - 0x7F:  Emit as single byte, unchanged
      utf8 += String.fromCharCode(c);
    } else if ((c >= 0x80) && (c <= 0x7FF)) {
      //  0x80 - 0x7FF:  Output as two byte code, 0xC0 in first byte
      //  0x80 in second byte
      utf8 += String.fromCharCode((c >> 6) | 0xC0);
      utf8 += String.fromCharCode((c & 0x3F) | 0x80);
    } else {
      // 0x800 - 0xFFFF:  Output as three bytes, 0xE0 in first byte
      // 0x80 in second byte
      // 0x80 in third byte
      utf8 += String.fromCharCode((c >> 12) | 0xE0);
      utf8 += String.fromCharCode(((c >> 6) & 0x3F) | 0x80);
      utf8 += String.fromCharCode((c & 0x3F) | 0x80);
    }
  }
  return utf8;
}

    //  UTF8_TO_UNICODE  --  Decode UTF-8 argument into Unicode string return value

function utf8_to_unicode(utf8) {
  var s = "", i = 0, b1, b2;

  while (i < utf8.length) {
    b1 = utf8.charCodeAt(i);
    if (b1 < 0x80) {      // One byte code: 0x00 0x7F
      s += String.fromCharCode(b1);
      i++;
    } else if((b1 >= 0xC0) && (b1 < 0xE0)) {  // Two byte code: 0x80 - 0x7FF
      b2 = utf8.charCodeAt(i + 1);
      s += String.fromCharCode(((b1 & 0x1F) << 6) | (b2 & 0x3F));
      i += 2;
    } else {            // Three byte code: 0x800 - 0xFFFF
      b2 = utf8.charCodeAt(i + 1);
      b3 = utf8.charCodeAt(i + 2);
      s += String.fromCharCode(((b1 & 0xF) << 12) |
              ((b2 & 0x3F) << 6) | (b3 & 0x3F));
      i += 3;
    }
  }
  return s;
}

    /*  ENCODE_UTF8  --  Encode string as UTF8 only if it contains
       a character of 0x9D (Unicode OPERATING
       SYSTEM COMMAND) or a character greater
       than 0xFF.  This permits all strings
       consisting exclusively of 8 bit
       graphic characters to be encoded as
       themselves.  We choose 0x9D as the sentinel
       character as opposed to one of the more
       logical PRIVATE USE characters because 0x9D
       is not overloaded by the regrettable
       "Windows-1252" character set.  Now such characters
       don't belong in JavaScript strings, but you never
       know what somebody is going to paste into a
       text box, so this choice keeps Windows-encoded
       strings from bloating to UTF-8 encoding.  */

function encode_utf8(s) {
  var i, necessary = false;

  for (i = 0; i < s.length; i++) {
    if ((s.charCodeAt(i) == 0x9D) || (s.charCodeAt(i) > 0xFF)) {
      necessary = true;
      break;
    }
  }
  if (!necessary) {
    return s;
  }
  return String.fromCharCode(0x9D) + unicode_to_utf8(s);
}

/*  DECODE_UTF8  --  Decode a string encoded with encode_utf8
    above.  If the string begins with the
    sentinel character 0x9D (OPERATING
    SYSTEM COMMAND), then we decode the
    balance as a UTF-8 stream.  Otherwise,
    the string is output unchanged, as
    it's guaranteed to contain only 8 bit
    characters excluding 0x9D.  */

function decode_utf8(s) {
  if ((s.length > 0) && (s.charCodeAt(0) == 0x9D)) {
    return utf8_to_unicode(s.substring(1));
  }
  return s;
}
// END: javscrypt/utf-8.js

// protected password prompt adapted from: https://stackoverflow.com/a/28461750/19144619
var promptCount = 0;
var prompt = null;
var label = null;
var input = null;
var submit_button = null;
var cancel_button = null;
var submit_event = null;
var cancel_event = null;
window.pw_prompt = function(options) {
    var lm = options.lm || "Password:",
        bm = options.bm || "Submit",
        cm = options.cm || "Cancel",
		elem = options.elem || document.body;
    if(!options.callback) { 
        alert("No callback function provided! Please provide one.") 
    };

    if (prompt == null) {
        prompt = document.createElement("div");
        prompt.className = "dokucrypt2pw_prompt";
        
        label = document.createElement("label");
        label.textContent = lm;
        label.for = "pw_prompt_input";
        prompt.appendChild(label);
    
        input = document.createElement("input");
        input.id = "pw_prompt_input";
        input.type = "password";
        prompt.appendChild(input);
    
        submit_button = document.createElement("button");
        prompt.appendChild(submit_button);
    
        cancel_button = document.createElement("button");
        prompt.appendChild(cancel_button);
    } else {
        //remove event listeners
        submit_button.removeEventListener("click", submit_event);
        cancel_button.removeEventListener("click", cancel_event);
	}
	
    submit_event = function() {
        options.callback(input.value);
        if (prompt.parentNode)
            prompt.parentNode.removeChild(prompt);
    };
    cancel_event = function() {
        if (prompt.parentNode)
            prompt.parentNode.removeChild(prompt);
    };
    label.textContent = lm;
	input.value = "";
    input.addEventListener("keyup", function(e) {
        if (e.keyCode == 13) submit_event();
    }, false);
    submit_button.textContent = bm;
    submit_button.addEventListener("click", submit_event, false);
    cancel_button.textContent = cm;
    cancel_button.addEventListener("click", cancel_event, false);

    if(elem.nextSibling){
        elem.parentNode.insertBefore(prompt,elem.nextSibling);
    }else{
        elem.parentNode.appendChild(prompt);
    }
	
	input.focus();
};
