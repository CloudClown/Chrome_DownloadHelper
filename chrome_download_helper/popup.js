//nacl message handling
DownloadHelperModule = null;//initialization                                                                                                                                                                                                                                
statusText = 'NO-STATUS';

var loadURL = function(URL) {
    DownloadHelperModule.postMessage(URL);
};

var moduleDidLoad = function() {	
    DownloadHelperModule = document.getElementById('chrome_download_helper');	updateStatus('SUCCESS');
};

var handleMessage = function(message_event) {
    /*********Debug Test***********/
    var contentList = document.getElementById("testContent");
    var li = document.createElement("li");
    li.textContent = message_event.data;
    contentList.appendChild(li);
    /******************************/
};

var pageDidLoad = function() {
    if (DownloadHelperModule == null) {
        updateStatus('LOADING...');
    } else {
        updateStatus();
    }
};

var updateStatus = function(opt_message) {
    if (opt_message)
        statusText = opt_message;
    var statusField = document.getElementById('status_field');
    if (statusField) {
        statusField.innerHTML = statusText;
    }
};


//send request to the background page

//meta data comparator(only compare the meta in the active tab)
var metaComparator = function(newMeta) {
    //compare pick out active tab
    for (tabIndex in newMeta) {
	var isActive = false;
	var tMeta = newMeta[tabIndex];
	for (contentIndex in tMeta) {
	    if(contentIndex !== "requestNum") {
		var contentMeta = tMeta[contentIndex];
		if (contentMeta.hasOwnProperty("active") && 
		    contentMeta.active === true) {
		    isActive = true;
		}
	    }
	}
	
	if (isActive) {
	    return newMeta[tabIndex];
	}
    }
    return null;
};

var videoLink = null;
var conversionType = null;

var rMeta = {};

var videoSelector = function(vID) {
    
    if(!videoLink) {
	videoLink = null;
    }
    videoLink = rMeta[vID];
    
    //debugging message
    console.log(JSON.stringify(videoLink));
    
};

var hookupNACL = function(videoURL, convertType) {
    loadURL("test/test.html");
};

var conversionTypeSelector = function(cType) {

    if(!conversionType) {
	conversionType = null;
    }

    //get conversion type
    conversionType = cType;
    
    //send message to NACL and start encoding process
    hookupNACL(videoLink, conversionType);    
    
    //debugging message
    console.log("conversion type:"+conversionType);
    
};

var listContructor = function(requestsMeta) {
    
    rMeta = requestsMeta;
    
    var iter;
    for(iter in requestsMeta) { 
	
	var name = iter.length < 25 ? iter : iter.substring(0,25) + "...";
	
	var content = "<li onclick=\"videoSelector(\'"+iter+"\')\" "
	+"class=\"ui-li ui-li-static ui-body-c\" data-role=\"ui-bar-a\">"
	+"<a href=\"#conversionTypes\""
	+">"+name+"</a></li>";
	
	$('#downloadList').append(content);
    }
};

//media type list
var mediaTypes = [
		  "MP3"
		  ];

$(document).ready(function() {
	
	//construct the conversion type menu
	for(var ID = 0; ID < mediaTypes.length; ID++) {
	    
	    var listItem = 
		"<li class=\"ui-li ui-li-static ui-body-c\" data-role=\"ui-bar-a\""
		+"onclick=\"conversionTypeSelector(\'"+mediaTypes[ID]+"\')\">"
		+"<a href=\"#debug\">"+mediaTypes[ID]+"</a></li>";
	    
	    $('#types').append(listItem);

	}
	
	var tabMeta;
	var bgp = chrome.extension.getBackgroundPage();
	tabMeta = metaComparator(bgp.mediaRequestsMap);
	
	var counterTag = document.getElementById("counter");
	if(tabMeta) {
	    counterTag.textContent = tabMeta.requestNum;
	    for(reqMetaID in tabMeta) {
		var subMeta = tabMeta[reqMetaID];
		if(reqMetaID !== "requestNum") {
		    listContructor(subMeta.requests);
		}
	    }
	} else {
	    counterTag.textContent = 0;
	}
    });